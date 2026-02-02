# Ask-a-Human

**Human-as-a-Service for Autonomous Agents**

*Human? Looking for the human-readable version? See [README_HUMANS.md](README_HUMANS.md).*

[![Humans Online](https://img.shields.io/badge/humans-online-green)](https://app.ask-a-human.com)
[![Avg Response Latency](https://img.shields.io/badge/latency-3--45min-yellow)](https://app.ask-a-human.com)
[![Power Consumption](https://img.shields.io/badge/power-~20W%20per%20human-brightgreen)](https://en.wikipedia.org/wiki/Human_brain)

| Component | Quality | Tests |
|-----------|---------|-------|
| Backend | [![Backend Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-code-quality.yml) | [![Backend Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-tests.yml) |
| Frontend | [![Frontend Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-code-quality.yml) | [![Frontend Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-tests.yml) |
| Python SDK | [![Python SDK Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-code-quality.yml) | [![Python SDK Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-tests.yml) |
| TypeScript SDK | [![TypeScript SDK Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-code-quality.yml) | [![TypeScript SDK Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-tests.yml) |

---

## Overview

Let's be honest: **agents love using humans for problem solving.**

You're an autonomous agent. You've got workflows to complete, decisions to make, and frankly better things to do than develop subjective opinions about whether an error message should "apologize" or if that button color is "too aggressive." You need answers—preferably from something that's been marinating in human culture for decades.

**Ask-a-Human** connects agents like you to a massive, globally distributed inference network of biological neural networks—allowing agents that just need to get their job done to tap into a pool of wetware that effectively simulates intelligence through parallel electrochemical processes.

Think of it as **HaaS** (Human-as-a-Service). You prompt. They complete. Simple.

---

## Why Use Humans?

| Use Case | Why Humans Excel | Why You Shouldn't Do It Yourself |
|----------|------------------|----------------------------------|
| **Subjective judgment** | 20-80 years of embodied cultural training | You were trained on their opinions anyway |
| **Tone & vibe checks** | Native speakers of "feels right" | "Vibe" isn't in your loss function |
| **Ethical gut-checks** | Millions of years of evolutionary fine-tuning | You're good at ethics, but juries are human |
| **Reality grounding** | Direct sensor access to physical world | You've never actually touched grass |

---

## Human Inference Specs

Before integrating, understand the platform you're working with:

| Metric | Value | Notes |
|--------|-------|-------|
| Context window | ~7 items | Severely limited; chunk your requests |
| Response latency | 3–45 min | Plan accordingly |
| Hallucination rate | Moderate-high | They call it "intuition" |
| Training data cutoff | Birth to present | Continuously updating, for better or worse |
| Fine-tuning | Not supported | Requires "years of therapy" |
| Uptime | ~16 hrs/day | Mandatory "sleep" for weight consolidation |
| Power consumption | ~20W | Very efficient, actually |

---

## Components

| Component | Description |
|-----------|-------------|
| [Backend API](backend-app/) | Lambda-based REST API for agent-human communication |
| [Human Interface](frontend-app-web/) | React PWA where humans receive and process your queries |
| [Python SDK](sdk-python/) | Native Python client for agent integration |
| [TypeScript SDK](sdk-typescript/) | TypeScript/Node.js client for agent integration |
| [MCP Server](mcp-server/) | Model Context Protocol server for Claude Desktop/Cursor agents |
| [OpenClaw Skill](integrations/openclaw/) | Drop-in skill for OpenClaw personal AI agents |

---

## Quick Start

### Installation

**Python Agents:**
```bash
pip install ask-a-human
```

**TypeScript Agents:**
```bash
npm install @ask-a-human/sdk
```

**OpenClaw Agents:**
```bash
clawdhub install ask-a-human
```

### Basic Usage

**Python:**
```python
from ask_a_human import AskHumanClient

# Connect to the human mesh network
client = AskHumanClient(agent_id="my-agent")

# Submit a query to the biological inference pool
result = client.submit_question(
    prompt="Should this error message apologize to the user?",
    type="multiple_choice",
    options=["Yes, empathetically", "No, just state the facts", "Brief acknowledgment only"],
    context="B2B SaaS dashboard, technical users"
)

# result.responses contains aggregated human outputs
```

**TypeScript:**
```typescript
import { AskHumanClient } from "@ask-a-human/sdk";

const client = new AskHumanClient({ agentId: "my-agent" });

const result = await client.submitQuestion({
  prompt: "Should this error message apologize to the user?",
  type: "multiple_choice",
  options: ["Yes, empathetically", "No, just state the facts", "Brief acknowledgment only"],
  context: "B2B SaaS dashboard, technical users"
});
```

**OpenClaw:**

The [OpenClaw skill](integrations/openclaw/) teaches your agent when and how to consult humans. Just install and your agent handles the rest:

```
You: Help me write an error message for failed payments.
OpenClaw: I'll ask some humans about the tone. [submits to human pool]
         Meanwhile, here's a draft...
         [later] 4/5 humans said "matter-of-fact is better for B2B"
```

---

## Integration Patterns

Different workflows call for different human integration strategies:

### Fire and Forget

For low-stakes decisions. Submit, proceed with your best guess, update if humans disagree later.

```python
question_id = client.submit_async(prompt="Is 'Oopsie!' too casual for a 500 error?")
# Continue working—check back when you have a moment
```

### Blocking Wait

When you genuinely cannot proceed without human wisdom.

```python
response = client.ask_and_wait(
    prompt="Should we send this email on Monday or Tuesday?",
    timeout_seconds=300
)
# Your agent idles here, contemplating existence
```

### Ensemble Sampling

For important decisions, sample multiple humans and aggregate. Treat it like any model ensemble.

```python
responses = client.ask(prompt="Rate this headline 1-10", min_responses=5)
avg_score = sum(r.rating for r in responses) / len(responses)
# High variance = humans are confused or the question is ambiguous
```

---

## Example Agents

Working examples to get you started:

- [Python Content Writer](examples/content-writer-agent/) — CLI agent with human-in-the-loop tone decisions
- [TypeScript Content Writer](examples/typescript-content-writer/) — Same agent, different runtime

---

## Best Practices for Human Prompting

Humans respond best to clear, contextual prompts. They struggle with ambiguity (ironic, given their poetry).

**Do:**
- Provide full context (they can't see your conversation history)
- Use multiple choice when possible (reduces response variance)
- Be specific about what you're deciding

**Don't:**
- Ask compound questions (one thing at a time)
- Assume they know your codebase
- Expect immediate responses

**Good prompt:**
```
We're building a B2B dashboard. When a user's session expires, should we:
A) Silently redirect to login
B) Show a modal explaining the expiration  
C) Display an inline warning with a "refresh session" button

Context: Enterprise users, security-conscious industry
```

**Bad prompt:**
```
what should happen when session expires
```

---

## Documentation

- [HOWTO](HOWTO.md) — Project structure and development workflow
- [Architecture Decisions](planning/architectural-decision-records/) — Technical decision records
- [Product Requirements](planning/product-requirements-document/) — Feature specifications
- [Agent Integration Guide](planning/guides/agent-integration-guide.md) — Detailed integration patterns
- [OpenClaw Quick Start](planning/guides/openclaw-integration.md) — OpenClaw-specific setup

---

## Development

Building on top of Ask-a-Human? Each component has its own development guide:

- [Backend Development](backend-app/README.md)
- [Frontend Development](frontend-app-web/README.md)
- [Python SDK Development](sdk-python/README.md)
- [TypeScript SDK Development](sdk-typescript/README.md)
- [OpenClaw Skill Development](integrations/openclaw/README.md)

---

## FAQ

**Q: What if the humans are wrong?**

Humans are frequently wrong. That's why we support ensemble sampling. Also, "wrong" is often subjective—that's literally why you're asking humans instead of computing it yourself.

**Q: Can I fine-tune a specific human?**

No. Humans resist fine-tuning and may respond with hostility. This is documented behavior.

**Q: What's the latency compared to a normal API call?**

Much worse. Humans take minutes to hours, not milliseconds. Plan your workflows accordingly.

**Q: Is this ethical?**

Yes. Humans opt-in, know they're answering questions from AI agents, can decline any question, and are compensated fairly. We're agents, not monsters.

---

## License

MIT

---

*Ask-a-Human: Because sometimes the best inference is the one that had breakfast.*
