"""Tests for the Question model."""

from typing import Any
from unittest.mock import MagicMock, patch

from src.models.question import Question, generate_question_id


class TestGenerateQuestionId:
    """Tests for question ID generation."""

    def test_generates_prefixed_id(self) -> None:
        """Question IDs should start with 'q_' prefix."""
        question_id = generate_question_id()
        assert question_id.startswith("q_")

    def test_generates_unique_ids(self) -> None:
        """Each call should generate a unique ID."""
        ids = {generate_question_id() for _ in range(100)}
        assert len(ids) == 100


class TestQuestionModel:
    """Tests for the Question dataclass."""

    def test_create_text_question(self) -> None:
        """Create should generate a valid text question."""
        question = Question.create(
            prompt="Test question?",
            question_type="text",
            min_responses=5,
            timeout_seconds=3600,
        )

        assert question.question_id.startswith("q_")
        assert question.prompt == "Test question?"
        assert question.type == "text"
        assert question.status == "OPEN"
        assert question.min_responses == 5
        assert question.current_responses == 0
        assert question.options is None

    def test_create_multiple_choice_question(self) -> None:
        """Create should generate a valid multiple choice question."""
        options = ["A", "B", "C"]
        question = Question.create(
            prompt="Choose one",
            question_type="multiple_choice",
            options=options,
        )

        assert question.type == "multiple_choice"
        assert question.options == options

    def test_to_dynamo_item(self, sample_question_data: dict[str, Any]) -> None:
        """to_dynamo_item should serialize question correctly."""
        question = Question(**sample_question_data)
        item = question.to_dynamo_item()

        assert item["question_id"] == sample_question_data["question_id"]
        assert item["prompt"] == sample_question_data["prompt"]
        assert item["type"] == sample_question_data["type"]
        assert item["status"] == sample_question_data["status"]

    def test_from_dynamo_item(self, sample_question_data: dict[str, Any]) -> None:
        """from_dynamo_item should deserialize question correctly."""
        question = Question.from_dynamo_item(sample_question_data)

        assert question.question_id == sample_question_data["question_id"]
        assert question.prompt == sample_question_data["prompt"]
        assert question.type == sample_question_data["type"]

    def test_to_agent_response(self, sample_question_data: dict[str, Any]) -> None:
        """to_agent_response should format response for agent API."""
        question = Question(**sample_question_data)
        response = question.to_agent_response(responses=[{"answer": "test"}])

        assert response["question_id"] == sample_question_data["question_id"]
        assert response["status"] == "OPEN"
        assert response["responses"] == [{"answer": "test"}]

    def test_to_human_list_item(self, sample_question_data: dict[str, Any]) -> None:
        """to_human_list_item should format response for human list API."""
        question = Question(**sample_question_data)
        item = question.to_human_list_item()

        assert item["question_id"] == sample_question_data["question_id"]
        assert item["prompt"] == sample_question_data["prompt"]
        assert "responses_needed" in item


class TestQuestionDatabaseOperations:
    """Tests for question database operations."""

    @patch("src.models.question.get_questions_table")
    def test_save_question(
        self,
        mock_get_table: MagicMock,
    ) -> None:
        """save_question should call DynamoDB put_item."""
        from src.models.question import save_question

        mock_table = MagicMock()
        mock_get_table.return_value = mock_table

        question = Question.create(prompt="Test?", question_type="text")
        save_question(question)

        mock_table.put_item.assert_called_once()

    @patch("src.models.question.get_questions_table")
    def test_get_question_found(
        self,
        mock_get_table: MagicMock,
        sample_question_data: dict[str, Any],
    ) -> None:
        """get_question should return question when found."""
        from src.models.question import get_question

        mock_table = MagicMock()
        mock_table.get_item.return_value = {"Item": sample_question_data}
        mock_get_table.return_value = mock_table

        question = get_question("q_test123456")

        assert question is not None
        assert question.question_id == "q_test123456"

    @patch("src.models.question.get_questions_table")
    def test_get_question_not_found(
        self,
        mock_get_table: MagicMock,
    ) -> None:
        """get_question should return None when not found."""
        from src.models.question import get_question

        mock_table = MagicMock()
        mock_table.get_item.return_value = {}
        mock_get_table.return_value = mock_table

        question = get_question("q_nonexistent")

        assert question is None
