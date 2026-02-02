# Key Learnings

Insights discovered during implementation. Add entries as you learn.

---

## Project Setup

### Documentation-First Approach (2026-02-02)

Starting with comprehensive ADRs and PRDs before implementation ensures:
- Clear thinking about architecture upfront
- Shared understanding across contributors
- AI assistants have full context when helping
- Less rework from misaligned assumptions

Source: Initial project setup.

---

## Architecture

(Add learnings about architectural decisions here)

---

## AWS / Infrastructure

### S3 Bucket Names Must Be Globally Unique (2026-02-02)

S3 bucket names are globally unique across all AWS accounts. The planned name `aah-terraform-state` was already taken by someone else. Solution: append account ID to ensure uniqueness (`aah-terraform-state-325062206315`).

Source: Task 01 implementation.

### IAM Role Assumption Required for Cross-Account Access (2026-02-02)

The IAM user in the identity account (`343194324802`) cannot directly create resources in the infrastructure account (`325062206315`). Must use `aws sts assume-role` to get temporary credentials for the `AccountManager` role first. Created helper script `infrastructure/scripts/aws-assume-role.sh` to simplify this.

Source: Task 01 implementation.

### Terraform dynamodb_table Parameter Deprecated (2026-02-02)

The `dynamodb_table` parameter for state locking in the S3 backend is deprecated. Terraform recommends using `use_lockfile` instead. Not critical for now but should be updated in a future iteration.

Source: Task 01 implementation, Terraform warning during apply.

---

## Frontend / PWA

(Add frontend learnings here)

---

## Firebase / Push Notifications

(Add FCM learnings here)

---

## DynamoDB

(Add database learnings here)

---

## Testing

(Add testing learnings here)
