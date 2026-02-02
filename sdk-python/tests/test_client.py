"""Tests for AskHumanClient."""

import pytest
from pytest_httpx import HTTPXMock

from ask_a_human import AskHumanClient
from ask_a_human.exceptions import (
    QuestionNotFoundError,
    QuotaExceededError,
    RateLimitError,
    ServerError,
    ValidationError,
)


class TestAskHumanClient:
    """Tests for AskHumanClient."""

    def test_init_defaults(self) -> None:
        """Test client initialization with defaults."""
        client = AskHumanClient(agent_id="test")
        assert client.base_url == "https://api.ask-a-human.com"
        assert client.agent_id == "test"
        assert client.timeout == 30.0
        client.close()

    def test_init_custom_values(self) -> None:
        """Test client initialization with custom values."""
        client = AskHumanClient(
            base_url="https://custom.example.com",
            agent_id="custom-agent",
            timeout=60.0,
        )
        assert client.base_url == "https://custom.example.com"
        assert client.agent_id == "custom-agent"
        assert client.timeout == 60.0
        client.close()

    def test_context_manager(self) -> None:
        """Test client as context manager."""
        with AskHumanClient(agent_id="test") as client:
            assert client.agent_id == "test"


class TestSubmitQuestion:
    """Tests for submit_question method."""

    def test_submit_text_question(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_submission_response: dict,
    ) -> None:
        """Test submitting a text question."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json=question_submission_response,
            status_code=201,
        )

        result = client.submit_question(
            prompt="Should this error message apologize to the user?",
            type="text",
            min_responses=5,
        )

        assert result.question_id == "q_test123"
        assert result.status == "OPEN"
        assert result.poll_url == "/agent/questions/q_test123"

        # Verify request
        request = httpx_mock.get_request()
        assert request is not None
        assert request.headers["X-Agent-Id"] == "test-agent"

    def test_submit_multiple_choice_question(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_submission_response: dict,
    ) -> None:
        """Test submitting a multiple choice question."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json=question_submission_response,
            status_code=201,
        )

        result = client.submit_question(
            prompt="Which button label is clearer?",
            type="multiple_choice",
            options=["Submit", "Send", "Confirm"],
            min_responses=10,
        )

        assert result.question_id == "q_test123"

    def test_submit_with_audience(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_submission_response: dict,
    ) -> None:
        """Test submitting a question with audience tags."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json=question_submission_response,
            status_code=201,
        )

        result = client.submit_question(
            prompt="Should this error message apologize to the user?",
            type="text",
            audience=["product", "creative"],
            min_responses=5,
        )

        assert result.question_id == "q_test123"

    def test_submit_validation_error(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        validation_error_response: dict,
    ) -> None:
        """Test validation error handling."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json=validation_error_response,
            status_code=400,
        )

        with pytest.raises(ValidationError) as exc_info:
            client.submit_question(prompt="Too short", type="text")

        assert exc_info.value.code == "VALIDATION_ERROR"
        assert exc_info.value.field == "prompt"

    def test_submit_rate_limit_error(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        rate_limit_error_response: dict,
    ) -> None:
        """Test rate limit error handling."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json=rate_limit_error_response,
            status_code=429,
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": "1706886000",
            },
        )

        with pytest.raises(RateLimitError) as exc_info:
            client.submit_question(
                prompt="Should this error message apologize?",
                type="text",
            )

        assert exc_info.value.retry_after == 60
        assert exc_info.value.limit == 100
        assert exc_info.value.remaining == 0

    def test_submit_quota_exceeded_error(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
    ) -> None:
        """Test quota exceeded error handling."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json={
                "error": {
                    "code": "AGENT_QUOTA_EXCEEDED",
                    "message": "Too many concurrent questions",
                }
            },
            status_code=403,
        )

        with pytest.raises(QuotaExceededError) as exc_info:
            client.submit_question(
                prompt="Should this error message apologize?",
                type="text",
            )

        assert exc_info.value.code == "AGENT_QUOTA_EXCEEDED"

    def test_submit_server_error(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
    ) -> None:
        """Test server error handling."""
        httpx_mock.add_response(
            method="POST",
            url="https://api.example.com/agent/questions",
            json={"error": {"code": "SERVER_ERROR", "message": "Internal error"}},
            status_code=500,
        )

        with pytest.raises(ServerError) as exc_info:
            client.submit_question(
                prompt="Should this error message apologize?",
                type="text",
            )

        assert exc_info.value.status_code == 500


class TestGetQuestion:
    """Tests for get_question method."""

    def test_get_open_question(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_response_open: dict,
    ) -> None:
        """Test getting an open question."""
        httpx_mock.add_response(
            method="GET",
            url="https://api.example.com/agent/questions/q_test123",
            json=question_response_open,
        )

        result = client.get_question("q_test123")

        assert result.question_id == "q_test123"
        assert result.status == "OPEN"
        assert result.current_responses == 0
        assert len(result.responses) == 0

    def test_get_partial_question(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_response_partial: dict,
    ) -> None:
        """Test getting a question with partial responses."""
        httpx_mock.add_response(
            method="GET",
            url="https://api.example.com/agent/questions/q_test123",
            json=question_response_partial,
        )

        result = client.get_question("q_test123")

        assert result.question_id == "q_test123"
        assert result.status == "PARTIAL"
        assert result.current_responses == 3
        assert len(result.responses) == 3
        assert result.responses[0].answer == "Just state the facts."
        assert result.responses[0].confidence == 4

    def test_get_closed_question(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_response_closed: dict,
    ) -> None:
        """Test getting a closed question."""
        httpx_mock.add_response(
            method="GET",
            url="https://api.example.com/agent/questions/q_test123",
            json=question_response_closed,
        )

        result = client.get_question("q_test123")

        assert result.question_id == "q_test123"
        assert result.status == "CLOSED"
        assert result.current_responses == 5
        assert result.closed_at is not None

    def test_get_multiple_choice_question(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        question_response_mc_closed: dict,
    ) -> None:
        """Test getting a multiple choice question."""
        httpx_mock.add_response(
            method="GET",
            url="https://api.example.com/agent/questions/q_mc123",
            json=question_response_mc_closed,
        )

        result = client.get_question("q_mc123")

        assert result.question_id == "q_mc123"
        assert result.type == "multiple_choice"
        assert result.options == ["Submit", "Send", "Confirm", "Done"]
        assert result.summary is not None
        assert result.summary["Submit"] == 6
        assert result.responses[0].selected_option == 0

    def test_get_question_not_found(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        not_found_error_response: dict,
    ) -> None:
        """Test getting a non-existent question."""
        httpx_mock.add_response(
            method="GET",
            url="https://api.example.com/agent/questions/q_nonexistent",
            json=not_found_error_response,
            status_code=404,
        )

        with pytest.raises(QuestionNotFoundError) as exc_info:
            client.get_question("q_nonexistent")

        assert exc_info.value.question_id == "q_nonexistent"
        assert exc_info.value.code == "QUESTION_NOT_FOUND"

    def test_get_question_rate_limit(
        self,
        httpx_mock: HTTPXMock,
        client: AskHumanClient,
        rate_limit_error_response: dict,
    ) -> None:
        """Test rate limit when getting a question."""
        httpx_mock.add_response(
            method="GET",
            url="https://api.example.com/agent/questions/q_test123",
            json=rate_limit_error_response,
            status_code=429,
        )

        with pytest.raises(RateLimitError):
            client.get_question("q_test123")
