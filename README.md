# VA - AI Executive Assistant

AI-powered executive assistant that helps busy operators plan their day, execute faster, and stay accountable across Gmail, Google Calendar, and Google Tasks.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## Product Framing

### Problem
Knowledge workers lose momentum by context-switching across inbox, calendar, and task tools. Planning happens in one app, execution in another, and reflection nowhere.

### Who This Is For
- Founders, operators, and students managing many short, high-context tasks daily.
- Users who prefer keyboard-first workflows and low-friction daily planning.

### Jobs To Be Done
- "Help me quickly turn incoming information into an executable plan."
- "Help me draft clear responses without overthinking tone and phrasing."
- "Help me stay accountable with visible progress, not just a to-do list."

## What Users Can Do Today
- Triage inbox and draft replies with a multi-model AI pipeline.
- See calendar, tasks, and email in one unified dashboard.
- Create and update tasks/events without leaving the workspace.
- Run global search across mail, calendar, tasks, and activity.
- Track daily momentum through streaks and activity scoring.

## Product Principles
- Reduce context switching: one surface for planning and execution.
- Optimize for speed: keyboard-first interactions and quick actions.
- Keep users in control: editable drafts, manual overrides, clear feedback.
- Balance automation with trust: AI assists, user decides.

## About The Builder
I built VA as a product-minded engineer, not just a feature implementer. My focus is the end-user workflow: where attention is lost, where friction compounds, and where small UX improvements create meaningful daily gains.

How I approach products:
- Start with the user problem and the job they are trying to get done.
- Ship thin end-to-end slices quickly, then refine based on usage feedback.
- Make explicit tradeoffs between speed, quality, cost, and trust.
- Treat security and reliability as core product requirements, not afterthoughts.

This project reflects how I work: user-centered design, pragmatic execution, and measurable outcomes.

## Primary User Journey
1. Morning: review tasks, meetings, and inbox in one dashboard.
2. Midday: turn priorities into scheduled blocks and send high-quality replies.
3. End of day: review activity and completion streaks for accountability.

## Feature Highlights
- **Multi-model email drafting**: GPT-4 draft, Gemini audit, GPT-4 refinement.
- **Keyboard-first UX**: `Cmd+K` global search, numeric column controls, context-aware Escape.
- **Unified work surface**: inbox, drafts, sent, calendar, priority tasks, and activity log.
- **Priority Planner**: local priority tasks synced with Google Tasks.
- **Activity intelligence**: streaks, impact scoring, and weekly consistency signals.

## Security And Privacy
- OAuth access/refresh tokens remain server-side (not exposed to client session).
- Optional sign-in allowlist (`ALLOWED_EMAILS` / `ALLOWED_EMAIL_DOMAIN`) for controlled access.
- Per-user local data isolation for activity and priority task storage.
- Per-user quotas on AI endpoints to limit abuse and spending risk.
- Input hardening on email draft/send routes and upload validation for transcription.

## Screenshots

Add real product screenshots or short GIFs here before sharing publicly.

Recommended assets:
- Dashboard overview (all major modules visible)
- Email compose + AI draft workflow
- Global search modal with mixed result types

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud project
- OpenAI API key (for AI features)
- Gemini API key (optional, for draft audit step)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd va-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in environment variables, then start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Required: Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Required: NextAuth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Recommended for public deployments: sign-in allowlist
ALLOWED_EMAILS="you@example.com,other@example.com"
# Or, allow a whole domain
ALLOWED_EMAIL_DOMAIN="example.com"

# Optional: AI Features
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="..."

# Optional: Location autocomplete
GOOGLE_PLACES_API_KEY="..."
```

## Google Cloud Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable APIs:
- Gmail API
- Google Calendar API
- Google Tasks API
- Places API (optional)
3. Create OAuth credentials:
- `APIs & Services` -> `Credentials` -> `Create Credentials` -> `OAuth client ID`
- Type: `Web application`
- Redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Configure OAuth consent screen and add test users.

## Technical Overview

```text
src/
  app/
    api/          # Authenticated server routes (email, calendar, tasks, activity, planning)
    dashboard/    # Main unified interface
    compose/      # Pop-out compose experience
  components/
    dashboard/    # Calendar, tasks, and activity UI
    search/       # Global search UX
  hooks/          # Preferences and utility hooks
  lib/            # Auth, AI prompts, quotas, user-scoped storage helpers
  data/           # Local storage (user-scoped JSON files)
```

## Key Product And Engineering Tradeoffs

| Decision | Why |
|----------|-----|
| Unified dashboard instead of separate pages | Lowers context switching and task latency |
| Keyboard-first interactions | Supports high-frequency users and power workflows |
| Multi-model draft pipeline | Improves final writing quality over single-pass generation |
| Local JSON persistence for MVP | Fast iteration and low infra overhead |
| Server-side OAuth token handling | Better security posture for public deployment |

## Success Metrics (What I Would Track In Production)
- Weekly active users and return usage by day-part.
- Median time from inbox item -> draft sent.
- Task completion rate for items created in VA.
- Calendar execution adherence (planned vs completed blocks).
- User-reported perceived stress reduction and planning confidence.

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run test      # Run tests
npm run test:coverage
```

## Roadmap
- Multi-user cloud persistence with explicit data retention policy.
- Shared team planning view and delegated tasks.
- Improved analytics for planning quality and time estimation accuracy.
- Better model orchestration with cost-aware routing.

## License

No open-source license is currently attached. If you plan to accept public reuse, add a license file (for example MIT).
