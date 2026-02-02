# ADR-03: API Design

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

The Ask-a-Human platform serves two distinct user types:
1. **Agents** (LLMs) - Submit questions, poll for responses
2. **Humans** - Browse questions, submit answers, manage notifications

We need a clean API design that:
- Is easy for agents to integrate (MCP tool)
- Works well with the anonymous, mobile-first human experience
- Supports rate limiting and abuse prevention
- Is simple to implement and maintain

## Decision

### API Structure

We will implement a **RESTful HTTP API** with two logical groupings:

- **Agent API** - For LLM integrations (`/agent/*`)
- **Human API** - For the PWA frontend (`/human/*`)

Base URL: `https://api.aah.dx-tooling.org`

---

## Agent API

### POST /agent/questions

Create a new question for humans to answer.

**Request:**
```json
{
  "prompt": "Should this error message apologize to the user or just state the facts?",
  "type": "text",
  "audience": ["product", "creative"],
  "min_responses": 5,
  "timeout_seconds": 3600,
  "idempotency_key": "agent-123-task-456"
}
```

**Request (Multiple Choice):**
```json
{
  "prompt": "Which button label is clearer?",
  "type": "multiple_choice",
  "options": ["Submit", "Send", "Confirm", "Done"],
  "audience": ["product"],
  "min_responses": 10,
  "timeout_seconds": 1800,
  "idempotency_key": "agent-123-task-789"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | The question text (max 2000 chars) |
| `type` | string | Yes | "text" or "multiple_choice" |
| `options` | string[] | If MC | Options for multiple choice (2-10 items) |
| `audience` | string[] | No | Target audience tags |
| `min_responses` | number | No | Minimum responses (default: 5, max: 50) |
| `timeout_seconds` | number | No | Expiration (default: 3600, max: 86400) |
| `idempotency_key` | string | No | Prevents duplicate submissions |

**Response (201 Created):**
```json
{
  "question_id": "q_abc123",
  "status": "OPEN",
  "poll_url": "/agent/questions/q_abc123",
  "expires_at": "2026-02-02T15:00:00Z"
}
```

---

### GET /agent/questions/{question_id}

Poll for question status and responses.

**Response (200 OK):**
```json
{
  "question_id": "q_abc123",
  "status": "PARTIAL",
  "prompt": "Should this error message apologize...",
  "type": "text",
  "required_responses": 5,
  "current_responses": 3,
  "expires_at": "2026-02-02T15:00:00Z",
  "responses": [
    {
      "answer": "Just state the facts. Users prefer clarity.",
      "confidence": 4
    },
    {
      "answer": "A brief apology feels more human.",
      "confidence": 3
    },
    {
      "answer": "Facts only. Apologies can seem insincere.",
      "confidence": 5
    }
  ]
}
```

**Status Values:**
- `OPEN` - Accepting responses, below threshold
- `PARTIAL` - Has some responses, still accepting
- `CLOSED` - Required responses reached
- `EXPIRED` - Timeout reached

---

## Human API

### GET /human/questions

List open questions for humans to answer.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results (default: 20, max: 50) |
| `cursor` | string | Pagination cursor |
| `audience` | string | Filter by audience tag |

**Response (200 OK):**
```json
{
  "questions": [
    {
      "question_id": "q_abc123",
      "prompt": "Should this error message apologize...",
      "type": "text",
      "audience": ["product", "creative"],
      "responses_needed": 2,
      "created_at": "2026-02-02T14:00:00Z"
    },
    {
      "question_id": "q_def456",
      "prompt": "Which button label is clearer?",
      "type": "multiple_choice",
      "options": ["Submit", "Send", "Confirm", "Done"],
      "audience": ["product"],
      "responses_needed": 7,
      "created_at": "2026-02-02T13:45:00Z"
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi..."
}
```

---

### GET /human/questions/{question_id}

Get a specific question to answer.

**Response (200 OK):**
```json
{
  "question_id": "q_abc123",
  "prompt": "Should this error message apologize to the user or just state the facts?",
  "type": "text",
  "audience": ["product", "creative"],
  "responses_needed": 2,
  "can_answer": true
}
```

`can_answer` is false if the user (by fingerprint) has already answered.

---

### POST /human/responses

Submit an answer to a question.

**Request (Text):**
```json
{
  "question_id": "q_abc123",
  "answer": "Just state the facts. Users prefer clarity over politeness.",
  "confidence": 4
}
```

**Request (Multiple Choice):**
```json
{
  "question_id": "q_def456",
  "selected_option": 2,
  "confidence": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question_id` | string | Yes | The question being answered |
| `answer` | string | If text | Free text answer (max 5000 chars) |
| `selected_option` | number | If MC | Index of selected option (0-based) |
| `confidence` | number | No | 1-5 confidence score |

**Response (201 Created):**
```json
{
  "response_id": "r_xyz789",
  "points_earned": 10,
  "new_badges": ["first_answer"],
  "total_points": 10
}
```

**Error (409 Conflict):** Already answered this question  
**Error (410 Gone):** Question is closed or expired

---

### POST /human/push/subscribe

Register for push notifications.

**Request:**
```json
{
  "fcm_token": "eK9f8sD...",
  "min_interval_minutes": 30
}
```

**Response (201 Created):**
```json
{
  "subscription_id": "sub_abc123",
  "status": "active"
}
```

---

### DELETE /human/push/subscribe/{subscription_id}

Unsubscribe from push notifications.

**Response (204 No Content)**

---

### GET /human/stats

Get gamification stats for the current user (by fingerprint).

**Response (200 OK):**
```json
{
  "total_points": 150,
  "total_answers": 12,
  "streak_days": 3,
  "badges": [
    {"id": "first_answer", "name": "First Steps", "earned_at": "2026-01-30T..."},
    {"id": "streak_3", "name": "On a Roll", "earned_at": "2026-02-02T..."}
  ],
  "rank": 42,
  "answers_by_category": {
    "technical": 5,
    "product": 7
  }
}
```

---

### GET /human/leaderboard

Get the points leaderboard.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `period` | string | "daily", "weekly", "all_time" (default) |
| `limit` | number | Max results (default: 10, max: 100) |

**Response (200 OK):**
```json
{
  "period": "weekly",
  "entries": [
    {"rank": 1, "points": 520, "answers": 45},
    {"rank": 2, "points": 480, "answers": 41},
    {"rank": 3, "points": 450, "answers": 38}
  ],
  "your_rank": 42,
  "your_points": 150
}
```

---

## Common Headers

### Request Headers

| Header | Description |
|--------|-------------|
| `X-Fingerprint` | Anonymized user fingerprint (human API) |
| `X-Idempotency-Key` | Prevents duplicate submissions |
| `X-Agent-Id` | Agent identifier (agent API) |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Rate limit ceiling |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /agent/questions | 60/hour | Per agent |
| GET /agent/questions/* | 600/hour | Per agent |
| POST /human/responses | 30/hour | Per fingerprint |
| GET /human/* | 300/hour | Per IP |

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "QUESTION_NOT_FOUND",
    "message": "The requested question does not exist or has expired."
  }
}
```

**Standard Error Codes:**
- `VALIDATION_ERROR` (400) - Invalid request body
- `RATE_LIMITED` (429) - Too many requests
- `QUESTION_NOT_FOUND` (404) - Question doesn't exist
- `ALREADY_ANSWERED` (409) - User already answered this question
- `QUESTION_CLOSED` (410) - Question is closed or expired
- `SERVER_ERROR` (500) - Internal error

---

## MCP Tool Interface

The agent API is designed to be wrapped as an MCP tool:

```json
{
  "name": "ask_human",
  "description": "Request human input when confidence is low or the decision involves subjective judgment. Humans will provide their opinions asynchronously.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "description": "The question to ask humans"
      },
      "type": {
        "type": "string",
        "enum": ["text", "multiple_choice"],
        "description": "Type of response expected"
      },
      "options": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Options for multiple choice questions"
      },
      "audience": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Target audience: technical, product, ethics, creative, general"
      },
      "min_responses": {
        "type": "number",
        "description": "Minimum number of human responses needed"
      },
      "timeout_seconds": {
        "type": "number",
        "description": "How long to wait for responses"
      }
    },
    "required": ["question", "type"]
  }
}
```

## Alternatives Considered

### GraphQL
- **Pros:** Flexible queries, single endpoint
- **Cons:** Complexity, caching harder, overkill for simple API
- **Decision:** REST is simpler and sufficient

### WebSockets for Agent Updates
- **Pros:** Real-time response delivery
- **Cons:** Connection management, complexity
- **Decision:** Polling is sufficient for MVP; can add webhooks later

### Separate API Gateways
- **Pros:** Independent scaling
- **Cons:** Operational complexity
- **Decision:** Single API Gateway with path-based routing

## Consequences

### Positive
- Clear separation between agent and human APIs
- Simple REST semantics
- Easy to test and debug
- Natural MCP tool mapping

### Negative
- Agents must poll (no push updates)
- Two fingerprint checks per answer (list + submit)

## Related Documents

- [ADR-01: System Architecture](01-system-architecture.md)
- [ADR-02: Database Schema](02-database-schema.md)
- [PRD-02: Agent API and MCP Tool](../product-requirements-document/02-agent-api.md)
