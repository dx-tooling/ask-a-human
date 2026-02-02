# Ask-a-Human Frontend Makefile
# Provides unified commands for development, testing, and CI
# Mirrors backend-app/Makefile structure for consistency

.PHONY: help install format format-check lint lint-fix type-check security-check test test-coverage quality ci-quality clean dev build

# Default target
.DEFAULT_GOAL := help

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
	@echo "$(BLUE)Ask-a-Human Frontend$(NC)"
	@echo "Usage: make [target]"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-18s$(NC) %s\n", $$1, $$2}'

#-----------------------------------------------------------------------
# Setup
#-----------------------------------------------------------------------

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm ci
	@echo "$(GREEN)Installation complete!$(NC)"

install-dev: ## Install dependencies (for development, uses npm install)
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Installation complete!$(NC)"

#-----------------------------------------------------------------------
# Development
#-----------------------------------------------------------------------

dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	npm run dev

build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	npm run build
	@echo "$(GREEN)Build complete!$(NC)"

preview: ## Preview production build
	@echo "$(BLUE)Starting preview server...$(NC)"
	npm run preview

#-----------------------------------------------------------------------
# Formatting
#-----------------------------------------------------------------------

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format
	@echo "$(GREEN)Formatting complete!$(NC)"

format-check: ## Check formatting without changes
	@echo "$(BLUE)Checking formatting...$(NC)"
	npm run format:check

#-----------------------------------------------------------------------
# Linting
#-----------------------------------------------------------------------

lint: ## Run ESLint
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

lint-fix: ## Run ESLint with auto-fix
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	npm run lint:fix

#-----------------------------------------------------------------------
# Type Checking
#-----------------------------------------------------------------------

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checker...$(NC)"
	npm run type-check

#-----------------------------------------------------------------------
# Security
#-----------------------------------------------------------------------

security-check: ## Run npm audit security scanning
	@echo "$(BLUE)Running security scan...$(NC)"
	npm run security-check

#-----------------------------------------------------------------------
# Testing
#-----------------------------------------------------------------------

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm run test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	npm run test:watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:coverage

#-----------------------------------------------------------------------
# Combined Quality Checks
#-----------------------------------------------------------------------

quality: format lint-fix type-check test ## Run all checks with formatting
	@echo "$(GREEN)All quality checks passed!$(NC)"

ci-quality: format-check lint type-check security-check ## Run all checks without modifications (for CI)
	@echo "$(GREEN)All CI quality checks passed!$(NC)"

#-----------------------------------------------------------------------
# Cleanup
#-----------------------------------------------------------------------

clean: ## Remove build artifacts and caches
	@echo "$(BLUE)Cleaning up...$(NC)"
	rm -rf node_modules
	rm -rf dist
	rm -rf coverage
	rm -rf .vitest
	@echo "$(GREEN)Cleanup complete!$(NC)"
