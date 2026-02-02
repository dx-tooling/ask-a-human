"""Custom exceptions for Ask-a-Human SDK.

This module defines the exception hierarchy for handling API errors.
All exceptions inherit from AskHumanError for easy catching.

Example:
    >>> from ask_a_human.exceptions import AskHumanError, RateLimitError
    >>> try:
    ...     client.submit_question(...)
    ... except RateLimitError as e:
    ...     print(f"Rate limited, retry after: {e.retry_after}")
    ... except AskHumanError as e:
    ...     print(f"API error: {e}")
"""

from typing import Any


class AskHumanError(Exception):
    """Base exception for all Ask-a-Human errors.

    All SDK exceptions inherit from this class, making it easy to catch
    any Ask-a-Human related error.

    Attributes:
        message: Human-readable error message.
        code: Error code from the API (if available).
        details: Additional error details from the API (if available).

    Example:
        >>> try:
        ...     client.submit_question(...)
        ... except AskHumanError as e:
        ...     print(f"Error: {e.message}")
        ...     if e.code:
        ...         print(f"Code: {e.code}")
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize the exception.

        Args:
            message: Human-readable error message.
            code: Error code from the API.
            details: Additional error details.
        """
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def __str__(self) -> str:
        """Return string representation of the error."""
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class ValidationError(AskHumanError):
    """Raised when the request is invalid (HTTP 400).

    This error occurs when the request body fails validation,
    such as missing required fields or invalid values.

    Attributes:
        field: The field that failed validation (if available).
        constraint: The constraint that was violated (if available).

    Example:
        >>> try:
        ...     client.submit_question(prompt="Hi", type="text")  # Too short
        ... except ValidationError as e:
        ...     print(f"Invalid field: {e.field}")
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize the validation error.

        Args:
            message: Human-readable error message.
            code: Error code (usually 'VALIDATION_ERROR').
            details: Additional details including field and constraint info.
        """
        super().__init__(message, code or "VALIDATION_ERROR", details)
        self.field = details.get("field") if details else None
        self.constraint = details.get("constraint") if details else None


class QuestionNotFoundError(AskHumanError):
    """Raised when a question is not found (HTTP 404).

    This error occurs when trying to retrieve a question that doesn't exist
    or has been deleted.

    Attributes:
        question_id: The question ID that was not found.

    Example:
        >>> try:
        ...     client.get_question("q_nonexistent")
        ... except QuestionNotFoundError as e:
        ...     print(f"Question not found: {e.question_id}")
    """

    def __init__(
        self,
        message: str,
        question_id: str | None = None,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize the not found error.

        Args:
            message: Human-readable error message.
            question_id: The question ID that was not found.
            code: Error code (usually 'QUESTION_NOT_FOUND').
            details: Additional error details.
        """
        super().__init__(message, code or "QUESTION_NOT_FOUND", details)
        self.question_id = question_id


class RateLimitError(AskHumanError):
    """Raised when rate limit is exceeded (HTTP 429).

    This error occurs when too many requests have been made.
    Check the `retry_after` attribute to know when to retry.

    Attributes:
        retry_after: Seconds to wait before retrying (if provided by API).
        limit: The rate limit ceiling.
        remaining: Remaining requests in the current window.
        reset: Unix timestamp when the limit resets.

    Example:
        >>> try:
        ...     client.submit_question(...)
        ... except RateLimitError as e:
        ...     if e.retry_after:
        ...         time.sleep(e.retry_after)
        ...         # Retry the request
    """

    def __init__(
        self,
        message: str,
        retry_after: int | None = None,
        limit: int | None = None,
        remaining: int | None = None,
        reset: int | None = None,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize the rate limit error.

        Args:
            message: Human-readable error message.
            retry_after: Seconds to wait before retrying.
            limit: Rate limit ceiling.
            remaining: Remaining requests.
            reset: Unix timestamp when limit resets.
            code: Error code (usually 'RATE_LIMITED').
            details: Additional error details.
        """
        super().__init__(message, code or "RATE_LIMITED", details)
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining
        self.reset = reset


class ServerError(AskHumanError):
    """Raised when the server returns a 5xx error.

    This error indicates a server-side problem. The request can typically
    be retried after a short delay.

    Attributes:
        status_code: The HTTP status code (500, 502, 503, etc.).

    Example:
        >>> try:
        ...     client.submit_question(...)
        ... except ServerError as e:
        ...     print(f"Server error (HTTP {e.status_code}): {e}")
        ...     # Implement retry logic
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize the server error.

        Args:
            message: Human-readable error message.
            status_code: HTTP status code.
            code: Error code (usually 'SERVER_ERROR').
            details: Additional error details.
        """
        super().__init__(message, code or "SERVER_ERROR", details)
        self.status_code = status_code


class QuotaExceededError(AskHumanError):
    """Raised when the agent has too many concurrent questions (HTTP 403).

    This error occurs when the agent has reached its limit of concurrent
    open questions. Wait for some questions to close before submitting more.

    Example:
        >>> try:
        ...     client.submit_question(...)
        ... except QuotaExceededError as e:
        ...     print("Too many open questions, wait for some to close")
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize the quota exceeded error.

        Args:
            message: Human-readable error message.
            code: Error code (usually 'AGENT_QUOTA_EXCEEDED').
            details: Additional error details.
        """
        super().__init__(message, code or "AGENT_QUOTA_EXCEEDED", details)
