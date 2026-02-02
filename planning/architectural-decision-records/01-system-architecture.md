# ADR-01: System Architecture Overview

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

We are building "Ask-a-Human" - a Human-in-the-Loop as a Service (HITL-aaS) platform that allows LLM agents to request human input for questions where they lack confidence or need subjective judgment.

Key requirements:
- Agents submit questions asynchronously and poll for responses
- Humans answer questions via a mobile-first web interface
- Push notifications alert humans to new questions
- No authentication required for answering (anonymous participation)
- Must scale horizontally with human supply being the only real bottleneck
- Launch quickly while avoiding architectural dead-ends

## Decision

We will use a **serverless AWS architecture** with the following components:

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AGENT SIDE                                  │
│  ┌───────────┐      ┌───────────┐                                       │
│  │ LLM Agent │ ──── │ MCP Tool  │                                       │
│  └───────────┘      └─────┬─────┘                                       │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS INFRASTRUCTURE                               │
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │   API Gateway   │ ──► │     Lambda      │ ──► │    DynamoDB     │   │
│  │   (HTTP API)    │     │   (Functions)   │     │    (Tables)     │   │
│  └─────────────────┘     └────────┬────────┘     └─────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│                          ┌─────────────────┐                            │
│                          │       SQS       │                            │
│                          │  (Job Queue)    │                            │
│                          └────────┬────────┘                            │
│                                   │                                      │
│  ┌─────────────────┐              │                                      │
│  │  S3 + CloudFront│              │                                      │
│  │   (PWA Host)    │              │                                      │
│  └─────────────────┘              │                                      │
│                                   │                                      │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION LAYER                                 │
│  ┌─────────────────┐     ┌─────────────────┐                            │
│  │  Lambda (SQS    │ ──► │ Firebase Cloud  │                            │
│  │   Consumer)     │     │   Messaging     │                            │
│  └─────────────────┘     └────────┬────────┘                            │
│                                   │                                      │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │ Web Push
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            HUMAN SIDE                                    │
│  ┌─────────────────┐     ┌─────────────────┐                            │
│  │ Mobile Browser  │ ◄── │       PWA       │                            │
│  │ (iOS/Android)   │     │   (Frontend)    │                            │
│  └─────────────────┘     └─────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Details

#### API Gateway (HTTP API)
- Serves both agent and human API endpoints
- Handles rate limiting at the edge
- Custom domain: `api.aah.dx-tooling.org`

#### Lambda Functions
- **Question API**: Create questions, poll for responses
- **Response API**: Submit answers, fetch open questions
- **Notification Dispatcher**: Process SQS messages, send push notifications
- **Stats API**: Gamification stats and leaderboards

#### DynamoDB
- Questions table (question metadata and status)
- Responses table (human answers)
- Subscriptions table (push notification tokens)
- UserStats table (gamification data, keyed by fingerprint)

#### SQS
- Decouples question creation from notification dispatch
- Enables retry logic and dead-letter queues
- Allows independent scaling of notification workers

#### S3 + CloudFront
- Hosts the PWA static assets
- Global CDN distribution
- Custom domain: `aah.dx-tooling.org`
- HTTPS via ACM certificate

#### Firebase Cloud Messaging (FCM)
- Handles web push to Android and iOS (PWA)
- Unified API for both platforms
- Free at expected scale

### Why This Stack?

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Compute | Lambda | Zero idle cost, auto-scaling, no servers to manage |
| API | API Gateway HTTP | Lower cost than REST API, sufficient features |
| Database | DynamoDB | Serverless, scales automatically, pay-per-request |
| Queue | SQS | Managed, reliable, integrates natively with Lambda |
| Static Hosting | S3 + CloudFront | Global CDN, cheap, integrates with ACM |
| Push | FCM | Best web push support, handles iOS PWA quirks |

## Alternatives Considered

### PostgreSQL + RDS
- **Pros:** Familiar SQL, flexible queries, strong consistency
- **Cons:** Always-on cost, scaling complexity, connection management in Lambda
- **Decision:** DynamoDB better fits our access patterns and serverless model

### SNS for Push Notifications
- **Pros:** All-AWS stack
- **Cons:** Web push support is limited, would need to manage VAPID keys manually
- **Decision:** FCM provides better web push UX, especially for iOS PWA

### Render/Fly.io + Postgres
- **Pros:** Simpler mental model, familiar stack
- **Cons:** Always-on costs, less AWS integration
- **Decision:** Serverless AWS better for variable load and low initial traffic

### WebSockets for Real-time Updates
- **Pros:** Instant updates to agents
- **Cons:** Complexity, connection management, not needed for MVP
- **Decision:** Polling is sufficient for v1; can add later if needed

## Consequences

### Positive
- Zero cost when idle (important during beta)
- Automatic scaling with demand
- No server management
- All infrastructure as code (Terraform)
- Clear separation of concerns

### Negative
- Cold start latency on Lambda (mitigated by provisioned concurrency if needed)
- DynamoDB query patterns must be designed upfront
- FCM adds external dependency (but it's free and reliable)
- Learning curve for DynamoDB if unfamiliar

### Risks
- DynamoDB access patterns may need revision as features evolve
- iOS PWA push notifications require user to "Add to Home Screen"

## Related Documents

- [ADR-02: Database Schema Design](02-database-schema.md)
- [ADR-03: API Design](03-api-design.md)
- [ADR-04: Push Notification Strategy](04-push-notifications.md)
- [ADR-06: Infrastructure as Code](06-infrastructure-as-code.md)
- [Infrastructure Accounts](../fundamentals/01-available-infrastructure-accounts-and-services.md) - AWS accounts, Firebase project, credentials
- [Living Styleguide](../../living-styleguide/README.md) - Visual design reference, corporate identity
