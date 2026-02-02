# Gotchas

Non-obvious pitfalls encountered during implementation. Learn from our mistakes.

---

## AWS

### S3 Bucket Names Are Globally Unique

S3 bucket names must be unique across ALL AWS accounts worldwide. Always include account ID or another unique identifier in bucket names to avoid conflicts.

Source: Task 01 - `aah-terraform-state` was taken, had to use `aah-terraform-state-325062206315`.

### CloudFront Requires Certificates in us-east-1

CloudFront distributions can ONLY use ACM certificates from us-east-1, regardless of where other resources are. You need separate certificates:
- **us-east-1**: For CloudFront (frontend)
- **us-west-1**: For API Gateway regional endpoint (API)

Source: AWS documentation, discovered during Task 01 planning review.

### Must Assume Role Before Running Terraform

The credentials in `secrets/AWS.txt` are for the IAM account, not the infra account. You must assume the `AccountManager` role before running any AWS CLI or Terraform commands:

```bash
eval $(bash infrastructure/scripts/aws-assume-role.sh)
```

Symptoms if you forget: "Access Denied" errors or operations happening in the wrong account.

### Lambda Python Runtime Versions

AWS Lambda runtime identifiers don't always match the latest Python versions. As of Feb 2026:
- Latest supported: `python3.13`
- `python3.14` is NOT yet supported (will fail Terraform validation)

Check AWS documentation for current supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

Source: Task 02 - Terraform plan failed with `python3.14`, had to use `python3.13`.

### Lambda Package Size Limits

Lambda deployment packages must be under ~70MB when uploaded directly. Common culprits that bloat packages:
- `.venv/` directories (can be 100MB+)
- `.mypy_cache/`, `.pytest_cache/`, `.ruff_cache/`
- `__pycache__/` directories

Always exclude these in Terraform's `archive_file`:

```hcl
excludes = [
  ".venv", "venv", "__pycache__", "*.pyc",
  ".pytest_cache", ".mypy_cache", ".ruff_cache",
  "tests", "Makefile", "pyproject.toml"
]
```

Source: Task 06 - Lambda deploy failed with "RequestEntityTooLargeException" due to .venv in backend-app/.

---

## Python

### Externally-Managed-Environment Error (PEP 668)

Modern Python installations (macOS Homebrew, Debian 12+, Ubuntu 23.04+) block system-wide pip installs with "externally-managed-environment" error. This is intentional to prevent breaking system packages.

**Solution**: Always use virtual environments:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

All project READMEs should include venv setup instructions.

Source: Task 06 - `pip install -e sdk-python` failed on macOS with Homebrew Python.

---

## DynamoDB

(Add DynamoDB gotchas here)

---

## Firebase / FCM

### iOS Web Push Requires PWA Installation

iOS Safari only supports web push notifications if the site is "installed" via Add to Home Screen. This is not obvious to users and requires explicit UX guidance.

Source: ADR-04 research.

---

## Terraform

### Always Initialize After Cloning

After cloning the repo or switching branches, run `terraform init` before any other Terraform commands. The `.terraform` directory is gitignored.

### Use Specific Terraform Version

Use `/usr/local/bin/terraform-1.14.4` (not just `terraform`) to ensure consistent behavior across team members.

---

## Frontend

(Add frontend gotchas here)

---

## Security

(Add security gotchas here)
