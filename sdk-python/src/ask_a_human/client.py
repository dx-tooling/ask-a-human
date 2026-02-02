"""Low-level API client for Ask-a-Human.

This module provides the AskHumanClient class which wraps the Ask-a-Human
HTTP API. For higher-level orchestration with polling and timeouts, see
the AskHumanOrchestrator class.

Example:
    >>> from ask_a_human import AskHumanClient
    >>> client = AskHumanClient(agent_id="my-agent")
    >>> result = client.submit_question(
    ...     prompt="Should this error apologize?",
    ...     type="text"
    ... )
    >>> response = client.get_question(result.question_id)
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any

import httpx

from ask_a_human.exceptions import (
    AskHumanError,
    QuestionNotFoundError,
    QuotaExceededError,
    RateLimitError,
    ServerError,
    ValidationError,
)
from ask_a_human.types import (
    AudienceTag,
    QuestionRequest,
    QuestionResponse,
    QuestionSubmission,
    QuestionType,
)

if TYPE_CHECKING:
    pass


# Default configuration
DEFAULT_BASE_URL = "https://api.ask-a-human.com"
DEFAULT_TIMEOUT = 30.0


class AskHumanClient:
    """Low-level client for the Ask-a-Human API.

    This client provides direct access to the API endpoints. For higher-level
    functionality like polling and timeouts, use AskHumanOrchestrator instead.

    Attributes:
        base_url: The API base URL.
        agent_id: The agent identifier for rate limiting.
        timeout: HTTP request timeout in seconds.

    Example:
        >>> client = AskHumanClient(agent_id="my-agent")
        >>> # Submit a question
        >>> result = client.submit_question(
        ...     prompt="What tone should this email use?",
        ...     type="multiple_choice",
        ...     options=["Formal", "Casual", "Friendly"]
        ... )
        >>> print(result.question_id)
        'q_abc123'
        >>> # Check for responses
        >>> response = client.get_question(result.question_id)
        >>> print(response.status)
        'PARTIAL'
    """

    def __init__(
        self,
        base_url: str | None = None,
        agent_id: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        """Initialize the client.

        Args:
            base_url: API base URL. Defaults to ASK_A_HUMAN_BASE_URL env var
                or https://api.ask-a-human.com.
            agent_id: Agent identifier for rate limiting. Defaults to
                ASK_A_HUMAN_AGENT_ID env var or 'default'.
            timeout: HTTP request timeout in seconds. Defaults to 30.

        Example:
            >>> # Using defaults
            >>> client = AskHumanClient(agent_id="my-agent")
            >>> # Custom configuration
            >>> client = AskHumanClient(
            ...     base_url="https://api.example.com",
            ...     agent_id="my-agent",
            ...     timeout=60.0
            ... )
        """
        self.base_url = base_url or os.environ.get("ASK_A_HUMAN_BASE_URL", DEFAULT_BASE_URL)
        self.agent_id = agent_id or os.environ.get("ASK_A_HUMAN_AGENT_ID", "default")
        self.timeout = timeout

        # Initialize HTTP client
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "X-Agent-Id": self.agent_id,
            },
        )

    def __enter__(self) -> AskHumanClient:
        """Enter context manager."""
        return self

    def __exit__(self, *args: Any) -> None:
        """Exit context manager."""
        self.close()

    def close(self) -> None:
        """Close the HTTP client.

        Call this when you're done using the client to release resources.
        Alternatively, use the client as a context manager.

        Example:
            >>> client = AskHumanClient(agent_id="my-agent")
            >>> try:
            ...     # Use client
            ...     pass
            ... finally:
            ...     client.close()
            >>> # Or use as context manager
            >>> with AskHumanClient(agent_id="my-agent") as client:
            ...     # Use client
            ...     pass
        """
        self._client.close()

    def submit_question(
        self,
        prompt: str,
        type: QuestionType,  # noqa: A002 - 'type' shadows builtin, but matches API
        options: list[str] | None = None,
        audience: list[AudienceTag] | None = None,
        min_responses: int = 5,
        timeout_seconds: int = 3600,
        idempotency_key: str | None = None,
    ) -> QuestionSubmission:
        """Submit a question for humans to answer.

        Args:
            prompt: The question text (10-2000 characters).
            type: Question type - 'text' for free-form, 'multiple_choice' for options.
            options: Options for multiple choice questions (2-10 items). Required if
                type is 'multiple_choice'.
            audience: Target audience tags. Defaults to ['general'].
            min_responses: Minimum responses needed (1-50). Defaults to 5.
            timeout_seconds: Question expiration in seconds (60-86400). Defaults to 3600.
            idempotency_key: Optional key to prevent duplicate submissions.

        Returns:
            QuestionSubmission with question_id, status, poll_url, and expires_at.

        Raises:
            ValidationError: If the request is invalid.
            RateLimitError: If rate limit is exceeded.
            QuotaExceededError: If too many concurrent questions.
            ServerError: If the server returns a 5xx error.
            AskHumanError: For other API errors.

        Example:
            >>> # Text question
            >>> result = client.submit_question(
            ...     prompt="Should error messages apologize to users?",
            ...     type="text",
            ...     audience=["product", "creative"],
            ...     min_responses=5
            ... )
            >>> # Multiple choice question
            >>> result = client.submit_question(
            ...     prompt="Which button label is clearer?",
            ...     type="multiple_choice",
            ...     options=["Submit", "Send", "Confirm"],
            ...     min_responses=10
            ... )
        """
        # Build request
        request = QuestionRequest(
            prompt=prompt,
            type=type,
            options=options,
            audience=audience,
            min_responses=min_responses,
            timeout_seconds=timeout_seconds,
            idempotency_key=idempotency_key,
        )

        # Send request
        response = self._client.post(
            "/agent/questions",
            json=request.model_dump(exclude_none=True),
        )

        # Handle response
        self._handle_errors(response)

        # Parse response
        data = response.json()
        return QuestionSubmission.model_validate(data)

    def get_question(self, question_id: str) -> QuestionResponse:
        """Get a question's status and responses.

        Args:
            question_id: The question ID to retrieve.

        Returns:
            QuestionResponse with full question details and responses.

        Raises:
            QuestionNotFoundError: If the question doesn't exist.
            RateLimitError: If rate limit is exceeded.
            ServerError: If the server returns a 5xx error.
            AskHumanError: For other API errors.

        Example:
            >>> response = client.get_question("q_abc123")
            >>> print(f"Status: {response.status}")
            >>> print(f"Responses: {response.current_responses}/{response.required_responses}")
            >>> for r in response.responses:
            ...     print(f"  {r.answer or r.selected_option}")
        """
        response = self._client.get(f"/agent/questions/{question_id}")

        # Handle 404 specially
        if response.status_code == 404:
            error_data = response.json().get("error", {})
            raise QuestionNotFoundError(
                message=error_data.get("message", "Question not found"),
                question_id=question_id,
                code=error_data.get("code"),
                details=error_data.get("details"),
            )

        self._handle_errors(response)

        data = response.json()
        return QuestionResponse.model_validate(data)

    def _handle_errors(self, response: httpx.Response) -> None:
        """Handle HTTP error responses.

        Args:
            response: The HTTP response to check.

        Raises:
            ValidationError: For 400 errors.
            QuotaExceededError: For 403 errors.
            QuestionNotFoundError: For 404 errors.
            RateLimitError: For 429 errors.
            ServerError: For 5xx errors.
            AskHumanError: For other errors.
        """
        if response.is_success:
            return

        # Try to parse error response
        try:
            error_data = response.json().get("error", {})
        except Exception:
            error_data = {}

        message = error_data.get("message", f"HTTP {response.status_code}")
        code = error_data.get("code")
        details = error_data.get("details")

        if response.status_code == 400:
            raise ValidationError(message, code, details)

        if response.status_code == 403:
            raise QuotaExceededError(message, code, details)

        if response.status_code == 404:
            raise QuestionNotFoundError(message, code=code, details=details)

        if response.status_code == 429:
            # Extract rate limit headers
            retry_after = response.headers.get("Retry-After")
            limit = response.headers.get("X-RateLimit-Limit")
            remaining = response.headers.get("X-RateLimit-Remaining")
            reset = response.headers.get("X-RateLimit-Reset")

            raise RateLimitError(
                message,
                retry_after=int(retry_after) if retry_after else None,
                limit=int(limit) if limit else None,
                remaining=int(remaining) if remaining else None,
                reset=int(reset) if reset else None,
                code=code,
                details=details,
            )

        if response.status_code >= 500:
            raise ServerError(message, response.status_code, code, details)

        # Unknown error
        raise AskHumanError(message, code, details)
