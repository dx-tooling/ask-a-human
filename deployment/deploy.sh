#!/bin/bash
# Full deployment: backend + frontend
# Usage: ./deploy.sh [--backend-only | --frontend-only]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors (defined here for header display)
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
BACKEND_ONLY=false
FRONTEND_ONLY=false

case "${1:-}" in
    --backend-only)
        BACKEND_ONLY=true
        ;;
    --frontend-only)
        FRONTEND_ONLY=true
        ;;
    --help|-h)
        echo "Usage: ./deploy.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --backend-only   Deploy only backend (Lambda via Terraform)"
        echo "  --frontend-only  Deploy only frontend (S3 + CloudFront)"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Without options, deploys both backend and frontend."
        exit 0
        ;;
esac

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Ask-a-Human Production Deployment                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Deploy backend
if [[ "$FRONTEND_ONLY" == "false" ]]; then
    "$SCRIPT_DIR/deploy-backend.sh"
    echo ""
fi

# Deploy frontend
if [[ "$BACKEND_ONLY" == "false" ]]; then
    "$SCRIPT_DIR/deploy-frontend.sh"
    echo ""
fi

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All deployments complete!                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  API:      https://api.ask-a-human.com"
echo "  Frontend: https://app.ask-a-human.com"
echo ""
