# Ask-a-Human Terraform Infrastructure

This directory contains the Terraform configuration for the Ask-a-Human AWS infrastructure.

## Prerequisites

- Terraform 1.14.4+ (available at `/usr/local/bin/terraform-1.14.4`)
- AWS CLI v2
- AWS credentials in `secrets/AWS.txt`

## Directory Structure

```
terraform/
├── environments/
│   └── prod/           # Production environment configuration
├── modules/
│   └── database/       # DynamoDB tables module
└── shared/
    └── backend.tf      # Backend configuration reference
```

## Authentication

The IAM user credentials in `secrets/AWS.txt` need to assume a role to access the infrastructure account.

### Quick Setup

```bash
# From repository root, assume the AccountManager role
eval $(bash infrastructure/scripts/aws-assume-role.sh)

# Verify you're in the correct account
aws sts get-caller-identity
# Should show account 325062206315
```

### Manual Role Assumption

If you prefer to configure manually:

1. Export base credentials:
   ```bash
   export AWS_ACCESS_KEY_ID=<from secrets/AWS.txt>
   export AWS_SECRET_ACCESS_KEY=<from secrets/AWS.txt>
   export AWS_DEFAULT_REGION=us-west-1
   ```

2. Assume the AccountManager role:
   ```bash
   aws sts assume-role \
     --role-arn arn:aws:iam::325062206315:role/AccountManager \
     --role-session-name terraform-session
   ```

3. Export the temporary credentials from the response.

## Usage

### Initialize Terraform

```bash
cd infrastructure/terraform/environments/prod

# Assume role first
eval $(bash ../../scripts/aws-assume-role.sh)

# Initialize
/usr/local/bin/terraform-1.14.4 init
```

### Plan Changes

```bash
/usr/local/bin/terraform-1.14.4 plan -out=tfplan
```

### Apply Changes

```bash
/usr/local/bin/terraform-1.14.4 apply tfplan
```

### View Outputs

```bash
/usr/local/bin/terraform-1.14.4 output
```

## State Management

- **S3 Bucket**: `aah-terraform-state-325062206315`
- **DynamoDB Lock Table**: `aah-terraform-locks`
- **Region**: `us-west-1`

State is encrypted at rest and protected by DynamoDB locking to prevent concurrent modifications.

## Resources Created

### DynamoDB Tables

| Table | Purpose |
|-------|---------|
| `aah-questions` | Question metadata and status |
| `aah-responses` | Human responses to questions |
| `aah-subscriptions` | Push notification subscriptions |
| `aah-user-stats` | Gamification stats and leaderboard |

### ACM Certificate

- Domain: `ask-a-human.com`
- SAN: `api.ask-a-human.com`
- Validation: DNS (manual records at IONOS)

## Manual Steps

### DNS Validation (IONOS)

After running `terraform apply`, you need to add CNAME records at IONOS:

1. Run `terraform output acm_validation_records` to see the required records
2. Log into IONOS: https://my.ionos.com
3. Navigate to: Domains & SSL → ask-a-human.com → DNS
4. Add the CNAME records
5. Wait 5-30 minutes for validation

Check certificate status:
```bash
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw acm_certificate_arn) \
  --query 'Certificate.Status'
```

## Troubleshooting

### "Access Denied" Errors

Make sure you've assumed the AccountManager role:
```bash
eval $(bash infrastructure/scripts/aws-assume-role.sh)
aws sts get-caller-identity  # Should show account 325062206315
```

### State Lock Issues

If Terraform reports a state lock, someone else may be running Terraform. Wait for them to finish, or if the lock is stale:

```bash
/usr/local/bin/terraform-1.14.4 force-unlock <LOCK_ID>
```

## Related Documentation

- [ADR-02: Database Schema](../../planning/architectural-decision-records/02-database-schema.md)
- [ADR-06: Infrastructure as Code](../../planning/architectural-decision-records/06-infrastructure-as-code.md)
- [Infrastructure Accounts](../../planning/fundamentals/01-available-infrastructure-accounts-and-services.md)
