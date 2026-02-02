"""Tests for the agent questions handler."""

import json
from typing import Any
from unittest.mock import MagicMock, patch

from tests.conftest import make_get_event, make_post_event


class TestAgentQuestionsHandler:
    """Tests for the main agent questions handler."""

    @patch("src.handlers.agent_questions.save_question")
    def test_create_question_success(
        self,
        mock_save: MagicMock,
    ) -> None:
        """POST should create a question and return 201."""
        from src.handlers.agent_questions import handler

        event = make_post_event(
            "/agent/questions",
            {
                "prompt": "What is the best approach?",
                "type": "text",
                "min_responses": 5,
            },
        )

        response = handler(event, None)

        assert response["statusCode"] == 201
        body = json.loads(response["body"])
        assert "question_id" in body
        assert body["status"] == "OPEN"
        mock_save.assert_called_once()

    def test_create_question_missing_prompt(self) -> None:
        """POST without prompt should return 400."""
        from src.handlers.agent_questions import handler

        event = make_post_event(
            "/agent/questions",
            {"type": "text"},
        )

        response = handler(event, None)

        assert response["statusCode"] == 400
        body = json.loads(response["body"])
        assert body["error"]["code"] == "VALIDATION_ERROR"

    def test_create_question_invalid_type(self) -> None:
        """POST with invalid type should return 400."""
        from src.handlers.agent_questions import handler

        event = make_post_event(
            "/agent/questions",
            {
                "prompt": "Test question",
                "type": "invalid",
            },
        )

        response = handler(event, None)

        assert response["statusCode"] == 400

    @patch("src.handlers.agent_questions.get_question_with_responses")
    def test_get_question_success(
        self,
        mock_get: MagicMock,
        sample_question_data: dict[str, Any],
    ) -> None:
        """GET should return question with responses."""
        from src.handlers.agent_questions import handler
        from src.models.question import Question

        mock_question = Question(**sample_question_data)
        mock_get.return_value = (mock_question, [{"answer": "test"}])

        event = make_get_event(
            "/agent/questions/q_test123456",
            path_params={"question_id": "q_test123456"},
        )

        response = handler(event, None)

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["question_id"] == "q_test123456"
        assert body["responses"] == [{"answer": "test"}]

    @patch("src.handlers.agent_questions.get_question_with_responses")
    def test_get_question_not_found(
        self,
        mock_get: MagicMock,
    ) -> None:
        """GET for non-existent question should return 404."""
        from src.handlers.agent_questions import handler

        mock_get.return_value = (None, [])

        event = make_get_event(
            "/agent/questions/q_nonexistent",
            path_params={"question_id": "q_nonexistent"},
        )

        response = handler(event, None)

        assert response["statusCode"] == 404
        body = json.loads(response["body"])
        assert body["error"]["code"] == "QUESTION_NOT_FOUND"

    def test_unsupported_method(self) -> None:
        """Unsupported HTTP method should return 400."""
        from src.handlers.agent_questions import handler

        event = {
            "requestContext": {
                "http": {
                    "method": "DELETE",
                },
            },
        }

        response = handler(event, None)

        assert response["statusCode"] == 400
