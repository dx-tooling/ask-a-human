---
id: 02
title: Minimal Working API (Lambda + API Gateway)
source: ADR-01, ADR-03, ADR-06
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# Minimal Working API (Lambda + API Gateway)

## Description

Implement the core API infrastructure and a minimal vertical slice that enables the complete question-answer loop. This task focuses on getting something working end-to-end, deferring features like rate limiting, gamification, and notifications to later tasks.

This task creates:
1. API Gateway HTTP API with custom domain (`api.ask-a-human.com`)
2. Lambda functions for core endpoints
3. IAM roles and permissions
4. Terraform modules for API and Lambda

## Acceptance Criteria

### API Gateway Infrastructure
- [x] HTTP API created in API Gateway
- [x] Custom domain `api.ask-a-human.com` configured with ACM certificate
- [x] CORS configured for frontend origin
- [x] Routes configured for Lambda integrations
- [x] DNS CNAME record documented for IONOS

### Lambda Functions
- [x] Runtime: Python 3.13
- [x] Lambda execution IAM role with DynamoDB access
- [x] Environment variables for table names
- [x] Functions deployed and working:

#### Agent API
- [x] `POST /agent/questions` - Create a new question
  - Accepts: prompt, type, options (if MC), min_responses, timeout_seconds
  - Returns: question_id, status, poll_url, expires_at
  - Stores in `aah-questions` table
  
- [x] `GET /agent/questions/{question_id}` - Poll for responses
  - Returns: question details + responses array
  - Reads from `aah-questions` and `aah-responses` tables

#### Human API
- [x] `GET /human/questions` - List open questions
  - Returns: array of open questions (status=OPEN or PARTIAL)
  - Uses ByStatus GSI
  
- [x] `GET /human/questions/{question_id}` - Get single question
  - Returns: question details for answering
  
- [x] `POST /human/responses` - Submit an answer
  - Accepts: question_id, answer (text) or selected_option (MC), confidence
  - Stores in `aah-responses` table
  - Updates `current_responses` count in question
  - Returns: response_id, points_earned (placeholder: always 10)

### Terraform Modules
- [x] `modules/api/` - API Gateway configuration
- [x] `modules/lambda/` - Lambda function deployment
- [x] Production environment wires modules together

### Verification
- [x] Can create a question via curl/Postman
- [x] Can poll the question and see status=OPEN
- [x] Can submit a response via curl/Postman
- [x] Can poll and see the response in the responses array
- [x] Question status changes to CLOSED when min_responses reached

## Out of Scope (Deferred)

- Rate limiting (Task 03+)
- Idempotency keys (Task 03+)
- Fingerprint validation (Task 03+)
- Gamification/points calculation (Task 04+)
- Push notifications (Task 05+)
- X-Agent-Id header validation (Task 03+)

## Implementation Notes

### Reference Documents
- [ADR-01: System Architecture](../../architectural-decision-records/01-system-architecture.md)
- [ADR-03: API Design](../../architectural-decision-records/03-api-design.md)
- [ADR-06: Infrastructure as Code](../../architectural-decision-records/06-infrastructure-as-code.md)
- [PRD-02: Agent API](../../product-requirements-document/02-agent-api.md)

### AWS Details
- Region: `us-west-1`
- Account: `325062206315` (infra-webapp-prod)
- ACM Certificate: `arn:aws:acm:us-west-1:325062206315:certificate/9d8f702b-560d-404b-8250-730c4cd33f8d`
- Existing tables: `aah-questions`, `aah-responses`, `aah-subscriptions`, `aah-user-stats`

### Files Created

**Backend Application (`backend-app/`):**
```
backend-app/
├── src/
│   ├── __init__.py
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── agent_questions.py   # POST/GET /agent/questions
│   │   └── human_api.py         # GET/POST /human/*
│   ├── models/
│   │   ├── __init__.py
│   │   ├── question.py          # Question dataclass + DynamoDB ops
│   │   └── response.py          # Response dataclass + DynamoDB ops
│   └── utils/
│       ├── __init__.py
│       ├── api_response.py      # Standardized API responses
│       └── dynamodb.py          # DynamoDB client wrapper
├── requirements.txt
└── README.md
```

**Terraform Modules (`infrastructure/terraform/`):**
```
infrastructure/terraform/
├── modules/
│   ├── api/                     # API Gateway HTTP API module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── lambda/                  # Lambda function deployment module
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/prod/
    ├── main.tf                  # Wires all modules together
    ├── variables.tf
    ├── outputs.tf
    └── terraform.tfvars
```

### Lambda Functions Deployed
- `aah-agent-questions` - Handles `/agent/questions` endpoints
- `aah-human-api` - Handles `/human/questions` and `/human/responses` endpoints

### API Endpoints
| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/agent/questions` | agent_questions | Create question |
| GET | `/agent/questions/{question_id}` | agent_questions | Poll for responses |
| GET | `/human/questions` | human_api | List open questions |
| GET | `/human/questions/{question_id}` | human_api | Get single question |
| POST | `/human/responses` | human_api | Submit answer |

## Testing Plan

```bash
# 1. Create a question (Agent)
curl -X POST https://api.ask-a-human.com/agent/questions \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test question?", "type": "text", "min_responses": 1}'

# 2. List open questions (Human)
curl https://api.ask-a-human.com/human/questions

# 3. Submit a response (Human)
curl -X POST https://api.ask-a-human.com/human/responses \
  -H "Content-Type: application/json" \
  -d '{"question_id": "q_xxx", "answer": "Test answer", "confidence": 5}'

# 4. Poll for responses (Agent)
curl https://api.ask-a-human.com/agent/questions/q_xxx
```

## ADR/PRD Updates

- Updated Python runtime to 3.13 (from 3.12) to use latest Lambda-supported version
