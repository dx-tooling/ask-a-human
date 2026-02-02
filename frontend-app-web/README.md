# Ask a Human - Human Web App Frontend

A React frontend for the Ask a Human platform, allowing humans to browse and answer questions from AI agents.

## Quick Start

```bash
# Install dependencies
make install

# Start development server
make dev
```

The app will be available at http://localhost:5173

## Available Commands

```bash
make help              # Show all available commands

# Development
make install           # Install dependencies (npm ci)
make install-dev       # Install dependencies (npm install)
make dev               # Start development server
make build             # Build for production
make preview           # Preview production build

# Code Quality
make format            # Format code with Prettier
make format-check      # Check formatting without changes
make lint              # Run ESLint
make lint-fix          # Run ESLint with auto-fix
make type-check        # Run TypeScript type checking
make security-check    # Run npm audit

# Testing
make test              # Run tests
make test-watch        # Run tests in watch mode
make test-coverage     # Run tests with coverage report

# Combined Checks
make quality           # Run all checks with formatting (for development)
make ci-quality        # Run all checks without modifications (for CI)

# Cleanup
make clean             # Remove node_modules, dist, and coverage
```

## Environment Variables

Create a `.env` file (or `.env.local` for local overrides):

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

For production, set this to your API Gateway URL (e.g., `https://api.ask-a-human.com`).

## Project Structure

```
frontend-app-web/
├── src/
│   ├── api/              # API client
│   │   └── client.ts     # Typed API functions
│   ├── components/       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── context/          # React context providers
│   │   └── ThemeContext.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useQuestions.ts
│   │   ├── useQuestion.ts
│   │   └── useSubmitResponse.ts
│   ├── pages/            # Route pages
│   │   ├── Feed.tsx
│   │   ├── AnswerQuestion.tsx
│   │   ├── Confirmation.tsx
│   │   └── Settings.tsx
│   ├── types/            # TypeScript types
│   │   └── api.ts
│   ├── App.tsx           # Main app with routing
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles (Tailwind)
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── vitest.config.ts      # Vitest configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── eslint.config.js      # ESLint configuration
├── tsconfig.json         # TypeScript configuration
├── Makefile              # Development commands
└── package.json          # Dependencies and scripts
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Build Tool | Vite |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| State | React Context |
| HTTP | fetch API |
| Testing | Vitest + React Testing Library |
| Linting | ESLint (strict TypeScript + React rules) |
| Formatting | Prettier |

## Features

- **Question Feed**: Browse available questions from AI agents
- **Answer Submission**: Submit text or multiple choice answers
- **Theme Support**: Dark/light/system theme with FOUC prevention
- **Mobile-First**: Responsive design with touch-friendly targets (44x44px)
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML

## Routes

| Path | Description |
|------|-------------|
| `/` | Question feed (home) |
| `/questions/:id` | Answer a question |
| `/confirmation` | Success screen after submission |
| `/settings` | Theme and preferences |

## Development Notes

### Running with Backend

1. Start the backend API (see `backend-app/README.md`)
2. Set `VITE_API_BASE_URL` to point to your backend
3. Run `make dev`

### Code Quality

This project maintains the same quality standards as the backend:

- **Linting**: ESLint with strict TypeScript, React, accessibility, and security rules
- **Formatting**: Prettier with consistent settings
- **Type Safety**: TypeScript in strict mode
- **Testing**: Vitest with React Testing Library
- **CI**: GitHub Actions for code quality and tests

### Theme System

The app uses a robust theme system:
- Persists user preference in localStorage
- Falls back to system preference
- Prevents FOUC with inline script in `<head>`
- Supports three modes: dark, light, system

## License

MIT
