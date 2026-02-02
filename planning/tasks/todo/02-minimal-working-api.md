---
id: 02
title: Minimal Working API (Lambda + API Gateway)
source: ADR-01, ADR-03, ADR-06
priority: high
created: 2026-02-02
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
- [ ] HTTP API created in API Gateway
- [ ] Custom domain `api.ask-a-human.com` configured with ACM certificate
- [ ] CORS configured for frontend origin
- [ ] Routes configured for Lambda integrations
- [ ] DNS CNAME record documented for IONOS

### Lambda Functions
- [ ] Runtime: Python 3.12 or Node.js 20.x (decide during implementation)
- [ ] Lambda execution IAM role with DynamoDB access
- [ ] Environment variables for table names
- [ ] Functions deployed and working:

#### Agent API
- [ ] `POST /agent/questions` - Create a new question
  - Accepts: prompt, type, options (if MC), min_responses, timeout_seconds
  - Returns: question_id, status, poll_url, expires_at
  - Stores in `aah-questions` table
  
- [ ] `GET /agent/questions/{question_id}` - Poll for responses
  - Returns: question details + responses array
  - Reads from `aah-questions` and `aah-responses` tables

#### Human API
- [ ] `GET /human/questions` - List open questions
  - Returns: array of open questions (status=OPEN or PARTIAL)
  - Uses ByStatus GSI
  
- [ ] `GET /human/questions/{question_id}` - Get single question
  - Returns: question details for answering
  
- [ ] `POST /human/responses` - Submit an answer
  - Accepts: question_id, answer (text) or selected_option (MC), confidence
  - Stores in `aah-responses` table
  - Updates `current_responses` count in question
  - Returns: response_id, points_earned (placeholder: always 10)

### Terraform Modules
- [ ] `modules/api/` - API Gateway configuration
- [ ] `modules/lambda/` - Lambda function deployment
- [ ] Production environment wires modules together

### Verification
- [ ] Can create a question via curl/Postman
- [ ] Can poll the question and see status=OPEN
- [ ] Can submit a response via curl/Postman
- [ ] Can poll and see the response in the responses array
- [ ] Question status changes to CLOSED when min_responses reached

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

### Directory Structure
```
backend-app/
├── src/
│   ├── handlers/
│   │   ├── agent_questions.py      # POST/GET /agent/questions
│   │   └── human_responses.py      # GET/POST /human/*
│   ├── models/
│   │   ├── question.py
│   │   └── response.py
│   └── utils/
│       └── dynamodb.py
├── requirements.txt
└── README.md

infrastructure/terraform/
├── modules/
│   ├── api/                        # NEW: API Gateway module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── lambda/                     # NEW: Lambda module
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/prod/
    └── main.tf                     # Wire new modules
```

### API Gateway Custom Domain
After Terraform apply, add CNAME at IONOS:
- `api.ask-a-human.com` → API Gateway domain name (from Terraform output)

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

(To be filled during implementation if any changes needed)
