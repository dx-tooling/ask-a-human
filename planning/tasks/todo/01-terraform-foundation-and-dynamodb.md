---
id: 01
title: Set up Terraform foundation and DynamoDB tables
source: ADR-06, ADR-02
priority: high
created: 2026-02-02
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
- [ ] S3 bucket `aah-terraform-state` created in us-west-1
- [ ] DynamoDB table `aah-terraform-locks` created for state locking
- [ ] Backend configuration in `infrastructure/terraform/shared/backend.tf`

### Module Structure
- [ ] Directory structure created per ADR-06:
  ```
  infrastructure/terraform/
  ├── environments/prod/
  ├── modules/database/
  └── shared/
  ```
- [ ] Production environment `main.tf` wired to database module

### DynamoDB Tables (per ADR-02)
- [ ] `aah-questions` table with:
  - PK: `question_id`
  - GSI `ByStatus`: PK=status, SK=created_at
  - GSI `ByAgentId`: PK=agent_id, SK=created_at
  - TTL on `expires_at`
- [ ] `aah-responses` table with:
  - PK: `question_id`, SK: `response_id`
  - GSI `ByFingerprint`: PK=fingerprint_hash, SK=created_at
- [ ] `aah-subscriptions` table with:
  - PK: `subscription_id`
  - GSI `ByLastNotified`: PK=active, SK=last_notified_at
- [ ] `aah-user-stats` table with:
  - PK: `fingerprint_hash`
  - GSI `ByTotalPoints`: PK=_leaderboard, SK=total_points
- [ ] All tables use on-demand (PAY_PER_REQUEST) billing

### ACM Certificate
- [ ] Certificate created for `aah.dx-tooling.org` and `api.aah.dx-tooling.org`
- [ ] DNS validation method configured
- [ ] Terraform outputs the CNAME records needed for IONOS
- [ ] Documentation added for manual DNS setup step

### Verification
- [ ] `terraform plan` runs without errors
- [ ] `terraform apply` succeeds
- [ ] Tables visible in AWS Console
- [ ] Certificate in "Pending validation" state (until DNS records added)

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

## ADR/PRD Updates

(To be filled during implementation if any changes needed)
