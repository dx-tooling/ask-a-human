---
id: 06
title: Agent SDK, MCP Server, and Reference Implementation
source: PRD-02, ADR-03
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# Agent SDK, MCP Server, and Reference Implementation

## Description

Create the agent-facing components of Ask-a-Human that enable LLM agents to integrate with the system. This includes a Python SDK for programmatic access, an MCP tool server for Cursor/Claude Desktop integration, and a reference content-writer agent that demonstrates the async human-in-the-loop pattern.

The goal is to provide agent developers with everything they need to integrate Ask-a-Human into their workflows: a well-documented SDK, ready-to-use MCP tools, and a working example they can learn from.

**Source code locations:**
- `sdk-python/` - Python SDK package
- `mcp-server/` - MCP tool server
- `examples/content-writer-agent/` - Reference agent implementation

## Acceptance Criteria

### Python SDK Package (`sdk-python/`)

#### Project Setup
- [x] `pyproject.toml` configured with package metadata
- [x] Python 3.11+ compatibility (broad compatibility for agent developers)
- [x] Dependencies: `httpx`, `pydantic`
- [x] Package name: `ask-a-human`
- [x] Installable via `pip install -e sdk-python/`

#### AskHumanClient (Low-level API wrapper)
- [x] `__init__(base_url, agent_id)` - Configure client
- [x] `submit_question(prompt, type, options, min_responses, timeout_seconds, audience)` - Submit question
- [x] `get_question(question_id)` - Poll for status and responses
- [x] Proper error handling with custom exceptions
- [x] Type hints for all public methods
- [x] Docstrings with usage examples

#### AskHumanOrchestrator (High-level async patterns)
- [x] `__init__(client, poll_interval)` - Configure orchestrator
- [x] `submit(prompt, **kwargs)` - Submit and track question
- [x] `await_responses(question_ids, min_responses, timeout)` - Block until ready
- [x] `poll_once(question_ids)` - Non-blocking status check
- [x] Exponential backoff for polling
- [x] Returns partial results on timeout

#### Type Definitions (`types.py`)
- [x] `QuestionType` - Literal["text", "multiple_choice"]
- [x] `QuestionStatus` - Literal["OPEN", "PARTIAL", "CLOSED", "EXPIRED"]
- [x] `QuestionSubmission` - Response from submit
- [x] `QuestionResponse` - Full question with responses
- [x] `HumanResponse` - Individual response (answer/selected_option, confidence)

#### Exceptions (`exceptions.py`)
- [x] `AskHumanError` - Base exception
- [x] `ValidationError` - Invalid request
- [x] `QuestionNotFoundError` - 404 response
- [x] `RateLimitError` - 429 response
- [x] `ServerError` - 5xx response

#### Tests
- [x] Unit tests for `AskHumanClient` with mocked responses
- [x] Unit tests for `AskHumanOrchestrator` with mocked client
- [x] Test error handling for various HTTP status codes
- [x] Test timeout and partial results behavior

#### Documentation
- [x] `README.md` with installation and usage examples
- [x] Inline examples in `examples/` directory

### MCP Tool Server (`mcp-server/`)

#### Project Setup
- [x] `pyproject.toml` configured
- [x] Depends on `ask-a-human` SDK and `mcp` package
- [x] Runnable via `python -m ask_a_human_mcp`

#### Tools Implemented
- [x] `ask_human` tool - Submit a question
  - Input: question, type, options, audience, min_responses, timeout_seconds
  - Output: question_id, status, poll_url, message
- [x] `check_human_responses` tool - Check status and get responses
  - Input: question_id
  - Output: Full question status with responses

#### Tool Schemas
- [x] JSON Schema matches PRD-02 specification
- [x] Clear descriptions for each parameter
- [x] Proper required/optional field marking

#### Configuration
- [x] `ASK_A_HUMAN_BASE_URL` environment variable
- [x] `ASK_A_HUMAN_AGENT_ID` environment variable
- [x] Example configs for Cursor and Claude Desktop

#### Documentation
- [x] `README.md` with setup instructions
- [x] Example MCP configuration files in `config/`

### Reference Agent: Content Writer (`examples/content-writer-agent/`)

#### Project Setup
- [x] `requirements.txt` with dependencies: `ask-a-human`, `openai`, `rich`
- [x] `README.md` with setup and usage instructions
- [x] OpenAI API key loaded from `secrets/openai-api-key.txt` or `OPENAI_API_KEY` env var

#### Agent Behavior
- [x] Accepts content brief from user (CLI input)
- [x] Uses OpenAI to analyze brief and identify decision points
- [x] Asks humans for tone/style decisions via Ask-a-Human
- [x] Waits for human responses with progress indication
- [x] Generates final content incorporating human feedback
- [x] Beautiful terminal output using `rich`

#### Human-in-the-Loop Integration
- [x] At least 2 decision points that trigger human questions
- [x] Uses multiple choice questions for clear decisions
- [x] Handles timeout/partial results gracefully
- [x] Shows human response summary before proceeding

#### Demo Quality
- [x] Works end-to-end with real API calls
- [x] Clear console output showing agent reasoning
- [x] Informative progress messages during wait periods

### Documentation

#### ADR-07: Agent Integration Patterns
- [x] Context: Why agents need async human input
- [x] Decision: Recommended patterns (multi-turn, orchestrator, checkpoint)
- [x] Covers async handling strategies
- [x] Covers partial results handling
- [x] References SDK and MCP implementations

#### Integration Guide (`planning/guides/agent-integration-guide.md`)
- [x] Quick start with SDK
- [x] Setting up MCP server
- [x] Patterns for different agent types (Cursor, autonomous, serverless)
- [x] Handling timeouts and partial results
- [x] Best practices for question formulation

## Out of Scope (This Task)

- PyPI publishing (future task)
- Webhooks for push delivery (API enhancement)
- Batch question submission API (API enhancement)
- SDKs for other languages (TypeScript, etc.)
- CI/CD for SDK packages

## Implementation Notes

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Implementations                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Reference Agent │  Custom Agents  │   Cursor/Claude Desktop     │
│      (CLI)      │                 │                             │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                        │
         │                 │                        │
         ▼                 ▼                        ▼
┌─────────────────────────────────┐    ┌──────────────────────────┐
│        sdk-python/              │    │      mcp-server/         │
│  ┌───────────────────────────┐  │    │  ┌────────────────────┐  │
│  │     AskHumanClient        │  │    │  │    ask_human       │  │
│  │     (low-level API)       │  │    │  │    (MCP tool)      │  │
│  └───────────────────────────┘  │    │  └─────────┬──────────┘  │
│  ┌───────────────────────────┐  │    │  ┌─────────▼──────────┐  │
│  │   AskHumanOrchestrator    │  │    │  │ check_human_resp.  │  │
│  │   (async patterns)        │  │    │  │    (MCP tool)      │  │
│  └───────────────────────────┘  │    │  └────────────────────┘  │
└────────────────┬────────────────┘    └───────────┬──────────────┘
                 │                                  │
                 │      Uses SDK internally         │
                 │◄─────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  api.ask-a-human│
        │      .com       │
        └─────────────────┘
```

### Directory Structure

```
ask-a-human/
├── sdk-python/
│   ├── pyproject.toml
│   ├── README.md
│   ├── src/
│   │   └── ask_a_human/
│   │       ├── __init__.py
│   │       ├── client.py
│   │       ├── orchestrator.py
│   │       ├── types.py
│   │       └── exceptions.py
│   ├── tests/
│   │   ├── test_client.py
│   │   └── test_orchestrator.py
│   └── examples/
│       ├── basic_usage.py
│       └── multi_question.py
│
├── mcp-server/
│   ├── pyproject.toml
│   ├── README.md
│   ├── src/
│   │   └── ask_a_human_mcp/
│   │       ├── __init__.py
│   │       ├── server.py
│   │       └── tools.py
│   └── config/
│       ├── cursor.example.json
│       └── claude-desktop.example.json
│
├── examples/
│   └── content-writer-agent/
│       ├── README.md
│       ├── requirements.txt
│       ├── main.py
│       ├── agent.py
│       └── prompts.py
│
└── planning/
    ├── architectural-decision-records/
    │   └── 07-agent-integration-patterns.md
    └── guides/
        └── agent-integration-guide.md
```

### Key API Endpoints (from ADR-03)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/questions` | Create a new question |
| GET | `/agent/questions/{question_id}` | Poll for responses |

### Configuration

**SDK defaults:**
- Base URL: `https://api.ask-a-human.com`
- Poll interval: 30 seconds
- Timeout: 3600 seconds (1 hour)

**Environment variables:**
- `ASK_A_HUMAN_BASE_URL` - Override API base URL
- `ASK_A_HUMAN_AGENT_ID` - Agent identifier for rate limiting
- `OPENAI_API_KEY` - For reference agent (or `secrets/openai-api-key.txt`)

### Reference Documents

- [PRD-02: Agent API and MCP Tool](../../product-requirements-document/02-agent-api.md)
- [ADR-03: API Design](../../architectural-decision-records/03-api-design.md)
- [PRD-04: Question Lifecycle](../../product-requirements-document/04-question-lifecycle.md)

## Testing Plan

### SDK Testing

```bash
cd sdk-python
pip install -e ".[dev]"
pytest
```

### MCP Server Testing

```bash
cd mcp-server
pip install -e .
python -m ask_a_human_mcp  # Should start server
```

Manual verification in Cursor:
1. Add MCP config to `~/.cursor/mcp.json`
2. Restart Cursor
3. Test `ask_human` tool in chat
4. Test `check_human_responses` tool

### Reference Agent Testing

```bash
cd examples/content-writer-agent
pip install -r requirements.txt
# Ensure secrets/openai-api-key.txt exists
python main.py
```

Expected flow:
1. Enter content brief
2. Agent asks humans for tone preference (wait for responses)
3. Agent asks humans for headline preference (wait for responses)
4. Agent outputs final content

## Success Metrics

| Metric | Target |
|--------|--------|
| SDK test coverage | > 80% |
| SDK install time | < 30 seconds |
| MCP server startup | < 5 seconds |
| Reference agent end-to-end | Works with real API |
| Documentation completeness | All public APIs documented |

## ADR/PRD Updates

- [x] Create ADR-07: Agent Integration Patterns
- [x] Update PRD-02 if any MCP tool schema changes are needed (none needed - schema matches spec)
