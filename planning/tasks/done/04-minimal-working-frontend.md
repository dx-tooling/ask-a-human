---
id: 04
title: Minimal Working Frontend (Human Web App)
source: PRD-01, Living Styleguide
priority: high
created: 2026-02-02
started: 2026-02-02
completed: 2026-02-02
---

# Minimal Working Frontend (Human Web App)

## Description

Build the minimal viable Human Web App frontend that allows users to browse questions, submit answers, and see confirmation. This establishes the core question-answer loop from the human side.

The goal is to get something functional deployed, following the same "minimal working" philosophy as Task 02 (API). Advanced features like push notifications, gamification display, leaderboard, and PWA installability are deferred.

**Source code:** `frontend-app-web/`

## Acceptance Criteria

### Project Setup
- [x] Vite project initialized with React 18
- [x] TypeScript configured
- [x] Tailwind CSS v4 configured (matching living-styleguide approach)
- [x] Dark mode as default, light mode toggle available
- [x] ESLint + Prettier configured
- [x] Basic folder structure established

### Core Pages/Components

#### Question Feed (F1 - minimal)
- [x] Home screen displays list of open questions from API
- [x] Each question card shows:
  - Question preview (truncated if long)
  - Question type indicator (text vs multiple choice)
  - "X more responses needed" count
- [x] Tap/click navigates to answer view
- [x] Loading state while fetching
- [x] Empty state when no questions
- [x] Error state on API failure

#### Answer Question - Text (F2 - minimal)
- [x] Full question text displayed
- [x] Text area for answer (auto-growing preferred)
- [x] Character count indicator
- [x] Submit button (disabled until minimum content)
- [x] Back button to feed
- [x] Loading state during submission

#### Answer Question - Multiple Choice (F3 - minimal)
- [x] Full question text displayed
- [x] Radio button options with large tap targets
- [x] Submit button (disabled until selection)
- [x] Visual feedback on selection
- [x] Back button to feed

#### Answer Confirmation (F4 - minimal)
- [x] Success message displayed
- [x] Points earned shown (placeholder: +10)
- [x] "Answer another" button returns to feed
- [x] Auto-return to feed after 3 seconds (optional)

#### Settings (F5 - minimal)
- [x] Theme toggle (dark/light/system)
- [x] Placeholder for future notification settings
- [x] Accessible from feed header

### API Integration
- [x] API client module for backend communication
- [x] `GET /human/questions` - fetch question list
- [x] `GET /human/questions/{id}` - fetch single question
- [x] `POST /human/responses` - submit answer
- [x] Error handling with user-friendly messages
- [x] API base URL configurable via environment variable

### Styling & UX
- [x] Mobile-first responsive design
- [x] Follows living-styleguide visual patterns
- [x] Dark mode default, respects `prefers-color-scheme`
- [x] Theme preference persisted in localStorage
- [x] FOUC prevention (theme applied before render)
- [x] Touch-friendly tap targets (44x44px minimum)

### Developer Experience
- [x] `npm run dev` - Start development server
- [x] `npm run build` - Production build
- [x] `npm run preview` - Preview production build
- [x] `npm run quality` - Run linting and type checks
- [x] README with setup instructions

## Out of Scope (This Task)

- Push notifications (F6) - deferred to separate task
- Leaderboard (F7) - deferred to gamification task
- PWA features (service worker, installability) - deferred
- Badge/achievement display - deferred to gamification
- Confidence slider - optional enhancement
- Audience tags display - optional enhancement
- Infinite scroll pagination - basic list is sufficient
- Pull-to-refresh - nice to have
- Offline support - deferred to PWA task

## Implementation Notes

### Tech Stack (Actual - React 19)

| Layer | Technology |
|-------|------------|
| Framework | React 19 (upgraded from planned React 18) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| State | React Context (ThemeContext) |
| Routing | React Router v6 |
| HTTP | fetch API |
| Testing | Vitest + React Testing Library |

### DX Tooling (Backend Parity Achieved)

The frontend DX tooling matches or exceeds the backend:

| Aspect | Backend | Frontend |
|--------|---------|----------|
| Linting | Ruff | ESLint (strict TS + React + a11y + security) |
| Formatting | Black + isort | Prettier |
| Type Safety | mypy strict | TypeScript strict mode |
| Testing | pytest + coverage | Vitest + React Testing Library |
| Security | Bandit | npm audit + eslint-plugin-security |
| Commands | Makefile | Makefile (same target names) |
| CI | 2 GitHub Actions | 2 GitHub Actions (same structure) |

### Files Created

**Configuration:**
- `package.json` - Dependencies and npm scripts
- `vite.config.ts` - Vite with path aliases
- `vitest.config.ts` - Testing with coverage
- `tsconfig.*.json` - TypeScript strict mode
- `eslint.config.js` - ESLint with TS/React/a11y/security
- `.prettierrc` - Formatting rules
- `tailwind.config.ts` - Tailwind CSS v4
- `postcss.config.js` - PostCSS for Tailwind
- `Makefile` - Unified commands

**CI/CD:**
- `.github/workflows/frontend-code-quality.yml`
- `.github/workflows/frontend-tests.yml`

**Source Code:**
- `src/api/client.ts` - Typed API client
- `src/types/api.ts` - TypeScript interfaces
- `src/context/ThemeContext.tsx` - Theme with FOUC prevention
- `src/hooks/*.ts` - useQuestions, useQuestion, useSubmitResponse
- `src/components/*.tsx` - Button, Card, Header, LoadingSpinner, ErrorMessage, EmptyState, QuestionCard
- `src/pages/*.tsx` - Feed, AnswerQuestion, Confirmation, Settings

### Deployment Infrastructure Created

Created Terraform module for frontend hosting:
- `infrastructure/terraform/modules/frontend/` - S3 + CloudFront module
- Updated `infrastructure/terraform/environments/prod/main.tf` - Added frontend module
- `infrastructure/scripts/deploy-frontend.sh` - Deployment script

**Deployed Resources:**
- S3 bucket: `aah-frontend-325062206315`
- CloudFront distribution: `E1RL1VJNM1ANZ7`
- CloudFront domain: `d1q47nq8khquum.cloudfront.net`
- ACM certificate (us-east-1): Issued

### Build Output
- Bundle size: **78.72 KB gzipped** (target was < 100KB) ✓
- All quality checks pass

### Directory Structure (Final)

```
frontend-app-web/
├── src/
│   ├── api/client.ts
│   ├── components/{Button,Card,Header,LoadingSpinner,ErrorMessage,EmptyState,QuestionCard}.tsx
│   ├── context/ThemeContext.tsx
│   ├── hooks/{useQuestions,useQuestion,useSubmitResponse}.ts
│   ├── pages/{Feed,AnswerQuestion,Confirmation,Settings}.tsx
│   ├── types/api.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── eslint.config.js
├── Makefile
└── README.md
```

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Feed` | Question list (home) |
| `/questions/:id` | `AnswerQuestion` | Answer a question |
| `/confirmation` | `Confirmation` | Success screen |
| `/settings` | `Settings` | Theme and preferences |

### API Base URL

Configure via environment variable:
- Development: `http://localhost:3000` (or mock)
- Production: `https://api.ask-a-human.com`

```
VITE_API_BASE_URL=https://api.ask-a-human.com
```

### Theming Approach

Follow the living-styleguide pattern:
1. Check localStorage for saved preference
2. Fall back to `prefers-color-scheme` media query
3. Apply theme class to `<html>` element
4. Use inline script in `<head>` to prevent FOUC

### Reference Documents

- [PRD-01: Human Web App](../../product-requirements-document/01-human-web-app.md)
- [Living Styleguide](../../../living-styleguide/README.md)
- [ADR-03: API Design](../../architectural-decision-records/03-api-design.md)

## Testing Plan

After implementation, verify:

1. Question feed loads and displays questions
2. Tapping a question navigates to answer view
3. Text answer can be submitted
4. Multiple choice answer can be submitted
5. Confirmation screen shows after submission
6. Theme toggle works (dark/light)
7. Mobile layout works on phone-sized viewport
8. API errors show user-friendly messages
9. Production build works: `npm run build && npm run preview`

## Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Time to Interactive | < 3 seconds | TBD (needs DNS) |
| Bundle size (gzipped) | < 100KB | 78.72 KB ✓ |
| Lighthouse Performance | > 80 | TBD (needs DNS) |

## ADR/PRD Updates

Changes that should be fed back into source documents:
- [x] ADR-06: Frontend infrastructure module documented in implementation
- [ ] PRD-01: Update tech stack to note React 19 instead of React 18

## Follow-up Tasks

- Configure DNS at IONOS to point `ask-a-human.com` to CloudFront (`d1q47nq8khquum.cloudfront.net`)
- Run Lighthouse audit once DNS is configured
- Consider PWA task for service worker and installability
