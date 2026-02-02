#!/bin/bash
# Deploy frontend to S3 and invalidate CloudFront cache
# Usage: ./deploy-frontend.sh [--skip-build]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/aws-auth.sh"

# Configuration
FRONTEND_DIR="$REPO_ROOT/frontend-app-web"
TERRAFORM_DIR="$REPO_ROOT/infrastructure/terraform/environments/prod"
TERRAFORM_BIN="/usr/local/bin/terraform-1.14.4"

# Parse arguments
SKIP_BUILD=false
if [[ "${1:-}" == "--skip-build" ]]; then
    SKIP_BUILD=true
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Frontend Deployment (S3 + CloudFront)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Authenticate
assume_aws_role
echo ""

# Get deployment config from Terraform
echo -e "${BLUE}Getting deployment configuration...${NC}"
cd "$TERRAFORM_DIR"
BUCKET_NAME=$($TERRAFORM_BIN output -raw frontend_bucket_name)
DISTRIBUTION_ID=$($TERRAFORM_BIN output -raw cloudfront_distribution_id)
echo -e "  Bucket: ${GREEN}$BUCKET_NAME${NC}"
echo -e "  Distribution: ${GREEN}$DISTRIBUTION_ID${NC}"
echo ""

# Build frontend
cd "$FRONTEND_DIR"

if [[ "$SKIP_BUILD" == "true" ]]; then
    if [[ ! -d "dist" ]]; then
        echo -e "${RED}Error: dist/ not found. Cannot skip build.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Skipping build (using existing dist/)${NC}"
else
    echo -e "${BLUE}Building frontend...${NC}"
    npm ci --silent
    npm run build
fi
echo ""

# Upload to S3
echo -e "${BLUE}Uploading to S3...${NC}"

# Upload assets with long cache
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --delete \
    --cache-control "max-age=31536000,public" \
    --exclude "index.html" \
    --exclude "*.json"

# Upload index.html with no-cache
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate"

# Upload JSON files with moderate cache
if ls dist/*.json 1>/dev/null 2>&1; then
    for file in dist/*.json; do
        filename=$(basename "$file")
        aws s3 cp "$file" "s3://$BUCKET_NAME/$filename" \
            --cache-control "max-age=3600,public"
    done
fi

echo -e "${GREEN}✓ S3 upload complete${NC}"
echo ""

# Invalidate CloudFront
echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
echo -e "  Invalidation ID: ${YELLOW}$INVALIDATION_ID${NC}"

echo -e "${BLUE}Waiting for invalidation to complete...${NC}"
aws cloudfront wait invalidation-completed \
    --distribution-id "$DISTRIBUTION_ID" \
    --id "$INVALIDATION_ID"
echo -e "${GREEN}✓ CloudFront invalidation complete${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Frontend deployment complete!${NC}"
echo -e "${GREEN}  Live at: https://app.ask-a-human.com${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
