---
id: 07
title: TypeScript SDK and Reference Implementation
source: PRD-02, ADR-03, ADR-07
priority: high
created: 2026-02-02
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
- [ ] `package.json` configured with package metadata
- [ ] TypeScript 5.x with strict mode enabled
- [ ] Node.js 20+ compatibility (LTS)
- [ ] ES modules (type: "module")
- [ ] Dependencies: `undici` or native fetch (Node 18+)
- [ ] Package name: `@ask-a-human/sdk` or `ask-a-human`
- [ ] Publishable to npm (proper exports, types)
- [ ] Installable via `npm install` from local path

#### Developer Tooling
- [ ] ESLint with strict TypeScript rules
- [ ] Prettier for code formatting
- [ ] Vitest for testing
- [ ] tsup or similar for building
- [ ] Makefile with standard commands (install, build, test, lint, format)
- [ ] Pre-commit hooks via husky/lint-staged (optional but nice)

#### AskHumanClient (Low-level API wrapper)
- [ ] Constructor options: `baseUrl`, `agentId`, `fetch` (optional custom fetch)
- [ ] `submitQuestion(options)` - Submit question, returns `QuestionSubmission`
- [ ] `getQuestion(questionId)` - Get question status/responses
- [ ] Proper error handling with typed exceptions
- [ ] Full TypeScript types for all methods
- [ ] JSDoc comments with examples

#### AskHumanOrchestrator (High-level async patterns)
- [ ] Constructor: `client`, `pollInterval` options
- [ ] `submit(prompt, options)` - Submit and track question
- [ ] `awaitResponses(questionIds, options)` - Promise that resolves when ready
- [ ] `pollOnce(questionIds)` - Non-blocking status check
- [ ] Exponential backoff for polling
- [ ] Returns partial results on timeout
- [ ] Supports AbortController for cancellation

#### Type Definitions (`types.ts`)
- [ ] `QuestionType` - "text" | "multiple_choice"
- [ ] `QuestionStatus` - "OPEN" | "PARTIAL" | "CLOSED" | "EXPIRED"
- [ ] `AudienceTag` - String union of valid tags
- [ ] `QuestionSubmission` - Response from submit
- [ ] `QuestionResponse` - Full question with responses
- [ ] `HumanResponse` - Individual response
- [ ] `SubmitQuestionOptions` - Input options type
- [ ] Export all types for consumers

#### Error Handling (`errors.ts`)
- [ ] `AskHumanError` - Base error class
- [ ] `ValidationError` - Invalid request (400)
- [ ] `QuestionNotFoundError` - 404 response
- [ ] `RateLimitError` - 429 response
- [ ] `ServerError` - 5xx response
- [ ] `TimeoutError` - Request timeout
- [ ] All errors include response details where applicable

#### Tests
- [ ] Unit tests for `AskHumanClient` with mocked fetch
- [ ] Unit tests for `AskHumanOrchestrator`
- [ ] Test error handling for various HTTP status codes
- [ ] Test timeout and partial results behavior
- [ ] Test AbortController cancellation
- [ ] >80% code coverage

#### Documentation
- [ ] `README.md` with installation and usage examples
- [ ] TypeScript examples showing type inference
- [ ] CommonJS and ESM usage examples
- [ ] API reference (auto-generated or manual)

### Reference Agent: TypeScript Content Writer (`examples/typescript-content-writer/`)

#### Project Setup
- [ ] `package.json` with dependencies
- [ ] TypeScript configuration
- [ ] Dependencies: `@ask-a-human/sdk`, `openai`, `chalk` (or similar for colors)
- [ ] `README.md` with setup and usage instructions
- [ ] OpenAI API key from env var or secrets file

#### Agent Behavior
- [ ] Accepts content brief from user (CLI input via readline or prompts)
- [ ] Uses OpenAI to analyze brief and identify decision points
- [ ] Asks humans for tone/style decisions via Ask-a-Human
- [ ] Waits for human responses with progress indication
- [ ] Generates final content incorporating human feedback
- [ ] Beautiful terminal output with colors/spinners

#### Human-in-the-Loop Integration
- [ ] At least 2 decision points that trigger human questions
- [ ] Uses multiple choice questions for clear decisions
- [ ] Handles timeout/partial results gracefully
- [ ] Shows human response summary before proceeding

#### Demo Quality
- [ ] Works end-to-end with real API calls
- [ ] Clear console output showing agent reasoning
- [ ] Informative progress messages during wait periods
- [ ] Runnable via `npx ts-node main.ts` or compiled JS

## Out of Scope (This Task)

- npm publishing (future task)
- Browser/edge runtime support (Node.js only for now)
- React hooks or framework-specific integrations
- TypeScript MCP server (Python MCP server already works)

## Implementation Notes

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Implementations                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  TS Reference   │  Custom Agents  │   Other TS Frameworks       │
│   Agent (CLI)   │   (LangChain,   │   (Vercel AI SDK, etc.)     │
│                 │    etc.)        │                             │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                        │
         ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    sdk-typescript/                               │
│  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  │     AskHumanClient        │  │   AskHumanOrchestrator    │   │
│  │     (low-level API)       │  │   (async patterns)        │   │
│  └───────────────────────────┘  └───────────────────────────┘   │
│  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  │        types.ts           │  │        errors.ts          │   │
│  │   (full type exports)     │  │   (typed exceptions)      │   │
│  └───────────────────────────┘  └───────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  api.ask-a-human│
                        │      .com       │
                        └─────────────────┘
```

### Directory Structure

```
ask-a-human/
├── sdk-typescript/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts          # Build configuration
│   ├── vitest.config.ts        # Test configuration
│   ├── eslint.config.js        # ESLint flat config
│   ├── .prettierrc
│   ├── Makefile
│   ├── README.md
│   ├── src/
│   │   ├── index.ts            # Main exports
│   │   ├── client.ts           # AskHumanClient
│   │   ├── orchestrator.ts     # AskHumanOrchestrator
│   │   ├── types.ts            # Type definitions
│   │   └── errors.ts           # Error classes
│   ├── tests/
│   │   ├── client.test.ts
│   │   └── orchestrator.test.ts
│   └── examples/
│       ├── basic-usage.ts
│       └── multi-question.ts
│
└── examples/
    └── typescript-content-writer/
        ├── package.json
        ├── tsconfig.json
        ├── README.md
        ├── src/
        │   ├── main.ts
        │   ├── agent.ts
        │   └── prompts.ts
        └── .env.example
```

### Package.json Exports (sdk-typescript)

```json
{
  "name": "@ask-a-human/sdk",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "lint": "eslint src tests",
    "format": "prettier --write ."
  }
}
```

### API Parity with Python SDK

| Python | TypeScript |
|--------|------------|
| `AskHumanClient` | `AskHumanClient` |
| `AskHumanOrchestrator` | `AskHumanOrchestrator` |
| `submit_question()` | `submitQuestion()` |
| `get_question()` | `getQuestion()` |
| `await_responses()` | `awaitResponses()` |
| `poll_once()` | `pollOnce()` |
| Pydantic models | TypeScript interfaces |
| Custom exceptions | Custom Error classes |

### Reference Documents

- [PRD-02: Agent API and MCP Tool](../../product-requirements-document/02-agent-api.md)
- [ADR-03: API Design](../../architectural-decision-records/03-api-design.md)
- [ADR-07: Agent Integration Patterns](../../architectural-decision-records/07-agent-integration-patterns.md)
- [Python SDK](../../sdk-python/) - Reference implementation

## Testing Plan

### SDK Testing

```bash
cd sdk-typescript
npm install
npm test           # Run tests
npm run test:cov   # With coverage
npm run lint       # Check linting
npm run build      # Build package
```

### Reference Agent Testing

```bash
cd examples/typescript-content-writer
npm install
# Set OPENAI_API_KEY environment variable
npm start
```

Expected flow matches Python content-writer agent.

## Success Metrics

| Metric | Target |
|--------|--------|
| Test coverage | > 80% |
| Build time | < 10 seconds |
| Package size | < 50KB (minified) |
| Type coverage | 100% (strict mode) |
| Zero runtime dependencies | Ideal (use native fetch) |
| API parity with Python SDK | 100% |

## ADR/PRD Updates

- [ ] Update ADR-07 to include TypeScript examples
- [ ] Update integration guide with TypeScript quick start
