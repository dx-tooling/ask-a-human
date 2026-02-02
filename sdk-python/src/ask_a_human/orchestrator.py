"""High-level orchestration for Ask-a-Human.

This module provides the AskHumanOrchestrator class which handles polling,
timeouts, and exponential backoff for async human-in-the-loop workflows.

Example:
    >>> from ask_a_human import AskHumanClient, AskHumanOrchestrator
    >>> client = AskHumanClient(agent_id="my-agent")
    >>> orchestrator = AskHumanOrchestrator(client)
    >>> submission = orchestrator.submit(prompt="...", type="text")
    >>> responses = orchestrator.await_responses([submission.question_id])
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING

from ask_a_human.types import QuestionResponse, QuestionSubmission

if TYPE_CHECKING:
    from ask_a_human.client import AskHumanClient
    from ask_a_human.types import AudienceTag, QuestionType


# Default configuration
DEFAULT_POLL_INTERVAL = 30.0  # seconds
DEFAULT_TIMEOUT = 3600.0  # 1 hour
DEFAULT_MAX_BACKOFF = 300.0  # 5 minutes max between polls
DEFAULT_BACKOFF_MULTIPLIER = 1.5


class AskHumanOrchestrator:
    """High-level orchestrator for async human-in-the-loop workflows.

    The orchestrator handles common patterns like polling for responses,
    waiting with timeouts, and exponential backoff. It wraps an AskHumanClient
    and provides higher-level methods.

    Attributes:
        client: The underlying AskHumanClient.
        poll_interval: Base interval between polls in seconds.
        max_backoff: Maximum interval between polls in seconds.
        backoff_multiplier: Multiplier for exponential backoff.

    Example:
        >>> client = AskHumanClient(agent_id="my-agent")
        >>> orchestrator = AskHumanOrchestrator(client, poll_interval=30.0)
        >>> # Submit and wait for responses
        >>> submission = orchestrator.submit(
        ...     prompt="What tone should this use?",
        ...     type="multiple_choice",
        ...     options=["Formal", "Casual"]
        ... )
        >>> responses = orchestrator.await_responses(
        ...     [submission.question_id],
        ...     min_responses=5,
        ...     timeout=300
        ... )
    """

    def __init__(
        self,
        client: AskHumanClient,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        max_backoff: float = DEFAULT_MAX_BACKOFF,
        backoff_multiplier: float = DEFAULT_BACKOFF_MULTIPLIER,
    ) -> None:
        """Initialize the orchestrator.

        Args:
            client: The AskHumanClient to use for API calls.
            poll_interval: Base interval between polls in seconds. Defaults to 30.
            max_backoff: Maximum interval between polls in seconds. Defaults to 300.
            backoff_multiplier: Multiplier for exponential backoff. Defaults to 1.5.

        Example:
            >>> client = AskHumanClient(agent_id="my-agent")
            >>> orchestrator = AskHumanOrchestrator(
            ...     client,
            ...     poll_interval=15.0,  # Start with 15s polls
            ...     max_backoff=120.0,   # Max 2 minutes between polls
            ... )
        """
        self.client = client
        self.poll_interval = poll_interval
        self.max_backoff = max_backoff
        self.backoff_multiplier = backoff_multiplier

    def submit(
        self,
        prompt: str,
        type: QuestionType,  # noqa: A002
        options: list[str] | None = None,
        audience: list[AudienceTag] | None = None,
        min_responses: int = 5,
        timeout_seconds: int = 3600,
        idempotency_key: str | None = None,
    ) -> QuestionSubmission:
        """Submit a question for humans to answer.

        This is a convenience wrapper around client.submit_question().

        Args:
            prompt: The question text (10-2000 characters).
            type: Question type - 'text' for free-form, 'multiple_choice' for options.
            options: Options for multiple choice questions (2-10 items).
            audience: Target audience tags. Defaults to ['general'].
            min_responses: Minimum responses needed (1-50). Defaults to 5.
            timeout_seconds: Question expiration in seconds (60-86400). Defaults to 3600.
            idempotency_key: Optional key to prevent duplicate submissions.

        Returns:
            QuestionSubmission with question_id, status, poll_url, and expires_at.

        Example:
            >>> submission = orchestrator.submit(
            ...     prompt="Which headline is better?",
            ...     type="multiple_choice",
            ...     options=["Option A", "Option B"],
            ...     min_responses=10
            ... )
            >>> print(submission.question_id)
        """
        return self.client.submit_question(
            prompt=prompt,
            type=type,
            options=options,
            audience=audience,
            min_responses=min_responses,
            timeout_seconds=timeout_seconds,
            idempotency_key=idempotency_key,
        )

    def poll_once(self, question_ids: list[str]) -> dict[str, QuestionResponse]:
        """Poll for the current status of questions.

        This is a non-blocking call that returns immediately with the current
        status of each question.

        Args:
            question_ids: List of question IDs to check.

        Returns:
            Dictionary mapping question_id to QuestionResponse.

        Example:
            >>> responses = orchestrator.poll_once(["q_abc123", "q_def456"])
            >>> for qid, response in responses.items():
            ...     print(f"{qid}: {response.status} ({response.current_responses} responses)")
        """
        results: dict[str, QuestionResponse] = {}
        for question_id in question_ids:
            results[question_id] = self.client.get_question(question_id)
        return results

    def await_responses(
        self,
        question_ids: list[str],
        min_responses: int = 1,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> dict[str, QuestionResponse]:
        """Wait for responses to questions.

        Polls periodically until either:
        - All questions have at least min_responses, or
        - All questions are CLOSED or EXPIRED, or
        - The timeout is reached

        Uses exponential backoff to reduce API load during long waits.

        Args:
            question_ids: List of question IDs to wait for.
            min_responses: Minimum responses needed per question. Defaults to 1.
            timeout: Maximum time to wait in seconds. Defaults to 3600 (1 hour).

        Returns:
            Dictionary mapping question_id to QuestionResponse.
            May return partial results if timeout is reached.

        Example:
            >>> # Wait up to 5 minutes for at least 5 responses
            >>> responses = orchestrator.await_responses(
            ...     ["q_abc123"],
            ...     min_responses=5,
            ...     timeout=300
            ... )
            >>> question = responses["q_abc123"]
            >>> if question.status == "CLOSED":
            ...     print("Got all responses!")
            ... elif question.status == "PARTIAL":
            ...     print(f"Got {question.current_responses} partial responses")
        """
        start_time = time.time()
        current_interval = self.poll_interval
        results: dict[str, QuestionResponse] = {}

        while True:
            # Poll all questions
            results = self.poll_once(question_ids)

            # Check if all questions are done
            all_done = True
            for response in results.values():
                # Question is done if:
                # - It has enough responses
                # - It's CLOSED
                # - It's EXPIRED
                if response.status in ("CLOSED", "EXPIRED"):
                    continue
                if response.current_responses >= min_responses:
                    continue
                all_done = False
                break

            if all_done:
                return results

            # Check timeout
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                # Return partial results
                return results

            # Calculate sleep time (don't sleep past timeout)
            remaining = timeout - elapsed
            sleep_time = min(current_interval, remaining)

            if sleep_time > 0:
                time.sleep(sleep_time)

            # Exponential backoff for next iteration
            current_interval = min(
                current_interval * self.backoff_multiplier,
                self.max_backoff,
            )

    def submit_and_wait(
        self,
        prompt: str,
        type: QuestionType,  # noqa: A002
        options: list[str] | None = None,
        audience: list[AudienceTag] | None = None,
        min_responses: int = 5,
        timeout_seconds: int = 3600,
        idempotency_key: str | None = None,
        wait_timeout: float | None = None,
    ) -> QuestionResponse:
        """Submit a question and wait for responses.

        Convenience method that combines submit() and await_responses().

        Args:
            prompt: The question text (10-2000 characters).
            type: Question type - 'text' for free-form, 'multiple_choice' for options.
            options: Options for multiple choice questions (2-10 items).
            audience: Target audience tags. Defaults to ['general'].
            min_responses: Minimum responses needed (1-50). Defaults to 5.
            timeout_seconds: Question expiration in seconds (60-86400). Defaults to 3600.
            idempotency_key: Optional key to prevent duplicate submissions.
            wait_timeout: How long to wait for responses. Defaults to timeout_seconds.

        Returns:
            QuestionResponse with status and responses.

        Example:
            >>> response = orchestrator.submit_and_wait(
            ...     prompt="Should we proceed with option A or B?",
            ...     type="multiple_choice",
            ...     options=["Option A", "Option B"],
            ...     min_responses=5,
            ...     wait_timeout=300  # Wait up to 5 minutes
            ... )
            >>> print(f"Status: {response.status}")
            >>> for r in response.responses:
            ...     print(f"  {response.options[r.selected_option]}")
        """
        submission = self.submit(
            prompt=prompt,
            type=type,
            options=options,
            audience=audience,
            min_responses=min_responses,
            timeout_seconds=timeout_seconds,
            idempotency_key=idempotency_key,
        )

        # Wait for responses
        wait_time = wait_timeout if wait_timeout is not None else float(timeout_seconds)
        results = self.await_responses(
            question_ids=[submission.question_id],
            min_responses=min_responses,
            timeout=wait_time,
        )

        return results[submission.question_id]
