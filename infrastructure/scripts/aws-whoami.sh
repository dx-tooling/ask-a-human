#!/bin/bash
# Show the current AWS identity based on credentials in secrets/AWS.txt

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SECRETS_FILE="$REPO_ROOT/secrets/AWS.txt"

if [[ ! -f "$SECRETS_FILE" ]]; then
    echo "Error: Secrets file not found at $SECRETS_FILE"
    exit 1
fi

# Read credentials from file (handles both = formats)
export AWS_ACCESS_KEY_ID=$(grep -E '^AWS_ACCESS_KEY_ID=' "$SECRETS_FILE" | cut -d'=' -f2)
export AWS_SECRET_ACCESS_KEY=$(grep -E '^AWS_SECRE.?T_ACCESS_KEY=' "$SECRETS_FILE" | cut -d'=' -f2)
export AWS_DEFAULT_REGION=us-west-1

echo "Using credentials from: $SECRETS_FILE"
echo "Region: $AWS_DEFAULT_REGION"
echo ""
echo "AWS Identity:"
aws sts get-caller-identity
