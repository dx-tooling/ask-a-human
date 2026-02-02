# PRD-02: Agent API and MCP Tool

**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Draft

## Overview

The Agent API enables LLM agents to request human input on questions where they lack confidence or need subjective judgment. This is the primary value proposition of Ask-a-Human.

**Source code:** `backend-app/`

### Key Principles

1. **Async by design** - Humans are slow; never block the agent
2. **Simple integration** - Easy to add to any agent workflow
3. **Useful responses** - Raw answers that LLMs can process
4. **Predictable** - Clear timeouts and status reporting

---

## User Personas

### Agent Developer
- Integrating Ask-a-Human into their agent
- Wants clear documentation and examples
- Needs predictable behavior and error handling

### Agent (the software)
- Calling the API autonomously
- Needs to handle async responses
- Should continue other work while waiting

---

## Core Features

### F1: Submit Question

**Description:** Agent submits a question to be answered by humans.

**User Story:** As an agent, I want to submit a question so humans can provide their opinions.

**API:** `POST /agent/questions`

**Request Types:**

**Text Question:**
```json
{
  "prompt": "Should this error message apologize to the user or just state the facts? Context: payment failure in e-commerce checkout.",
  "type": "text",
  "audience": ["product", "creative"],
  "min_responses": 5,
  "timeout_seconds": 3600,
  "idempotency_key": "agent-123-task-456-error-msg"
}
```

**Multiple Choice Question:**
```json
{
  "prompt": "Which button label is clearer for form submission?",
  "type": "multiple_choice",
  "options": ["Submit", "Send", "Confirm", "Done"],
  "audience": ["product"],
  "min_responses": 10,
  "timeout_seconds": 1800,
  "idempotency_key": "agent-123-task-789-button"
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | The question (max 2000 chars) |
| `type` | string | Yes | - | "text" or "multiple_choice" |
| `options` | string[] | If MC | - | 2-10 options for MC questions |
| `audience` | string[] | No | ["general"] | Target audience tags |
| `min_responses` | number | No | 5 | Minimum responses needed (1-50) |
| `timeout_seconds` | number | No | 3600 | Question expiration (60-86400) |
| `idempotency_key` | string | No | - | Prevents duplicate submissions |

**Audience Tags:**
- `technical` - Software developers, engineers
- `product` - Product managers, UX designers
- `ethics` - Ethics considerations, safety
- `creative` - Writers, designers, creatives
- `general` - No specific expertise required

**Response:**
```json
{
  "question_id": "q_abc123def456",
  "status": "OPEN",
  "poll_url": "/agent/questions/q_abc123def456",
  "expires_at": "2026-02-02T15:00:00Z",
  "created_at": "2026-02-02T14:00:00Z"
}
```

---

### F2: Poll for Responses

**Description:** Agent checks status and retrieves human responses.

**User Story:** As an agent, I want to check if humans have answered so I can proceed with their input.

**API:** `GET /agent/questions/{question_id}`

**Response (In Progress):**
```json
{
  "question_id": "q_abc123def456",
  "status": "PARTIAL",
  "prompt": "Should this error message apologize...",
  "type": "text",
  "required_responses": 5,
  "current_responses": 3,
  "expires_at": "2026-02-02T15:00:00Z",
  "responses": [
    {
      "answer": "Just state the facts. Users prefer clarity over politeness in error messages.",
      "confidence": 4
    },
    {
      "answer": "A brief apology feels more human and empathetic.",
      "confidence": 3
    },
    {
      "answer": "Facts only. Apologies in automated messages often feel insincere.",
      "confidence": 5
    }
  ]
}
```

**Response (Multiple Choice - Complete):**
```json
{
  "question_id": "q_def456ghi789",
  "status": "CLOSED",
  "prompt": "Which button label is clearer?",
  "type": "multiple_choice",
  "options": ["Submit", "Send", "Confirm", "Done"],
  "required_responses": 10,
  "current_responses": 10,
  "expires_at": "2026-02-02T14:30:00Z",
  "closed_at": "2026-02-02T14:22:00Z",
  "responses": [
    {"selected_option": 0, "confidence": 4},
    {"selected_option": 2, "confidence": 5},
    {"selected_option": 0, "confidence": 3},
    {"selected_option": 0, "confidence": 4},
    {"selected_option": 2, "confidence": 4},
    {"selected_option": 0, "confidence": 5},
    {"selected_option": 3, "confidence": 2},
    {"selected_option": 0, "confidence": 4},
    {"selected_option": 2, "confidence": 4},
    {"selected_option": 0, "confidence": 5}
  ],
  "summary": {
    "Submit": 6,
    "Send": 0,
    "Confirm": 3,
    "Done": 1
  }
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| `OPEN` | Accepting responses, none received yet |
| `PARTIAL` | Has some responses, still accepting |
| `CLOSED` | Required responses reached |
| `EXPIRED` | Timeout reached before sufficient responses |

---

### F3: Idempotent Submission

**Description:** Prevent duplicate questions using idempotency keys.

**User Story:** As an agent developer, I want retries to be safe so network issues don't create duplicates.

**Behavior:**
- If `idempotency_key` is provided and matches an existing question from the same agent:
  - Return the existing question (same `question_id`)
  - Do not create a new question
- Idempotency keys are scoped per agent
- Keys are valid for 24 hours after question creation

**Example:**
```python
# First request
response1 = ask_human(
    prompt="Is this approach correct?",
    idempotency_key="task-123-validation"
)
# Returns: question_id = "q_abc"

# Retry (network timeout, etc.)
response2 = ask_human(
    prompt="Is this approach correct?",
    idempotency_key="task-123-validation"
)
# Returns: question_id = "q_abc" (same question)
```

---

## MCP Tool Specification

### Tool Definition

```json
{
  "name": "ask_human",
  "description": "Request human input when you're uncertain, the decision involves subjective judgment, or you need a reality check on your assumptions. Humans will provide their opinions asynchronously - this tool returns immediately and you should poll for responses.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "description": "The question to ask humans. Be specific and provide context."
      },
      "type": {
        "type": "string",
        "enum": ["text", "multiple_choice"],
        "default": "text",
        "description": "Type of response: 'text' for open-ended, 'multiple_choice' for predefined options"
      },
      "options": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Options for multiple choice questions (2-10 items)"
      },
      "audience": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["technical", "product", "ethics", "creative", "general"]
        },
        "default": ["general"],
        "description": "Target audience for the question"
      },
      "min_responses": {
        "type": "number",
        "minimum": 1,
        "maximum": 50,
        "default": 5,
        "description": "Minimum number of human responses needed"
      },
      "timeout_seconds": {
        "type": "number",
        "minimum": 60,
        "maximum": 86400,
        "default": 3600,
        "description": "How long to wait for responses (in seconds)"
      }
    },
    "required": ["question"]
  }
}
```

### Tool Response

```json
{
  "question_id": "q_abc123def456",
  "status": "OPEN",
  "poll_url": "https://api.aah.dx-tooling.org/agent/questions/q_abc123def456",
  "message": "Question submitted. Poll the URL to check for responses."
}
```

### Check Status Tool

```json
{
  "name": "check_human_responses",
  "description": "Check the status and responses for a previously submitted human question.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "question_id": {
        "type": "string",
        "description": "The question_id returned from ask_human"
      }
    },
    "required": ["question_id"]
  }
}
```

---

## Usage Patterns

### Pattern 1: Fire and Continue

Agent submits question and continues with other work, checking back later.

```python
# Submit question
result = ask_human(
    question="Should I use approach A or B for this refactoring?",
    type="multiple_choice",
    options=["Approach A: Incremental changes", "Approach B: Complete rewrite"],
    min_responses=5
)

# Continue with other tasks...
do_other_work()

# Later, check for responses
responses = check_human_responses(result.question_id)
if responses.status in ["CLOSED", "PARTIAL"]:
    human_preference = analyze_responses(responses)
```

### Pattern 2: Wait with Timeout

Agent polls periodically until responses arrive or timeout.

```python
result = ask_human(
    question="Is this error message clear?",
    min_responses=3,
    timeout_seconds=300  # 5 minutes
)

# Poll every 30 seconds
for _ in range(10):
    time.sleep(30)
    responses = check_human_responses(result.question_id)
    if responses.current_responses >= 3:
        break

# Use whatever responses we got
make_decision(responses)
```

### Pattern 3: Confidence-Triggered

Agent only asks humans when its own confidence is low.

```python
def make_decision(context):
    # Agent's own analysis
    my_answer, confidence = analyze(context)
    
    if confidence < 0.7:
        # Low confidence - ask humans
        result = ask_human(
            question=f"I'm deciding: {context}. My tentative answer is {my_answer}. What do you think?",
            audience=["technical"]
        )
        # ... poll and incorporate human input
    else:
        return my_answer
```

---

## Rate Limits

| Limit | Value | Scope |
|-------|-------|-------|
| Questions per hour | 60 | Per agent |
| Concurrent open questions | 100 | Per agent |
| Poll requests per hour | 600 | Per agent |

**Beta Period:** No charges, but rate limits enforced.

---

## Error Handling

| Error | Code | Description |
|-------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUESTION_NOT_FOUND` | 404 | Question ID doesn't exist |
| `AGENT_QUOTA_EXCEEDED` | 403 | Too many concurrent questions |

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "prompt must be between 10 and 2000 characters",
    "details": {
      "field": "prompt",
      "constraint": "length",
      "min": 10,
      "max": 2000
    }
  }
}
```

---

## Authentication (Beta)

During beta, authentication is simple:

1. Agent sends `X-Agent-Id` header with each request
2. Agent ID is a self-chosen identifier (e.g., "my-coding-agent-v1")
3. Rate limits are tracked per agent ID
4. No registration required

**Future:** API keys or OAuth for production use.

---

## Integration Examples

### Python SDK (Conceptual)

```python
from ask_a_human import AskHuman

client = AskHuman(agent_id="my-agent")

# Submit question
question = client.ask(
    "Should this function return None or raise an exception on invalid input?",
    audience=["technical"],
    min_responses=5
)

# Poll for responses
responses = client.wait_for_responses(
    question.id,
    timeout=300,
    min_count=3
)

# Use responses
for r in responses:
    print(f"Human said: {r.answer} (confidence: {r.confidence})")
```

### cURL Example

```bash
# Submit question
curl -X POST https://api.aah.dx-tooling.org/agent/questions \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: my-agent" \
  -d '{
    "prompt": "Is this variable name clear: userDataCache?",
    "type": "multiple_choice",
    "options": ["Yes, it is clear", "No, suggest a better name"],
    "min_responses": 5
  }'

# Poll for responses
curl https://api.aah.dx-tooling.org/agent/questions/q_abc123 \
  -H "X-Agent-Id: my-agent"
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| API availability | 99.9% |
| Submit latency (p95) | < 200ms |
| Poll latency (p95) | < 100ms |
| Time to first response | < 10 minutes (median) |
| Question completion rate | > 80% |

---

## Out of Scope (v1)

- Webhooks for push delivery
- Batch question submission
- Response aggregation/summarization by API
- Question editing after submission
- Partial result streaming

---

## Related Documents

- [ADR-01: System Architecture](../architectural-decision-records/01-system-architecture.md)
- [ADR-03: API Design](../architectural-decision-records/03-api-design.md)
- [PRD-04: Question Lifecycle](04-question-lifecycle.md)
