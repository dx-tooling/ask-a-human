# Ask-a-Human Python SDK

Python SDK for integrating [Ask-a-Human](https://ask-a-human.com) into your AI agents. Get human input when your agent is uncertain or needs subjective judgment.

## Installation

```bash
pip install ask-a-human
```

Or install from source:

```bash
pip install -e path/to/sdk-python
```

### Installing from Source with Virtual Environment

On modern systems (especially macOS with Homebrew), you'll need to use a virtual environment:

```bash
# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install the SDK
pip install -e path/to/sdk-python

# Install with development dependencies (for running tests)
pip install -e "path/to/sdk-python[dev]"
```

## Quick Start

```python
from ask_a_human import AskHumanClient

# Create a client
client = AskHumanClient(agent_id="my-agent")

# Submit a question
result = client.submit_question(
    prompt="Should this error message apologize to the user or just state the facts?",
    type="text",
    audience=["product", "creative"],
    min_responses=5
)

print(f"Question submitted: {result.question_id}")

# Later, check for responses
response = client.get_question(result.question_id)

if response.status in ("CLOSED", "PARTIAL"):
    for r in response.responses:
        print(f"Human said: {r.answer} (confidence: {r.confidence})")
```

## Using the Orchestrator

For more complex workflows, use the `AskHumanOrchestrator` which handles polling and timeouts:

```python
from ask_a_human import AskHumanClient, AskHumanOrchestrator

client = AskHumanClient(agent_id="my-agent")
orchestrator = AskHumanOrchestrator(client, poll_interval=30.0)

# Submit a question
submission = orchestrator.submit(
    prompt="Which button label is clearer?",
    type="multiple_choice",
    options=["Submit", "Send", "Confirm", "Done"],
    min_responses=10
)

# Wait for responses (with timeout)
responses = orchestrator.await_responses(
    question_ids=[submission.question_id],
    min_responses=5,
    timeout=300  # 5 minutes
)

# Process responses
question = responses[submission.question_id]
print(f"Status: {question.status}")
print(f"Got {question.current_responses} responses")

if question.summary:
    print(f"Summary: {question.summary}")
```

## Multiple Choice Questions

```python
result = client.submit_question(
    prompt="What tone should this notification use?",
    type="multiple_choice",
    options=[
        "Formal and professional",
        "Friendly and casual",
        "Urgent and direct",
        "Neutral and informative"
    ],
    audience=["product"],
    min_responses=10
)

# Check responses
response = client.get_question(result.question_id)

# For multiple choice, responses have selected_option instead of answer
for r in response.responses:
    option_text = response.options[r.selected_option]
    print(f"Human chose: {option_text} (confidence: {r.confidence})")

# summary field shows vote counts
if response.summary:
    print(f"Vote distribution: {response.summary}")
```

## Handling Timeouts and Partial Results

The orchestrator can return partial results when a timeout is reached:

```python
responses = orchestrator.await_responses(
    question_ids=["q_abc123"],
    min_responses=10,
    timeout=60  # Short timeout
)

question = responses["q_abc123"]

if question.status == "PARTIAL":
    print(f"Got {question.current_responses} of {question.required_responses} responses")
    # Decide whether to proceed with partial results or wait longer
elif question.status == "EXPIRED":
    print("Question expired before getting enough responses")
```

## Configuration

### Environment Variables

- `ASK_A_HUMAN_BASE_URL` - Override the API base URL (default: `https://api.ask-a-human.com`)
- `ASK_A_HUMAN_AGENT_ID` - Default agent ID if not specified in constructor

### Client Options

```python
client = AskHumanClient(
    base_url="https://api.ask-a-human.com",  # API endpoint
    agent_id="my-agent",                      # Your agent identifier
    timeout=30.0                              # HTTP request timeout
)
```

### Orchestrator Options

```python
orchestrator = AskHumanOrchestrator(
    client=client,
    poll_interval=30.0  # Seconds between polls (uses exponential backoff)
)
```

## Error Handling

```python
from ask_a_human import AskHumanClient
from ask_a_human.exceptions import (
    AskHumanError,
    ValidationError,
    QuestionNotFoundError,
    RateLimitError,
    ServerError
)

client = AskHumanClient(agent_id="my-agent")

try:
    result = client.submit_question(prompt="...", type="text")
except ValidationError as e:
    print(f"Invalid request: {e}")
except RateLimitError as e:
    print(f"Rate limited: {e}")
except ServerError as e:
    print(f"Server error: {e}")
except AskHumanError as e:
    print(f"Unknown error: {e}")
```

## API Reference

### AskHumanClient

Low-level API client.

- `submit_question(prompt, type, options=None, audience=None, min_responses=5, timeout_seconds=3600, idempotency_key=None)` - Submit a question
- `get_question(question_id)` - Get question status and responses

### AskHumanOrchestrator

High-level orchestration with polling and timeouts.

- `submit(prompt, **kwargs)` - Submit a question (same args as client)
- `await_responses(question_ids, min_responses=1, timeout=3600)` - Wait for responses
- `poll_once(question_ids)` - Non-blocking status check

### Types

- `QuestionType` - `"text"` or `"multiple_choice"`
- `QuestionStatus` - `"OPEN"`, `"PARTIAL"`, `"CLOSED"`, or `"EXPIRED"`
- `QuestionSubmission` - Response from submitting a question
- `QuestionResponse` - Full question with status and responses
- `HumanResponse` - Individual human response

## Examples

See the `examples/` directory for more usage examples:

- `basic_usage.py` - Simple question submission and polling
- `multi_question.py` - Managing multiple concurrent questions

## License

MIT
