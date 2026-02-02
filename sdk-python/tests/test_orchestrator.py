"""Tests for AskHumanOrchestrator."""

from unittest.mock import MagicMock, patch

import pytest

from ask_a_human import AskHumanClient, AskHumanOrchestrator
from ask_a_human.types import HumanResponse, QuestionResponse, QuestionSubmission


@pytest.fixture
def mock_client() -> MagicMock:
    """Create a mock client."""
    return MagicMock(spec=AskHumanClient)


@pytest.fixture
def orchestrator(mock_client: MagicMock) -> AskHumanOrchestrator:
    """Create an orchestrator with mock client."""
    return AskHumanOrchestrator(
        mock_client,
        poll_interval=0.01,  # Fast polling for tests
        max_backoff=0.05,
    )


@pytest.fixture
def sample_submission() -> QuestionSubmission:
    """Create a sample question submission."""
    return QuestionSubmission(
        question_id="q_test123",
        status="OPEN",
        poll_url="/agent/questions/q_test123",
        expires_at="2026-02-02T15:00:00Z",
    )


@pytest.fixture
def open_response() -> QuestionResponse:
    """Create an open question response."""
    return QuestionResponse(
        question_id="q_test123",
        status="OPEN",
        prompt="Test question",
        type="text",
        required_responses=5,
        current_responses=0,
        expires_at="2026-02-02T15:00:00Z",
        responses=[],
    )


@pytest.fixture
def partial_response() -> QuestionResponse:
    """Create a partial question response."""
    return QuestionResponse(
        question_id="q_test123",
        status="PARTIAL",
        prompt="Test question",
        type="text",
        required_responses=5,
        current_responses=3,
        expires_at="2026-02-02T15:00:00Z",
        responses=[
            HumanResponse(answer="Answer 1", confidence=4),
            HumanResponse(answer="Answer 2", confidence=5),
            HumanResponse(answer="Answer 3", confidence=3),
        ],
    )


@pytest.fixture
def closed_response() -> QuestionResponse:
    """Create a closed question response."""
    return QuestionResponse(
        question_id="q_test123",
        status="CLOSED",
        prompt="Test question",
        type="text",
        required_responses=5,
        current_responses=5,
        expires_at="2026-02-02T15:00:00Z",
        closed_at="2026-02-02T14:30:00Z",
        responses=[
            HumanResponse(answer="Answer 1", confidence=4),
            HumanResponse(answer="Answer 2", confidence=5),
            HumanResponse(answer="Answer 3", confidence=3),
            HumanResponse(answer="Answer 4", confidence=4),
            HumanResponse(answer="Answer 5", confidence=4),
        ],
    )


class TestAskHumanOrchestrator:
    """Tests for AskHumanOrchestrator."""

    def test_init(self, mock_client: MagicMock) -> None:
        """Test orchestrator initialization."""
        orchestrator = AskHumanOrchestrator(
            mock_client,
            poll_interval=15.0,
            max_backoff=120.0,
            backoff_multiplier=2.0,
        )
        assert orchestrator.client == mock_client
        assert orchestrator.poll_interval == 15.0
        assert orchestrator.max_backoff == 120.0
        assert orchestrator.backoff_multiplier == 2.0


class TestSubmit:
    """Tests for submit method."""

    def test_submit_delegates_to_client(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        sample_submission: QuestionSubmission,
    ) -> None:
        """Test that submit delegates to client."""
        mock_client.submit_question.return_value = sample_submission

        result = orchestrator.submit(
            prompt="Test question",
            type="text",
            min_responses=5,
        )

        assert result == sample_submission
        mock_client.submit_question.assert_called_once_with(
            prompt="Test question",
            type="text",
            options=None,
            audience=None,
            min_responses=5,
            timeout_seconds=3600,
            idempotency_key=None,
        )


class TestPollOnce:
    """Tests for poll_once method."""

    def test_poll_once_single_question(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        partial_response: QuestionResponse,
    ) -> None:
        """Test polling a single question."""
        mock_client.get_question.return_value = partial_response

        results = orchestrator.poll_once(["q_test123"])

        assert "q_test123" in results
        assert results["q_test123"].status == "PARTIAL"
        mock_client.get_question.assert_called_once_with("q_test123")

    def test_poll_once_multiple_questions(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        open_response: QuestionResponse,
        partial_response: QuestionResponse,
    ) -> None:
        """Test polling multiple questions."""
        # Create a second response with different ID
        second_response = QuestionResponse(
            question_id="q_test456",
            status="PARTIAL",
            prompt="Second question",
            type="text",
            required_responses=5,
            current_responses=2,
            expires_at="2026-02-02T15:00:00Z",
            responses=[],
        )

        mock_client.get_question.side_effect = [open_response, second_response]

        results = orchestrator.poll_once(["q_test123", "q_test456"])

        assert len(results) == 2
        assert "q_test123" in results
        assert "q_test456" in results
        assert mock_client.get_question.call_count == 2


class TestAwaitResponses:
    """Tests for await_responses method."""

    def test_await_returns_immediately_when_closed(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        closed_response: QuestionResponse,
    ) -> None:
        """Test that await_responses returns immediately for closed questions."""
        mock_client.get_question.return_value = closed_response

        results = orchestrator.await_responses(["q_test123"], min_responses=5)

        assert results["q_test123"].status == "CLOSED"
        # Should only poll once since question is already closed
        assert mock_client.get_question.call_count == 1

    def test_await_returns_when_min_responses_reached(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        partial_response: QuestionResponse,
    ) -> None:
        """Test await returns when min_responses is reached."""
        mock_client.get_question.return_value = partial_response

        # Wait for 3 responses (partial_response has 3)
        results = orchestrator.await_responses(["q_test123"], min_responses=3)

        assert results["q_test123"].current_responses == 3
        # Should return after first poll since we have 3 responses
        assert mock_client.get_question.call_count == 1

    @patch("ask_a_human.orchestrator.time.sleep")
    def test_await_polls_until_responses(
        self,
        mock_sleep: MagicMock,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        open_response: QuestionResponse,
        partial_response: QuestionResponse,
        closed_response: QuestionResponse,
    ) -> None:
        """Test await polls until responses arrive."""
        # Simulate: OPEN -> PARTIAL -> CLOSED
        mock_client.get_question.side_effect = [
            open_response,
            partial_response,
            closed_response,
        ]

        results = orchestrator.await_responses(["q_test123"], min_responses=5, timeout=10)

        assert results["q_test123"].status == "CLOSED"
        assert mock_client.get_question.call_count == 3

    @patch("ask_a_human.orchestrator.time.sleep")
    @patch("ask_a_human.orchestrator.time.time")
    def test_await_respects_timeout(
        self,
        mock_time: MagicMock,
        mock_sleep: MagicMock,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        open_response: QuestionResponse,
    ) -> None:
        """Test await respects timeout."""
        mock_client.get_question.return_value = open_response

        # Simulate time passing
        mock_time.side_effect = [0, 0.5, 1.0, 1.5, 2.0]  # 2 seconds total

        results = orchestrator.await_responses(["q_test123"], min_responses=5, timeout=1.0)

        # Should return partial results on timeout
        assert results["q_test123"].status == "OPEN"

    def test_await_returns_expired_immediately(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
    ) -> None:
        """Test await returns immediately for expired questions."""
        expired_response = QuestionResponse(
            question_id="q_test123",
            status="EXPIRED",
            prompt="Test question",
            type="text",
            required_responses=5,
            current_responses=2,
            expires_at="2026-02-02T15:00:00Z",
            responses=[],
        )
        mock_client.get_question.return_value = expired_response

        results = orchestrator.await_responses(["q_test123"], min_responses=5)

        assert results["q_test123"].status == "EXPIRED"
        assert mock_client.get_question.call_count == 1


class TestSubmitAndWait:
    """Tests for submit_and_wait method."""

    def test_submit_and_wait(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        sample_submission: QuestionSubmission,
        closed_response: QuestionResponse,
    ) -> None:
        """Test submit_and_wait combines submit and await."""
        mock_client.submit_question.return_value = sample_submission
        mock_client.get_question.return_value = closed_response

        result = orchestrator.submit_and_wait(
            prompt="Test question",
            type="text",
            min_responses=5,
        )

        assert result.status == "CLOSED"
        mock_client.submit_question.assert_called_once()
        mock_client.get_question.assert_called_once()

    def test_submit_and_wait_custom_timeout(
        self,
        orchestrator: AskHumanOrchestrator,
        mock_client: MagicMock,
        sample_submission: QuestionSubmission,
        closed_response: QuestionResponse,
    ) -> None:
        """Test submit_and_wait with custom wait timeout."""
        mock_client.submit_question.return_value = sample_submission
        mock_client.get_question.return_value = closed_response

        result = orchestrator.submit_and_wait(
            prompt="Test question",
            type="text",
            min_responses=5,
            timeout_seconds=3600,
            wait_timeout=300,  # Only wait 5 minutes
        )

        assert result.status == "CLOSED"
