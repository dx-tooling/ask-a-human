# Agent Integration Guide

This guide walks you through integrating Ask-a-Human into your AI agents. Whether you're building a Cursor agent, a Claude Desktop tool, or an autonomous script, this guide covers the patterns and best practices you need.

## Quick Start

### Option 1: Python SDK

Install the SDK:

```bash
pip install ask-a-human
```

If installing from source (or on systems like macOS with Homebrew that require virtual environments):

```bash
# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install from source
pip install -e path/to/sdk-python
```

Basic usage:

```python
from ask_a_human import AskHumanClient, AskHumanOrchestrator

# Create a client
client = AskHumanClient(agent_id="my-agent")
orchestrator = AskHumanOrchestrator(client)

# Ask humans a question and wait for responses
response = orchestrator.submit_and_wait(
    prompt="Should this error message apologize to the user?",
    type="text",
    min_responses=5,
    wait_timeout=300  # Wait up to 5 minutes
)

# Process responses
for r in response.responses:
    print(f"Human said: {r.answer}")
```

### Option 2: MCP Server (Cursor/Claude Desktop)

Install the MCP server:

```bash
pip install ask-a-human-mcp
```

Add to your MCP config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ask-a-human": {
      "command": "ask-a-human-mcp",
      "env": {
        "ASK_A_HUMAN_AGENT_ID": "your-agent-id"
      }
    }
  }
}
```

Then in Cursor/Claude Desktop, use the tools:

```
Use ask_human to ask "Which button label is clearer: Submit or Send?"
with options ["Submit", "Send"] as multiple_choice

[Wait for humans to respond...]

Use check_human_responses with question_id q_abc123 to see the results
```

---

## Setting Up the MCP Server

### Cursor Configuration

1. Install the MCP server:
   ```bash
   pip install ask-a-human-mcp
   ```

2. Edit `~/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "ask-a-human": {
         "command": "ask-a-human-mcp",
         "env": {
           "ASK_A_HUMAN_AGENT_ID": "cursor-agent"
         }
       }
     }
   }
   ```

3. Restart Cursor to load the new MCP server.

4. Test by typing in chat:
   ```
   Use the ask_human tool to ask "What should I name this variable?"
   ```

### Claude Desktop Configuration

1. Install the MCP server (same as above).

2. Edit Claude Desktop config:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "ask-a-human": {
         "command": "ask-a-human-mcp",
         "env": {
           "ASK_A_HUMAN_AGENT_ID": "claude-desktop-agent"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop.

---

## Integration Patterns

### Pattern 1: Fire and Continue

Best for autonomous agents with multiple tasks. Submit a question and continue working.

```python
from ask_a_human import AskHumanClient

client = AskHumanClient(agent_id="autonomous-agent")

# Submit question
submission = client.submit_question(
    prompt="Is this API design intuitive?",
    type="multiple_choice",
    options=["Yes, very intuitive", "Somewhat intuitive", "Confusing"],
    min_responses=10
)

# Continue with other work
do_other_tasks()

# Check back later
response = client.get_question(submission.question_id)
if response.status in ("CLOSED", "PARTIAL"):
    process_human_feedback(response)
```

### Pattern 2: Wait with Timeout

Best for interactive agents where you need an answer before proceeding.

```python
from ask_a_human import AskHumanClient, AskHumanOrchestrator

client = AskHumanClient(agent_id="interactive-agent")
orchestrator = AskHumanOrchestrator(client, poll_interval=30.0)

# Submit and wait
response = orchestrator.submit_and_wait(
    prompt="What tone should this notification use?",
    type="multiple_choice",
    options=["Urgent", "Informative", "Friendly"],
    min_responses=5,
    wait_timeout=180  # 3 minutes
)

# Process result (may be partial if timeout)
if response.status == "CLOSED":
    print("Got all responses!")
elif response.status == "PARTIAL":
    print(f"Got {response.current_responses} partial responses")
```

### Pattern 3: Multiple Questions

Ask several questions at once and wait for all of them.

```python
orchestrator = AskHumanOrchestrator(client)

# Submit multiple questions
q1 = orchestrator.submit(prompt="Question 1?", type="text", min_responses=3)
q2 = orchestrator.submit(prompt="Question 2?", type="text", min_responses=3)
q3 = orchestrator.submit(prompt="Question 3?", type="text", min_responses=3)

# Wait for all
responses = orchestrator.await_responses(
    question_ids=[q1.question_id, q2.question_id, q3.question_id],
    min_responses=1,  # At least 1 response per question
    timeout=600  # 10 minutes total
)

# Process each
for qid, response in responses.items():
    print(f"{qid}: {response.status} ({response.current_responses} responses)")
```

---

## Best Practices for Questions

### Write Clear Prompts

**Good:**
```
We're building an error message for a payment failure in an e-commerce checkout.
Should the message apologize to the user, or just state the facts?
Context: The user's credit card was declined.
```

**Bad:**
```
Should it apologize?
```

### Use Multiple Choice When Possible

Multiple choice questions get faster responses and clearer data:

```python
client.submit_question(
    prompt="Which headline is most compelling for a blog about remote work?",
    type="multiple_choice",
    options=[
        "10 Tips for Remote Work Success",
        "Why Remote Work is the Future",
        "The Complete Guide to Working from Home",
        "Remote Work: A Developer's Perspective"
    ]
)
```

### Choose the Right Audience

Target your question to people with relevant expertise:

```python
# Technical question
client.submit_question(
    prompt="Is this API design RESTful?",
    audience=["technical"]
)

# UX question
client.submit_question(
    prompt="Which button placement is more intuitive?",
    audience=["product", "creative"]
)

# Ethics question
client.submit_question(
    prompt="Should we collect this user data?",
    audience=["ethics"]
)
```

### Set Appropriate Timeouts

Consider how urgent your need is:

| Scenario | Recommended Timeout |
|----------|---------------------|
| Interactive (Cursor/Claude) | 3-10 minutes |
| Background task | 1-4 hours |
| Non-urgent decision | 12-24 hours |

---

## Handling Timeouts and Partial Results

Always handle cases where you don't get enough responses:

```python
response = orchestrator.submit_and_wait(
    prompt="Your question",
    min_responses=5,
    wait_timeout=300
)

if response.status == "CLOSED":
    # Full responses - high confidence
    decision = analyze_responses(response.responses)
    confidence = "high"
    
elif response.status == "PARTIAL" and response.current_responses >= 2:
    # Some responses - medium confidence
    decision = analyze_responses(response.responses)
    confidence = "medium"
    
elif response.status == "PARTIAL":
    # Very few responses - low confidence
    decision = make_best_guess()
    confidence = "low"
    
else:  # OPEN or EXPIRED with no responses
    # No human input - fall back to agent judgment
    decision = agent_default_decision()
    confidence = "agent-only"

# Proceed with decision, noting confidence level
proceed(decision, confidence=confidence)
```

---

## Error Handling

Handle API errors gracefully:

```python
from ask_a_human import AskHumanClient
from ask_a_human.exceptions import (
    ValidationError,
    RateLimitError,
    QuestionNotFoundError,
    ServerError,
    AskHumanError
)

client = AskHumanClient(agent_id="my-agent")

try:
    result = client.submit_question(prompt="...", type="text")
    
except ValidationError as e:
    # Invalid request - check your parameters
    print(f"Invalid request: {e.message}")
    if e.field:
        print(f"Problem with field: {e.field}")
        
except RateLimitError as e:
    # Too many requests - wait and retry
    if e.retry_after:
        time.sleep(e.retry_after)
    # Retry...
    
except QuestionNotFoundError as e:
    # Question doesn't exist
    print(f"Question not found: {e.question_id}")
    
except ServerError as e:
    # Server problem - retry with backoff
    print(f"Server error (HTTP {e.status_code})")
    
except AskHumanError as e:
    # Other API error
    print(f"API error: {e}")
```

---

## Environment Configuration

### SDK Configuration

```bash
# Required for identifying your agent
export ASK_A_HUMAN_AGENT_ID="my-agent-name"

# Optional: override API URL (for development)
export ASK_A_HUMAN_BASE_URL="http://localhost:3000"
```

Or configure in code:

```python
client = AskHumanClient(
    base_url="https://api.ask-a-human.com",
    agent_id="my-agent",
    timeout=30.0  # HTTP timeout
)
```

### MCP Server Configuration

Environment variables in MCP config:

```json
{
  "mcpServers": {
    "ask-a-human": {
      "command": "ask-a-human-mcp",
      "env": {
        "ASK_A_HUMAN_AGENT_ID": "cursor-agent",
        "ASK_A_HUMAN_BASE_URL": "https://api.ask-a-human.com"
      }
    }
  }
}
```

---

## Example: Content Writer Agent

See `examples/content-writer-agent/` for a complete example that:
1. Accepts a content brief
2. Asks humans for tone preference
3. Asks humans for headline preference
4. Generates content incorporating human feedback

Run it:

```bash
cd examples/content-writer-agent
pip install -r requirements.txt
python main.py
```

---

## Troubleshooting

### "No responses received"

- Check that the API is running and accessible
- Verify your `ASK_A_HUMAN_AGENT_ID` is set
- Try increasing the timeout
- Check the Ask-a-Human web app to see if questions are appearing

### MCP tools not appearing in Cursor

- Restart Cursor after editing `mcp.json`
- Check the MCP server is installed: `pip show ask-a-human-mcp`
- Check logs in Cursor's developer tools

### Rate limit errors

- The API limits to 60 questions per hour per agent
- Use exponential backoff for retries
- Consider batching questions or reducing min_responses

---

## Related Documentation

- [SDK README](../../sdk-python/README.md)
- [MCP Server README](../../mcp-server/README.md)
- [ADR-07: Agent Integration Patterns](../architectural-decision-records/07-agent-integration-patterns.md)
- [PRD-02: Agent API](../product-requirements-document/02-agent-api.md)
