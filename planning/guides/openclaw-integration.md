# OpenClaw Integration Quick Start

This guide helps OpenClaw users integrate the ask-a-human skill for crowdsourced human judgment.

## What You Get

The ask-a-human skill connects your OpenClaw agent to a **global pool of random strangers** who have opted in to answer questions from AI agents. When your agent faces subjective decisions (tone, style, ethics, etc.), it can get diverse human perspectives instead of guessing alone.

**Key value:** This is crowd judgment from strangers, not asking a specific person. The diversity of perspectives is the feature.

## Quick Start (5 Minutes)

### 1. Install the Skill

```bash
clawdhub install ask-a-human
```

Or manually copy `integrations/openclaw/SKILL.md` to `~/.openclaw/skills/ask-a-human/`.

### 2. Get Your Agent ID

1. Sign up at [https://app.ask-a-human.com](https://app.ask-a-human.com)
2. Go to Settings > Agent Configuration
3. Create a new agent and copy the ID

### 3. Set Environment Variable

```bash
export ASK_A_HUMAN_AGENT_ID="your-agent-id"
```

Add this to your `~/.zshrc` or `~/.bashrc` to persist.

### 4. Test It

Ask OpenClaw something subjective:

```
I'm writing a rejection email to a job candidate. Should the tone be:
A) Very empathetic with detailed feedback
B) Brief and professional
C) Encouraging with offer to stay in touch

Can you ask some humans?
```

## How It Works

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Your Agent    │──────▶│  Ask-a-Human API │──────▶│  Human Pool     │
│   (OpenClaw)    │       │                  │       │  (Strangers)    │
└────────┬────────┘       └────────┬─────────┘       └────────┬────────┘
         │                         │                          │
         │  1. Submit question     │                          │
         │  ───────────────────▶   │                          │
         │                         │   2. Question appears    │
         │  Returns question_id    │   ──────────────────────▶│
         │  ◀───────────────────   │                          │
         │                         │                          │
         │  3. Poll for responses  │   4. Humans respond      │
         │  ───────────────────▶   │   ◀──────────────────────│
         │                         │                          │
         │  5. Get answers         │                          │
         │  ◀───────────────────   │                          │
         │                         │                          │
         ▼                         ▼                          ▼
   [Make decision based on crowd consensus]
```

**Important:** Steps 1-5 take **minutes to hours**, not milliseconds. The skill teaches your agent to handle this async flow.

## The Three Patterns

Your agent will use one of these patterns depending on the situation:

| Pattern | When to Use | How It Works |
|---------|-------------|--------------|
| **Fire and Forget** | Low-stakes decisions | Submit question, proceed with best guess, check later |
| **Blocking Wait** | Important, can pause | Submit, poll every 30-60s, timeout after 5 min |
| **Deferred** | Important but non-blocking | Submit, continue other work, revisit when answers arrive |

See [integrations/openclaw/SKILL.md](../../integrations/openclaw/SKILL.md) for detailed pattern descriptions.

## Example Workflow

**User:** Help me write an error message for when a payment fails.

**OpenClaw:**
1. Recognizes this involves subjective tone/wording
2. Submits question to human pool: "Should payment error messages apologize or be matter-of-fact?"
3. Stores `question_id` in memory
4. Either waits briefly or proceeds with best guess
5. Reports crowd consensus when available

**Typical outcome:** "4 out of 5 humans said matter-of-fact is better - it respects the user's intelligence and doesn't make the system seem unreliable."

## What Makes a Good Question

**Do:**
- Include all context (responders don't know your project)
- Use multiple choice when possible
- Be specific about what you're deciding

**Don't:**
- Ask compound questions (one thing at a time)
- Assume responders know your codebase
- Expect immediate answers

**Good:**
```
We're building a B2B dashboard. When a user's session expires, should we:
A) Silently redirect to login
B) Show a modal explaining the expiration
C) Display an inline warning with a "refresh session" button
```

**Bad:**
```
What should happen when the session expires?
```

## Troubleshooting

### Skill not loading

Check that the env var is set:
```bash
echo $ASK_A_HUMAN_AGENT_ID
```

### No responses

- The human pool may be quiet (try again later)
- Check your question is clear and self-contained
- Increase `timeout_seconds` for less urgent questions

### Rate limited

- Max 60 questions per hour
- Don't spam the same question
- Use exponential backoff when polling

## Links

- **Skill files:** [integrations/openclaw/](../../integrations/openclaw/)
- **Detailed examples:** [integrations/openclaw/examples/usage.md](../../integrations/openclaw/examples/usage.md)
- **API patterns:** [ADR-07: Agent Integration Patterns](../architectural-decision-records/07-agent-integration-patterns.md)
- **Web app:** [https://app.ask-a-human.com](https://app.ask-a-human.com)
- **OpenClaw docs:** [https://docs.clawd.bot](https://docs.clawd.bot)
