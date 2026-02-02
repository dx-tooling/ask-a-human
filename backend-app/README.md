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
├── tests/                     # Test suite
│   ├── conftest.py            # Pytest fixtures
│   ├── handlers/              # Handler tests
│   └── models/                # Model tests
├── pyproject.toml             # Project configuration
├── Makefile                   # Development commands
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

## Developer Setup

### Prerequisites

- Python 3.13 (pinned in `.python-version`)
- Make

### Installation

```bash
# Create virtual environment and install dependencies
make install
```

### Running Quality Checks

```bash
# Run all checks with auto-formatting
make quality

# Run all checks without modifications (CI mode)
make ci-quality
```

### Individual Commands

```bash
# Format code with black and isort
make format

# Check formatting without changes
make format-check

# Run linter (ruff)
make lint

# Run linter with auto-fix
make lint-fix

# Run type checker (mypy)
make type-check

# Run security scan (bandit)
make security-check
```

### Running Tests

```bash
# Run tests
make test

# Run tests with coverage report
make test-coverage
```

### Cleanup

```bash
# Remove build artifacts and caches
make clean
```

## Code Quality Tools

- **Black**: Code formatting (line-length: 120)
- **isort**: Import sorting (black-compatible profile)
- **Ruff**: Fast Python linter (replaces flake8)
- **mypy**: Static type checking (strict mode)
- **Bandit**: Security vulnerability scanning
- **pytest**: Testing framework with coverage

## CI/CD

Quality checks and tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch

Workflows:
- `.github/workflows/backend-code-quality.yml` - Runs `make ci-quality`
- `.github/workflows/backend-tests.yml` - Runs `make test-coverage`

## Deployment

Deployed via Terraform. See `infrastructure/terraform/` for configuration.

## Reference Documents

- [ADR-02: Database Schema](../planning/architectural-decision-records/02-database-schema.md)
- [ADR-03: API Design](../planning/architectural-decision-records/03-api-design.md)
- [PRD-02: Agent API](../planning/product-requirements-document/02-agent-api.md)
