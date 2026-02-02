---
id: 03
title: Python Developer Tooling and Code Quality Guardrails
source: Best practices, reference project platform-problem-monitoring-core
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# Python Developer Tooling and Code Quality Guardrails

## Description

Set up best-in-class developer tooling and guardrails for the Python codebase (`backend-app/`). The goal is to make it near-impossible to produce sub-par code by enforcing formatting, linting, type checking, security scanning, and testing at every stage of development.

This task creates a comprehensive quality assurance pipeline including:
1. Code formatting (Black, isort)
2. Linting (Ruff - replaces flake8 with better performance)
3. Static type checking (mypy with strict mode)
4. Security scanning (Bandit)
5. Testing framework (pytest with coverage)
6. ~~Pre-commit hooks for local enforcement~~ (removed per user request)
7. GitHub Actions workflows for CI enforcement
8. Makefile for unified developer experience

## Reference Implementation

Use `/Users/manuel/git/github/dx-tooling/platform-problem-monitoring-core` as the gold standard reference. Adapt its tooling configuration to the `backend-app/` structure.

## Acceptance Criteria

### Package Configuration
- [x] `pyproject.toml` with all tool configurations:
  - Project metadata and dependencies
  - Black configuration (line-length: 120)
  - mypy strict mode configuration
  - isort configuration (black-compatible profile)
  - Ruff linting configuration with comprehensive rule set
  - pytest configuration with markers
  - Coverage configuration
  - Bandit security scanning configuration

### Code Formatting
- [x] Black for code formatting
- [x] isort for import sorting (black-compatible)
- [x] Formats can be checked without modification (for CI)
- [x] Formats can be auto-applied (for development)

### Linting
- [x] Ruff configured with comprehensive rules:
  - E, F: pycodestyle, Pyflakes
  - C90: McCabe complexity
  - I: isort
  - N: pep8-naming
  - A: flake8-builtins
  - B: flake8-bugbear
  - C4: flake8-comprehensions
  - D: flake8-docstrings (Google style)
  - EM: flake8-errmsg
  - G: flake8-logging-format
  - SIM: flake8-simplify
  - ARG: flake8-unused-arguments
  - PT: flake8-pytest-style
  - PTH: flake8-use-pathlib
- [x] Auto-fix mode available for applicable rules

### Type Checking
- [x] mypy with strict configuration:
  - `disallow_untyped_defs = true`
  - `disallow_incomplete_defs = true`
  - `check_untyped_defs = true`
  - `no_implicit_optional = true`
  - `strict_optional = true`
  - `warn_redundant_casts = true`
  - `warn_unused_ignores = true`
  - `warn_no_return = true`
  - `warn_unreachable = true`
- [x] Type stubs for boto3 and other dependencies
- [x] All existing code passes type checking (add annotations as needed)

### Security Scanning
- [x] Bandit configured for security checks
- [x] Test files excluded from scanning
- [x] Appropriate skips for known false positives

### Testing
- [x] pytest as test framework
- [x] pytest-cov for coverage reporting
- [x] Test directory structure: `backend-app/tests/`
- [x] At least one test per handler to validate framework works
- [x] Coverage targets configured
- [x] Test markers for slow/integration tests

### Pre-commit Hooks
- [x] ~~`.pre-commit-config.yaml` configured~~ **SKIPPED** - Per user request, no pre-commit hooks. Quality enforced via CI only.

### CI/CD Workflows
- [x] `.github/workflows/backend-code-quality.yml`:
  - Runs on push to main and PRs
  - Python 3.13 (pinned to Lambda runtime)
  - Runs all quality checks via Makefile
- [x] `.github/workflows/backend-tests.yml`:
  - Runs on push to main and PRs
  - Python 3.13
  - Coverage reporting

### Makefile
- [x] `make install` - Set up venv and install dependencies
- [x] `make format` - Format code with black and isort
- [x] `make format-check` - Check formatting without changes
- [x] `make lint` - Run ruff linting
- [x] `make lint-fix` - Run ruff with auto-fix
- [x] `make type-check` - Run mypy
- [x] `make security-check` - Run bandit
- [x] `make test` - Run tests
- [x] `make test-coverage` - Run tests with coverage
- [x] `make quality` - Run all checks with formatting
- [x] `make ci-quality` - Run all checks without modifications
- [x] `make clean` - Remove build artifacts
- [x] `make help` - Show available commands

### Existing Code Updates
- [x] Add type annotations to all existing code
- [x] Add docstrings to all modules, classes, and functions
- [x] Fix any linting issues in existing code
- [x] Ensure all checks pass before merge

### Documentation
- [x] Update `backend-app/README.md` with:
  - Developer setup instructions
  - Quality check commands
  - CI/CD information

## Implementation Notes

### Python Version
Pinned to **Python 3.13** to match AWS Lambda runtime exactly:
- `requires-python = "==3.13.*"` in pyproject.toml
- `.python-version` file set to `3.13`
- GitHub Actions use Python 3.13 only (no matrix)
- All tool target versions set to py313

### Files Created/Modified

**New files:**
- `backend-app/pyproject.toml` - All tool configurations
- `backend-app/Makefile` - Unified build commands with CI detection
- `backend-app/.python-version` - Python version pin
- `.github/workflows/backend-code-quality.yml` - CI quality checks
- `.github/workflows/backend-tests.yml` - CI test runner
- `backend-app/tests/conftest.py` - Pytest fixtures with mocked DynamoDB
- `backend-app/tests/handlers/test_agent_questions.py` - 6 handler tests
- `backend-app/tests/handlers/test_human_api.py` - 7 handler tests
- `backend-app/tests/models/test_question.py` - 12 model tests
- `backend-app/tests/models/test_response.py` - 7 model tests

**Modified files (type annotations + docstrings):**
- `backend-app/src/__init__.py` - Added docstring
- `backend-app/src/handlers/__init__.py` - Added docstring
- `backend-app/src/handlers/agent_questions.py` - Strict types, Google docstrings
- `backend-app/src/handlers/human_api.py` - Strict types, Google docstrings
- `backend-app/src/models/__init__.py` - Added docstring
- `backend-app/src/models/question.py` - Strict types, Google docstrings
- `backend-app/src/models/response.py` - Strict types, Google docstrings
- `backend-app/src/utils/__init__.py` - Added docstring
- `backend-app/src/utils/api_response.py` - Strict types, Google docstrings
- `backend-app/src/utils/dynamodb.py` - Strict types, Google docstrings, boto3-stubs
- `backend-app/README.md` - Added developer setup documentation

### Quality Check Results
```
✓ Formatting (Black, isort) - 18 files unchanged
✓ Linting (Ruff) - All checks passed
✓ Type checking (mypy strict) - No issues in 10 source files
✓ Security scan (Bandit) - No issues identified
✓ Tests - 32 passed
```

### Dependencies Added
```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=4.1",
    "black>=24.0",
    "isort>=5.13",
    "ruff>=0.2",
    "mypy>=1.8",
    "bandit>=1.7",
    "boto3>=1.34",  # For testing (provided by Lambda runtime in production)
    "boto3-stubs[dynamodb]>=1.34",
]
```

## Out of Scope

- ~~Pre-commit hooks~~ (removed per user request)
- IDE-specific configurations (VSCode, JetBrains)
- Local DynamoDB for integration testing (future task)
- Performance profiling tools
- Logging framework configuration

## Verification Completed

1. ✅ `make install` creates working venv
2. ✅ `make quality` passes on all code
3. ✅ `make test` runs 32 tests without errors
4. ✅ `make ci-quality` passes (CI mode)
5. ✅ GitHub Actions workflows created

## Reference Documents

- Reference project: `/Users/manuel/git/github/dx-tooling/platform-problem-monitoring-core`
- [ADR-06: Infrastructure as Code](../../architectural-decision-records/06-infrastructure-as-code.md)
