---
id: 01
title: Set up Terraform foundation and DynamoDB tables
source: ADR-06, ADR-02
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# Set up Terraform foundation and DynamoDB tables

## Description

Establish the infrastructure-as-code foundation for the Ask-a-Human platform. This is the first task because all other work (APIs, frontend, notifications) depends on AWS resources existing.

This task creates:
1. Terraform state management (S3 bucket + DynamoDB lock table)
2. Module structure for organized infrastructure code
3. The four core DynamoDB tables
4. ACM certificate for HTTPS (with DNS validation records for IONOS)

## Acceptance Criteria

### Terraform State Bootstrap
- [x] S3 bucket `aah-terraform-state-325062206315` created in us-west-1 (note: added account ID suffix for global uniqueness)
- [x] DynamoDB table `aah-terraform-locks` created for state locking
- [x] Backend configuration in `infrastructure/terraform/shared/backend.tf`

### Module Structure
- [x] Directory structure created per ADR-06:
  ```
  infrastructure/terraform/
  ├── environments/prod/
  ├── modules/database/
  └── shared/
  ```
- [x] Production environment `main.tf` wired to database module

### DynamoDB Tables (per ADR-02)
- [x] `aah-questions` table with:
  - PK: `question_id`
  - GSI `ByStatus`: PK=status, SK=created_at
  - GSI `ByAgentId`: PK=agent_id, SK=created_at
  - TTL on `expires_at`
- [x] `aah-responses` table with:
  - PK: `question_id`, SK: `response_id`
  - GSI `ByFingerprint`: PK=fingerprint_hash, SK=created_at
- [x] `aah-subscriptions` table with:
  - PK: `subscription_id`
  - GSI `ByLastNotified`: PK=active, SK=last_notified_at
- [x] `aah-user-stats` table with:
  - PK: `fingerprint_hash`
  - GSI `ByTotalPoints`: PK=_leaderboard, SK=total_points
- [x] All tables use on-demand (PAY_PER_REQUEST) billing

### ACM Certificate
- [x] Certificate created for `ask-a-human.com` and `api.ask-a-human.com`
- [x] DNS validation method configured
- [x] Terraform outputs the CNAME records needed for IONOS
- [x] Documentation added for manual DNS setup step

### Verification
- [x] `terraform plan` runs without errors
- [x] `terraform apply` succeeds
- [x] Tables visible in AWS Console
- [x] Certificate in "Pending validation" state (until DNS records added)

## Implementation Notes

Reference documents:
- [ADR-02: Database Schema](../../architectural-decision-records/02-database-schema.md)
- [ADR-06: Infrastructure as Code](../../architectural-decision-records/06-infrastructure-as-code.md)
- [Infrastructure Accounts](../../fundamentals/01-available-infrastructure-accounts-and-services.md)

AWS Details:
- Region: `us-west-1`
- Account: `325062206315` (infra-webapp-prod)
- Terraform: `/usr/local/bin/terraform-1.14.4`
- Credentials: `secrets/AWS.txt`

### Implementation Details

**State Bucket Name Change**: The original bucket name `aah-terraform-state` was globally taken in S3. Used `aah-terraform-state-325062206315` (with account ID suffix) instead.

**Role Assumption Required**: The IAM credentials must assume the `AccountManager` role in the infra account before running Terraform. Helper scripts created:
- `infrastructure/scripts/aws-assume-role.sh` - Assumes role and exports credentials
- `infrastructure/scripts/aws-whoami.sh` - Shows current AWS identity

**Terraform Warning**: The `dynamodb_table` parameter for state locking is deprecated. Future task: migrate to `use_lockfile` parameter.

**Resources Created**:
- S3 bucket: `aah-terraform-state-325062206315` (with versioning)
- DynamoDB lock table: `aah-terraform-locks`
- DynamoDB tables: `aah-questions`, `aah-responses`, `aah-subscriptions`, `aah-user-stats`
- ACM certificate: `arn:aws:acm:us-west-1:325062206315:certificate/e6f0e55a-2def-47cc-a8f7-a7519fc55198`

## ADR/PRD Updates

- **ADR-06**: Update S3 bucket name from `aah-terraform-state` to `aah-terraform-state-325062206315`
