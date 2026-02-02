"""Standardized API response helpers for Lambda handlers.

Reference: ADR-03 API Design
"""

import json
from typing import Any


def success(body: dict[str, Any] | list[Any], status_code: int = 200) -> dict[str, Any]:
    """Return a successful API response.

    Args:
        body: Response body as dict or list.
        status_code: HTTP status code (default 200).

    Returns:
        API Gateway response dictionary.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def created(body: dict[str, Any]) -> dict[str, Any]:
    """Return a 201 Created response.

    Args:
        body: Response body as dict.

    Returns:
        API Gateway response dictionary with 201 status.
    """
    return success(body, status_code=201)


def error(
    code: str,
    message: str,
    status_code: int = 400,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return an error response in the standard format.

    Error format from ADR-03:
    {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Human readable message",
            "details": { ... }  # optional
        }
    }

    Args:
        code: Error code string.
        message: Human-readable error message.
        status_code: HTTP status code (default 400).
        details: Optional additional error details.

    Returns:
        API Gateway error response dictionary.
    """
    error_body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details:
        error_body["error"]["details"] = details

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(error_body),
    }


def validation_error(message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return a 400 validation error.

    Args:
        message: Error message.
        details: Optional validation error details.

    Returns:
        API Gateway validation error response.
    """
    return error("VALIDATION_ERROR", message, status_code=400, details=details)


def not_found(message: str = "Resource not found") -> dict[str, Any]:
    """Return a 404 not found error.

    Args:
        message: Error message.

    Returns:
        API Gateway 404 response.
    """
    return error("NOT_FOUND", message, status_code=404)


def question_not_found() -> dict[str, Any]:
    """Return a 404 error for missing question.

    Returns:
        API Gateway 404 response for missing question.
    """
    return error(
        "QUESTION_NOT_FOUND",
        "The requested question does not exist or has expired.",
        status_code=404,
    )


def already_answered() -> dict[str, Any]:
    """Return a 409 conflict error when user already answered.

    Returns:
        API Gateway 409 conflict response.
    """
    return error(
        "ALREADY_ANSWERED",
        "You have already answered this question.",
        status_code=409,
    )


def question_closed() -> dict[str, Any]:
    """Return a 410 gone error when question is closed or expired.

    Returns:
        API Gateway 410 gone response.
    """
    return error(
        "QUESTION_CLOSED",
        "This question is no longer accepting responses.",
        status_code=410,
    )


def server_error(message: str = "An internal error occurred") -> dict[str, Any]:
    """Return a 500 server error.

    Args:
        message: Error message.

    Returns:
        API Gateway 500 server error response.
    """
    return error("SERVER_ERROR", message, status_code=500)
