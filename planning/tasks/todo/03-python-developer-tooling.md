---
id: 03
title: Python Developer Tooling and Code Quality Guardrails
source: Best practices, reference project platform-problem-monitoring-core
priority: high
created: 2026-02-02
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
6. Pre-commit hooks for local enforcement
7. GitHub Actions workflows for CI enforcement
8. Makefile for unified developer experience

## Reference Implementation

Use `/Users/manuel/git/github/dx-tooling/platform-problem-monitoring-core` as the gold standard reference. Adapt its tooling configuration to the `backend-app/` structure.

## Acceptance Criteria

### Package Configuration
- [ ] `pyproject.toml` with all tool configurations:
  - Project metadata and dependencies
  - Black configuration (line-length: 120)
  - mypy strict mode configuration
  - isort configuration (black-compatible profile)
  - Ruff linting configuration with comprehensive rule set
  - pytest configuration with markers
  - Coverage configuration
  - Bandit security scanning configuration

### Code Formatting
- [ ] Black for code formatting
- [ ] isort for import sorting (black-compatible)
- [ ] Formats can be checked without modification (for CI)
- [ ] Formats can be auto-applied (for development)

### Linting
- [ ] Ruff configured with comprehensive rules:
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
- [ ] Auto-fix mode available for applicable rules

### Type Checking
- [ ] mypy with strict configuration:
  - `disallow_untyped_defs = true`
  - `disallow_incomplete_defs = true`
  - `check_untyped_defs = true`
  - `no_implicit_optional = true`
  - `strict_optional = true`
  - `warn_redundant_casts = true`
  - `warn_unused_ignores = true`
  - `warn_no_return = true`
  - `warn_unreachable = true`
- [ ] Type stubs for boto3 and other dependencies
- [ ] All existing code passes type checking (add annotations as needed)

### Security Scanning
- [ ] Bandit configured for security checks
- [ ] Test files excluded from scanning
- [ ] Appropriate skips for known false positives

### Testing
- [ ] pytest as test framework
- [ ] pytest-cov for coverage reporting
- [ ] Test directory structure: `backend-app/tests/`
- [ ] At least one test per handler to validate framework works
- [ ] Coverage targets configured
- [ ] Test markers for slow/integration tests

### Pre-commit Hooks
- [ ] `.pre-commit-config.yaml` configured with:
  - trailing-whitespace
  - end-of-file-fixer
  - check-yaml
  - check-added-large-files
  - check-json
  - check-toml
  - detect-private-key
  - black (via Makefile)
  - isort (via Makefile)
  - ruff (via Makefile)
  - mypy (via Makefile)
  - bandit (via Makefile, excluding tests)

### CI/CD Workflows
- [ ] `.github/workflows/code-quality.yml`:
  - Runs on push to main and PRs
  - Matrix testing across Python versions (3.12, 3.13)
  - Runs all quality checks via Makefile
- [ ] `.github/workflows/tests.yml`:
  - Runs on push to main and PRs
  - Matrix testing across Python versions
  - Coverage reporting

### Makefile
- [ ] `make install` - Set up venv and install dependencies
- [ ] `make format` - Format code with black and isort
- [ ] `make format-check` - Check formatting without changes
- [ ] `make lint` - Run ruff linting
- [ ] `make lint-fix` - Run ruff with auto-fix
- [ ] `make type-check` - Run mypy
- [ ] `make security-check` - Run bandit
- [ ] `make test` - Run tests
- [ ] `make test-coverage` - Run tests with coverage
- [ ] `make quality` - Run all checks with formatting
- [ ] `make ci-quality` - Run all checks without modifications
- [ ] `make clean` - Remove build artifacts
- [ ] `make help` - Show available commands

### Existing Code Updates
- [ ] Add type annotations to all existing code
- [ ] Add docstrings to all modules, classes, and functions
- [ ] Fix any linting issues in existing code
- [ ] Ensure all checks pass before merge

### Documentation
- [ ] Update `backend-app/README.md` with:
  - Developer setup instructions
  - Quality check commands
  - Pre-commit hook setup
  - CI/CD information

## Implementation Notes

### Directory Structure After Implementation

```
backend-app/
├── src/
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── agent_questions.py
│   │   └── human_api.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── question.py
│   │   └── response.py
│   └── utils/
│       ├── __init__.py
│       ├── api_response.py
│       └── dynamodb.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # pytest fixtures
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── test_agent_questions.py
│   │   └── test_human_api.py
│   └── models/
│       ├── __init__.py
│       ├── test_question.py
│       └── test_response.py
├── .pre-commit-config.yaml
├── .python-version
├── Makefile
├── pyproject.toml
├── requirements.txt
└── README.md

.github/workflows/
├── code-quality.yml
└── tests.yml
```

### Key Differences from Reference Project

1. **Package structure**: Lambda deployment uses flat `src/` not installed package
2. **Python version**: Target 3.12+ (Lambda supported versions)
3. **Dependencies**: Minimal - boto3 provided by Lambda runtime
4. **Testing**: Focus on unit tests with mocked DynamoDB

### Type Annotation Strategy

For AWS Lambda handlers:
```python
from typing import Any

def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Lambda handler docstring."""
    ...
```

For boto3 operations, use `types-boto3` for type stubs.

## Out of Scope

- IDE-specific configurations (VSCode, JetBrains)
- Local DynamoDB for integration testing (future task)
- Performance profiling tools
- Logging framework configuration

## Testing Plan

After implementation, verify:

1. `make install` creates working venv
2. `make quality` passes on existing code
3. `make test` runs without errors
4. Pre-commit hooks block bad commits
5. GitHub Actions workflows pass

## Reference Documents

- Reference project: `/Users/manuel/git/github/dx-tooling/platform-problem-monitoring-core`
- [ADR-06: Infrastructure as Code](../../architectural-decision-records/06-infrastructure-as-code.md)
