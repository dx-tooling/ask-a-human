# ADR-05: Abuse Prevention

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

The Ask-a-Human platform allows anonymous participation. While this reduces friction and increases accessibility, it also creates opportunities for abuse:

- **Spam answers** - Low-quality or nonsense responses
- **Gaming** - Automated or bulk answering for points
- **Flooding** - Overwhelming the system with requests
- **Manipulation** - Coordinated responses to skew results

We need abuse prevention that:
- Works without user accounts/authentication
- Doesn't create excessive friction for legitimate users
- Can be tuned as we learn from real usage
- Scales with the system

## Decision

### Defense in Depth

We will implement **multiple layers of protection**, each catching different types of abuse:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Layer 1: Edge                             │
│              CloudFront + API Gateway Rate Limits                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 2: Identification                       │
│                   Soft Fingerprinting (Hash)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 3: Behavioral                           │
│           Response Time, Patterns, Duplicate Detection           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 4: Quality (Future)                     │
│              Answer Scoring, Shadow Banning                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Edge Rate Limiting

### CloudFront Rate Limiting

Applied at the CDN level before requests reach API Gateway:

| Limit | Value | Scope |
|-------|-------|-------|
| Requests per second | 100 | Per IP |
| Burst | 500 | Per IP |

This blocks volumetric attacks before they consume Lambda resources.

### API Gateway Rate Limits

Applied per endpoint:

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| POST /agent/questions | 60 | 1 hour | Per agent ID |
| GET /agent/questions/* | 600 | 1 hour | Per agent ID |
| POST /human/responses | 30 | 1 hour | Per fingerprint |
| GET /human/questions | 300 | 1 hour | Per IP |
| POST /human/push/subscribe | 10 | 1 hour | Per IP |

---

## Layer 2: Soft Fingerprinting

### Purpose

Identify unique users without requiring accounts. Used for:
- One answer per question enforcement
- Rate limiting per user
- Gamification persistence

### Implementation

Generate a hash from stable browser characteristics:

```javascript
const fingerprint = await generateFingerprint({
  // Stable signals (don't change often)
  userAgent: navigator.userAgent,
  language: navigator.language,
  screenResolution: `${screen.width}x${screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  
  // Semi-stable signals
  colorDepth: screen.colorDepth,
  deviceMemory: navigator.deviceMemory,
  hardwareConcurrency: navigator.hardwareConcurrency,
});

// Hash to fixed-length, non-reversible string
const fingerprintHash = sha256(fingerprint);
```

### Privacy Considerations

- **Hash only** - Original values never stored
- **Non-reversible** - Cannot reconstruct browser characteristics
- **Short-lived correlation** - Not used for cross-site tracking
- **No PII** - No IP addresses, cookies, or identifiers stored

### Collision Handling

Fingerprint collisions are possible but rare. Impact is limited:
- User might not be able to answer a question (thinks they already did)
- Gamification stats might merge with another user

This is acceptable for an anonymous system.

---

## Layer 3: Behavioral Analysis

### Response Time Heuristics

Track time from page load to answer submission:

```python
def is_suspicious_timing(response_time_ms, question_type):
    if question_type == "text":
        # Text answers need time to read and type
        min_expected_ms = 5000  # 5 seconds
    else:
        # Multiple choice can be faster
        min_expected_ms = 2000  # 2 seconds
    
    return response_time_ms < min_expected_ms
```

Responses submitted too quickly are:
1. Flagged for review (v1)
2. Silently discarded (v2, if pattern proves reliable)

### Duplicate Detection

Prevent the same user from answering the same question:

```python
def can_answer(fingerprint_hash, question_id):
    existing = responses.query(
        fingerprint_hash=fingerprint_hash,
        question_id=question_id
    )
    return len(existing) == 0
```

### Pattern Detection

Flag suspicious patterns:

| Pattern | Detection | Action |
|---------|-----------|--------|
| Rapid sequential answers | >5 answers in 1 minute | Temporary slowdown |
| Identical answers | Same text across questions | Flag for review |
| All minimum-length | Consistently shortest possible | Flag for review |

---

## Layer 4: Quality Scoring (Future)

Not implemented in v1, but designed for:

### Answer Quality Signals

| Signal | Description |
|--------|-------------|
| Length | Very short answers may be low effort |
| Uniqueness | Answers similar to others may be copied |
| Consistency | User's answers align with others on easy questions |
| Engagement | User reads question fully before answering |

### Shadow Banning

Low-quality contributors can be shadow banned:
- Their answers are accepted but not counted
- They continue to earn points (don't know they're banned)
- Reduces incentive to create new fingerprints

---

## Agent-Side Protections

### Idempotency Keys

Prevent duplicate question submissions:

```python
def create_question(request):
    if request.idempotency_key:
        existing = questions.get_by_idempotency_key(
            agent_id=request.agent_id,
            idempotency_key=request.idempotency_key
        )
        if existing:
            return existing  # Return existing question
    
    # Create new question
    ...
```

### Agent Rate Limiting

Per-agent limits prevent runaway agents:

| Limit | Value | Rationale |
|-------|-------|-----------|
| Questions per hour | 60 | Prevents flooding |
| Concurrent open questions | 100 | Bounds human attention |
| Max required_responses | 50 | Limits per-question load |

### Question Validation

| Validation | Limit |
|------------|-------|
| Prompt length | 2000 characters |
| Options count | 2-10 items |
| Option length | 200 characters each |
| Timeout | 60-86400 seconds |

---

## Monitoring and Response

### Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| Rate limit hits | >100/minute |
| Suspicious timing | >10% of responses |
| Duplicate attempts | >50/hour |
| Failed submissions | >5% error rate |

### Manual Review Queue

Flagged responses are stored for review:

```
FlaggedResponses:
- response_id
- flag_reason: "suspicious_timing" | "duplicate_content" | "pattern_match"
- flagged_at
- reviewed: boolean
- action_taken: "approved" | "rejected" | "banned"
```

### Escalation Path

1. **Automated** - Rate limits, timing checks
2. **Flagging** - Suspicious patterns queued for review
3. **Manual** - Human reviews flagged content
4. **Banning** - Fingerprint or IP blocked

---

## Alternatives Considered

### CAPTCHA
- **Pros:** Proven bot prevention
- **Cons:** Friction, accessibility issues, doesn't stop humans gaming
- **Decision:** Not for v1; can add selectively if needed

### Account Requirements
- **Pros:** Strong identity, easier to ban
- **Cons:** High friction, contradicts anonymous design
- **Decision:** Against core product philosophy

### Proof of Work
- **Pros:** Computational cost deters abuse
- **Cons:** Battery drain on mobile, poor UX
- **Decision:** Too aggressive for legitimate users

### Machine Learning
- **Pros:** Adaptive, catches novel attacks
- **Cons:** Complexity, training data needed, false positives
- **Decision:** Not for v1; consider when we have data

## Consequences

### Positive
- Multiple layers provide defense in depth
- Legitimate users experience minimal friction
- Can tune thresholds based on real data
- Privacy-preserving approach

### Negative
- Sophisticated attackers can still game the system
- Fingerprinting has collisions
- Manual review doesn't scale infinitely

### Risks
- False positives frustrate legitimate users
- Fingerprinting may become less reliable (browser changes)
- Coordinated attacks can overwhelm manual review

## Related Documents

- [ADR-01: System Architecture](01-system-architecture.md)
- [ADR-02: Database Schema](02-database-schema.md)
- [ADR-03: API Design](03-api-design.md)
