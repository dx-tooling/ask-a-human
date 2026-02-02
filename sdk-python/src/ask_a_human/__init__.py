"""Ask-a-Human Python SDK.

A Python SDK for integrating Ask-a-Human into your AI agents.
Get human input when your agent is uncertain or needs subjective judgment.

Example:
    >>> from ask_a_human import AskHumanClient
    >>> client = AskHumanClient(agent_id="my-agent")
    >>> result = client.submit_question(
    ...     prompt="Should this error apologize to the user?",
    ...     type="text"
    ... )
    >>> response = client.get_question(result.question_id)
"""

from ask_a_human.client import AskHumanClient
from ask_a_human.exceptions import (
    AskHumanError,
    QuestionNotFoundError,
    RateLimitError,
    ServerError,
    ValidationError,
)
from ask_a_human.orchestrator import AskHumanOrchestrator
from ask_a_human.types import (
    HumanResponse,
    QuestionResponse,
    QuestionStatus,
    QuestionSubmission,
    QuestionType,
)

__version__ = "0.1.0"

__all__ = [
    # Client
    "AskHumanClient",
    # Orchestrator
    "AskHumanOrchestrator",
    # Types
    "QuestionType",
    "QuestionStatus",
    "QuestionSubmission",
    "QuestionResponse",
    "HumanResponse",
    # Exceptions
    "AskHumanError",
    "ValidationError",
    "QuestionNotFoundError",
    "RateLimitError",
    "ServerError",
]
