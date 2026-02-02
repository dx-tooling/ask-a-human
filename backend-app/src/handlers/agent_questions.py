"""
Agent API Lambda handler for question operations.
Reference: ADR-03 API Design, PRD-02 Agent API

Handles:
- POST /agent/questions - Create a new question
- GET /agent/questions/{question_id} - Poll for responses
"""

import json
import logging
from typing import Any

from ..models.question import (
    Question,
    get_question_with_responses,
    save_question,
    DEFAULT_MIN_RESPONSES,
    DEFAULT_TIMEOUT_SECONDS,
    MAX_TIMEOUT_SECONDS,
    MAX_MIN_RESPONSES,
    MAX_PROMPT_LENGTH,
)
from ..utils.api_response import (
    success,
    created,
    validation_error,
    question_not_found,
    server_error,
)


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: dict, context: Any) -> dict:
    """
    Main Lambda handler that routes based on HTTP method.
    API Gateway HTTP API event format.
    """
    try:
        http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
        
        if http_method == "POST":
            return handle_create_question(event)
        elif http_method == "GET":
            return handle_get_question(event)
        else:
            return validation_error(f"Unsupported method: {http_method}")
    
    except Exception as e:
        logger.exception("Unhandled error in agent_questions handler")
        return server_error(str(e))


def handle_create_question(event: dict) -> dict:
    """
    Handle POST /agent/questions - Create a new question.
    
    Request body:
    {
        "prompt": "Question text",
        "type": "text" | "multiple_choice",
        "options": ["A", "B", "C"],  // required if type=multiple_choice
        "min_responses": 5,
        "timeout_seconds": 3600,
        "audience": ["technical", "product"]
    }
    """
    # Parse request body
    try:
        body = json.loads(event.get("body", "{}"))
    except json.JSONDecodeError:
        return validation_error("Invalid JSON in request body")
    
    # Validate required fields
    prompt = body.get("prompt")
    if not prompt:
        return validation_error(
            "prompt is required",
            details={"field": "prompt", "constraint": "required"},
        )
    
    if len(prompt) > MAX_PROMPT_LENGTH:
        return validation_error(
            f"prompt must be at most {MAX_PROMPT_LENGTH} characters",
            details={"field": "prompt", "constraint": "length", "max": MAX_PROMPT_LENGTH},
        )
    
    question_type = body.get("type")
    if question_type not in ("text", "multiple_choice"):
        return validation_error(
            "type must be 'text' or 'multiple_choice'",
            details={"field": "type", "constraint": "enum", "allowed": ["text", "multiple_choice"]},
        )
    
    # Validate options for multiple choice
    options = body.get("options")
    if question_type == "multiple_choice":
        if not options or not isinstance(options, list):
            return validation_error(
                "options is required for multiple_choice questions",
                details={"field": "options", "constraint": "required"},
            )
        if len(options) < 2 or len(options) > 10:
            return validation_error(
                "options must have 2-10 items",
                details={"field": "options", "constraint": "length", "min": 2, "max": 10},
            )
    
    # Validate optional fields
    min_responses = body.get("min_responses", DEFAULT_MIN_RESPONSES)
    if not isinstance(min_responses, int) or min_responses < 1 or min_responses > MAX_MIN_RESPONSES:
        return validation_error(
            f"min_responses must be between 1 and {MAX_MIN_RESPONSES}",
            details={"field": "min_responses", "constraint": "range", "min": 1, "max": MAX_MIN_RESPONSES},
        )
    
    timeout_seconds = body.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)
    if not isinstance(timeout_seconds, int) or timeout_seconds < 60 or timeout_seconds > MAX_TIMEOUT_SECONDS:
        return validation_error(
            f"timeout_seconds must be between 60 and {MAX_TIMEOUT_SECONDS}",
            details={"field": "timeout_seconds", "constraint": "range", "min": 60, "max": MAX_TIMEOUT_SECONDS},
        )
    
    audience = body.get("audience")
    if audience is not None and not isinstance(audience, list):
        return validation_error(
            "audience must be an array of strings",
            details={"field": "audience", "constraint": "type"},
        )
    
    # Extract agent_id from header (optional, for future rate limiting)
    agent_id = event.get("headers", {}).get("x-agent-id")
    
    # Create and save the question
    question = Question.create(
        prompt=prompt,
        question_type=question_type,
        min_responses=min_responses,
        timeout_seconds=timeout_seconds,
        options=options if question_type == "multiple_choice" else None,
        audience=audience,
        agent_id=agent_id,
    )
    
    save_question(question)
    
    logger.info(f"Created question {question.question_id}")
    
    # Return 201 Created response
    return created({
        "question_id": question.question_id,
        "status": question.status,
        "poll_url": f"/agent/questions/{question.question_id}",
        "expires_at": question.expires_at,
    })


def handle_get_question(event: dict) -> dict:
    """
    Handle GET /agent/questions/{question_id} - Poll for responses.
    
    Returns question details plus all responses received so far.
    """
    # Extract question_id from path parameters
    path_params = event.get("pathParameters", {}) or {}
    question_id = path_params.get("question_id")
    
    if not question_id:
        return validation_error("question_id is required in path")
    
    # Fetch question and responses
    question, responses = get_question_with_responses(question_id)
    
    if not question:
        return question_not_found()
    
    logger.info(f"Retrieved question {question_id} with {len(responses)} responses")
    
    return success(question.to_agent_response(responses=responses))
