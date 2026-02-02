---
id: 05
title: Frontend Subdomain Migration (app.ask-a-human.com)
source: Task-04 follow-up
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# Frontend Subdomain Migration (app.ask-a-human.com)

## Description

IONOS does not support CNAME records on the apex domain (`ask-a-human.com`). The frontend needs to be served from `app.ask-a-human.com` instead.

A CNAME record has already been created at IONOS:
- `app.ask-a-human.com` → `d1q47nq8khquum.cloudfront.net`

This task covers the infrastructure and code changes needed to make the frontend work on the subdomain.

## Acceptance Criteria

### Infrastructure Changes
- [x] Update CloudFront distribution aliases to include `app.ask-a-human.com`
- [x] Update ACM certificate (us-east-1) to include `app.ask-a-human.com` as SAN
- [x] Add DNS validation record for new subdomain at IONOS (if needed)
- [x] Update API Gateway CORS origins to allow `https://app.ask-a-human.com`

### Code Changes
- [x] Update any hardcoded references to `ask-a-human.com` in frontend code
- [x] Update `.env.production` or deployment scripts if domain is referenced
- [x] Update README documentation with correct production URL

### Verification
- [x] Site loads at `https://app.ask-a-human.com`
- [x] API calls work (CORS configured correctly)
- [x] Theme persistence works
- [x] All routes work (React Router)

## Implementation Notes

### Current State

CloudFront distribution `E1RL1VJNM1ANZ7` is configured with:
- Alias: `app.ask-a-human.com`
- Certificate: ACM cert in us-east-1 for `app.ask-a-human.com`

### Changes Made

1. **ACM Certificate** - Changed from `ask-a-human.com` to `app.ask-a-human.com`
   - New certificate: `arn:aws:acm:us-east-1:325062206315:certificate/64cf34c8-56fb-493f-a330-9cb78ae69c33`
   - DNS validation record added at IONOS

2. **CloudFront Distribution** - Updated aliases
   ```hcl
   aliases = ["app.ask-a-human.com"]
   ```

3. **API Gateway CORS** - Updated allowed origins in `infrastructure/terraform/environments/prod/main.tf`:
   ```hcl
   cors_origins = [
     "https://app.${var.domain_name}",
   ]
   ```

4. **Deploy Script** - Updated success message URL in `infrastructure/scripts/deploy-frontend.sh`

### Files Modified

- `infrastructure/terraform/environments/prod/main.tf` - CloudFront domain, CORS origins, ACM cert
- `infrastructure/scripts/deploy-frontend.sh` - Success message URL

### Domain Setup (Configured at IONOS)

HTTP redirects are configured:
- `ask-a-human.com` → redirects to `app.ask-a-human.com`
- `www.ask-a-human.com` → redirects to `app.ask-a-human.com`
- `app.ask-a-human.com` → CNAME to `d1q47nq8khquum.cloudfront.net`

## Reference Documents

- [ADR-06: Infrastructure as Code](../../architectural-decision-records/06-infrastructure-as-code.md)
- [Task-04: Minimal Working Frontend](../done/04-minimal-working-frontend.md)

## ADR/PRD Updates

Changes that should be fed back into source documents:
- [x] ADR-06: Document IONOS apex CNAME limitation
- [x] ADR-06: Update domain configuration to reflect `app.ask-a-human.com`
- [ ] PRD-01: Update production URL reference
