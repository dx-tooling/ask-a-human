# PRD-04: Question Lifecycle

**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Draft

## Overview

This document defines how questions flow through the Ask-a-Human system, from agent submission to completion or expiration. Understanding this lifecycle is essential for both agent integration and human experience design.

---

## Question States

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌──────┐       ┌────────┐       ┌─────────┐       ┌──────────┐
│CREATE│──────►│  OPEN  │──────►│ PARTIAL │──────►│  CLOSED  │
└──────┘       └────────┘       └─────────┘       └──────────┘
                    │                │
                    │                │
                    ▼                ▼
               ┌─────────┐     ┌─────────┐
               │ EXPIRED │     │ EXPIRED │
               └─────────┘     └─────────┘
```

### State Definitions

| State | Description |
|-------|-------------|
| **OPEN** | Question created, accepting responses, 0 responses received |
| **PARTIAL** | Has some responses, still accepting more |
| **CLOSED** | Required responses reached, no longer accepting |
| **EXPIRED** | Timeout reached before sufficient responses |

---

## State Transitions

### OPEN → PARTIAL
**Trigger:** First response submitted
**Actions:**
- Update `current_responses` count
- Continue accepting responses

### PARTIAL → CLOSED
**Trigger:** `current_responses >= required_responses`
**Actions:**
- Set status to CLOSED
- Set `closed_at` timestamp
- Stop accepting new responses
- Question remains queryable by agent

### OPEN/PARTIAL → EXPIRED
**Trigger:** `expires_at` timestamp reached
**Actions:**
- Set status to EXPIRED
- Stop accepting new responses
- Responses collected so far remain available
- Question eventually deleted by TTL

---

## Question Creation

### Agent Request

```json
POST /agent/questions
{
  "prompt": "Should this error message apologize?",
  "type": "text",
  "audience": ["product"],
  "min_responses": 5,
  "timeout_seconds": 3600
}
```

### System Processing

1. **Validate request**
   - Prompt length (10-2000 chars)
   - Type is "text" or "multiple_choice"
   - Options provided if multiple_choice (2-10 items)
   - min_responses in range (1-50)
   - timeout_seconds in range (60-86400)

2. **Check idempotency**
   - If idempotency_key provided, check for existing question
   - Return existing if found

3. **Create question record**
   - Generate question_id (UUID with prefix `q_`)
   - Set status = OPEN
   - Calculate expires_at = now + timeout_seconds
   - Set current_responses = 0
   - Store in DynamoDB

4. **Trigger notifications**
   - Enqueue message to SQS
   - Notification dispatcher will fan out to eligible users

5. **Return response**
   ```json
   {
     "question_id": "q_abc123",
     "status": "OPEN",
     "poll_url": "/agent/questions/q_abc123",
     "expires_at": "2026-02-02T15:00:00Z"
   }
   ```

---

## Response Submission

### Human Request

```json
POST /human/responses
{
  "question_id": "q_abc123",
  "answer": "Just state the facts.",
  "confidence": 4
}
```

### System Processing

1. **Validate question**
   - Question exists
   - Status is OPEN or PARTIAL
   - Not expired

2. **Check fingerprint**
   - User hasn't already answered this question
   - User within rate limits

3. **Validate response**
   - Answer provided (text) or selected_option (MC)
   - Answer length reasonable (1-5000 chars)
   - selected_option in valid range

4. **Apply heuristics**
   - Response time > minimum threshold
   - Not suspicious pattern

5. **Store response**
   - Generate response_id
   - Store in Responses table
   - Record response_time_ms

6. **Update question**
   - Increment current_responses
   - Update status if threshold reached

7. **Update user stats**
   - Add points
   - Check for badges
   - Update streak

8. **Return response**
   ```json
   {
     "response_id": "r_xyz789",
     "points_earned": 17,
     "new_badges": [],
     "total_points": 167
   }
   ```

---

## Notification Flow

### Trigger Points

| Event | Action |
|-------|--------|
| Question created | Immediate notification dispatch |
| Question under-answered | Catch-up notification (after 15 min) |
| Periodic check | EventBridge scheduled rule |

### Dispatch Algorithm

```python
def dispatch_notifications(question):
    # 1. Calculate target notifications
    responses_needed = question.required_responses - question.current_responses
    target_notifications = responses_needed * 3  # Over-notify
    
    # 2. Find eligible subscriptions
    eligible = subscriptions.query(
        active=True,
        last_notified_at < now() - subscription.min_interval
    )
    
    # 3. Filter by audience match (if specified)
    if question.audience:
        # Future: user preferences for categories
        pass
    
    # 4. Random sample
    to_notify = random.sample(
        eligible,
        min(target_notifications, len(eligible))
    )
    
    # 5. Send notifications
    for subscription in to_notify:
        send_push(subscription, question)
        subscription.update(last_notified_at=now())
```

### Notification Content

```json
{
  "notification": {
    "title": "Help an AI decide",
    "body": "A quick question needs your input (30s)",
    "icon": "/icons/notification.png"
  },
  "data": {
    "question_id": "q_abc123",
    "type": "text",
    "url": "/q/abc123"
  }
}
```

---

## Expiration Handling

### TTL-Based Cleanup

Questions have a TTL attribute (`expires_at`) that DynamoDB uses for automatic deletion:

- Questions are deleted ~24 hours after expiration
- Responses are retained for analytics (separate TTL)
- Agent can still query until actual deletion

### Expired Question Query

Agent polling an expired question:

```json
{
  "question_id": "q_abc123",
  "status": "EXPIRED",
  "prompt": "Should this error message...",
  "required_responses": 5,
  "current_responses": 2,
  "expired_at": "2026-02-02T15:00:00Z",
  "responses": [
    {"answer": "Just state the facts.", "confidence": 4},
    {"answer": "A brief apology is nice.", "confidence": 3}
  ]
}
```

---

## Agent Polling Strategy

### Recommended Pattern

```python
def wait_for_responses(question_id, min_count=None, max_wait=300):
    """
    Poll for responses with exponential backoff.
    Returns when min_count reached, question closed, or max_wait exceeded.
    """
    start = time.time()
    wait_time = 5  # Start with 5 second intervals
    
    while time.time() - start < max_wait:
        response = poll_question(question_id)
        
        # Check completion conditions
        if response.status == "CLOSED":
            return response
        if response.status == "EXPIRED":
            return response
        if min_count and response.current_responses >= min_count:
            return response
        
        # Exponential backoff with cap
        time.sleep(wait_time)
        wait_time = min(wait_time * 1.5, 60)  # Cap at 60 seconds
    
    # Return whatever we have
    return poll_question(question_id)
```

### Polling Intervals

| Time Since Creation | Recommended Interval |
|--------------------|---------------------|
| 0-5 minutes | 5-10 seconds |
| 5-15 minutes | 15-30 seconds |
| 15-60 minutes | 30-60 seconds |
| 1+ hours | 60-120 seconds |

---

## Edge Cases

### Duplicate Submissions

**Scenario:** Agent submits same question twice (e.g., retry after timeout)

**Handling:** 
- Use idempotency_key to detect
- Return existing question, don't create new

### Race Condition: Closing

**Scenario:** Multiple responses arrive simultaneously, putting count over threshold

**Handling:**
- DynamoDB conditional update ensures atomic increment
- First response that crosses threshold triggers CLOSED
- Subsequent responses are rejected with 410 Gone

### Late Responses

**Scenario:** Response arrives after question expired

**Handling:**
- Return 410 Gone error
- Don't store response
- Don't award points

### Fingerprint Change

**Scenario:** User's fingerprint changes mid-session

**Handling:**
- New fingerprint treated as new user
- Old stats not accessible
- Can answer questions again (but rate limits still apply)

---

## Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Questions created | Rate of new questions | Spike: >10x normal |
| Response rate | Responses per minute | Drop: <50% of normal |
| Completion rate | % questions reaching CLOSED | <80% |
| Time to first response | Median time | >10 minutes |
| Time to completion | Median time to CLOSED | >30 minutes |
| Expiration rate | % questions expiring | >20% |

### Alerts

| Condition | Action |
|-----------|--------|
| Completion rate < 70% | Review notification effectiveness |
| Time to first response > 15 min | Check push notification delivery |
| Expiration rate > 30% | Increase notification frequency |

---

## Data Retention

| Data | Retention | Rationale |
|------|-----------|-----------|
| Open/Partial questions | Until completion or expiration | Active use |
| Closed questions | 7 days after closure | Agent may need to re-query |
| Expired questions | 24 hours after expiration | Cleanup grace period |
| Responses | 30 days | Analytics and quality review |
| Aggregated stats | Indefinite | Long-term analytics |

---

## Related Documents

- [ADR-02: Database Schema](../architectural-decision-records/02-database-schema.md)
- [ADR-03: API Design](../architectural-decision-records/03-api-design.md)
- [ADR-04: Push Notifications](../architectural-decision-records/04-push-notifications.md)
- [PRD-02: Agent API](02-agent-api.md)
