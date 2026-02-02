# Project Conventions

Established patterns and standards for this project.

---

## Naming

### DynamoDB Tables
- Prefix: `aah-` (Ask-a-Human)
- Examples: `aah-questions`, `aah-responses`, `aah-subscriptions`, `aah-user-stats`

### API Endpoints
- Agent API: `/agent/*`
- Human API: `/human/*`

### IDs
- Questions: `q_` prefix + UUID (e.g., `q_abc123def456`)
- Responses: `r_` prefix + UUID
- Subscriptions: `sub_` prefix + UUID

### Task Files
- Format: `NN-short-description.md`
- Example: `01-terraform-foundation-and-dynamodb.md`

---

## Code Style

### TypeScript/JavaScript
- (Add conventions as they're established)

### Terraform
- Module structure per ADR-06
- Environment-specific configs in `environments/{env}/`

---

## Git

### Commit Messages
- (Add conventions as they're established)

### Branches
- (Add conventions as they're established)

---

## Documentation

### ADR Format
- Status, Date, Deciders header
- Context, Decision, Alternatives, Consequences sections
- Related Documents links at the end

### PRD Format
- Version, Date, Status header
- Overview, Features, Requirements sections
- Related Documents links at the end

### Task Format
- YAML frontmatter: id, title, source, priority, created, started, completed
- Description, Acceptance Criteria, Implementation Notes, ADR/PRD Updates sections
