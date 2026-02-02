---
id: 07
title: TypeScript SDK and Reference Implementation
source: PRD-02, ADR-03, ADR-07
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# TypeScript SDK and Reference Implementation

## Description

Create TypeScript/Node.js SDK and example agent for Ask-a-Human, providing the same quality developer experience as the Python SDK. This enables the large ecosystem of TypeScript-based LLM agents to integrate with Ask-a-Human.

The SDK should follow modern TypeScript best practices with strong typing, comprehensive tooling, and excellent documentation. The example agent should demonstrate async human-in-the-loop patterns in a Node.js environment.

**Source code locations:**
- `sdk-typescript/` - TypeScript SDK package
- `examples/typescript-content-writer/` - Reference agent implementation

## Acceptance Criteria

### TypeScript SDK Package (`sdk-typescript/`)

#### Project Setup
- [x] `package.json` configured with package metadata
- [x] TypeScript 5.x with strict mode enabled
- [x] Node.js 20+ compatibility (LTS)
- [x] ES modules (type: "module")
- [x] Dependencies: `undici` or native fetch (Node 18+)
- [x] Package name: `@ask-a-human/sdk` or `ask-a-human`
- [x] Publishable to npm (proper exports, types)
- [x] Installable via `npm install` from local path

#### Developer Tooling
- [x] ESLint with strict TypeScript rules
- [x] Prettier for code formatting
- [x] Vitest for testing
- [x] tsup or similar for building
- [x] Makefile with standard commands (install, build, test, lint, format)
- [ ] Pre-commit hooks via husky/lint-staged (optional but nice)

#### AskHumanClient (Low-level API wrapper)
- [x] Constructor options: `baseUrl`, `agentId`, `fetch` (optional custom fetch)
- [x] `submitQuestion(options)` - Submit question, returns `QuestionSubmission`
- [x] `getQuestion(questionId)` - Get question status/responses
- [x] Proper error handling with typed exceptions
- [x] Full TypeScript types for all methods
- [x] JSDoc comments with examples

#### AskHumanOrchestrator (High-level async patterns)
- [x] Constructor: `client`, `pollInterval` options
- [x] `submit(prompt, options)` - Submit and track question
- [x] `awaitResponses(questionIds, options)` - Promise that resolves when ready
- [x] `pollOnce(questionIds)` - Non-blocking status check
- [x] Exponential backoff for polling
- [x] Returns partial results on timeout
- [x] Supports AbortController for cancellation

#### Type Definitions (`types.ts`)
- [x] `QuestionType` - "text" | "multiple_choice"
- [x] `QuestionStatus` - "OPEN" | "PARTIAL" | "CLOSED" | "EXPIRED"
- [x] `AudienceTag` - String union of valid tags
- [x] `QuestionSubmission` - Response from submit
- [x] `QuestionResponse` - Full question with responses
- [x] `HumanResponse` - Individual response
- [x] `SubmitQuestionOptions` - Input options type
- [x] Export all types for consumers

#### Error Handling (`errors.ts`)
- [x] `AskHumanError` - Base error class
- [x] `ValidationError` - Invalid request (400)
- [x] `QuestionNotFoundError` - 404 response
- [x] `RateLimitError` - 429 response
- [x] `ServerError` - 5xx response
- [x] `TimeoutError` - Request timeout
- [x] All errors include response details where applicable

#### Tests
- [x] Unit tests for `AskHumanClient` with mocked fetch
- [x] Unit tests for `AskHumanOrchestrator`
- [x] Test error handling for various HTTP status codes
- [x] Test timeout and partial results behavior
- [x] Test AbortController cancellation
- [x] >80% code coverage (achieved 96.9%)

#### Documentation
- [x] `README.md` with installation and usage examples
- [x] TypeScript examples showing type inference
- [x] CommonJS and ESM usage examples
- [x] API reference (auto-generated or manual)

### Reference Agent: TypeScript Content Writer (`examples/typescript-content-writer/`)

#### Project Setup
- [x] `package.json` with dependencies
- [x] TypeScript configuration
- [x] Dependencies: `@ask-a-human/sdk`, `openai`, `chalk` (or similar for colors)
- [x] `README.md` with setup and usage instructions
- [x] OpenAI API key from env var or secrets file

#### Agent Behavior
- [x] Accepts content brief from user (CLI input via readline or prompts)
- [x] Uses OpenAI to analyze brief and identify decision points
- [x] Asks humans for tone/style decisions via Ask-a-Human
- [x] Waits for human responses with progress indication
- [x] Generates final content incorporating human feedback
- [x] Beautiful terminal output with colors/spinners

#### Human-in-the-Loop Integration
- [x] At least 2 decision points that trigger human questions
- [x] Uses multiple choice questions for clear decisions
- [x] Handles timeout/partial results gracefully
- [x] Shows human response summary before proceeding

#### Demo Quality
- [x] Works end-to-end with real API calls
- [x] Clear console output showing agent reasoning
- [x] Informative progress messages during wait periods
- [x] Runnable via `npx ts-node main.ts` or compiled JS

## Out of Scope (This Task)

- npm publishing (future task)
- Browser/edge runtime support (Node.js only for now)
- React hooks or framework-specific integrations
- TypeScript MCP server (Python MCP server already works)

## Implementation Notes

### Final Package Structure

```
sdk-typescript/
├── package.json          # @ask-a-human/sdk, type: module
├── tsconfig.json         # strict mode, ES2022 target
├── tsup.config.ts        # ESM + CJS output
├── vitest.config.ts      # 80% coverage threshold
├── eslint.config.js      # Flat config with TypeScript rules
├── .prettierrc
├── Makefile
├── README.md
├── src/
│   ├── index.ts          # Re-exports
│   ├── client.ts         # AskHumanClient
│   ├── orchestrator.ts   # AskHumanOrchestrator
│   ├── types.ts          # TypeScript interfaces
│   └── errors.ts         # Custom error classes
├── tests/
│   ├── client.test.ts    # 16 tests
│   └── orchestrator.test.ts  # 14 tests
└── examples/
    ├── basic-usage.ts
    └── multi-question.ts

examples/typescript-content-writer/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── main.ts           # CLI entry point
    ├── agent.ts          # ContentWriterAgent class
    └── prompts.ts        # LLM prompt templates
```

### Test Coverage Results

```
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
All files        |    96.9 |       90 |   85.29 |    96.9
 client.ts       |   99.47 |    94.73 |     100 |   99.47
 errors.ts       |    97.2 |    89.47 |      80 |    97.2
 orchestrator.ts |   93.97 |    84.09 |      80 |   93.97
```

### API Parity Achieved

| Python | TypeScript |
|--------|------------|
| `AskHumanClient` | `AskHumanClient` |
| `AskHumanOrchestrator` | `AskHumanOrchestrator` |
| `submit_question()` | `submitQuestion()` |
| `get_question()` | `getQuestion()` |
| `await_responses()` | `awaitResponses()` |
| `poll_once()` | `pollOnce()` |
| `submit_and_wait()` | `submitAndWait()` |
| Pydantic models | TypeScript interfaces |
| Custom exceptions | Custom Error classes |

### Reference Documents

- [PRD-02: Agent API and MCP Tool](../../product-requirements-document/02-agent-api.md)
- [ADR-03: API Design](../../architectural-decision-records/03-api-design.md)
- [ADR-07: Agent Integration Patterns](../../architectural-decision-records/07-agent-integration-patterns.md)
- [Python SDK](../../sdk-python/) - Reference implementation

## ADR/PRD Updates

- [x] Update ADR-07 to include TypeScript examples
- [x] Update integration guide with TypeScript quick start
