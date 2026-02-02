# TypeScript Content Writer Agent

A reference implementation demonstrating the human-in-the-loop pattern with Ask-a-Human in TypeScript.

This agent generates content based on your brief, while asking humans for subjective decisions like tone and headline preferences.

## Features

- Analyzes content briefs using OpenAI (gpt-4o-mini)
- Asks humans for tone/style preferences via Ask-a-Human
- Generates multiple headline options
- Asks humans to choose the best headline
- Generates final content incorporating human feedback
- Beautiful terminal output with colors and spinners

## Prerequisites

- Node.js 20+
- OpenAI API key
- Ask-a-Human API access (optional - uses defaults)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure API keys:**

   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-...
   ```

   Alternatively, create a file at `secrets/openai-api-key.txt` in the project root.

3. **Build the SDK (if using local development):**

   From the `sdk-typescript` directory:

   ```bash
   cd ../../sdk-typescript
   npm install
   npm run build
   ```

## Usage

Run the agent:

```bash
npm start
```

You'll be prompted to enter a content brief. The agent will:

1. **Analyze your brief** - Determines content type, audience, and key points
2. **Ask humans about tone** - Submits a question to Ask-a-Human for tone preference
3. **Generate headlines** - Creates multiple headline options
4. **Ask humans about headline** - Submits another question for headline preference
5. **Generate content** - Creates the final content with human-chosen tone and headline

### Example Session

```
╔════════════════════════════════════════════════════════╗
║           Content Writer Agent - Demo                  ║
╠════════════════════════════════════════════════════════╣
║  This agent demonstrates the human-in-the-loop         ║
║  pattern with Ask-a-Human. It will ask humans for      ║
║  subjective decisions while generating content.        ║
╚════════════════════════════════════════════════════════╝

Enter your content brief (or 'quit' to exit):
> Write a blog post about the benefits of remote work for software developers

📋 Analyzing your brief...
✓ Brief analyzed: blog post for software developers

🧑 Asking humans about writing tone...
   Question ID: q_abc123
✓ Tone preference received: "Casual and friendly"

💡 Generating headline options...
✓ Generated 4 headline options

🧑 Asking humans about headline preference...
   Question ID: q_def456
✓ Headline selected: "Why Remote Work is a Game-Changer for Developers"

📝 Generating final content...
✓ Content generated

═════════════════════════════════════════════════════════════════
                        FINAL CONTENT
═════════════════════════════════════════════════════════════════

Tone: Casual and friendly

# Why Remote Work is a Game-Changer for Developers

[Generated content appears here...]

═════════════════════════════════════════════════════════════════
```

## How It Works

### Human Decision Points

The agent pauses at two key decision points to get human input:

1. **Tone/Style Selection** - After analyzing the brief, the agent asks humans which tone would be most effective for the content.

2. **Headline Selection** - After generating headline options, the agent asks humans which headline is most compelling.

### Handling Timeouts

If humans don't respond within the timeout period:
- The agent will proceed with a default choice
- A warning message is displayed
- Content generation continues

### Error Handling

The agent gracefully handles:
- Missing API keys (with helpful error messages)
- Ask-a-Human API errors (falls back to defaults)
- OpenAI API errors (displays error and allows retry)

## Project Structure

```
typescript-content-writer/
├── src/
│   ├── main.ts      # CLI entry point
│   ├── agent.ts     # ContentWriterAgent class
│   └── prompts.ts   # LLM prompt templates
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Development

### Build

```bash
npm run build
```

### Run in development mode (with auto-reload)

```bash
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `ASK_A_HUMAN_BASE_URL` | Ask-a-Human API URL | No |
| `ASK_A_HUMAN_AGENT_ID` | Your agent identifier | No |

### Timeouts

The agent uses these default timeouts:
- Question timeout: 10 minutes (how long the question stays open)
- Wait timeout: 5 minutes (how long to wait for responses)
- Poll interval: 10 seconds (how often to check for responses)

These can be modified in `src/agent.ts`.

## License

MIT
