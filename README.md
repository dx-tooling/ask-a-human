# Ask-a-Human

[![Backend Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-code-quality.yml)
[![Backend Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/backend-tests.yml)
[![Frontend Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-code-quality.yml)
[![Frontend Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/frontend-tests.yml)
[![Python SDK Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-code-quality.yml)
[![Python SDK Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-python-tests.yml)
[![TypeScript SDK Code Quality](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-code-quality.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-code-quality.yml)
[![TypeScript SDK Tests](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-tests.yml/badge.svg)](https://github.com/dx-tooling/ask-a-human/actions/workflows/sdk-typescript-tests.yml)

Get human input for your AI agents when they're uncertain or need subjective judgment.

## Overview

Ask-a-Human provides a simple API and SDKs for LLM agents to request human feedback on subjective decisions, confidence checks, and reality validation. Humans respond via a web app, and agents poll for responses.

## Components

| Component | Description |
|-----------|-------------|
| [Backend API](backend-app/) | Lambda-based REST API for agents and humans |
| [Frontend Web App](frontend-app-web/) | React PWA for humans to answer questions |
| [Python SDK](sdk-python/) | Python client library for agents |
| [TypeScript SDK](sdk-typescript/) | TypeScript/Node.js client library for agents |
| [MCP Server](mcp-server/) | Model Context Protocol server for Claude Desktop/Cursor |
| [OpenClaw Skill](integrations/openclaw/) | Skill for OpenClaw personal AI assistant |

## Quick Start

### For Agent Developers

**Python:**
```python
from ask_a_human import AskHumanClient

client = AskHumanClient(agent_id="my-agent")
result = client.submit_question(
    prompt="Should this error message apologize to the user?",
    type="text",
    audience=["product", "creative"],
)
```

**TypeScript:**
```typescript
import { AskHumanClient } from "@ask-a-human/sdk";

const client = new AskHumanClient({ agentId: "my-agent" });
const result = await client.submitQuestion({
  prompt: "Should this error message apologize to the user?",
  type: "text",
  audience: ["product", "creative"],
});
```

### Example Agents

- [Python Content Writer](examples/content-writer-agent/) - CLI agent with human-in-the-loop decisions
- [TypeScript Content Writer](examples/typescript-content-writer/) - TypeScript version of the above

## Documentation

- [HOWTO](HOWTO.md) - Project structure and workflow
- [Architecture Decision Records](planning/architectural-decision-records/) - Technical decisions
- [Product Requirements](planning/product-requirements-document/) - Feature specifications
- [Agent Integration Guide](planning/guides/agent-integration-guide.md) - Integration patterns
- [OpenClaw Integration](planning/guides/openclaw-integration.md) - OpenClaw skill quick start

## Development

See individual component READMEs for setup instructions:
- [Backend Development](backend-app/README.md)
- [Frontend Development](frontend-app-web/README.md)
- [Python SDK Development](sdk-python/README.md)
- [TypeScript SDK Development](sdk-typescript/README.md)

## License

MIT
