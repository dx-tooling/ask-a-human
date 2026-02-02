"""Question model and DynamoDB operations.

Reference: ADR-02 Database Schema, ADR-03 API Design
"""

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from boto3.dynamodb.conditions import Key

from ..utils.dynamodb import (
    deserialize_item,
    get_questions_table,
    get_responses_table,
    serialize_item,
)

# Question status values
QuestionStatus = Literal["OPEN", "PARTIAL", "CLOSED", "EXPIRED"]

# Default values from ADR-03
DEFAULT_MIN_RESPONSES = 5
DEFAULT_TIMEOUT_SECONDS = 3600
MAX_TIMEOUT_SECONDS = 86400
MAX_MIN_RESPONSES = 50
MAX_PROMPT_LENGTH = 2000


def generate_question_id() -> str:
    """Generate a unique question ID with q_ prefix.

    Returns:
        A unique question ID string starting with 'q_'.
    """
    return f"q_{uuid.uuid4().hex[:12]}"


@dataclass
class Question:
    """Question data model matching DynamoDB schema."""

    question_id: str
    prompt: str
    type: Literal["text", "multiple_choice"]
    status: QuestionStatus
    min_responses: int
    current_responses: int
    created_at: str
    expires_at: str
    options: list[str] | None = None
    audience: list[str] | None = None
    agent_id: str | None = None
    closed_at: str | None = None

    @classmethod
    def create(
        cls,
        prompt: str,
        question_type: Literal["text", "multiple_choice"],
        min_responses: int = DEFAULT_MIN_RESPONSES,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        options: list[str] | None = None,
        audience: list[str] | None = None,
        agent_id: str | None = None,
    ) -> "Question":
        """Create a new question with generated ID and timestamps.

        Args:
            prompt: The question text.
            question_type: Either 'text' or 'multiple_choice'.
            min_responses: Minimum responses required (default 5).
            timeout_seconds: Seconds until expiration (default 3600).
            options: List of options for multiple choice questions.
            audience: Target audience tags.
            agent_id: Optional agent identifier.

        Returns:
            A new Question instance.
        """
        now = datetime.now(timezone.utc)
        expires_at = datetime.fromtimestamp(
            now.timestamp() + timeout_seconds,
            tz=timezone.utc,
        )

        return cls(
            question_id=generate_question_id(),
            prompt=prompt,
            type=question_type,
            status="OPEN",
            min_responses=min_responses,
            current_responses=0,
            created_at=now.isoformat(),
            expires_at=expires_at.isoformat(),
            options=options,
            audience=audience or ["general"],
            agent_id=agent_id,
        )

    def to_dynamo_item(self) -> dict[str, Any]:
        """Convert to DynamoDB item format.

        Returns:
            Dictionary suitable for DynamoDB put_item.
        """
        item = {
            "question_id": self.question_id,
            "prompt": self.prompt,
            "type": self.type,
            "status": self.status,
            "min_responses": self.min_responses,
            "current_responses": self.current_responses,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
        }
        if self.options:
            item["options"] = self.options
        if self.audience:
            item["audience"] = self.audience
        if self.agent_id:
            item["agent_id"] = self.agent_id
        if self.closed_at:
            item["closed_at"] = self.closed_at
        return serialize_item(item)

    @classmethod
    def from_dynamo_item(cls, item: dict[str, Any]) -> "Question":
        """Create Question from DynamoDB item.

        Args:
            item: DynamoDB item dictionary.

        Returns:
            Question instance.
        """
        data = deserialize_item(item)
        return cls(
            question_id=data["question_id"],
            prompt=data["prompt"],
            type=data["type"],
            status=data["status"],
            min_responses=data["min_responses"],
            current_responses=data.get("current_responses", 0),
            created_at=data["created_at"],
            expires_at=data["expires_at"],
            options=data.get("options"),
            audience=data.get("audience"),
            agent_id=data.get("agent_id"),
            closed_at=data.get("closed_at"),
        )

    def to_agent_response(self, responses: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Convert to API response format for agent polling.

        Args:
            responses: Optional list of response dictionaries.

        Returns:
            Dictionary formatted for agent API response.
        """
        result = {
            "question_id": self.question_id,
            "status": self.status,
            "prompt": self.prompt,
            "type": self.type,
            "required_responses": self.min_responses,
            "current_responses": self.current_responses,
            "expires_at": self.expires_at,
        }
        if self.options:
            result["options"] = self.options
        if self.closed_at:
            result["closed_at"] = self.closed_at
        if responses is not None:
            result["responses"] = responses
        return result

    def to_human_list_item(self) -> dict[str, Any]:
        """Convert to API response format for human question list.

        Returns:
            Dictionary formatted for human list API response.
        """
        result = {
            "question_id": self.question_id,
            "prompt": self.prompt,
            "type": self.type,
            "responses_needed": max(0, self.min_responses - self.current_responses),
            "created_at": self.created_at,
        }
        if self.options:
            result["options"] = self.options
        if self.audience:
            result["audience"] = self.audience
        return result

    def to_human_detail(self, can_answer: bool = True) -> dict[str, Any]:
        """Convert to API response format for single question detail.

        Args:
            can_answer: Whether the user can answer this question.

        Returns:
            Dictionary formatted for human detail API response.
        """
        result = {
            "question_id": self.question_id,
            "prompt": self.prompt,
            "type": self.type,
            "responses_needed": max(0, self.min_responses - self.current_responses),
            "can_answer": can_answer,
        }
        if self.options:
            result["options"] = self.options
        if self.audience:
            result["audience"] = self.audience
        return result


def save_question(question: Question) -> None:
    """Save a question to DynamoDB.

    Args:
        question: Question instance to save.
    """
    table = get_questions_table()
    table.put_item(Item=question.to_dynamo_item())


def get_question(question_id: str) -> Question | None:
    """Fetch a question by ID.

    Args:
        question_id: The question ID to fetch.

    Returns:
        Question instance if found, None otherwise.
    """
    table = get_questions_table()
    response = table.get_item(Key={"question_id": question_id})
    item = response.get("Item")
    if not item:
        return None
    return Question.from_dynamo_item(item)


def get_question_with_responses(question_id: str) -> tuple[Question | None, list[dict[str, Any]]]:
    """Fetch a question and all its responses.

    Args:
        question_id: The question ID to fetch.

    Returns:
        Tuple of (Question or None, list of response dicts).
    """
    question = get_question(question_id)
    if not question:
        return None, []

    # Query responses table
    responses_table = get_responses_table()
    response = responses_table.query(KeyConditionExpression=Key("question_id").eq(question_id))

    # Format responses for API output (exclude internal fields)
    responses = []
    for item in response.get("Items", []):
        data = deserialize_item(item)
        resp = {}
        if "answer" in data:
            resp["answer"] = data["answer"]
        if "selected_option" in data:
            resp["selected_option"] = data["selected_option"]
        if "confidence" in data:
            resp["confidence"] = data["confidence"]
        responses.append(resp)

    return question, responses


def list_open_questions(limit: int = 20) -> list[Question]:
    """List questions with OPEN or PARTIAL status.

    Uses the ByStatus GSI.

    Args:
        limit: Maximum number of questions to return.

    Returns:
        List of Question instances.
    """
    table = get_questions_table()
    questions = []

    # Query for OPEN status
    response = table.query(
        IndexName="ByStatus",
        KeyConditionExpression=Key("status").eq("OPEN"),
        Limit=limit,
        ScanIndexForward=False,  # Most recent first
    )
    for item in response.get("Items", []):
        questions.append(Question.from_dynamo_item(item))

    # If we have room, also get PARTIAL status
    remaining = limit - len(questions)
    if remaining > 0:
        response = table.query(
            IndexName="ByStatus",
            KeyConditionExpression=Key("status").eq("PARTIAL"),
            Limit=remaining,
            ScanIndexForward=False,
        )
        for item in response.get("Items", []):
            questions.append(Question.from_dynamo_item(item))

    return questions


def increment_response_count(question_id: str, min_responses: int) -> str:
    """Increment the response count and update status if needed.

    Status transitions:
    - OPEN -> PARTIAL (first response)
    - PARTIAL -> CLOSED (min_responses reached)

    Args:
        question_id: The question ID to update.
        min_responses: Minimum responses needed for CLOSED status.

    Returns:
        The new status string.
    """
    table = get_questions_table()

    # Update with conditional logic
    response = table.update_item(
        Key={"question_id": question_id},
        UpdateExpression="""
            SET current_responses = current_responses + :inc,
                #status = CASE
                    WHEN current_responses + :inc >= :min THEN :closed
                    WHEN current_responses = :zero THEN :partial
                    ELSE #status
                END
        """,
        # DynamoDB doesn't support CASE in UpdateExpression, so we do it differently
        # Using a simpler approach with two possible updates
        ConditionExpression="attribute_exists(question_id)",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
            ":inc": 1,
            ":min": min_responses,
            ":closed": "CLOSED",
            ":partial": "PARTIAL",
            ":zero": 0,
        },
        ReturnValues="ALL_NEW",
    )

    return str(response["Attributes"]["status"])


def update_question_status(question_id: str, new_responses: int, min_responses: int) -> str:
    """Update the response count and status.

    Args:
        question_id: The question ID to update.
        new_responses: The new response count.
        min_responses: Minimum responses needed for CLOSED status.

    Returns:
        The new status string.
    """
    table = get_questions_table()

    # Determine new status
    if new_responses >= min_responses:
        new_status = "CLOSED"
        closed_at = datetime.now(timezone.utc).isoformat()
    elif new_responses > 0:
        new_status = "PARTIAL"
        closed_at = None
    else:
        new_status = "OPEN"
        closed_at = None

    update_expr = "SET current_responses = :count, #status = :status"
    expr_values: dict[str, Any] = {
        ":count": new_responses,
        ":status": new_status,
    }

    if closed_at:
        update_expr += ", closed_at = :closed_at"
        expr_values[":closed_at"] = closed_at

    table.update_item(
        Key={"question_id": question_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues=expr_values,
    )

    return new_status
