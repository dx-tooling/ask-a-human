# ADR-02: Database Schema Design

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

The Ask-a-Human platform needs to store:
- Questions submitted by agents
- Responses submitted by humans
- Push notification subscriptions
- Gamification stats (points, badges)

We've chosen DynamoDB (see ADR-01) which requires upfront design of access patterns.

## Decision

### Table Design

We will use **four DynamoDB tables** with single-table design principles where beneficial:

---

### 1. Questions Table

Stores question metadata and status.

**Table Name:** `aah-questions`

| Attribute | Type | Description |
|-----------|------|-------------|
| `question_id` (PK) | String | UUID, partition key |
| `status` | String | OPEN, PARTIAL, CLOSED, EXPIRED |
| `prompt` | String | The question text |
| `type` | String | "text" or "multiple_choice" |
| `options` | List | MC options (if type=multiple_choice) |
| `audience` | List | Tags: ["technical", "product", etc.] |
| `required_responses` | Number | Target number of responses |
| `current_responses` | Number | Current count (denormalized) |
| `agent_id` | String | Identifier for the requesting agent |
| `idempotency_key` | String | For duplicate request prevention |
| `created_at` | String | ISO 8601 timestamp |
| `expires_at` | Number | Unix timestamp (TTL attribute) |
| `closed_at` | String | ISO 8601 timestamp (when closed) |

**GSI: ByStatus**
- PK: `status`
- SK: `created_at`
- Use: Fetch open questions for humans

**GSI: ByAgentId**
- PK: `agent_id`
- SK: `created_at`
- Use: Agent fetches their questions

**TTL:** `expires_at` - Automatically deletes expired questions

---

### 2. Responses Table

Stores individual human responses.

**Table Name:** `aah-responses`

| Attribute | Type | Description |
|-----------|------|-------------|
| `question_id` (PK) | String | Links to Questions table |
| `response_id` (SK) | String | UUID, sort key |
| `answer` | String | The human's answer |
| `selected_option` | Number | Index if multiple choice |
| `confidence` | Number | Optional 1-5 confidence score |
| `fingerprint_hash` | String | Anonymized user identifier |
| `created_at` | String | ISO 8601 timestamp |
| `response_time_ms` | Number | Time from page load to submit |

**GSI: ByFingerprint**
- PK: `fingerprint_hash`
- SK: `created_at`
- Use: Check if user already answered, rate limiting

---

### 3. Subscriptions Table

Stores push notification subscriptions.

**Table Name:** `aah-subscriptions`

| Attribute | Type | Description |
|-----------|------|-------------|
| `subscription_id` (PK) | String | UUID, partition key |
| `fcm_token` | String | Firebase Cloud Messaging token |
| `min_interval_minutes` | Number | User's preferred notification frequency |
| `last_notified_at` | String | ISO 8601 timestamp |
| `created_at` | String | ISO 8601 timestamp |
| `updated_at` | String | ISO 8601 timestamp |
| `active` | Boolean | Whether subscription is active |

**GSI: ByLastNotified**
- PK: `active` (sparse index, only active=true)
- SK: `last_notified_at`
- Use: Find users eligible for notification

---

### 4. UserStats Table

Stores gamification data (anonymous, keyed by fingerprint).

**Table Name:** `aah-user-stats`

| Attribute | Type | Description |
|-----------|------|-------------|
| `fingerprint_hash` (PK) | String | Anonymized user identifier |
| `total_points` | Number | Cumulative points |
| `total_answers` | Number | Total answers submitted |
| `streak_days` | Number | Current answer streak |
| `streak_last_date` | String | Date of last streak-counted answer |
| `badges` | List | List of earned badge IDs |
| `answers_by_category` | Map | Count per category (technical, etc.) |
| `created_at` | String | ISO 8601 timestamp |
| `updated_at` | String | ISO 8601 timestamp |

**GSI: ByTotalPoints**
- PK: `_leaderboard` (constant string)
- SK: `total_points`
- Use: Leaderboard queries

---

### Access Patterns Summary

| Access Pattern | Table | Index | Key Condition |
|----------------|-------|-------|---------------|
| Get question by ID | Questions | - | PK = question_id |
| List open questions | Questions | ByStatus | PK = "OPEN", SK desc |
| Agent's questions | Questions | ByAgentId | PK = agent_id |
| Get responses for question | Responses | - | PK = question_id |
| User's recent answers | Responses | ByFingerprint | PK = fingerprint_hash |
| Check duplicate answer | Responses | ByFingerprint | PK = fingerprint, filter question_id |
| Get eligible for notification | Subscriptions | ByLastNotified | PK = true, SK < threshold |
| Get user stats | UserStats | - | PK = fingerprint_hash |
| Leaderboard | UserStats | ByTotalPoints | PK = "_leaderboard", SK desc |

---

### Capacity Mode

**On-Demand (Pay-per-Request)**
- No capacity planning needed
- Scales automatically
- Cost-effective for variable/unpredictable load
- Can switch to provisioned if patterns stabilize

## Alternatives Considered

### Single-Table Design
- **Pros:** Fewer tables, potential for transactional operations
- **Cons:** Complex key design, harder to reason about, GSIs get complicated
- **Decision:** Separate tables are clearer for this domain model

### PostgreSQL
- **Pros:** Flexible queries, familiar SQL
- **Cons:** Always-on cost, connection pooling complexity with Lambda
- **Decision:** DynamoDB better fits serverless and access patterns

### Redis for UserStats
- **Pros:** Fast leaderboard operations
- **Cons:** Additional infrastructure, persistence concerns
- **Decision:** DynamoDB with GSI is sufficient for MVP leaderboard scale

## Consequences

### Positive
- Clear, simple table structure
- Access patterns are well-defined
- On-demand pricing means zero cost when idle
- TTL handles automatic cleanup of expired questions

### Negative
- Cannot easily add new access patterns without new GSIs
- Leaderboard is limited to top-N queries (acceptable for MVP)
- Denormalized `current_responses` requires atomic updates

### Risks
- GSI throttling if leaderboard queries are too frequent
- Fingerprint collisions (unlikely but possible)

## Related Documents

- [ADR-01: System Architecture](01-system-architecture.md)
- [ADR-03: API Design](03-api-design.md)
- [ADR-05: Abuse Prevention](05-abuse-prevention.md)
