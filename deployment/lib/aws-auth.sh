#!/bin/bash
# Shared AWS authentication helper
# Sources this file to set up AWS credentials automatically

set -e

# Find repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_FILE="$REPO_ROOT/secrets/AWS.txt"

# Configuration
ROLE_ARN="arn:aws:iam::325062206315:role/AccountManager"
SESSION_NAME="deploy-session"
AWS_REGION="us-west-1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Check if already authenticated with valid session
check_aws_session() {
    if aws sts get-caller-identity &>/dev/null; then
        local account_id
        account_id=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "")
        if [[ "$account_id" == "325062206315" ]]; then
            return 0  # Valid session
        fi
    fi
    return 1  # No valid session
}

# Assume role and export credentials
assume_aws_role() {
    echo -e "${BLUE}Setting up AWS credentials...${NC}"
    
    # Check if we already have a valid session
    if check_aws_session; then
        echo -e "${GREEN}✓ Already authenticated to AWS account 325062206315${NC}"
        return 0
    fi
    
    # Check secrets file exists
    if [[ ! -f "$SECRETS_FILE" ]]; then
        echo -e "${RED}Error: Secrets file not found at $SECRETS_FILE${NC}" >&2
        echo "Create this file with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY" >&2
        exit 1
    fi
    
    # Read base credentials
    export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' "$SECRETS_FILE" | cut -d'=' -f2)
    export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRE.?T_ACCESS_KEY=' "$SECRETS_FILE" | cut -d'=' -f2)
    export AWS_DEFAULT_REGION="$AWS_REGION"
    unset AWS_SESSION_TOKEN
    
    if [[ -z "$AWS_ACCESS_KEY_ID" ]] || [[ -z "$AWS_SECRET_ACCESS_KEY" ]]; then
        echo -e "${RED}Error: Could not read credentials from $SECRETS_FILE${NC}" >&2
        exit 1
    fi
    
    # Assume role
    echo -e "  Assuming role ${YELLOW}$ROLE_ARN${NC}..."
    local creds
    creds=$(aws sts assume-role \
        --role-arn "$ROLE_ARN" \
        --role-session-name "$SESSION_NAME" \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
        --output text 2>&1)
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Error: Failed to assume role${NC}" >&2
        echo "$creds" >&2
        exit 1
    fi
    
    # Export temporary credentials
    export AWS_ACCESS_KEY_ID=$(echo "$creds" | awk '{print $1}')
    export AWS_SECRET_ACCESS_KEY=$(echo "$creds" | awk '{print $2}')
    export AWS_SESSION_TOKEN=$(echo "$creds" | awk '{print $3}')
    
    # Verify
    local account_id
    account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    echo -e "${GREEN}✓ Authenticated to AWS account $account_id${NC}"
}

# Export functions and variables for use in other scripts
export REPO_ROOT
export AWS_REGION
export -f check_aws_session
export -f assume_aws_role
