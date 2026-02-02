---
name: Terraform Foundation Setup
overview: Set up Terraform infrastructure foundation including state management (S3 + DynamoDB), module structure, four core DynamoDB tables, and ACM certificate with DNS validation for IONOS.
todos:
  - id: start-task
    content: Move task file from todo/ to in-progress/, add started date to frontmatter
    status: completed
  - id: bootstrap
    content: "Bootstrap Terraform state: Create S3 bucket (with versioning) and DynamoDB lock table via AWS CLI"
    status: completed
  - id: directory
    content: "Create Terraform directory structure: environments/prod, modules/database, shared"
    status: completed
  - id: backend
    content: Implement shared backend configuration (shared/backend.tf)
    status: completed
  - id: database-module
    content: Implement database module with 4 DynamoDB tables and GSIs per ADR-02
    status: completed
  - id: prod-env
    content: "Implement prod environment: main.tf, variables.tf, outputs.tf, terraform.tfvars"
    status: completed
  - id: acm
    content: Add ACM certificate resource with DNS validation outputs for IONOS
    status: completed
  - id: readme
    content: Create infrastructure/terraform/README.md with setup and usage documentation
    status: completed
  - id: verify
    content: Run terraform init, plan, and apply; verify resources in AWS Console
    status: completed
  - id: complete-task
    content: Move task to done/, add completed date, capture learnings in planning/memory/
    status: completed
isProject: false
---

# Terraform Foundation and DynamoDB Tables

## Overview

This task establishes the infrastructure-as-code foundation for Ask-a-Human. All subsequent infrastructure work depends on this being in place.

## Prerequisites

- AWS credentials from `secrets/AWS.txt` must be configured (either as environment variables or AWS profile)
- Terraform 1.14.4 available at `/usr/local/bin/terraform-1.14.4`
- AWS Account: `325062206315` (infra-webapp-prod), Region: `us-west-1`

## Task Workflow

Per [HOWTO.md](HOWTO.md), follow the task lifecycle:

1. **Start**: Move task file from `planning/tasks/todo/` to `planning/tasks/in-progress/`
2. **Add metadata**: Add `started: 2026-02-02` to the task frontmatter
3. **Implement**: Complete all phases below
4. **Complete**: Move task file to `planning/tasks/done/`, add `completed: YYYY-MM-DD`
5. **Capture learnings**: Add any insights to `planning/memory/learnings.md` or `planning/memory/gotchas.md`

## Implementation Steps

### Phase 1: Bootstrap State Management (Manual AWS CLI)

Before Terraform can manage itself, we need to manually create the state backend:

```bash
# Export credentials from secrets/AWS.txt
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-west-1

# Create S3 bucket with versioning
aws s3api create-bucket \
  --bucket aah-terraform-state \
  --region us-west-1 \
  --create-bucket-configuration LocationConstraint=us-west-1

aws s3api put-bucket-versioning \
  --bucket aah-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name aah-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-west-1
```

### Phase 2: Create Directory Structure

Create the Terraform module structure per [ADR-06](planning/architectural-decision-records/06-infrastructure-as-code.md):

```
infrastructure/terraform/
├── environments/
│   └── prod/
│       ├── main.tf           # Root module, wires modules together
│       ├── variables.tf      # Input variables
│       ├── outputs.tf        # Output values
│       └── terraform.tfvars  # Variable values for prod
├── modules/
│   └── database/
│       ├── main.tf           # DynamoDB table definitions
│       ├── variables.tf      # Module inputs
│       └── outputs.tf        # Table ARNs and names
└── shared/
    └── backend.tf            # S3 backend configuration
```

### Phase 3: Implement Shared Backend Configuration

File: `infrastructure/terraform/shared/backend.tf`

- Configure S3 backend with bucket `aah-terraform-state`
- Configure DynamoDB table `aah-terraform-locks` for state locking
- Enable encryption

### Phase 4: Implement Database Module

File: `infrastructure/terraform/modules/database/main.tf`

Create four DynamoDB tables per [ADR-02](planning/architectural-decision-records/02-database-schema.md):

**1. aah-questions**

- PK: `question_id` (String)
- GSI `ByStatus`: PK=`status`, SK=`created_at`
- GSI `ByAgentId`: PK=`agent_id`, SK=`created_at`
- TTL on `expires_at`
- Billing: PAY_PER_REQUEST

**2. aah-responses**

- PK: `question_id` (String), SK: `response_id` (String)
- GSI `ByFingerprint`: PK=`fingerprint_hash`, SK=`created_at`
- Billing: PAY_PER_REQUEST

**3. aah-subscriptions**

- PK: `subscription_id` (String)
- GSI `ByLastNotified`: PK=`active`, SK=`last_notified_at`
- Billing: PAY_PER_REQUEST

**4. aah-user-stats**

- PK: `fingerprint_hash` (String)
- GSI `ByTotalPoints`: PK=`_leaderboard` (constant), SK=`total_points`
- Billing: PAY_PER_REQUEST

### Phase 5: Implement ACM Certificate

Add to `infrastructure/terraform/environments/prod/main.tf`:

- ACM certificate for `aah.dx-tooling.org` and `api.aah.dx-tooling.org`
- DNS validation method (not email)
- Output the CNAME records needed for IONOS DNS configuration
- Note: Certificate will remain in "Pending validation" state until DNS records are manually added at IONOS

### Phase 6: Production Environment Configuration

File: `infrastructure/terraform/environments/prod/main.tf`

- Provider configuration for AWS us-west-1
- Backend configuration (symlink or copy from shared)
- Module reference to database module
- ACM certificate resource

### Phase 7: Verification and Apply

```bash
cd infrastructure/terraform/environments/prod
/usr/local/bin/terraform-1.14.4 init
/usr/local/bin/terraform-1.14.4 plan -out=tfplan
/usr/local/bin/terraform-1.14.4 apply tfplan
```

### Phase 8: Documentation

Create `infrastructure/terraform/README.md` documenting:

- How to set up AWS credentials
- Bootstrap process (one-time)
- How to run Terraform commands
- Manual DNS setup step for IONOS

## Post-Implementation Manual Steps

After `terraform apply` succeeds:

1. Copy the ACM validation CNAME records from Terraform output
2. Log into IONOS DNS management for `dx-tooling.org`
3. Add the CNAME records for certificate validation
4. Wait for certificate to transition from "Pending validation" to "Issued" (can take 5-30 minutes)

## Key Files to Create


| File                                                          | Purpose              |
| ------------------------------------------------------------- | -------------------- |
| `infrastructure/terraform/shared/backend.tf`                  | S3 backend config    |
| `infrastructure/terraform/modules/database/main.tf`           | DynamoDB tables      |
| `infrastructure/terraform/modules/database/variables.tf`      | Module inputs        |
| `infrastructure/terraform/modules/database/outputs.tf`        | Table ARNs           |
| `infrastructure/terraform/environments/prod/main.tf`          | Root module          |
| `infrastructure/terraform/environments/prod/variables.tf`     | Prod variables       |
| `infrastructure/terraform/environments/prod/outputs.tf`       | Outputs (ACM CNAMEs) |
| `infrastructure/terraform/environments/prod/terraform.tfvars` | Prod values          |
| `infrastructure/terraform/README.md`                          | Usage documentation  |


## Verification Checklist

- `terraform plan` runs without errors
- `terraform apply` succeeds
- 4 DynamoDB tables visible in AWS Console (us-west-1)
- Each table has correct GSIs
- ACM certificate created in "Pending validation" state
- Terraform output shows CNAME records for IONOS

## Post-Completion

After all verification passes:

1. **Move task**: `planning/tasks/in-progress/01-terraform-foundation-and-dynamodb.md` → `planning/tasks/done/`
2. **Update frontmatter**: Add `completed: YYYY-MM-DD`
3. **Capture learnings**: Add any Terraform or AWS insights to:
  - `planning/memory/learnings.md` - general insights
  - `planning/memory/gotchas.md` - pitfalls encountered
4. **Update ADR/PRD if needed**: Note any corrections in the task's "ADR/PRD Updates" section and apply them

