# Ask-a-Human: Project Guide

Welcome to the Ask-a-Human project. This document explains how the project is organized and how to contribute effectively.

## Quick Start

1. **Understand the vision**: Read `planning/fundamentals/00-initial-brainstorming.md`
2. **Check available resources**: Review `planning/fundamentals/01-available-infrastructure-accounts-and-services.md`
3. **Understand the architecture**: Read the ADRs in `planning/architectural-decision-records/`
4. **Know what we're building**: Read the PRDs in `planning/product-requirements-document/`
5. **Pick up a task**: Look in `planning/tasks/todo/` for work to do

---

## Project Structure

```
ask-a-human/
├── HOWTO.md                    # You are here
├── planning/
│   ├── fundamentals/           # Core context and constraints
│   ├── architectural-decision-records/  # Technical decisions (ADRs)
│   ├── product-requirements-document/   # Feature specs (PRDs)
│   ├── tasks/                  # Work tracking
│   │   ├── todo/              # Tasks ready to start
│   │   ├── in-progress/       # Tasks being worked on
│   │   └── done/              # Completed tasks
│   └── memory/                 # Project learnings and knowledge base
├── backend-app/                # Lambda functions, API implementation
├── frontend-app-web/           # PWA frontend (React/Vite)
├── infrastructure/             # Terraform, deployment configs
├── living-styleguide/          # Visual design reference (corporate identity)
└── secrets/                    # Credentials (not in git)
```

---

## Document Hierarchy

The planning documents form a hierarchy from vision to execution:

```
Fundamentals (Why & What constraints)
    │
    ├── ADRs (How - technical decisions)
    │
    ├── PRDs (What - feature specifications)
    │
    └── Tasks (Do - actionable work items)
            │
            └── Memory (Learn - captured knowledge)
```

### Fundamentals (`planning/fundamentals/`)

The foundation. Contains:
- **Vision and brainstorming**: What we're building and why
- **Constraints**: Available accounts, services, credentials, domains

Read these first. They rarely change but inform everything else.

### ADRs (`planning/architectural-decision-records/`)

Architectural Decision Records document **how** we're building things technically.

Each ADR covers:
- Context: Why we needed to decide
- Decision: What we chose
- Alternatives considered: What we didn't choose and why
- Consequences: Trade-offs we're accepting

**Current ADRs:**
| ADR | Topic |
|-----|-------|
| 01 | System Architecture Overview |
| 02 | Database Schema Design |
| 03 | API Design |
| 04 | Push Notification Strategy |
| 05 | Abuse Prevention |
| 06 | Infrastructure as Code |

ADRs are living documents. Update them when implementation reveals better approaches.

### PRDs (`planning/product-requirements-document/`)

Product Requirements Documents specify **what** we're building from a user/feature perspective.

Each PRD covers:
- User personas and stories
- Feature requirements
- Acceptance criteria
- Success metrics

**Current PRDs:**
| PRD | Topic |
|-----|-------|
| 01 | Human Web Application |
| 02 | Agent API and MCP Tool |
| 03 | Gamification System |
| 04 | Question Lifecycle |

### Tasks (`planning/tasks/`)

Tasks are the actionable work items derived from ADRs and PRDs.

See `planning/tasks/task-management.md` for the full process.

**Quick summary:**
1. Tasks live in `todo/`, `in-progress/`, or `done/`
2. Move files between folders as work progresses
3. Each task references its source ADR/PRD
4. Implementation learnings feed back into source documents

---

## Working on Tasks

### Finding Work

1. Look in `planning/tasks/todo/` for available tasks
2. Tasks are numbered (01, 02, ...) roughly in priority/dependency order
3. Read the task's source ADR/PRD for full context

### Starting a Task

1. Move the task file from `todo/` to `in-progress/`
2. Add `started: YYYY-MM-DD` to the frontmatter
3. Read the linked ADR/PRD documents thoroughly
4. Begin implementation

### During Implementation

1. Check off acceptance criteria as you complete them
2. Add notes to the "Implementation Notes" section
3. Note any ADR/PRD updates needed in that section
4. **Capture learnings** in `planning/memory/` (see below)

### Completing a Task

1. Ensure all acceptance criteria are checked
2. Move the task file from `in-progress/` to `done/`
3. Add `completed: YYYY-MM-DD` to the frontmatter
4. Apply any ADR/PRD updates you noted
5. Create follow-up tasks if needed

---

## Project Memory (`planning/memory/`)

The memory folder is a **knowledge base** that grows with the project. It captures learnings, patterns, and institutional knowledge that would otherwise be lost.

### Why Memory Matters

- Prevents repeating mistakes
- Preserves context for future contributors
- Builds up project-specific expertise
- Helps AI assistants understand project conventions

### What to Capture

Create markdown files for:

| Type | Example Filename | Content |
|------|------------------|---------|
| Key learnings | `learnings.md` | Hard-won insights from implementation |
| Patterns | `patterns.md` | Recurring solutions that work well |
| Gotchas | `gotchas.md` | Non-obvious pitfalls to avoid |
| Decisions | `decisions-log.md` | Small decisions not worth a full ADR |
| Conventions | `conventions.md` | Project-specific coding/naming conventions |
| Debugging | `debugging-tips.md` | How to diagnose common issues |
| Vendor notes | `aws-notes.md`, `firebase-notes.md` | Platform-specific learnings |

### Memory Format

Keep entries concise and scannable:

```markdown
# Key Learnings

## DynamoDB

### GSI Projection Costs (2026-02-15)
Learned that projecting all attributes to GSIs significantly increases storage costs.
Better to project only needed attributes and do a follow-up GetItem if more needed.
Source: Task 03 implementation.

### Conditional Writes for Idempotency (2026-02-18)
Use `attribute_not_exists(pk)` condition for idempotent creates.
This is cheaper than checking existence first.
Source: ADR-03 implementation.
```

### When to Add Memory

- After completing a task (what did you learn?)
- When you solve a tricky problem
- When you discover something non-obvious
- When you make a decision that future-you might question
- When debugging takes more than 30 minutes

---

## Design Reference

The `living-styleguide/` directory contains our visual design system:

- **Not a tech dependency** - it's a reference, not a library
- **Corporate identity** - colors, typography, spacing, component styles
- **Dark/light mode patterns** - theming approach to follow
- **Marketing consistency** - same look for app and marketing pages

When building UI, ensure visual consistency with the styleguide.

---

## Credentials and Secrets

Secrets are stored in `secrets/` (gitignored):

| File | Purpose |
|------|---------|
| `AWS.txt` | AWS access keys |
| `ask-a-human-poc-firebase-adminsdk-*.json` | Firebase service account |

See `planning/fundamentals/01-available-infrastructure-accounts-and-services.md` for details.

**Never commit secrets to git.**

---

## Feedback Loop

The system is designed to improve itself:

```
ADRs/PRDs → Tasks → Implementation → Learnings → Memory
                           │
                           └──────→ ADR/PRD Updates
```

1. **Tasks reference ADRs/PRDs** for requirements
2. **Implementation reveals reality** (better approaches, missing details)
3. **Memory captures learnings** for future reference
4. **ADRs/PRDs get updated** to stay accurate

Don't let documentation drift from reality. Update it.

---

## Getting Help

- **Architecture questions**: Check relevant ADR first
- **Feature questions**: Check relevant PRD first
- **"How did we do X before?"**: Check `planning/memory/`
- **Credentials/accounts**: Check `planning/fundamentals/01-*.md`

---

## Summary Checklist

Before starting work:
- [ ] Read the fundamentals
- [ ] Understand relevant ADRs
- [ ] Understand relevant PRDs
- [ ] Pick a task from `todo/`

During work:
- [ ] Update task notes as you go
- [ ] Capture learnings in `planning/memory/`
- [ ] Note any ADR/PRD updates needed

After completing work:
- [ ] Move task to `done/`
- [ ] Apply ADR/PRD updates
- [ ] Create follow-up tasks if needed

Happy building!
