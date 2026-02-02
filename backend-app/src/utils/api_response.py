"""
Standardized API response helpers for Lambda handlers.
Reference: ADR-03 API Design
"""

import json
from typing import Any


def success(body: dict | list, status_code: int = 200) -> dict:
    """Return a successful API response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(body),
    }


def created(body: dict) -> dict:
    """Return a 201 Created response."""
    return success(body, status_code=201)


def error(code: str, message: str, status_code: int = 400, details: dict | None = None) -> dict:
    """
    Return an error response in the standard format.
    
    Error format from ADR-03:
    {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Human readable message",
            "details": { ... }  # optional
        }
    }
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


def validation_error(message: str, details: dict | None = None) -> dict:
    """Return a 400 validation error."""
    return error("VALIDATION_ERROR", message, status_code=400, details=details)


def not_found(message: str = "Resource not found") -> dict:
    """Return a 404 not found error."""
    return error("NOT_FOUND", message, status_code=404)


def question_not_found() -> dict:
    """Return a 404 error for missing question."""
    return error(
        "QUESTION_NOT_FOUND",
        "The requested question does not exist or has expired.",
        status_code=404,
    )


def already_answered() -> dict:
    """Return a 409 conflict error when user already answered."""
    return error(
        "ALREADY_ANSWERED",
        "You have already answered this question.",
        status_code=409,
    )


def question_closed() -> dict:
    """Return a 410 gone error when question is closed or expired."""
    return error(
        "QUESTION_CLOSED",
        "This question is no longer accepting responses.",
        status_code=410,
    )


def server_error(message: str = "An internal error occurred") -> dict:
    """Return a 500 server error."""
    return error("SERVER_ERROR", message, status_code=500)
