# Ask-a-Human Python SDK Makefile
# Provides unified commands for development, testing, and CI

.PHONY: help install format format-check lint lint-fix type-check test test-coverage quality ci-quality build publish-test publish clean

# Default target
.DEFAULT_GOAL := help

# Detect CI environment - use venv locally, direct commands in CI
VENV := .venv
ifeq ($(CI),true)
    PYTHON := python
    PIP := pip
else
    PYTHON := $(VENV)/bin/python
    PIP := $(VENV)/bin/pip
endif

# Colors for output (disabled in CI)
ifneq ($(CI),true)
    BLUE := \033[0;34m
    GREEN := \033[0;32m
    YELLOW := \033[0;33m
    NC := \033[0m
else
    BLUE :=
    GREEN :=
    YELLOW :=
    NC :=
endif

#-----------------------------------------------------------------------
# Help
#-----------------------------------------------------------------------

help: ## Show this help message
	@echo "$(BLUE)Ask-a-Human Python SDK$(NC)"
	@echo "Usage: make [target]"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-18s$(NC) %s\n", $$1, $$2}'

#-----------------------------------------------------------------------
# Setup
#-----------------------------------------------------------------------

$(VENV)/bin/activate:
	@echo "$(BLUE)Creating virtual environment...$(NC)"
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip

install: $(VENV)/bin/activate ## Install dependencies in virtual environment
	@echo "$(BLUE)Installing dependencies...$(NC)"
	$(PIP) install -e ".[dev]"
	@echo "$(GREEN)Installation complete!$(NC)"

#-----------------------------------------------------------------------
# Formatting
#-----------------------------------------------------------------------

format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(NC)"
	$(PYTHON) -m black src tests examples
	$(PYTHON) -m isort src tests examples
	@echo "$(GREEN)Formatting complete!$(NC)"

format-check: ## Check formatting without changes
	@echo "$(BLUE)Checking formatting...$(NC)"
	$(PYTHON) -m black --check src tests examples
	$(PYTHON) -m isort --check-only src tests examples

#-----------------------------------------------------------------------
# Linting
#-----------------------------------------------------------------------

lint: ## Run ruff linting
	@echo "$(BLUE)Running linter...$(NC)"
	$(PYTHON) -m ruff check src tests examples

lint-fix: ## Run ruff with auto-fix
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	$(PYTHON) -m ruff check --fix src tests examples

#-----------------------------------------------------------------------
# Type Checking
#-----------------------------------------------------------------------

type-check: ## Run mypy type checking
	@echo "$(BLUE)Running type checker...$(NC)"
	$(PYTHON) -m mypy src

#-----------------------------------------------------------------------
# Testing
#-----------------------------------------------------------------------

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(PYTHON) -m pytest tests -v

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(PYTHON) -m pytest tests -v --cov=src --cov-report=term-missing --cov-report=html

#-----------------------------------------------------------------------
# Combined Quality Checks
#-----------------------------------------------------------------------

quality: format lint-fix type-check test ## Run all checks with formatting
	@echo "$(GREEN)All quality checks passed!$(NC)"

ci-quality: format-check lint type-check ## Run all checks without modifications (for CI)
	@echo "$(GREEN)All CI quality checks passed!$(NC)"

#-----------------------------------------------------------------------
# Build & Publish
#-----------------------------------------------------------------------

build: ## Build distribution packages
	@echo "$(BLUE)Building distribution packages...$(NC)"
	rm -rf dist build
	$(PYTHON) -m build
	@echo "$(GREEN)Build complete! Packages in dist/$(NC)"

publish-test: build ## Publish to TestPyPI
	@echo "$(BLUE)Publishing to TestPyPI...$(NC)"
	$(PYTHON) -m twine upload --repository testpypi dist/*
	@echo "$(GREEN)Published to TestPyPI!$(NC)"

publish: build ## Publish to PyPI
	@echo "$(BLUE)Publishing to PyPI...$(NC)"
	$(PYTHON) -m twine upload dist/*
	@echo "$(GREEN)Published to PyPI!$(NC)"

#-----------------------------------------------------------------------
# Cleanup
#-----------------------------------------------------------------------

clean: ## Remove build artifacts and caches
	@echo "$(BLUE)Cleaning up...$(NC)"
	rm -rf $(VENV)
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf .ruff_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf *.egg-info
	rm -rf dist
	rm -rf build
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete!$(NC)"
