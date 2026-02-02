# Ask-a-Human TypeScript SDK Makefile
# Provides unified commands for development, testing, and CI

.PHONY: help install build dev test test-watch test-coverage lint lint-fix format format-check typecheck quality ci-quality clean

# Default target
.DEFAULT_GOAL := help

# Detect CI environment
ifeq ($(CI),true)
    NPM := npm
else
    NPM := npm
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
	@echo "$(BLUE)Ask-a-Human TypeScript SDK$(NC)"
	@echo "Usage: make [target]"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-18s$(NC) %s\n", $$1, $$2}'

#-----------------------------------------------------------------------
# Setup
#-----------------------------------------------------------------------

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	$(NPM) install
	@echo "$(GREEN)Installation complete!$(NC)"

#-----------------------------------------------------------------------
# Build
#-----------------------------------------------------------------------

build: ## Build the SDK
	@echo "$(BLUE)Building SDK...$(NC)"
	$(NPM) run build
	@echo "$(GREEN)Build complete!$(NC)"

dev: ## Build in watch mode
	@echo "$(BLUE)Starting dev mode...$(NC)"
	$(NPM) run dev

#-----------------------------------------------------------------------
# Testing
#-----------------------------------------------------------------------

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(NPM) run test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	$(NPM) run test:watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(NPM) run test:coverage

#-----------------------------------------------------------------------
# Linting & Formatting
#-----------------------------------------------------------------------

lint: ## Run ESLint
	@echo "$(BLUE)Running linter...$(NC)"
	$(NPM) run lint

lint-fix: ## Run ESLint with auto-fix
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	$(NPM) run lint:fix

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	$(NPM) run format
	@echo "$(GREEN)Formatting complete!$(NC)"

format-check: ## Check formatting without changes
	@echo "$(BLUE)Checking formatting...$(NC)"
	$(NPM) run format:check

typecheck: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checker...$(NC)"
	$(NPM) run typecheck

#-----------------------------------------------------------------------
# Combined Quality Checks
#-----------------------------------------------------------------------

quality: lint-fix format typecheck test ## Run all checks with formatting
	@echo "$(GREEN)All quality checks passed!$(NC)"

ci-quality: format-check lint typecheck test ## Run all checks without modifications (for CI)
	@echo "$(GREEN)All CI quality checks passed!$(NC)"

#-----------------------------------------------------------------------
# Cleanup
#-----------------------------------------------------------------------

clean: ## Remove build artifacts and caches
	@echo "$(BLUE)Cleaning up...$(NC)"
	rm -rf dist
	rm -rf node_modules
	rm -rf coverage
	rm -rf .turbo
	@echo "$(GREEN)Cleanup complete!$(NC)"
