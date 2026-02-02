---
name: Python Developer Tooling
overview: Set up comprehensive Python developer tooling for backend-app/ including formatting (Black, isort), linting (Ruff), type checking (mypy strict), security scanning (Bandit), testing (pytest), GitHub Actions CI, and a unified Makefile.
todos:
  - id: config-files
    content: Create pyproject.toml, Makefile, .python-version in backend-app/
    status: completed
  - id: github-workflows
    content: Create .github/workflows/backend-code-quality.yml and backend-tests.yml
    status: completed
  - id: test-infrastructure
    content: Create tests/ directory structure with conftest.py and initial test files
    status: completed
  - id: type-annotations
    content: Update all Python files with strict type annotations (dict -> dict[str, Any])
    status: completed
  - id: verify-quality
    content: Run make quality to verify all checks pass, fix any issues
    status: completed
  - id: update-readme
    content: Update backend-app/README.md with developer setup instructions
    status: completed
isProject: false
---

# Python Developer Tooling and Code Quality Guardrails

This plan implements best-in-class developer tooling for `backend-app/` based on the reference project patterns.

## Current State

- **Existing code**: 6 Python modules in `src/` (handlers, models, utils) with basic type hints and docstrings
- **Configuration**: Only empty `requirements.txt` exists
- **Tests**: None
- **CI/CD**: No root-level GitHub workflows

## Phase 1: Configuration Files

### 1.1 Create `pyproject.toml`

Create [backend-app/pyproject.toml](backend-app/pyproject.toml) with all tool configurations:

```toml
[project]
name = "ask-a-human-backend"
version = "0.1.0"
requires-python = "==3.13.*"

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=4.1",
    "black>=24.0",
    "isort>=5.13",
    "ruff>=0.2",
    "mypy>=1.8",
    "bandit>=1.7",
    "boto3-stubs[dynamodb]>=1.34",
]

[tool.black]
line-length = 120
target-version = ["py313"]

[tool.mypy]
python_version = "3.13"
strict = true
# ... full strict configuration

[tool.ruff]
line-length = 120
target-version = "py313"
select = ["E", "F", "C90", "I", "N", "A", "B", "C4", "D", "EM", "G", "SIM", "ARG", "PT", "PTH"]
# ... full ruff config

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
markers = ["slow", "integration"]

[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*"]
```

### 1.2 Create `Makefile`

Create [backend-app/Makefile](backend-app/Makefile) with CI-aware targets:

- `make install` - Create venv, install dev dependencies
- `make format` / `make format-check` - Black + isort
- `make lint` / `make lint-fix` - Ruff
- `make type-check` - mypy strict
- `make security-check` - Bandit (excluding tests)
- `make test` / `make test-coverage` - pytest with coverage
- `make quality` - All checks with formatting
- `make ci-quality` - All checks without modifications

Key pattern from reference: CI detection (`CI=true`) to switch between venv and direct commands.

### 1.3 Create `.python-version`

Create [backend-app/.python-version](backend-app/.python-version) with `3.13`.

## Phase 2: GitHub Actions Workflows

Create root-level `.github/workflows/` directory:

### 2.1 Code Quality Workflow

Create [.github/workflows/backend-code-quality.yml](.github/workflows/backend-code-quality.yml):

- Triggers: push/PR to main (paths: `backend-app/**`)
- Python: 3.13 (pinned to match Lambda runtime)
- Runs: `make ci-quality` in `backend-app/`

### 2.2 Tests Workflow

Create [.github/workflows/backend-tests.yml](.github/workflows/backend-tests.yml):

- Triggers: push/PR to main (paths: `backend-app/**`)
- Python: 3.13 (pinned to match Lambda runtime)
- Runs: `make test-coverage` in `backend-app/`

## Phase 3: Test Infrastructure

### 3.1 Create Test Directory Structure

```
backend-app/tests/
├── __init__.py
├── conftest.py          # pytest fixtures (mock DynamoDB tables)
├── handlers/
│   ├── __init__.py
│   ├── test_agent_questions.py
│   └── test_human_api.py
└── models/
    ├── __init__.py
    ├── test_question.py
    └── test_response.py
```

### 3.2 Create `conftest.py`

Set up pytest fixtures for:

- Mocked DynamoDB tables using `unittest.mock`
- Environment variables for table names
- Sample question/response data

### 3.3 Create Initial Tests

At least one test per handler to validate the framework works:

- `test_agent_questions.py`: Test POST creates question, GET retrieves it
- `test_human_api.py`: Test list questions, get question, submit response
- `test_question.py`: Test Question model serialization/deserialization
- `test_response.py`: Test Response model serialization/deserialization

## Phase 4: Update Existing Code for Strict Type Checking

The existing code has basic type hints but needs refinement for strict mypy:

### 4.1 Type Annotation Improvements

Update all modules with stricter types:


| File                          | Changes Needed                                   |
| ----------------------------- | ------------------------------------------------ |
| `handlers/agent_questions.py` | `dict` → `dict[str, Any]` for event/return types |
| `handlers/human_api.py`       | Same pattern                                     |
| `models/question.py`          | Add `dict[str, Any]` return types to methods     |
| `models/response.py`          | Same pattern                                     |
| `utils/api_response.py`       | Add `dict[str, Any]` return types                |
| `utils/dynamodb.py`           | Add return types to `get_*_table()` functions    |


### 4.2 Add Missing Docstrings

Most modules have docstrings, but ensure Google-style docstrings on all public functions with Args/Returns sections.

## Phase 5: Update Documentation

### 5.1 Update `backend-app/README.md`

Add sections for:

- Developer setup (venv creation, `make install`)
- Quality checks (`make quality`, `make ci-quality`)
- Running tests (`make test`, `make test-coverage`)
- CI/CD information

## Verification Checklist

After implementation, verify:

1. `make install` creates working venv
2. `make format` formats code without errors
3. `make lint` passes (fix any issues)
4. `make type-check` passes (add annotations as needed)
5. `make security-check` passes
6. `make test` runs without errors
7. `make quality` passes all checks
8. GitHub Actions workflows pass (may need to push to test)

## File Summary


| New File                                     | Purpose                 |
| -------------------------------------------- | ----------------------- |
| `backend-app/pyproject.toml`                 | All tool configurations |
| `backend-app/Makefile`                       | Unified build commands  |
| `backend-app/.python-version`                | Python version pin      |
| `.github/workflows/backend-code-quality.yml` | CI quality checks       |
| `.github/workflows/backend-tests.yml`        | CI test runner          |
| `backend-app/tests/conftest.py`              | Pytest fixtures         |
| `backend-app/tests/handlers/test_*.py`       | Handler tests           |
| `backend-app/tests/models/test_*.py`         | Model tests             |


## Risk Mitigation

- **API still works**: No changes to core business logic, only adding type annotations and tooling
- **Incremental verification**: Run `make quality` after each major change to catch issues early
- **Type stubs**: Use `boto3-stubs[dynamodb]` to avoid mypy errors with boto3
- **Python version**: Pinned to 3.13 to match AWS Lambda runtime exactly

