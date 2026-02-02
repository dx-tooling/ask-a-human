"""Pytest configuration and fixtures for backend tests."""

import json
import os
from typing import Any
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_env_vars() -> None:
    """Set required environment variables for all tests."""
    os.environ["QUESTIONS_TABLE"] = "test-questions"
    os.environ["RESPONSES_TABLE"] = "test-responses"


@pytest.fixture
def mock_dynamodb_tables() -> Any:
    """Mock DynamoDB tables for testing."""
    with patch("src.utils.dynamodb.get_dynamodb_resource") as mock_resource:
        mock_questions_table = MagicMock()
        mock_responses_table = MagicMock()

        # Configure the mock resource to return mock tables
        mock_resource.return_value.Table.side_effect = lambda name: (
            mock_questions_table if "questions" in name else mock_responses_table
        )

        yield {
            "questions": mock_questions_table,
            "responses": mock_responses_table,
        }


@pytest.fixture
def sample_question_data() -> dict[str, Any]:
    """Sample question data for testing."""
    return {
        "question_id": "q_test123456",
        "prompt": "What is the best approach for this feature?",
        "type": "text",
        "status": "OPEN",
        "min_responses": 5,
        "current_responses": 0,
        "created_at": "2026-02-02T12:00:00+00:00",
        "expires_at": "2026-02-02T13:00:00+00:00",
        "audience": ["general"],
    }


@pytest.fixture
def sample_multiple_choice_question_data() -> dict[str, Any]:
    """Sample multiple choice question data for testing."""
    return {
        "question_id": "q_mc_test1234",
        "prompt": "Which option do you prefer?",
        "type": "multiple_choice",
        "status": "OPEN",
        "min_responses": 3,
        "current_responses": 0,
        "created_at": "2026-02-02T12:00:00+00:00",
        "expires_at": "2026-02-02T13:00:00+00:00",
        "options": ["Option A", "Option B", "Option C"],
        "audience": ["technical"],
    }


@pytest.fixture
def sample_response_data() -> dict[str, Any]:
    """Sample response data for testing."""
    return {
        "question_id": "q_test123456",
        "response_id": "r_resp123456",
        "created_at": "2026-02-02T12:30:00+00:00",
        "answer": "I think we should use approach X because...",
        "confidence": 4,
    }


@pytest.fixture
def api_gateway_event() -> dict[str, Any]:
    """Base API Gateway HTTP API event structure."""
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": "/",
        "rawQueryString": "",
        "headers": {
            "content-type": "application/json",
        },
        "requestContext": {
            "http": {
                "method": "GET",
                "path": "/",
            },
        },
        "body": None,
        "isBase64Encoded": False,
    }


def make_post_event(path: str, body: dict[str, Any]) -> dict[str, Any]:
    """Create a POST event for testing handlers."""
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {
            "content-type": "application/json",
        },
        "requestContext": {
            "http": {
                "method": "POST",
                "path": path,
            },
        },
        "body": json.dumps(body),
        "isBase64Encoded": False,
    }


def make_get_event(
    path: str,
    path_params: dict[str, str] | None = None,
    query_params: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Create a GET event for testing handlers."""
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {
            "content-type": "application/json",
        },
        "requestContext": {
            "http": {
                "method": "GET",
                "path": path,
            },
        },
        "pathParameters": path_params,
        "queryStringParameters": query_params,
        "body": None,
        "isBase64Encoded": False,
    }
