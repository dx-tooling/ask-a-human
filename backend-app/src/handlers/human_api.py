"""Human API Lambda handler for question browsing and response submission.

Reference: ADR-03 API Design, PRD-01 Human Web App

Handles:
- GET /human/questions - List open questions
- GET /human/questions/{question_id} - Get single question
- POST /human/responses - Submit an answer
"""

import json
import logging
from typing import Any

from ..models.question import (
    get_question,
    list_open_questions,
    update_question_status,
)
from ..models.response import (
    Response,
    get_answered_question_ids,
    save_response,
)
from ..utils.api_response import (
    created,
    question_closed,
    question_not_found,
    server_error,
    success,
    validation_error,
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:  # noqa: ARG001
    """Main Lambda handler that routes based on HTTP method and path.

    API Gateway HTTP API event format.

    Args:
        event: API Gateway event dictionary.
        context: Lambda context object (unused but required by Lambda).

    Returns:
        API Gateway response dictionary.
    """
    try:
        http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
        path = event.get("requestContext", {}).get("http", {}).get("path", "")

        if http_method == "GET":
            if "/questions/" in path:
                return handle_get_question(event)
            else:
                return handle_list_questions(event)
        elif http_method == "POST":
            return handle_submit_response(event)
        else:
            return validation_error(f"Unsupported method: {http_method}")

    except Exception as e:
        logger.exception("Unhandled error in human_api handler")
        return server_error(str(e))


def handle_list_questions(event: dict[str, Any]) -> dict[str, Any]:
    """Handle GET /human/questions - List open questions.

    Query parameters:
    - limit: Max results (default 20, max 50)

    Headers:
    - X-Fingerprint: User fingerprint to filter out already-answered questions

    Args:
        event: API Gateway event dictionary.

    Returns:
        API Gateway response dictionary.
    """
    # Parse query parameters
    query_params = event.get("queryStringParameters") or {}

    limit = 20
    if "limit" in query_params:
        try:
            limit = int(query_params["limit"])
            limit = max(1, min(50, limit))  # Clamp to 1-50
        except ValueError:
            pass

    # Get fingerprint from header (for filtering already-answered questions)
    headers = event.get("headers", {}) or {}
    fingerprint_hash = headers.get("x-fingerprint")

    # Get question IDs the user has already answered
    answered_ids: set[str] = set()
    if fingerprint_hash:
        answered_ids = get_answered_question_ids(fingerprint_hash)

    # Fetch open questions (fetch more to account for filtering)
    # We fetch extra to compensate for filtered questions
    fetch_limit = limit + len(answered_ids) if answered_ids else limit
    fetch_limit = min(fetch_limit, 100)  # Cap at reasonable number
    questions = list_open_questions(limit=fetch_limit)

    # Filter out already-answered questions
    if answered_ids:
        questions = [q for q in questions if q.question_id not in answered_ids]

    # Apply the original limit after filtering
    questions = questions[:limit]

    logger.info(
        "Listed %d open questions (filtered %d already answered)",
        len(questions),
        len(answered_ids),
    )

    return success(
        {
            "questions": [q.to_human_list_item() for q in questions],
        }
    )


def handle_get_question(event: dict[str, Any]) -> dict[str, Any]:
    """Handle GET /human/questions/{question_id} - Get single question.

    Returns question details for answering.
    Note: can_answer check by fingerprint is deferred to Task 03+

    Args:
        event: API Gateway event dictionary.

    Returns:
        API Gateway response dictionary.
    """
    # Extract question_id from path parameters
    path_params = event.get("pathParameters", {}) or {}
    question_id = path_params.get("question_id")

    if not question_id:
        return validation_error("question_id is required in path")

    question = get_question(question_id)

    if not question:
        return question_not_found()

    # Check if question is still accepting responses
    if question.status in ("CLOSED", "EXPIRED"):
        return question_closed()

    # can_answer is always True for now (fingerprint validation in Task 03+)
    can_answer = True

    logger.info("Retrieved question %s for human", question_id)

    return success(question.to_human_detail(can_answer=can_answer))


def handle_submit_response(event: dict[str, Any]) -> dict[str, Any]:  # noqa: C901
    """Handle POST /human/responses - Submit an answer.

    Request body:
    {
        "question_id": "q_xxx",
        "answer": "text response",  // for text questions
        "selected_option": 2,       // for multiple choice (0-based index)
        "confidence": 4             // optional, 1-5
    }

    Args:
        event: API Gateway event dictionary.

    Returns:
        API Gateway response dictionary.
    """
    # Parse request body
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return validation_error("Invalid JSON in request body")

    # Validate question_id
    question_id = body.get("question_id")
    if not question_id:
        return validation_error(
            "question_id is required",
            details={"field": "question_id", "constraint": "required"},
        )

    # Fetch the question
    question = get_question(question_id)
    if not question:
        return question_not_found()

    # Check if question is still accepting responses
    if question.status in ("CLOSED", "EXPIRED"):
        return question_closed()

    # Validate answer based on question type
    answer = body.get("answer")
    selected_option = body.get("selected_option")

    if question.type == "text":
        if not answer or not isinstance(answer, str):
            return validation_error(
                "answer is required for text questions",
                details={"field": "answer", "constraint": "required"},
            )
        if len(answer) > 5000:
            return validation_error(
                "answer must be at most 5000 characters",
                details={"field": "answer", "constraint": "length", "max": 5000},
            )
        selected_option = None

    elif question.type == "multiple_choice":
        if selected_option is None or not isinstance(selected_option, int):
            return validation_error(
                "selected_option is required for multiple choice questions",
                details={"field": "selected_option", "constraint": "required"},
            )
        if question.options and (selected_option < 0 or selected_option >= len(question.options)):
            return validation_error(
                f"selected_option must be between 0 and {len(question.options) - 1}",
                details={
                    "field": "selected_option",
                    "constraint": "range",
                    "min": 0,
                    "max": len(question.options) - 1 if question.options else 0,
                },
            )
        answer = None

    # Validate optional confidence
    confidence = body.get("confidence")
    if confidence is not None and (not isinstance(confidence, int) or confidence < 1 or confidence > 5):
        return validation_error(
            "confidence must be between 1 and 5",
            details={"field": "confidence", "constraint": "range", "min": 1, "max": 5},
        )

    # Extract fingerprint from header (optional, for future deduplication)
    fingerprint_hash = event.get("headers", {}).get("x-fingerprint")

    # Create and save the response
    response = Response.create(
        question_id=question_id,
        answer=answer,
        selected_option=selected_option,
        confidence=confidence,
        fingerprint_hash=fingerprint_hash,
    )

    save_response(response)

    # Update question response count and status
    new_count = question.current_responses + 1
    new_status = update_question_status(
        question_id=question_id,
        new_responses=new_count,
        min_responses=question.min_responses,
    )

    logger.info(
        "Submitted response %s to question %s. New count: %d, status: %s",
        response.response_id,
        question_id,
        new_count,
        new_status,
    )

    # Return 201 Created response
    # Points are placeholder (always 10) per task spec
    return created(response.to_api_response())
