"""Tests for the human API handler."""

import json
from typing import Any
from unittest.mock import MagicMock, patch

from tests.conftest import make_get_event, make_post_event


class TestHumanApiHandler:
    """Tests for the main human API handler."""

    @patch("src.handlers.human_api.list_open_questions")
    def test_list_questions_success(
        self,
        mock_list: MagicMock,
        sample_question_data: dict[str, Any],
    ) -> None:
        """GET /human/questions should return list of open questions."""
        from src.handlers.human_api import handler
        from src.models.question import Question

        mock_question = Question(**sample_question_data)
        mock_list.return_value = [mock_question]

        event = make_get_event("/human/questions")

        response = handler(event, None)

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert "questions" in body
        assert len(body["questions"]) == 1

    @patch("src.handlers.human_api.get_question")
    def test_get_question_success(
        self,
        mock_get: MagicMock,
        sample_question_data: dict[str, Any],
    ) -> None:
        """GET /human/questions/{id} should return question details."""
        from src.handlers.human_api import handler
        from src.models.question import Question

        mock_question = Question(**sample_question_data)
        mock_get.return_value = mock_question

        event = make_get_event(
            "/human/questions/q_test123456",
            path_params={"question_id": "q_test123456"},
        )

        response = handler(event, None)

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["question_id"] == "q_test123456"
        assert body["can_answer"] is True

    @patch("src.handlers.human_api.get_question")
    def test_get_question_not_found(
        self,
        mock_get: MagicMock,
    ) -> None:
        """GET for non-existent question should return 404."""
        from src.handlers.human_api import handler

        mock_get.return_value = None

        event = make_get_event(
            "/human/questions/q_nonexistent",
            path_params={"question_id": "q_nonexistent"},
        )

        response = handler(event, None)

        assert response["statusCode"] == 404

    @patch("src.handlers.human_api.update_question_status")
    @patch("src.handlers.human_api.save_response")
    @patch("src.handlers.human_api.get_question")
    def test_submit_response_success(
        self,
        mock_get_question: MagicMock,
        mock_save_response: MagicMock,  # noqa: ARG002
        mock_update_status: MagicMock,
        sample_question_data: dict[str, Any],
    ) -> None:
        """POST /human/responses should submit answer and return 201."""
        from src.handlers.human_api import handler
        from src.models.question import Question

        mock_question = Question(**sample_question_data)
        mock_get_question.return_value = mock_question
        mock_update_status.return_value = "PARTIAL"

        event = make_post_event(
            "/human/responses",
            {
                "question_id": "q_test123456",
                "answer": "This is my answer",
                "confidence": 4,
            },
        )

        response = handler(event, None)

        assert response["statusCode"] == 201
        body = json.loads(response["body"])
        assert "response_id" in body
        assert body["points_earned"] == 10

    @patch("src.handlers.human_api.get_question")
    def test_submit_response_question_not_found(
        self,
        mock_get: MagicMock,
    ) -> None:
        """POST to non-existent question should return 404."""
        from src.handlers.human_api import handler

        mock_get.return_value = None

        event = make_post_event(
            "/human/responses",
            {
                "question_id": "q_nonexistent",
                "answer": "Test",
            },
        )

        response = handler(event, None)

        assert response["statusCode"] == 404

    @patch("src.handlers.human_api.get_question")
    def test_submit_response_question_closed(
        self,
        mock_get: MagicMock,
        sample_question_data: dict[str, Any],
    ) -> None:
        """POST to closed question should return 410."""
        from src.handlers.human_api import handler
        from src.models.question import Question

        sample_question_data["status"] = "CLOSED"
        mock_question = Question(**sample_question_data)
        mock_get.return_value = mock_question

        event = make_post_event(
            "/human/responses",
            {
                "question_id": "q_test123456",
                "answer": "Test",
            },
        )

        response = handler(event, None)

        assert response["statusCode"] == 410

    def test_submit_response_missing_question_id(self) -> None:
        """POST without question_id should return 400."""
        from src.handlers.human_api import handler

        event = make_post_event(
            "/human/responses",
            {"answer": "Test answer"},
        )

        response = handler(event, None)

        assert response["statusCode"] == 400
        body = json.loads(response["body"])
        assert body["error"]["code"] == "VALIDATION_ERROR"
