# Task Management Process

This document describes the file-based task management system for the Ask-a-Human project.

## Overview

Tasks are managed through a simple folder-based workflow. Each task is a markdown file that moves between folders as it progresses through its lifecycle.

## Directory Structure

```
planning/tasks/
├── task-management.md    # This document
├── todo/                 # Tasks ready to be worked on
├── in-progress/          # Tasks currently being worked on (max 1-2 at a time)
└── done/                 # Completed tasks
```

## Task Lifecycle

```
┌─────────┐     ┌─────────────┐     ┌──────┐
│  todo/  │ ──► │ in-progress │ ──► │ done │
└─────────┘     └─────────────┘     └──────┘
                      │
                      ▼
              ADR/PRD updates
              (feedback loop)
```

1. **todo/** - Tasks that are defined and ready to be picked up
2. **in-progress/** - Tasks actively being worked on
3. **done/** - Completed tasks (kept for reference and audit trail)

To advance a task, simply move the file to the next folder.

## Task File Format

### Naming Convention

```
NN-short-description.md
```

- `NN` - Two-digit sequence number (01, 02, 03...)
- `short-description` - Lowercase, hyphen-separated summary

Examples:
- `01-setup-terraform-foundation.md`
- `02-implement-question-api.md`
- `03-build-pwa-shell.md`

### File Template

```markdown
---
id: NN
title: Short descriptive title
source: ADR-01 | PRD-02
priority: high | medium | low
created: YYYY-MM-DD
started: YYYY-MM-DD      # Added when moved to in-progress
completed: YYYY-MM-DD    # Added when moved to done
---

# Task Title

## Description

What needs to be done and why.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Notes

Notes, decisions, and learnings captured during implementation.

## ADR/PRD Updates

Changes that should be fed back into source documents:
- [ ] Update to ADR-XX: description
- [ ] Update to PRD-XX: description
```

## Creating Tasks

Tasks are derived from ADRs (Architectural Decision Records) and PRDs (Product Requirements Documents):

1. Review an ADR or PRD
2. Identify discrete, actionable work items
3. Create a task file in `todo/` with:
   - Clear description
   - Measurable acceptance criteria
   - Reference to source document (`source:` field)
4. Assign a sequence number (next available)

## Working on Tasks

1. Move task file from `todo/` to `in-progress/`
2. Add `started:` date to frontmatter
3. Work on the task
4. Update "Implementation Notes" as you go
5. Check off acceptance criteria as completed
6. Note any ADR/PRD updates needed

## Completing Tasks

1. Ensure all acceptance criteria are checked
2. Move task file from `in-progress/` to `done/`
3. Add `completed:` date to frontmatter
4. Apply any ADR/PRD updates noted in the task
5. Create follow-up tasks if needed

## Feedback Loop

Implementation often reveals:
- Missing details in ADRs/PRDs
- Incorrect assumptions
- Better approaches
- New requirements

**Always** capture these in the "ADR/PRD Updates" section and apply them when the task is done. This keeps documentation accurate and useful.

## Guidelines

- **One task at a time** - Focus on completing tasks before starting new ones
- **Small tasks** - If a task feels too big, split it into smaller tasks
- **Keep notes** - Future you will thank present you
- **Update source docs** - Documentation that drifts from reality is worse than no documentation
- **Don't delete done tasks** - They serve as project history and decision log
