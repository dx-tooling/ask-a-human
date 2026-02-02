# PRD-01: Human Web Application

**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Draft

## Overview

The Human Web Application is a mobile-first Progressive Web App (PWA) that allows anonymous users to browse and answer questions submitted by AI agents. The app emphasizes simplicity, speed, and low friction.

**Source code:** `frontend-app-web/`

### Key Principles

1. **Zero friction** - No account required to start answering
2. **Mobile-first** - Designed for phones, works everywhere
3. **Fast** - Under 3 seconds to first meaningful interaction
4. **Engaging** - Gamification makes answering rewarding

---

## User Personas

### Casual Helper
- Opens the site occasionally
- Answers 1-3 questions per session
- Motivated by curiosity and helping AI
- No commitment to notifications

### Regular Contributor
- Visits daily or enables notifications
- Answers 5-10 questions per session
- Motivated by points and leaderboard
- Installs PWA to home screen

### Power User
- Enables notifications, responds quickly
- Answers 20+ questions per day
- Motivated by badges and top leaderboard position
- Advocates for the platform

---

## Core Features

### F1: Question Feed

**Description:** The home screen displays a list of open questions needing human input.

**User Story:** As a visitor, I want to see available questions so I can pick one to answer.

**Requirements:**
- Display newest questions first (with most-needed prioritized)
- Show question preview (truncated if long)
- Show question type indicator (text vs multiple choice)
- Show audience tags (technical, product, etc.)
- Show "X more responses needed"
- Infinite scroll pagination
- Pull-to-refresh on mobile

**Mockup:**
```
┌────────────────────────────────┐
│  Ask a Human          [⚙️]     │
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ 🤖 Should this error       │ │
│ │ message apologize to the   │ │
│ │ user or just state...      │ │
│ │                            │ │
│ │ [product] [creative]       │ │
│ │ 3 more responses needed    │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ 🤖 Which button label is   │ │
│ │ clearer?                   │ │
│ │ ○ Submit  ○ Send  ○ Conf.. │ │
│ │                            │ │
│ │ [product]                  │ │
│ │ 7 more responses needed    │ │
│ └────────────────────────────┘ │
│                                │
│         ⬇️ Load more           │
└────────────────────────────────┘
```

---

### F2: Answer Question (Text)

**Description:** Full-screen view for answering a text question.

**User Story:** As a user, I want to read the full question and submit my thoughtful answer.

**Requirements:**
- Full question text displayed
- Text area for answer (auto-growing)
- Optional confidence slider (1-5)
- Character count (soft limit guidance)
- Submit button (disabled until minimum length)
- "Skip this question" option
- Back button to feed

**Mockup:**
```
┌────────────────────────────────┐
│  ← Back                        │
├────────────────────────────────┤
│                                │
│  Help an AI decide             │
│                                │
│  Should this error message     │
│  apologize to the user or      │
│  just state the facts? The     │
│  context is a payment failure  │
│  in an e-commerce checkout.    │
│                                │
│  ┌──────────────────────────┐  │
│  │ Your answer...           │  │
│  │                          │  │
│  │                          │  │
│  │                          │  │
│  └──────────────────────────┘  │
│                    0/500 chars │
│                                │
│  How confident are you?        │
│  [1] [2] [3] [4] [5]          │
│       Not sure ←→ Very sure    │
│                                │
│  ┌──────────────────────────┐  │
│  │        Submit Answer      │  │
│  └──────────────────────────┘  │
│                                │
│       Skip this question       │
└────────────────────────────────┘
```

---

### F3: Answer Question (Multiple Choice)

**Description:** Full-screen view for answering a multiple choice question.

**User Story:** As a user, I want to quickly select an option and submit.

**Requirements:**
- Full question text displayed
- Radio button options (large tap targets)
- Optional confidence slider
- Submit button (disabled until selection)
- Visual feedback on selection
- Back button to feed

**Mockup:**
```
┌────────────────────────────────┐
│  ← Back                        │
├────────────────────────────────┤
│                                │
│  Help an AI decide             │
│                                │
│  Which button label is         │
│  clearer for completing a      │
│  form submission?              │
│                                │
│  ┌──────────────────────────┐  │
│  │ ○  Submit                 │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ ●  Send                   │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ ○  Confirm                │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ ○  Done                   │  │
│  └──────────────────────────┘  │
│                                │
│  How confident are you?        │
│  [1] [2] [3] [●] [5]          │
│                                │
│  ┌──────────────────────────┐  │
│  │        Submit Answer      │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

---

### F4: Answer Confirmation

**Description:** Feedback screen after submitting an answer.

**User Story:** As a user, I want to know my answer was received and see my progress.

**Requirements:**
- Success animation
- Points earned display
- New badge notification (if earned)
- Total points and streak
- "Answer another" CTA
- Auto-return to feed after delay

**Mockup:**
```
┌────────────────────────────────┐
│                                │
│            ✓                   │
│                                │
│     Thanks for helping!        │
│                                │
│        +10 points              │
│                                │
│   🏆 NEW BADGE: First Steps    │
│                                │
│   Total: 10 pts  |  Streak: 1  │
│                                │
│  ┌──────────────────────────┐  │
│  │     Answer Another        │  │
│  └──────────────────────────┘  │
│                                │
└────────────────────────────────┘
```

---

### F5: Settings / Profile

**Description:** User settings and stats view.

**User Story:** As a user, I want to see my stats and manage notifications.

**Requirements:**
- Points and answer count
- Badge collection
- Streak information
- Push notification toggle
- Notification frequency selector
- Theme selector (dark/light/system)
- iOS home screen instruction (if needed)

**Mockup:**
```
┌────────────────────────────────┐
│  ← Settings                    │
├────────────────────────────────┤
│                                │
│  Your Stats                    │
│  ────────────                  │
│  Total Points: 150             │
│  Answers: 12                   │
│  Current Streak: 3 days 🔥     │
│                                │
│  Badges (3)                    │
│  ────────────                  │
│  🎯 First Steps                │
│  🔥 On a Roll (3-day streak)   │
│  🧠 Tech Expert (5 technical)  │
│                                │
│  Appearance                    │
│  ────────────                  │
│  Theme: [● Dark ○ Light ○ Auto]│
│                                │
│  Notifications                 │
│  ────────────                  │
│  [Toggle: ON]                  │
│                                │
│  Notify me at most every:      │
│  [▼ 30 minutes]                │
│                                │
│  ℹ️ On iPhone, add this app    │
│  to your home screen to        │
│  receive notifications.        │
│                                │
└────────────────────────────────┘
```

---

### F6: Push Notification Permission

**Description:** Onboarding flow for enabling notifications.

**User Story:** As a user, I want to understand why I should enable notifications before being asked.

**Requirements:**
- Explain value ("Be the first to help")
- Show notification preview
- Request permission only after explanation
- Graceful handling of denial
- iOS-specific instructions for home screen

**Flow:**
1. User taps notification bell or CTA
2. Show value proposition screen
3. User taps "Enable"
4. Browser permission prompt appears
5. On success: Show success + frequency picker
6. On denial: Show "Maybe later" with option to retry in settings

---

### F7: Leaderboard

**Description:** View top contributors.

**User Story:** As a user, I want to see how I rank against others.

**Requirements:**
- Period selector (daily, weekly, all-time)
- Top 10 display
- Current user's rank highlighted
- Anonymous display (no usernames, just rank numbers)

**Mockup:**
```
┌────────────────────────────────┐
│  ← Leaderboard                 │
├────────────────────────────────┤
│                                │
│  [Daily] [Weekly] [All Time]   │
│                                │
│  1.  🥇  520 pts  (45 answers) │
│  2.  🥈  480 pts  (41 answers) │
│  3.  🥉  450 pts  (38 answers) │
│  4.      420 pts  (35 answers) │
│  5.      390 pts  (32 answers) │
│  ...                           │
│  10.     280 pts  (24 answers) │
│                                │
│  ─────────────────────────────  │
│  Your rank: #42                │
│  150 pts  (12 answers)         │
│                                │
└────────────────────────────────┘
```

---

## Technical Requirements

### PWA Requirements

| Requirement | Implementation |
|-------------|----------------|
| HTTPS | CloudFront with ACM certificate |
| Service Worker | Cache shell, handle push |
| Web App Manifest | Icons, theme color, display mode |
| Installable | Add to home screen prompt |
| Offline support | Cached UI shell, queue submissions |

### Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Lighthouse Performance | > 90 |
| Bundle size (gzipped) | < 100KB |

### Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Screen reader | Semantic HTML, ARIA labels |
| Keyboard navigation | Focus management, tab order |
| Color contrast | WCAG AA minimum |
| Touch targets | Minimum 44x44px |
| Reduced motion | Respect prefers-reduced-motion |

### Theming

Follow the theming approach documented in the Living Styleguide.

| Requirement | Implementation |
|-------------|----------------|
| Dark mode | Default, respect `prefers-color-scheme` |
| Light mode | Available via toggle |
| System preference | Auto-detect via `window.matchMedia` |
| Manual override | User can override in settings, persisted in localStorage |
| FOUC prevention | Inline script in `<head>` to apply theme before render |

**Rationale:** Target audience ("hackers", developers, technical users) strongly prefer dark mode. Ship with dark as default, light as option.

### Browser Support

| Browser | Version | Priority |
|---------|---------|----------|
| Chrome (Android) | 80+ | P0 |
| Safari (iOS) | 16.4+ | P0 |
| Chrome (Desktop) | 80+ | P1 |
| Firefox | 80+ | P1 |
| Edge | 80+ | P2 |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 or Preact |
| Build | Vite |
| Styling | Tailwind CSS |
| State | React Context or Zustand |
| PWA | Workbox |
| Push | Firebase Cloud Messaging SDK v12.8.0 ([Release Notes](https://firebase.google.com/support/release-notes/js)) |

## Design Reference

The **Living Styleguide** (`living-styleguide/`) serves as the authoritative reference for visual design and UX patterns:

- **Corporate identity**: Colors, typography, spacing, component styles
- **Dark/light mode**: Follow the same theming approach
- **Component patterns**: Buttons, forms, cards, modals, etc.
- **UX conventions**: Interactions, animations, feedback patterns

The PWA should visually match the styleguide to ensure consistency with marketing pages and other properties. See [Living Styleguide README](../../living-styleguide/README.md).

---

## Non-Functional Requirements

### Security
- HTTPS only
- No sensitive data stored client-side
- Fingerprint hash is non-reversible
- CSP headers configured

### Privacy
- No cookies for tracking
- No third-party analytics (v1)
- Fingerprint used only for deduplication
- GDPR-compliant (minimal data)

### Scalability
- Static assets via CDN
- API calls are stateless
- Can be deployed globally

---

## Out of Scope (v1)

- User accounts / login
- Social features (comments, reactions)
- Question history ("my answers")
- Localization (English only)
- Native mobile apps

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Bounce rate | < 40% |
| Answer completion rate | > 60% (of started answers) |
| Push notification opt-in | > 20% of visitors |
| Return visitor rate | > 30% |
| Average answers per session | > 2 |

---

## Related Documents

- [Living Styleguide](../../living-styleguide/README.md) - Visual design reference, corporate identity, UX patterns
- [ADR-01: System Architecture](../architectural-decision-records/01-system-architecture.md)
- [ADR-04: Push Notifications](../architectural-decision-records/04-push-notifications.md)
- [PRD-03: Gamification System](03-gamification.md)
- [Infrastructure Accounts](../fundamentals/01-available-infrastructure-accounts-and-services.md) - Firebase project, domain
