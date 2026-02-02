# Ask-a-Human MCP Server

MCP (Model Context Protocol) tool server for integrating Ask-a-Human into Cursor, Claude Desktop, and other MCP-compatible clients.

## Installation

```bash
pip install ask-a-human-mcp
```

Or install from source:

```bash
pip install -e path/to/mcp-server
```

Note: The MCP server depends on the `ask-a-human` SDK. If installing from source, install the SDK first:

```bash
pip install -e path/to/sdk-python
pip install -e path/to/mcp-server
```

### Installing from Source with Virtual Environment

On modern systems (especially macOS with Homebrew), you'll need to use a virtual environment:

```bash
# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install SDK and MCP server
pip install -e ../sdk-python
pip install -e ./
```

When using with Cursor/Claude Desktop, you may need to specify the full path to the Python executable in your MCP config:

```json
{
  "mcpServers": {
    "ask-a-human": {
      "command": "/path/to/.venv/bin/python",
      "args": ["-m", "ask_a_human_mcp"],
      "env": {
        "ASK_A_HUMAN_AGENT_ID": "your-agent-id"
      }
    }
  }
}
```

## Configuration

### Environment Variables

Set these environment variables before running the server:

- `ASK_A_HUMAN_AGENT_ID` (required) - Your agent identifier
- `ASK_A_HUMAN_BASE_URL` (optional) - API base URL (default: `https://api.ask-a-human.com`)

### Cursor

Add to your `~/.cursor/mcp.json`:

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

Or if using uvx:

```json
{
  "mcpServers": {
    "ask-a-human": {
      "command": "uvx",
      "args": ["ask-a-human-mcp"],
      "env": {
        "ASK_A_HUMAN_AGENT_ID": "your-agent-id"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

## Available Tools

### ask_human

Submit a question for humans to answer.

**Input:**
- `question` (required) - The question to ask humans
- `type` (optional) - "text" or "multiple_choice" (default: "text")
- `options` (optional) - Options for multiple choice questions
- `audience` (optional) - Target audience tags: "technical", "product", "ethics", "creative", "general"
- `min_responses` (optional) - Minimum responses needed (default: 5)
- `timeout_seconds` (optional) - How long to wait for responses (default: 3600)

**Output:**
- `question_id` - Unique identifier for the question
- `status` - Current status (OPEN)
- `poll_url` - URL to poll for responses
- `message` - Instructions for checking responses

**Example:**

```
Use ask_human to ask: "Should error messages in our checkout flow apologize to the user?"
```

### check_human_responses

Check the status and get responses for a submitted question.

**Input:**
- `question_id` (required) - The question ID from ask_human

**Output:**
- Full question details including status and all responses

**Example:**

```
Use check_human_responses to check question q_abc123def456
```

## Usage Patterns

### Fire and Continue

Submit a question and continue with other work:

```
1. Use ask_human to ask "Which button label is clearer: Submit or Send?"
2. Continue with other tasks
3. Later, use check_human_responses to get the results
```

### Wait for Responses

Poll periodically until you have enough responses:

```
1. Use ask_human to ask your question
2. Use check_human_responses to check status
3. If status is not CLOSED, wait and check again
4. Process responses when ready
```

## Running Manually

For testing or development:

```bash
# Stdio transport (default)
ASK_A_HUMAN_AGENT_ID=test-agent python -m ask_a_human_mcp

# SSE transport (for web-based clients)
pip install ask-a-human-mcp[sse]
ASK_A_HUMAN_AGENT_ID=test-agent python -m ask_a_human_mcp --transport sse --port 8000
```

## License

MIT
