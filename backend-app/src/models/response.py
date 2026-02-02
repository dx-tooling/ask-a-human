"""Response model and DynamoDB operations.

Reference: ADR-02 Database Schema, ADR-03 API Design
"""

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from ..utils.dynamodb import (
    deserialize_item,
    get_responses_table,
    serialize_item,
)


def generate_response_id() -> str:
    """Generate a unique response ID with r_ prefix.

    Returns:
        A unique response ID string starting with 'r_'.
    """
    return f"r_{uuid.uuid4().hex[:12]}"


@dataclass
class Response:
    """Response data model matching DynamoDB schema."""

    question_id: str
    response_id: str
    created_at: str
    answer: str | None = None
    selected_option: int | None = None
    confidence: int | None = None
    fingerprint_hash: str | None = None

    @classmethod
    def create(
        cls,
        question_id: str,
        answer: str | None = None,
        selected_option: int | None = None,
        confidence: int | None = None,
        fingerprint_hash: str | None = None,
    ) -> "Response":
        """Create a new response with generated ID and timestamp.

        Args:
            question_id: ID of the question being answered.
            answer: Text answer for text questions.
            selected_option: Selected option index for multiple choice.
            confidence: Confidence level 1-5.
            fingerprint_hash: Browser fingerprint hash.

        Returns:
            A new Response instance.
        """
        return cls(
            question_id=question_id,
            response_id=generate_response_id(),
            created_at=datetime.now(timezone.utc).isoformat(),
            answer=answer,
            selected_option=selected_option,
            confidence=confidence,
            fingerprint_hash=fingerprint_hash,
        )

    def to_dynamo_item(self) -> dict[str, Any]:
        """Convert to DynamoDB item format.

        Returns:
            Dictionary suitable for DynamoDB put_item.
        """
        item: dict[str, Any] = {
            "question_id": self.question_id,
            "response_id": self.response_id,
            "created_at": self.created_at,
        }
        if self.answer is not None:
            item["answer"] = self.answer
        if self.selected_option is not None:
            item["selected_option"] = self.selected_option
        if self.confidence is not None:
            item["confidence"] = self.confidence
        if self.fingerprint_hash is not None:
            item["fingerprint_hash"] = self.fingerprint_hash
        return serialize_item(item)

    @classmethod
    def from_dynamo_item(cls, item: dict[str, Any]) -> "Response":
        """Create Response from DynamoDB item.

        Args:
            item: DynamoDB item dictionary.

        Returns:
            Response instance.
        """
        data = deserialize_item(item)
        return cls(
            question_id=data["question_id"],
            response_id=data["response_id"],
            created_at=data["created_at"],
            answer=data.get("answer"),
            selected_option=data.get("selected_option"),
            confidence=data.get("confidence"),
            fingerprint_hash=data.get("fingerprint_hash"),
        )

    def to_api_response(self) -> dict[str, Any]:
        """Convert to API response format for POST /human/responses.

        Points are a placeholder (always 10) per task spec.

        Returns:
            Dictionary formatted for API response.
        """
        return {
            "response_id": self.response_id,
            "points_earned": 10,  # Placeholder per task - gamification in Task 04+
        }


def save_response(response: Response) -> None:
    """Save a response to DynamoDB.

    Args:
        response: Response instance to save.
    """
    table = get_responses_table()
    table.put_item(Item=response.to_dynamo_item())
