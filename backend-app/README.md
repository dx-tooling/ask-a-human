# Ask-a-Human Backend

Lambda functions for the Ask-a-Human API.

## Structure

```
backend-app/
├── src/
│   ├── handlers/              # Lambda entry points
│   │   ├── agent_questions.py # POST/GET /agent/questions
│   │   └── human_api.py       # GET/POST /human/*
│   ├── models/                # Data models + DynamoDB operations
│   │   ├── question.py
│   │   └── response.py
│   └── utils/                 # Shared utilities
│       ├── api_response.py    # Standardized API responses
│       └── dynamodb.py        # DynamoDB client wrapper
├── requirements.txt
└── README.md
```

## Endpoints

### Agent API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/questions` | Create a new question |
| GET | `/agent/questions/{question_id}` | Poll for responses |

### Human API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/human/questions` | List open questions |
| GET | `/human/questions/{question_id}` | Get single question |
| POST | `/human/responses` | Submit an answer |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `QUESTIONS_TABLE` | DynamoDB table name for questions (default: `aah-questions`) |
| `RESPONSES_TABLE` | DynamoDB table name for responses (default: `aah-responses`) |

## Local Development

The Lambda functions use `boto3` which is provided by the AWS Lambda runtime.
For local testing, ensure you have AWS credentials configured.

## Deployment

Deployed via Terraform. See `infrastructure/terraform/` for configuration.

## Reference Documents

- [ADR-02: Database Schema](../planning/architectural-decision-records/02-database-schema.md)
- [ADR-03: API Design](../planning/architectural-decision-records/03-api-design.md)
- [PRD-02: Agent API](../planning/product-requirements-document/02-agent-api.md)
