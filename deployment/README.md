# Deployment Scripts

Simple deployment scripts that handle AWS authentication automatically.

## Quick Start

```bash
# Deploy everything (backend + frontend)
./deployment/deploy.sh

# Deploy only backend (Lambda via Terraform)
./deployment/deploy.sh --backend-only

# Deploy only frontend (S3 + CloudFront)
./deployment/deploy.sh --frontend-only
```

## Prerequisites

1. AWS credentials in `secrets/AWS.txt`:
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

2. Terraform 1.14.4+ at `/usr/local/bin/terraform-1.14.4`

3. AWS CLI v2

4. Node.js (for frontend build)

## Scripts

| Script | Description |
|--------|-------------|
| `deploy.sh` | Full deployment (backend + frontend) |
| `deploy-backend.sh` | Backend only (Lambda via Terraform) |
| `deploy-frontend.sh` | Frontend only (S3 + CloudFront) |

### Options

**deploy.sh**
- `--backend-only` - Deploy only backend
- `--frontend-only` - Deploy only frontend

**deploy-backend.sh**
- `--plan-only` - Show Terraform plan without applying

**deploy-frontend.sh**
- `--skip-build` - Use existing `dist/` instead of rebuilding

## What Gets Deployed

### Backend
- `aah-agent-questions` Lambda function
- `aah-human-api` Lambda function
- Any Terraform infrastructure changes

### Frontend
- Static files to S3 bucket `aah-frontend-325062206315`
- CloudFront cache invalidation

## URLs

- **API**: https://api.ask-a-human.com
- **Frontend**: https://app.ask-a-human.com
