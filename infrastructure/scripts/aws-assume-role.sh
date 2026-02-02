#!/bin/bash
# Assume the AccountManager role in infra-webapp-prod and export credentials
# Usage: eval $(./aws-assume-role.sh)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_FILE="$REPO_ROOT/secrets/AWS.txt"

ROLE_ARN="arn:aws:iam::325062206315:role/AccountManager"
SESSION_NAME="terraform-session"

if [[ ! -f "$SECRETS_FILE" ]]; then
    echo "Error: Secrets file not found at $SECRETS_FILE" >&2
    exit 1
fi

# Read base credentials from file
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' "$SECRETS_FILE" | cut -d'=' -f2)
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRE.?T_ACCESS_KEY=' "$SECRETS_FILE" | cut -d'=' -f2)
export AWS_DEFAULT_REGION=us-west-1
unset AWS_SESSION_TOKEN

# Assume role and get temporary credentials
CREDS=$(aws sts assume-role \
    --role-arn "$ROLE_ARN" \
    --role-session-name "$SESSION_NAME" \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
    --output text)

# Parse credentials
AWS_ACCESS_KEY_ID=$(echo "$CREDS" | awk '{print $1}')
AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | awk '{print $2}')
AWS_SESSION_TOKEN=$(echo "$CREDS" | awk '{print $3}')

# Output export commands for eval
echo "export AWS_ACCESS_KEY_ID='$AWS_ACCESS_KEY_ID'"
echo "export AWS_SECRET_ACCESS_KEY='$AWS_SECRET_ACCESS_KEY'"
echo "export AWS_SESSION_TOKEN='$AWS_SESSION_TOKEN'"
echo "export AWS_DEFAULT_REGION='us-west-1'"
