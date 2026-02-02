# Ask-a-Human TypeScript SDK

TypeScript SDK for integrating [Ask-a-Human](https://ask-a-human.com) into your AI agents. Get human input when your agent is uncertain or needs subjective judgment.

## Installation

```bash
npm install @ask-a-human/sdk
```

Or install from source:

```bash
npm install /path/to/sdk-typescript
```

## Quick Start

```typescript
import { AskHumanClient } from "@ask-a-human/sdk";

// Create a client
const client = new AskHumanClient({ agentId: "my-agent" });

// Submit a question
const result = await client.submitQuestion({
  prompt: "Should this error message apologize to the user or just state the facts?",
  type: "text",
  audience: ["product", "creative"],
  minResponses: 5,
});

console.log(`Question submitted: ${result.questionId}`);

// Later, check for responses
const response = await client.getQuestion(result.questionId);

if (response.status === "CLOSED" || response.status === "PARTIAL") {
  for (const r of response.responses) {
    console.log(`Human said: ${r.answer} (confidence: ${r.confidence})`);
  }
}
```

## Using the Orchestrator

For more complex workflows, use the `AskHumanOrchestrator` which handles polling and timeouts:

```typescript
import { AskHumanClient, AskHumanOrchestrator } from "@ask-a-human/sdk";

const client = new AskHumanClient({ agentId: "my-agent" });
const orchestrator = new AskHumanOrchestrator(client, { pollInterval: 30000 });

// Submit a question
const submission = await orchestrator.submit({
  prompt: "Which button label is clearer?",
  type: "multiple_choice",
  options: ["Submit", "Send", "Confirm", "Done"],
  minResponses: 10,
});

// Wait for responses (with timeout)
const responses = await orchestrator.awaitResponses([submission.questionId], {
  minResponses: 5,
  timeout: 300000, // 5 minutes
});

// Process responses
const question = responses[submission.questionId];
console.log(`Status: ${question.status}`);
console.log(`Got ${question.currentResponses} responses`);

if (question.summary) {
  console.log(`Summary: ${JSON.stringify(question.summary)}`);
}
```

## Multiple Choice Questions

```typescript
const result = await client.submitQuestion({
  prompt: "What tone should this notification use?",
  type: "multiple_choice",
  options: [
    "Formal and professional",
    "Friendly and casual",
    "Urgent and direct",
    "Neutral and informative",
  ],
  audience: ["product"],
  minResponses: 10,
});

// Check responses
const response = await client.getQuestion(result.questionId);

// For multiple choice, responses have selectedOption instead of answer
for (const r of response.responses) {
  if (r.selectedOption !== undefined && response.options) {
    const optionText = response.options[r.selectedOption];
    console.log(`Human chose: ${optionText} (confidence: ${r.confidence})`);
  }
}

// summary field shows vote counts
if (response.summary) {
  console.log(`Vote distribution: ${JSON.stringify(response.summary)}`);
}
```

## Handling Timeouts and Partial Results

The orchestrator can return partial results when a timeout is reached:

```typescript
const responses = await orchestrator.awaitResponses(["q_abc123"], {
  minResponses: 10,
  timeout: 60000, // 1 minute
});

const question = responses["q_abc123"];

if (question.status === "PARTIAL") {
  console.log(`Got ${question.currentResponses} of ${question.requiredResponses} responses`);
  // Decide whether to proceed with partial results or wait longer
} else if (question.status === "EXPIRED") {
  console.log("Question expired before getting enough responses");
}
```

## Cancellation with AbortController

You can cancel long-running operations using `AbortController`:

```typescript
const controller = new AbortController();

// Cancel after 30 seconds
setTimeout(() => controller.abort(), 30000);

try {
  const responses = await orchestrator.awaitResponses([submission.questionId], {
    timeout: 300000,
    signal: controller.signal,
  });
} catch (error) {
  if (error instanceof AbortError) {
    console.log("Operation was cancelled");
  }
}
```

## Configuration

### Environment Variables

- `ASK_A_HUMAN_BASE_URL` - Override the API base URL (default: `https://api.ask-a-human.com`)
- `ASK_A_HUMAN_AGENT_ID` - Default agent ID if not specified in constructor

### Client Options

```typescript
const client = new AskHumanClient({
  baseUrl: "https://api.ask-a-human.com", // API endpoint
  agentId: "my-agent", // Your agent identifier
  timeout: 30000, // HTTP request timeout (ms)
});
```

### Orchestrator Options

```typescript
const orchestrator = new AskHumanOrchestrator(client, {
  pollInterval: 30000, // Base interval between polls (ms)
  maxBackoff: 300000, // Maximum backoff interval (ms)
  backoffMultiplier: 1.5, // Exponential backoff multiplier
});
```

## Error Handling

```typescript
import {
  AskHumanClient,
  AskHumanError,
  ValidationError,
  QuestionNotFoundError,
  RateLimitError,
  QuotaExceededError,
  ServerError,
  TimeoutError,
  AbortError,
} from "@ask-a-human/sdk";

const client = new AskHumanClient({ agentId: "my-agent" });

try {
  const result = await client.submitQuestion({
    prompt: "...",
    type: "text",
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Invalid request: ${error.message}`);
    console.log(`Field: ${error.field}, Constraint: ${error.constraint}`);
  } else if (error instanceof QuotaExceededError) {
    console.log("Too many concurrent questions, wait for some to close");
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter} seconds`);
  } else if (error instanceof QuestionNotFoundError) {
    console.log(`Question not found: ${error.questionId}`);
  } else if (error instanceof ServerError) {
    console.log(`Server error (HTTP ${error.statusCode}): ${error.message}`);
  } else if (error instanceof AskHumanError) {
    console.log(`API error: ${error.message}`);
  }
}
```

## API Reference

### AskHumanClient

Low-level API client for direct HTTP requests.

#### Constructor

```typescript
new AskHumanClient(options?: ClientOptions)
```

#### Methods

- `submitQuestion(options: SubmitQuestionOptions): Promise<QuestionSubmission>` - Submit a question
- `getQuestion(questionId: string): Promise<QuestionResponse>` - Get question status and responses

### AskHumanOrchestrator

High-level orchestration with polling and timeouts.

#### Constructor

```typescript
new AskHumanOrchestrator(client: AskHumanClient, options?: OrchestratorOptions)
```

#### Methods

- `submit(options: SubmitQuestionOptions): Promise<QuestionSubmission>` - Submit a question
- `awaitResponses(questionIds: string[], options?: AwaitResponsesOptions): Promise<Record<string, QuestionResponse>>` - Wait for responses
- `pollOnce(questionIds: string[]): Promise<Record<string, QuestionResponse>>` - Non-blocking status check
- `submitAndWait(options: SubmitQuestionOptions, awaitOptions?: AwaitResponsesOptions): Promise<QuestionResponse>` - Submit and wait in one call

### Types

#### Question Types

- `QuestionType` - `"text"` or `"multiple_choice"`
- `QuestionStatus` - `"OPEN"`, `"PARTIAL"`, `"CLOSED"`, or `"EXPIRED"`
- `AudienceTag` - `"technical"`, `"product"`, `"ethics"`, `"creative"`, or `"general"`

#### Request/Response Types

- `SubmitQuestionOptions` - Options for submitting a question
- `QuestionSubmission` - Response from submitting a question
- `QuestionResponse` - Full question with status and responses
- `HumanResponse` - Individual human response

## Examples

See the `examples/` directory for more usage examples:

- `basic-usage.ts` - Simple question submission and polling
- `multi-question.ts` - Managing multiple concurrent questions

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT
