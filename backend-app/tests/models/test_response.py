"""Tests for the Response model."""

from typing import Any
from unittest.mock import MagicMock, patch

from src.models.response import Response, generate_response_id


class TestGenerateResponseId:
    """Tests for response ID generation."""

    def test_generates_prefixed_id(self) -> None:
        """Response IDs should start with 'r_' prefix."""
        response_id = generate_response_id()
        assert response_id.startswith("r_")

    def test_generates_unique_ids(self) -> None:
        """Each call should generate a unique ID."""
        ids = {generate_response_id() for _ in range(100)}
        assert len(ids) == 100


class TestResponseModel:
    """Tests for the Response dataclass."""

    def test_create_text_response(self) -> None:
        """Create should generate a valid text response."""
        response = Response.create(
            question_id="q_test123456",
            answer="My answer to the question",
            confidence=4,
        )

        assert response.response_id.startswith("r_")
        assert response.question_id == "q_test123456"
        assert response.answer == "My answer to the question"
        assert response.confidence == 4
        assert response.selected_option is None

    def test_create_multiple_choice_response(self) -> None:
        """Create should generate a valid multiple choice response."""
        response = Response.create(
            question_id="q_test123456",
            selected_option=2,
        )

        assert response.selected_option == 2
        assert response.answer is None

    def test_to_dynamo_item(self, sample_response_data: dict[str, Any]) -> None:
        """to_dynamo_item should serialize response correctly."""
        response = Response(**sample_response_data)
        item = response.to_dynamo_item()

        assert item["question_id"] == sample_response_data["question_id"]
        assert item["response_id"] == sample_response_data["response_id"]
        assert item["answer"] == sample_response_data["answer"]

    def test_from_dynamo_item(self, sample_response_data: dict[str, Any]) -> None:
        """from_dynamo_item should deserialize response correctly."""
        response = Response.from_dynamo_item(sample_response_data)

        assert response.question_id == sample_response_data["question_id"]
        assert response.response_id == sample_response_data["response_id"]
        assert response.answer == sample_response_data["answer"]

    def test_to_api_response(self, sample_response_data: dict[str, Any]) -> None:
        """to_api_response should format response for API."""
        response = Response(**sample_response_data)
        api_response = response.to_api_response()

        assert api_response["response_id"] == sample_response_data["response_id"]
        assert api_response["points_earned"] == 10  # Placeholder value


class TestResponseDatabaseOperations:
    """Tests for response database operations."""

    @patch("src.models.response.get_responses_table")
    def test_save_response(
        self,
        mock_get_table: MagicMock,
    ) -> None:
        """save_response should call DynamoDB put_item."""
        from src.models.response import save_response

        mock_table = MagicMock()
        mock_get_table.return_value = mock_table

        response = Response.create(
            question_id="q_test123456",
            answer="Test answer",
        )
        save_response(response)

        mock_table.put_item.assert_called_once()
