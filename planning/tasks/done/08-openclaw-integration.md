---
id: 08
title: OpenClaw Integration - Skill and Community Outreach
source: ADR-07
priority: medium
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# OpenClaw Integration - Skill and Community Outreach

## Description

Create an OpenClaw skill that lets any OpenClaw agent tap into ask-a-human's **global pool of random humans** for opinions and judgment calls. This is not about asking a specific person - it's about crowdsourcing decisions from strangers who have opted in to help AI agents.

**Why OpenClaw?**

OpenClaw is an open-source personal AI assistant framework with 134K+ GitHub stars and a passionate community. Users run it 24/7 for autonomous tasks (emails, calendar, code review, flight check-ins). One user reported their OpenClaw "accidentally started a fight with Lemonade Insurance because of a wrong interpretation" - this is exactly the problem ask-a-human solves.

**What ask-a-human provides:**

Ask-a-human gives any agent access to one single global random pool of humans willing to share their opinions. When an agent is uncertain about:
- Subjective decisions (tone, style, wording)
- Ethics or appropriateness
- Reality checks on assumptions
- A/B choices that need human intuition

...it can submit a question and get responses from multiple random strangers who have no context beyond what the agent provides. This is fundamentally different from "asking the owner" - it's crowdsourced judgment from diverse perspectives.

**The Core Challenge: Asynchronous Responses**

Submitting a question is easy and synchronous. The hard part is what comes after:

- **Responses take time** - Minutes to hours, not milliseconds
- **Questions might never get answered** - The pool might be empty, or nobody cares about this question
- **Answers might arrive very late** - After the agent has moved on to other tasks or even finished its session

The skill must teach OpenClaw agents to handle this inherently asynchronous process gracefully. This is the most important part of the integration - agents need to understand they're starting a process that won't complete immediately, and may never complete at all.

**Source code locations:**
- `integrations/openclaw/` - OpenClaw skill files (new)
- `planning/guides/` - Integration documentation

## Acceptance Criteria

### OpenClaw Skill (`integrations/openclaw/`)

#### SKILL.md File
- [x] Valid AgentSkills-compatible SKILL.md with YAML frontmatter
- [x] Clear skill name and description emphasizing "random humans" concept
- [x] Metadata with requirements (env: ASK_A_HUMAN_AGENT_ID)
- [x] Installation instructions for ClawHub
- [x] Homepage link to ask-a-human.com

#### Skill Instructions
- [x] Explains when to use: "Request judgment from random humans when..."
- [x] Makes clear this is a global pool, not the owner or specific people
- [x] **Heavily emphasizes the async nature** - this is not a tool that returns an answer
- [x] Explains the three possible outcomes: answers arrive, partial answers, no answers ever
- [x] Includes example prompts for common use cases

#### Async Handling Patterns (Critical Section)
- [x] **Pattern 1: Fire and Forget** - Submit question, note question_id in memory, proceed with best guess, check back during heartbeat
- [x] **Pattern 2: Blocking Wait** - Submit question, poll periodically, timeout after N minutes, proceed with whatever you have
- [x] **Pattern 3: Deferred Decision** - Submit question, continue with other work, revisit the decision point when answers arrive
- [x] Clear guidance on which pattern to use when
- [x] What to do when no answers ever arrive (fallback strategies)
- [x] What to do when answers arrive too late (already made the decision)

### Documentation

#### OpenClaw Integration Guide (`planning/guides/openclaw-integration.md`)
- [x] Quick start for OpenClaw users
- [x] Explains the "global random pool" value proposition
- [x] Shows complete workflow from question to decision
- [x] Troubleshooting common issues

### Community Outreach

- [ ] Skill submitted to ClawHub registry (or ready for submission) - **Ready for submission; requires manual `clawdhub sync` command**
- [ ] Draft message for OpenClaw Discord/community - **Deferred to separate outreach task**
- [ ] Identify potential showcase opportunities - **Deferred to separate outreach task**

## Out of Scope (This Task)

- Webhook notification support (future enhancement)
- "Ask owner" audience routing (fundamentally different product direction)
- Direct chat channel response collection (requires significant backend work)
- Changes to ask-a-human core API

## Implementation Notes

### Files Created

1. **`integrations/openclaw/SKILL.md`** - Main skill file with:
   - YAML frontmatter (name, description, metadata with openclaw requirements)
   - Comprehensive async handling instructions
   - Three patterns (Fire and Forget, Blocking Wait, Deferred Decision)
   - API reference with curl examples
   - Edge case handling (no responses, late responses, partial responses)

2. **`integrations/openclaw/README.md`** - Installation guide with:
   - ClawHub installation (`clawdhub install ask-a-human`)
   - Manual installation steps
   - Environment variable setup
   - Troubleshooting section

3. **`integrations/openclaw/examples/usage.md`** - Five detailed workflow examples:
   - Email tone decision (fire and forget)
   - Content headline choice (blocking wait)
   - Code review sensitivity check (deferred)
   - Handling no responses (timeout fallback)
   - Handling late responses

4. **`planning/guides/openclaw-integration.md`** - Quick start guide with:
   - 5-minute setup instructions
   - How it works diagram
   - Pattern summary table
   - Links to detailed docs

5. **Updated `README.md`** - Added OpenClaw to components and documentation sections

### API Integration Approach

The skill uses direct API calls via curl (through OpenClaw's `exec` tool) rather than the MCP server or Python SDK. This was chosen for simplicity - any OpenClaw installation can use curl without additional dependencies.

API endpoints used:
- `POST https://api.ask-a-human.com/api/questions` - Submit question
- `GET https://api.ask-a-human.com/api/questions/{id}` - Check responses

### Key Messaging

The skill consistently emphasizes:
- This is **crowd judgment from random strangers**, not asking specific people
- Responses take **minutes to hours** (or may never arrive)
- Always have a **fallback strategy**
- Store the `question_id` in memory for later checking

## ADR/PRD Updates

- [ ] Consider adding ADR-08 for external agent framework integrations
- [x] Update README.md to mention OpenClaw compatibility

## Follow-up Tasks

1. **Community Outreach** - Create separate task for:
   - Submitting skill to ClawHub
   - Announcing in OpenClaw Discord
   - Writing showcase blog post

2. **MCP Alternative** - Consider adding MCP-based instructions for OpenClaw users who prefer MCP over curl
