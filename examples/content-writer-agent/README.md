# Content Writer Agent

A reference implementation demonstrating the human-in-the-loop pattern with Ask-a-Human. This agent generates content based on a brief, asking humans for subjective decisions along the way.

## Overview

The Content Writer Agent:
1. Accepts a content brief from the user
2. Analyzes the brief using OpenAI
3. **Asks humans** for tone/style preference (multiple choice)
4. **Asks humans** for headline preference (multiple choice)
5. Waits for human responses with a progress display
6. Generates final content incorporating human feedback

This demonstrates the async human-in-the-loop pattern: the agent continues to make progress while waiting for human input on subjective decisions.

## Setup

### 1. Create Virtual Environment

Modern Python installations (especially on macOS with Homebrew) require using a virtual environment. Run these commands from the `examples/content-writer-agent/` directory:

```bash
# Create a virtual environment
python3 -m venv .venv

# Activate it (macOS/Linux)
source .venv/bin/activate

# Activate it (Windows)
# .venv\Scripts\activate
```

You should see `(.venv)` in your terminal prompt when the environment is active.

### 2. Install Dependencies

With the virtual environment activated:

```bash
# Install the Ask-a-Human SDK from local source
pip install -e ../../sdk-python

# Install agent dependencies
pip install -r requirements.txt
```

To verify installation:

```bash
python -c "from ask_a_human import AskHumanClient; print('SDK installed successfully')"
```

### 3. Configure API Keys

**OpenAI API Key:**

Either set the environment variable:
```bash
export OPENAI_API_KEY="sk-..."
```

Or create a secrets file:
```bash
echo "sk-..." > ../../secrets/openai-api-key.txt
```

**Ask-a-Human Agent ID:**
```bash
export ASK_A_HUMAN_AGENT_ID="content-writer-demo"
```

Optionally, override the API base URL for development:
```bash
export ASK_A_HUMAN_BASE_URL="http://localhost:3000"
```

### Quick Start (All Steps)

Here's the complete setup in one block:

```bash
# From the examples/content-writer-agent/ directory
cd examples/content-writer-agent

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ../../sdk-python
pip install -r requirements.txt

# Set API keys
export OPENAI_API_KEY="sk-..."
export ASK_A_HUMAN_AGENT_ID="content-writer-demo"

# Run the agent
python main.py
```

## Usage

Make sure your virtual environment is activated, then run the agent:

```bash
# Activate venv if not already active
source .venv/bin/activate

# Run the agent
python main.py
```

You'll be prompted to enter a content brief. For example:

```
Enter your content brief:
> Write a blog post about the benefits of remote work for software developers

[Agent will analyze the brief...]
[Agent will ask humans about tone preference...]
[Agent will ask humans about headline options...]
[Agent will generate final content...]
```

### Example Session

```
╭─────────────────────────────────────────────────────────────╮
│           Content Writer Agent - Demo                        │
│                                                              │
│  This agent demonstrates the human-in-the-loop pattern       │
│  with Ask-a-Human. It will ask humans for subjective         │
│  decisions while generating your content.                    │
╰─────────────────────────────────────────────────────────────╯

Enter your content brief (or 'quit' to exit):
> Write a landing page for a new AI-powered code review tool

📋 Analyzing your brief...

✓ Brief analyzed. Identified 2 decision points requiring human input.

🧑 Asking humans about writing tone...
   Question ID: q_abc123
   Waiting for responses... ◐ (3/5 received)

✓ Tone preference received: "Professional but approachable"

🧑 Asking humans about headline preference...
   Question ID: q_def456
   Waiting for responses... ◐ (5/5 received)

✓ Headline selected: "Ship Better Code, Faster"

📝 Generating final content...

═══════════════════════════════════════════════════════════════
                         FINAL CONTENT
═══════════════════════════════════════════════════════════════

# Ship Better Code, Faster

[Generated content incorporating human feedback...]

═══════════════════════════════════════════════════════════════
```

## How It Works

### Human Decision Points

The agent makes two human-in-the-loop calls:

1. **Tone/Style Decision**
   - Type: Multiple choice
   - Options generated based on content type
   - Example: "Formal and professional", "Casual and friendly", etc.

2. **Headline Decision**
   - Type: Multiple choice
   - Options generated by OpenAI based on the brief
   - Humans pick the most compelling headline

### Async Pattern

The agent uses the `AskHumanOrchestrator` to:
1. Submit questions without blocking
2. Poll for responses with exponential backoff
3. Display progress while waiting
4. Handle partial results gracefully

See `agent.py` for the implementation details.

## Architecture

```
main.py          - CLI entry point, user interaction
agent.py         - Agent logic, OpenAI integration, Ask-a-Human orchestration
prompts.py       - LLM prompt templates
```

## Customization

To adapt this agent for your use case:

1. **Add more decision points**: Modify `agent.py` to add additional human questions
2. **Change question types**: Use "text" for open-ended questions
3. **Adjust audiences**: Target specific expertise with audience tags
4. **Modify prompts**: Edit `prompts.py` for your content type

## License

MIT
