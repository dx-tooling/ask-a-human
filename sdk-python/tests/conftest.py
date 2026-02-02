"""Pytest configuration and fixtures for Ask-a-Human SDK tests."""

from datetime import datetime, timezone

import pytest

from ask_a_human import AskHumanClient


@pytest.fixture
def client() -> AskHumanClient:
    """Create a test client."""
    return AskHumanClient(
        base_url="https://api.example.com",
        agent_id="test-agent",
    )


@pytest.fixture
def question_submission_response() -> dict:
    """Sample response for question submission."""
    return {
        "question_id": "q_test123",
        "status": "OPEN",
        "poll_url": "/agent/questions/q_test123",
        "expires_at": "2026-02-02T15:00:00Z",
        "created_at": "2026-02-02T14:00:00Z",
    }


@pytest.fixture
def question_response_open() -> dict:
    """Sample response for an open question with no responses."""
    return {
        "question_id": "q_test123",
        "status": "OPEN",
        "prompt": "Should this error message apologize?",
        "type": "text",
        "required_responses": 5,
        "current_responses": 0,
        "expires_at": "2026-02-02T15:00:00Z",
        "responses": [],
    }


@pytest.fixture
def question_response_partial() -> dict:
    """Sample response for a question with partial responses."""
    return {
        "question_id": "q_test123",
        "status": "PARTIAL",
        "prompt": "Should this error message apologize?",
        "type": "text",
        "required_responses": 5,
        "current_responses": 3,
        "expires_at": "2026-02-02T15:00:00Z",
        "responses": [
            {"answer": "Just state the facts.", "confidence": 4},
            {"answer": "A brief apology is fine.", "confidence": 3},
            {"answer": "Facts only.", "confidence": 5},
        ],
    }


@pytest.fixture
def question_response_closed() -> dict:
    """Sample response for a closed question."""
    return {
        "question_id": "q_test123",
        "status": "CLOSED",
        "prompt": "Should this error message apologize?",
        "type": "text",
        "required_responses": 5,
        "current_responses": 5,
        "expires_at": "2026-02-02T15:00:00Z",
        "closed_at": "2026-02-02T14:30:00Z",
        "responses": [
            {"answer": "Just state the facts.", "confidence": 4},
            {"answer": "A brief apology is fine.", "confidence": 3},
            {"answer": "Facts only.", "confidence": 5},
            {"answer": "Be clear and direct.", "confidence": 4},
            {"answer": "No apology needed.", "confidence": 4},
        ],
    }


@pytest.fixture
def question_response_mc_closed() -> dict:
    """Sample response for a closed multiple choice question."""
    return {
        "question_id": "q_mc123",
        "status": "CLOSED",
        "prompt": "Which button label is clearer?",
        "type": "multiple_choice",
        "options": ["Submit", "Send", "Confirm", "Done"],
        "required_responses": 10,
        "current_responses": 10,
        "expires_at": "2026-02-02T14:30:00Z",
        "closed_at": "2026-02-02T14:22:00Z",
        "responses": [
            {"selected_option": 0, "confidence": 4},
            {"selected_option": 2, "confidence": 5},
            {"selected_option": 0, "confidence": 3},
            {"selected_option": 0, "confidence": 4},
            {"selected_option": 2, "confidence": 4},
            {"selected_option": 0, "confidence": 5},
            {"selected_option": 3, "confidence": 2},
            {"selected_option": 0, "confidence": 4},
            {"selected_option": 2, "confidence": 4},
            {"selected_option": 0, "confidence": 5},
        ],
        "summary": {
            "Submit": 6,
            "Send": 0,
            "Confirm": 3,
            "Done": 1,
        },
    }


@pytest.fixture
def validation_error_response() -> dict:
    """Sample validation error response."""
    return {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "prompt must be between 10 and 2000 characters",
            "details": {
                "field": "prompt",
                "constraint": "length",
                "min": 10,
                "max": 2000,
            },
        }
    }


@pytest.fixture
def not_found_error_response() -> dict:
    """Sample not found error response."""
    return {
        "error": {
            "code": "QUESTION_NOT_FOUND",
            "message": "The requested question does not exist or has expired.",
        }
    }


@pytest.fixture
def rate_limit_error_response() -> dict:
    """Sample rate limit error response."""
    return {
        "error": {
            "code": "RATE_LIMITED",
            "message": "Rate limit exceeded. Please try again later.",
        }
    }
