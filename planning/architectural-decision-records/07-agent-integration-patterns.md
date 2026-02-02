# ADR-07: Agent Integration Patterns

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

LLM agents need to request human input for subjective decisions, confidence checks, and reality validation. Unlike traditional APIs, agents operate asynchronously and need strategies to handle the delay between asking a question and receiving responses.

Key challenges:
- Humans respond on minutes-to-hours timescales, not milliseconds
- Agents may need to continue working on other tasks while waiting
- Some questions may time out without sufficient responses
- Agents operate in different environments (Cursor, Claude Desktop, autonomous scripts)

We need to document recommended patterns for integrating Ask-a-Human into various agent architectures.

## Decision

We recommend three primary integration patterns, each suited to different agent types:

### Pattern 1: Fire and Continue

**Best for:** Autonomous agents with multiple independent tasks

The agent submits a question and continues with other work, checking back later.

**Python:**
```python
# Submit question
result = ask_human(
    question="Should I use approach A or B?",
    type="multiple_choice",
    options=["Approach A", "Approach B"]
)

# Continue with other work
do_independent_task_1()
do_independent_task_2()

# Check for responses when needed
responses = check_human_responses(result.question_id)
if responses.status in ["CLOSED", "PARTIAL"]:
    proceed_with_human_input(responses)
```

**TypeScript:**
```typescript
// Submit question
const result = await client.submitQuestion({
  prompt: "Should I use approach A or B?",
  type: "multiple_choice",
  options: ["Approach A", "Approach B"],
});

// Continue with other work
await doIndependentTask1();
await doIndependentTask2();

// Check for responses when needed
const response = await client.getQuestion(result.questionId);
if (response.status === "CLOSED" || response.status === "PARTIAL") {
  proceedWithHumanInput(response);
}
```

**Advantages:**
- Agent stays productive during wait
- No blocking of other operations
- Natural fit for task queues

**Disadvantages:**
- Must track pending questions
- May need to revisit decisions later
- More complex orchestration

### Pattern 2: Wait with Timeout

**Best for:** Interactive agents (Cursor, Claude Desktop) where the user expects a response

The agent polls periodically until responses arrive or a reasonable timeout.

**Python:**
```python
result = ask_human(
    question="Is this error message clear?",
    min_responses=3,
    timeout_seconds=300  # 5 minutes
)

# Poll with exponential backoff
for i in range(10):
    time.sleep(30 * (1.5 ** i))  # 30s, 45s, 67s, ...
    responses = check_human_responses(result.question_id)
    if responses.current_responses >= 3:
        break

# Use whatever responses we got
make_decision(responses)
```

**TypeScript (using Orchestrator):**
```typescript
const orchestrator = new AskHumanOrchestrator(client, { pollInterval: 30000 });

const submission = await orchestrator.submit({
  prompt: "Is this error message clear?",
  type: "text",
  minResponses: 3,
  timeoutSeconds: 300,
});

// Wait with automatic exponential backoff
const responses = await orchestrator.awaitResponses(
  [submission.questionId],
  { minResponses: 3, timeout: 300000 }
);

// Use whatever responses we got
makeDecision(responses[submission.questionId]);
```

**Advantages:**
- Simple to implement
- User sees result in same session
- Works well for Cursor/Claude Desktop

**Disadvantages:**
- May timeout without sufficient responses
- Agent is "blocked" (though can display progress)

### Pattern 3: Multi-Turn Conversation

**Best for:** Chat-based agents where multiple exchanges are natural

The agent asks a question, informs the user it's waiting, then the user can check back.

```
Agent: I'm uncertain about the tone for this email. I've asked some humans
       for their opinion. The question ID is q_abc123.
       
       You can ask me to check the responses, or I can proceed with my
       best guess if you prefer.

User: Check the responses

Agent: I received 5 responses:
       - 3 said "professional but warm"
       - 2 said "casual and friendly"
       
       Based on the majority, I'll use a professional but warm tone.
```

**Advantages:**
- Natural conversational flow
- User stays in control
- Works well for long-running tasks

**Disadvantages:**
- Requires user to remember to check back
- Not suited for fully autonomous agents

## Implementation

### SDK Support

Both the Python and TypeScript SDKs provide two levels of abstraction:

**AskHumanClient** (low-level):
- Direct API wrapper
- `submit_question()` / `submitQuestion()` and `get_question()` / `getQuestion()` methods
- Agent manages polling/waiting

**AskHumanOrchestrator** (high-level):
- Handles polling with exponential backoff
- `await_responses()` / `awaitResponses()` blocks until ready or timeout
- `poll_once()` / `pollOnce()` for non-blocking checks
- Configurable poll interval and max backoff
- TypeScript SDK additionally supports `AbortController` for cancellation

| Python SDK | TypeScript SDK |
|------------|----------------|
| `AskHumanClient` | `AskHumanClient` |
| `AskHumanOrchestrator` | `AskHumanOrchestrator` |
| `submit_question()` | `submitQuestion()` |
| `get_question()` | `getQuestion()` |
| `await_responses()` | `awaitResponses()` |
| `poll_once()` | `pollOnce()` |

### MCP Tools Support

The MCP server exposes two tools:

- `ask_human` - Submit a question, returns question_id
- `check_human_responses` - Poll for responses

These map directly to the SDK methods and support all three patterns.

## Handling Partial Results

Agents should handle cases where:
- Some but not all requested responses arrive
- Question expires before sufficient responses
- No responses arrive

**Recommended strategies:**

1. **Accept partial:** Proceed with available responses if they're sufficient
2. **Fall back to default:** Use agent's best guess, noting reduced confidence
3. **Retry with different parameters:** Reduce min_responses or extend timeout
4. **Escalate:** Inform user that human input wasn't available

**Python:**
```python
responses = orchestrator.await_responses(
    question_ids=[qid],
    min_responses=5,
    timeout=300
)

question = responses[qid]

if question.status == "CLOSED":
    # Full responses received
    confidence = "high"
elif question.status == "PARTIAL" and question.current_responses >= 3:
    # Partial but usable
    confidence = "medium"
else:
    # Insufficient responses
    confidence = "low"
    # Fall back to agent's analysis
```

**TypeScript:**
```typescript
const responses = await orchestrator.awaitResponses(
  [questionId],
  { minResponses: 5, timeout: 300000 }
);

const question = responses[questionId];

let confidence: "high" | "medium" | "low";
if (question.status === "CLOSED") {
  // Full responses received
  confidence = "high";
} else if (question.status === "PARTIAL" && question.currentResponses >= 3) {
  // Partial but usable
  confidence = "medium";
} else {
  // Insufficient responses
  confidence = "low";
  // Fall back to agent's analysis
}
```

## Exponential Backoff

To reduce API load, agents should use exponential backoff when polling:

```
Base interval: 30 seconds
Multiplier: 1.5x
Max interval: 5 minutes

Poll 1: 30s
Poll 2: 45s
Poll 3: 67s
Poll 4: 101s
Poll 5: 151s (capped at 300s)
...
```

The SDK's `AskHumanOrchestrator` implements this automatically.

## Consequences

### Positive

- Clear patterns for different agent types
- SDK handles complexity of polling/backoff
- MCP tools work with any pattern
- Graceful handling of timeouts and partial results

### Negative

- Agents must handle async nature (can't just "call and get answer")
- Some patterns require more complex orchestration
- Users may need to wait for responses in interactive contexts

### Risks

- Network issues could lose track of pending questions
- Long timeouts could tie up resources
- Humans may not respond to all questions

## Related Documents

- [PRD-02: Agent API and MCP Tool](../product-requirements-document/02-agent-api.md)
- [ADR-03: API Design](03-api-design.md)
- [Python SDK Documentation](../../sdk-python/README.md)
- [TypeScript SDK Documentation](../../sdk-typescript/README.md)
- [MCP Server Documentation](../../mcp-server/README.md)
- [Python Content Writer Example](../../examples/content-writer-agent/README.md)
- [TypeScript Content Writer Example](../../examples/typescript-content-writer/README.md)
