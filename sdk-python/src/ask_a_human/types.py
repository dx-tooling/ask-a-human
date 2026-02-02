"""Type definitions for Ask-a-Human SDK.

This module contains Pydantic models for all data structures used in the SDK.
These types match the API responses defined in ADR-03 and PRD-02.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Type aliases for literals
QuestionType = Literal["text", "multiple_choice"]
"""Type of question: 'text' for free-form answers, 'multiple_choice' for predefined options."""

QuestionStatus = Literal["OPEN", "PARTIAL", "CLOSED", "EXPIRED"]
"""Status of a question:
- OPEN: Accepting responses, none received yet
- PARTIAL: Has some responses, still accepting more
- CLOSED: Required responses reached
- EXPIRED: Timeout reached before sufficient responses
"""

AudienceTag = Literal["technical", "product", "ethics", "creative", "general"]
"""Target audience for a question:
- technical: Software developers, engineers
- product: Product managers, UX designers
- ethics: Ethics considerations, safety
- creative: Writers, designers, creatives
- general: No specific expertise required
"""


class QuestionSubmission(BaseModel):
    """Response from submitting a question.

    Returned by the POST /agent/questions endpoint.

    Attributes:
        question_id: Unique identifier for the question (e.g., 'q_abc123def456').
        status: Current status of the question.
        poll_url: Relative URL to poll for responses.
        expires_at: When the question will expire if not enough responses.
        created_at: When the question was created.

    Example:
        >>> submission = client.submit_question(prompt="...", type="text")
        >>> print(submission.question_id)
        'q_abc123def456'
        >>> print(submission.poll_url)
        '/agent/questions/q_abc123def456'
    """

    question_id: str = Field(..., description="Unique identifier for the question")
    status: QuestionStatus = Field(..., description="Current status of the question")
    poll_url: str = Field(..., description="URL to poll for responses")
    expires_at: datetime = Field(..., description="When the question expires")
    created_at: datetime | None = Field(default=None, description="When the question was created")


class HumanResponse(BaseModel):
    """Individual response from a human.

    For text questions, the `answer` field contains the response.
    For multiple choice questions, `selected_option` contains the index.

    Attributes:
        answer: Free-text answer (for text questions).
        selected_option: Index of selected option (for multiple choice questions).
        confidence: Human's confidence in their answer (1-5 scale).

    Example:
        >>> for response in question.responses:
        ...     if response.answer:
        ...         print(f"Text: {response.answer}")
        ...     else:
        ...         print(f"Selected option: {response.selected_option}")
    """

    answer: str | None = Field(default=None, description="Free-text answer for text questions")
    selected_option: int | None = Field(default=None, description="Index of selected option for MC questions")
    confidence: int | None = Field(default=None, ge=1, le=5, description="Confidence score (1-5)")


class QuestionResponse(BaseModel):
    """Full question with status and responses.

    Returned by the GET /agent/questions/{question_id} endpoint.

    Attributes:
        question_id: Unique identifier for the question.
        status: Current status of the question.
        prompt: The original question text.
        type: Type of question ('text' or 'multiple_choice').
        options: Options for multiple choice questions.
        required_responses: Number of responses needed to close.
        current_responses: Number of responses received so far.
        expires_at: When the question will expire.
        closed_at: When the question was closed (if applicable).
        responses: List of human responses.
        summary: For MC questions, vote counts by option.

    Example:
        >>> response = client.get_question("q_abc123")
        >>> print(f"Status: {response.status}")
        >>> print(f"Got {response.current_responses} of {response.required_responses}")
        >>> for r in response.responses:
        ...     print(r.answer or f"Option {r.selected_option}")
    """

    question_id: str = Field(..., description="Unique identifier for the question")
    status: QuestionStatus = Field(..., description="Current status of the question")
    prompt: str = Field(..., description="The question text")
    type: QuestionType = Field(..., description="Type of question")
    options: list[str] | None = Field(default=None, description="Options for multiple choice questions")
    required_responses: int = Field(..., description="Number of responses needed")
    current_responses: int = Field(..., description="Number of responses received")
    expires_at: datetime = Field(..., description="When the question expires")
    closed_at: datetime | None = Field(default=None, description="When the question was closed")
    responses: list[HumanResponse] = Field(default_factory=list, description="Human responses")
    summary: dict[str, int] | None = Field(default=None, description="Vote counts for MC questions")


class QuestionRequest(BaseModel):
    """Request body for submitting a question.

    Used internally by AskHumanClient to construct API requests.

    Attributes:
        prompt: The question text (10-2000 characters).
        type: Type of question ('text' or 'multiple_choice').
        options: Options for multiple choice questions (2-10 items).
        audience: Target audience tags.
        min_responses: Minimum responses needed (1-50).
        timeout_seconds: Expiration time in seconds (60-86400).
        idempotency_key: Optional key to prevent duplicate submissions.
    """

    prompt: str = Field(..., min_length=10, max_length=2000, description="The question text")
    type: QuestionType = Field(..., description="Type of question")
    options: list[str] | None = Field(default=None, min_length=2, max_length=10, description="MC options")
    audience: list[AudienceTag] | None = Field(default=None, description="Target audience")
    min_responses: int = Field(default=5, ge=1, le=50, description="Minimum responses needed")
    timeout_seconds: int = Field(default=3600, ge=60, le=86400, description="Expiration in seconds")
    idempotency_key: str | None = Field(default=None, description="Key to prevent duplicates")
