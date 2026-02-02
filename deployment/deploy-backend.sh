#!/bin/bash
# Deploy backend Lambda functions via Terraform
# Usage: ./deploy-backend.sh [--plan-only]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/aws-auth.sh"

# Configuration
TERRAFORM_DIR="$REPO_ROOT/infrastructure/terraform/environments/prod"
TERRAFORM_BIN="/usr/local/bin/terraform-1.14.4"

# Parse arguments
PLAN_ONLY=false
if [[ "${1:-}" == "--plan-only" ]]; then
    PLAN_ONLY=true
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Backend Deployment (Lambda via Terraform)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Authenticate
assume_aws_role
echo ""

# Run Terraform
cd "$TERRAFORM_DIR"

echo -e "${BLUE}Running Terraform plan...${NC}"
$TERRAFORM_BIN plan -out=tfplan

if [[ "$PLAN_ONLY" == "true" ]]; then
    echo ""
    echo -e "${YELLOW}Plan-only mode. Run without --plan-only to apply.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Applying Terraform changes...${NC}"
$TERRAFORM_BIN apply tfplan

# Clean up plan file
rm -f tfplan

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Backend deployment complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
