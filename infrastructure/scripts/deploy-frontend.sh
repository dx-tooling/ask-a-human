#!/bin/bash
# Deploy Frontend to S3 and invalidate CloudFront cache
# Reference: ADR-06 Infrastructure as Code
#
# Usage:
#   ./deploy-frontend.sh
#
# Prerequisites:
#   - AWS credentials configured (run aws-assume-role.sh first)
#   - Frontend built (npm run build in frontend-app-web/)
#   - Terraform outputs available (run terraform output in prod environment)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend-app-web"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform/environments/prod"

echo -e "${BLUE}=== Frontend Deployment ===${NC}"
echo ""

# Check if frontend build exists
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo -e "${YELLOW}Frontend not built. Building now...${NC}"
    cd "$FRONTEND_DIR"
    npm ci
    npm run build
    cd "$PROJECT_ROOT"
fi

# Get Terraform outputs
echo -e "${BLUE}Getting deployment configuration from Terraform...${NC}"
cd "$TERRAFORM_DIR"

BUCKET_NAME=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo "")
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${RED}Error: Could not get Terraform outputs.${NC}"
    echo "Make sure you have run 'terraform apply' first."
    echo ""
    echo "Bucket name: ${BUCKET_NAME:-<not set>}"
    echo "Distribution ID: ${DISTRIBUTION_ID:-<not set>}"
    exit 1
fi

echo -e "  Bucket: ${GREEN}$BUCKET_NAME${NC}"
echo -e "  Distribution: ${GREEN}$DISTRIBUTION_ID${NC}"
echo ""

# Sync frontend to S3
echo -e "${BLUE}Syncing frontend to S3...${NC}"
cd "$FRONTEND_DIR"

aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --delete \
    --cache-control "max-age=31536000,public" \
    --exclude "index.html" \
    --exclude "*.json"

# Upload index.html and JSON files with shorter cache
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
    --cache-control "max-age=0,no-cache,no-store,must-revalidate"

# Upload any JSON files (like manifest) with moderate cache
if ls dist/*.json 1>/dev/null 2>&1; then
    for file in dist/*.json; do
        filename=$(basename "$file")
        aws s3 cp "$file" "s3://$BUCKET_NAME/$filename" \
            --cache-control "max-age=3600,public"
    done
fi

echo -e "${GREEN}S3 sync complete!${NC}"
echo ""

# Invalidate CloudFront cache
echo -e "${BLUE}Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "  Invalidation ID: ${GREEN}$INVALIDATION_ID${NC}"
echo ""

# Wait for invalidation to complete (optional, can take a few minutes)
echo -e "${BLUE}Waiting for invalidation to complete...${NC}"
aws cloudfront wait invalidation-completed \
    --distribution-id "$DISTRIBUTION_ID" \
    --id "$INVALIDATION_ID"

echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Frontend is now live at: https://app.ask-a-human.com"
echo ""
