# GEPPY Development Plan

## Product Overview

Interactive live comment + AI companion system for presentations.
Niconico-style overlay comments × Sli.do-like real-time interaction × Multimodal AI companion.

### Three Clients

1. **User App (PWA)** — Mobile web for participants to comment & vote
2. **Admin Dashboard (Web SPA)** — Session management, moderation, analytics
3. **Desktop App (Electron)** — Overlay comment display + AI companion

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 15 (Static Export) + shadcn/ui + Tailwind CSS v4 | user / admin apps |
| Desktop | Electron + React (shared UI components) | transparent overlay |
| API | Hono (Cloudflare Workers) | edge execution, pay-per-use |
| Realtime | Cloudflare Durable Objects + WebSocket | per-session state management |
| DB | Neon (PostgreSQL) + Drizzle ORM | serverless, branching |
| Cache/PubSub | Upstash Redis | Workers-compatible, pay-per-use |
| Auth | Clerk | Google/MS SSO, org management |
| AI | Vercel AI SDK + Claude API + Groq + Deepgram | provider abstraction |
| Billing | Stripe Billing + Checkout + Customer Portal | subscription + usage-based |
| Storage | Cloudflare R2 | S3-compatible, zero egress fees |
| Hosting | Cloudflare Pages (frontend) + Workers (API) | unified platform |
| Observability | Sentry + Langfuse + PostHog | error / AI / product analytics |
| Monorepo | Turborepo | apps/ + packages/ structure |

### Repository Structure

```
geppy/
├── apps/
│   ├── user/              # Next.js Static Export → CF Pages (participant PWA)
│   ├── admin/             # Next.js Static Export → CF Pages (admin dashboard)
│   ├── desktop/           # Electron (overlay + AI companion)
│   └── api/               # Hono → CF Workers
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   │   ├── sessions.ts
│       │   │   ├── comments.ts
│       │   │   ├── votes.ts
│       │   │   ├── ai.ts
│       │   │   ├── auth.ts
│       │   │   └── billing.ts
│       │   └── durable-objects/
│       │       └── session-room.ts
│       └── wrangler.toml
├── packages/
│   ├── shared/            # Zod schemas, type definitions, constants
│   ├── ui/                # shadcn/ui shared components
│   ├── db/                # Drizzle schema + migrations
│   ├── ai/                # Vercel AI SDK routing + prompts
│   └── realtime/          # WebSocket protocol definitions + client
├── turbo.json
├── package.json
├── tsconfig.json
└── .github/
    └── workflows/
        ├── deploy-api.yml
        ├── deploy-pages.yml
        └── build-desktop.yml
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              Cloudflare (unified)                │
│                                                  │
│  Pages ──→ Hono Workers ──→ Durable Objects     │
│  (static)  (API + AI)       (WebSocket + State)  │
│                 │                                │
│            ┌────┼────┐                           │
│            ▼    ▼    ▼                           │
│          R2   KV   DNS/CDN                       │
└─────────────────────────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
  ┌────────┐   ┌──────────┐   ┌──────────┐
  │ Neon   │   │ Upstash  │   │ Stripe   │
  │(Postgres)│ │ (Redis)  │   │(Billing) │
  └────────┘   └──────────┘   └──────────┘
       │
       ▼
  ┌───────────────────────────┐
  │ AI Providers (AI SDK)     │
  │ Claude / Groq / Gemini    │
  │ + Deepgram (STT)          │
  │ + Langfuse (Observability)│
  └───────────────────────────┘
```

---

## Phasing Strategy

### Design Principles

- **Each phase ends with a working, demoable deliverable**
- **Vertical slices**: build features end-to-end (frontend → API → DB)
- **Dependency order**: later phases build on earlier foundations
- **Debug isolation**: minimize layers touched per phase

---

## Phase 0: Project Foundation

### Goal
Monorepo skeleton is set up. All apps build and deploy in empty state.

### Tasks

1. **Turborepo monorepo init**
   - `pnpm` workspace configuration
   - `turbo.json` build pipeline
   - Shared `tsconfig.json` (base, node, react)

2. **packages/ scaffolding**
   - `packages/shared` — empty Zod schema exports
   - `packages/ui` — shadcn/ui init (Button, Card, basic components)
   - `packages/db` — Drizzle + Neon connection setup, empty schema
   - `packages/ai` — Vercel AI SDK setup, empty router
   - `packages/realtime` — WebSocket message type definitions

3. **apps/ scaffolding**
   - `apps/user` — Next.js 15 Static Export, verify shadcn/ui renders
   - `apps/admin` — Next.js 15 Static Export, verify shadcn/ui renders
   - `apps/api` — Hono on Workers, `GET /health` returns 200
   - `apps/desktop` — Electron launches empty window

4. **Infrastructure connectivity**
   - Deploy to Cloudflare Pages (user, admin)
   - Deploy to Cloudflare Workers (api)
   - Create Neon DB, verify connection
   - Create Upstash Redis, verify connection

5. **Dev environment**
   - ESLint + Prettier shared config
   - `turbo dev` runs all apps concurrently
   - `.env` management (dotenv + wrangler secrets)

### Done When
- `pnpm dev` starts all apps
- `pnpm build` succeeds for all
- CF Pages/Workers deployed and accessible in browser
- Neon/Upstash connections verified

---

## Phase 1: Real-time Comment Streaming (Core)

### Goal
Users can post comments from browser and see them appear in real-time for all participants.

### Tasks

1. **DB Schema (packages/db)**
   ```
   sessions
     id: uuid PK
     code: varchar(6) UNIQUE  -- join code
     title: varchar
     status: enum('preparing', 'live', 'ended', 'archived')
     created_at: timestamp
     updated_at: timestamp

   comments
     id: uuid PK
     session_id: uuid FK → sessions
     nickname: varchar
     content: text
     type: enum('user', 'ai')
     parent_id: uuid FK → comments (nullable, for AI replies)
     created_at: timestamp
   ```

2. **API Endpoints (apps/api)**
   - `POST /api/sessions` — create session
   - `GET /api/sessions/:code` — join session by code
   - `POST /api/sessions/:id/comments` — post comment
   - `GET /api/sessions/:id/comments` — list comments (initial load)

3. **Durable Object: SessionRoom (apps/api)**
   - Accept/manage WebSocket connections
   - Broadcast new comments to all clients
   - Buffer recent comments in memory (for reconnection delta sync)
   - Message protocol (packages/realtime):
     ```typescript
     type WSMessage =
       | { type: 'comment:new'; payload: Comment }
       | { type: 'comment:list'; payload: Comment[] }
       | { type: 'session:status'; payload: SessionStatus }
       | { type: 'ping' } | { type: 'pong' }
     ```

4. **User App (apps/user)**
   - Session join screen: enter code → display session info
   - Nickname input
   - Comment list (real-time updates, auto-scroll)
   - Comment post form
   - WebSocket connection hook (`useSessionRoom`)

5. **WebSocket Client (packages/realtime)**
   - Auto-reconnection logic
   - Exponential backoff
   - Connection state management

### Done When
- Open 2 browser tabs on same session; comment in one appears instantly in other
- Page reload preserves comment history
- WebSocket disconnect → auto-reconnect works

---

## Phase 2: Admin Dashboard + Auth

### Goal
Clerk authentication works. Admin can CRUD sessions. User app remains auth-free.

### Tasks

1. **Clerk Integration**
   - Create Clerk app, configure Google SSO
   - Add ClerkProvider to `apps/admin`
   - Add Clerk middleware to `apps/api` (admin endpoints only)
   - Clerk Webhook → Workers: on `user.created`, insert to DB

2. **DB Schema Addition**
   ```
   users
     id: uuid PK
     clerk_id: varchar UNIQUE
     email: varchar
     name: varchar
     created_at: timestamp

   sessions table additions:
     owner_id: uuid FK → users
   ```

3. **Admin Dashboard (apps/admin)**
   - Login / Signup (Clerk UI)
   - Dashboard: session list
   - Session create form (title, description)
   - Session detail: status toggle (preparing → live → ended)
   - Session detail: QR code + join code display
   - Session detail: real-time comment monitor (for moderation)
   - Comment delete action

4. **API Extensions**
   - `GET /api/admin/sessions` — list own sessions
   - `PATCH /api/admin/sessions/:id` — update status
   - `DELETE /api/admin/sessions/:id/comments/:commentId` — delete comment
   - Auth middleware with owner permission check

### Done When
- Google SSO login works
- Create session → QR code generated
- Scan QR on phone → user app loads, can post comments
- Admin monitors comments in real-time, can delete them

---

## Phase 3: Voting

### Goal
Admin creates polls, users vote, results aggregate in real-time.

### Tasks

1. **DB Schema Addition**
   ```
   polls
     id: uuid PK
     session_id: uuid FK → sessions
     question: text
     type: enum('single', 'multiple')
     status: enum('draft', 'open', 'closed')
     created_at: timestamp

   poll_options
     id: uuid PK
     poll_id: uuid FK → polls
     label: varchar
     sort_order: int

   poll_votes
     id: uuid PK
     poll_option_id: uuid FK → poll_options
     voter_fingerprint: varchar  -- anonymous dedup
     created_at: timestamp
   ```

2. **API Endpoints**
   - `POST /api/admin/sessions/:id/polls` — create poll
   - `PATCH /api/admin/polls/:id` — change status (open/closed)
   - `POST /api/polls/:id/vote` — cast vote
   - `GET /api/polls/:id/results` — get aggregated results

3. **Realtime Extensions**
   - Additional WS messages:
     ```typescript
     | { type: 'poll:open'; payload: Poll & { options: PollOption[] } }
     | { type: 'poll:vote'; payload: { pollId: string; results: PollResult[] } }
     | { type: 'poll:close'; payload: { pollId: string; finalResults: PollResult[] } }
     ```
   - Vote tallying via Upstash Redis atomic increments
   - Broadcast results through Durable Object to all clients

4. **Admin Dashboard Extensions**
   - Poll creation form (question + options, single/multiple choice)
   - One-click poll open/close
   - Real-time bar chart for results

5. **User App Extensions**
   - Poll popup on WebSocket push
   - Tap to vote
   - Real-time result graph (after voting or after close)
   - Duplicate vote prevention (browser fingerprint)

### Done When
- Admin creates poll → opens it → appears as popup on user app
- User votes → results update in real-time
- Same user cannot vote twice

---

## Phase 4: Desktop App (Overlay Comments)

### Goal
Desktop app displays comments as Niconico-style overlay flowing across the screen.

### Tasks

1. **Electron App Foundation (apps/desktop)**
   - Transparent window config:
     ```typescript
     new BrowserWindow({
       transparent: true,
       frame: false,
       alwaysOnTop: true,
       skipTaskbar: false,
       hasShadow: false,
     })
     ```
   - Click-through toggle (`setIgnoreMouseEvents`)
   - System tray icon + context menu
   - Global hotkeys

2. **Session Connection UI**
   - Login screen (Clerk or session code)
   - Session selection / code entry
   - Connection status indicator
   - Settings window = normal (non-transparent) window

3. **Niconico-style Comment Renderer**
   - Canvas or DOM-based comment rendering engine
   - Right-to-left scroll animation
   - Display settings:
     - Font size / color / opacity
     - Scroll speed
     - Display lanes (top / center / bottom)
     - Max concurrent comments
   - Collision avoidance (lane allocation algorithm)
   - Reuse packages/realtime WebSocket client

4. **Control Panel**
   - Overlay position/size adjustment
   - Pause/resume comment display
   - Poll result overlay (bar/pie chart)
   - Poll creation & publish (same capability as admin dashboard)

5. **OBS Compatibility**
   - Verify transparent window capture works
   - Optional chroma key background toggle for window capture fallback

### Done When
- Launch desktop app, connect to session
- Comments posted from phone flow across desktop screen Niconico-style
- Comment appearance (size, speed, color) is customizable
- Click-through mode allows operating PowerPoint behind overlay
- Polls can be created/published; results display as overlay

---

## Phase 5: AI Companion (Text-based)

### Goal
AI replies to comments and appears in overlay. Text input only (voice/screen in next phase).

### Tasks

1. **AI Routing (packages/ai)**
   ```typescript
   import { streamText, generateObject } from 'ai';
   import { anthropic } from '@ai-sdk/anthropic';
   import { groq } from '@ai-sdk/groq';

   const models = {
     reply: anthropic('claude-sonnet-4-5-20250514'),
     quip: groq('llama-3.3-70b-versatile'),
     summary: anthropic('claude-sonnet-4-5-20250514'),
     vote_gen: anthropic('claude-haiku-4-5-20251001'),
   };
   ```

2. **AI Companion Engine (packages/ai)**
   - Context management:
     - Session info (title, description, agenda)
     - Recent N comments history
     - Current session state
   - Persona system prompt builder
   - Response trigger logic:
     - Question-like comment → auto-reply
     - No comments for X seconds → engagement prompt
     - Peak activity → reaction
   - Generate response → save to `comments` table as `type: 'ai'` → broadcast via WebSocket

3. **API Endpoints**
   - `POST /api/ai/reply` — manually trigger AI reply
   - `POST /api/ai/generate-poll` — AI generates poll suggestion
   - Auto-response controlled by timer in Durable Object

4. **Admin Dashboard Extensions**
   - AI companion settings:
     - Persona name & character
     - Tone (serious / casual / witty)
     - Intervention mode: auto / semi-auto (suggest → approve) / manual
     - Intervention frequency slider (aggressive ↔ conservative)
     - Blocked topics
   - Pre-session context input (agenda, slide notes)

5. **User App & Desktop Extensions**
   - AI comments display with 🤖 badge
   - AI replies shown as threaded under parent comment
   - Desktop overlay: AI comments flow with distinct color

6. **Langfuse Integration**
   - Trace all AI calls
   - Prompt versioning
   - Cost tracking

### Done When
- User posts a question → AI replies
- AI replies visible on both user app and desktop overlay
- Admin can change AI persona and intervention mode
- AI can auto-suggest polls
- Traces visible in Langfuse

---

## Phase 6: AI Companion (Multimodal)

### Goal
AI understands mic audio and screen capture, reacting to presentation content.

### Tasks

1. **Mic Audio Capture (apps/desktop)**
   - Electron `desktopCapturer` or Web Audio API for system/mic audio
   - Stream audio to Deepgram Streaming API
   - Receive real-time transcription
   - Feed transcript into AI context
   - Buffering strategy: 5-10 second chunks sent to AI

2. **Screen Capture (apps/desktop)**
   - `desktopCapturer` for periodic screenshots (10-30 sec interval)
   - Change detection: only send when diff exceeds threshold vs previous frame
   - Send screenshot as base64 to Claude Vision API
   - Slide content understanding & summarization

3. **Multimodal Context Integration (packages/ai)**
   ```typescript
   interface CompanionContext {
     session: SessionInfo;
     recentComments: Comment[];       // user comments
     transcript: string;              // recent audio transcription
     currentSlide: string;            // base64 image
     slideDescription: string;        // previous slide summary
     companionPersona: PersonaConfig;
   }
   ```
   - Build prompts combining all 3 input sources
   - Responses informed by speaker's words + slide content

4. **Advanced AI Behaviors**
   - **Speaker commentary**: detect contradictions or talking points from audio + slides
   - **Context-aware Q&A**: "what was that earlier?" → search transcription
   - **Auto-summary**: propose "summary so far" at section transitions
   - **Slide awareness**: acknowledge new slides when transitions detected

5. **Desktop App Settings Extensions**
   - Mic device selector
   - Screen capture target (window/monitor) selector
   - Capture frequency setting
   - Audio input ON/OFF toggle
   - Screen capture ON/OFF toggle

### Done When
- During a PowerPoint presentation, AI comments "regarding this slide's [topic]..."
- AI makes witty remarks about what the speaker said
- AI integrates audio + screen + comments into contextual understanding
- Each input source can be toggled on/off independently

---

## Phase 7: Stripe Billing

### Goal
Free/Pro/Enterprise plan enforcement works. Stripe payments functional.

### Tasks

1. **Stripe Setup**
   - Configure Stripe account
   - Create Products / Prices:
     ```
     Free:       $0    — 3 sessions/month, 50 participants/session, no AI
     Pro:        $29   — unlimited sessions, 500 participants, AI companion
     Enterprise: $99   — custom participants, SSO, priority support
     ```
   - Stripe Checkout session creation
   - Enable Stripe Customer Portal
   - Configure webhook endpoint

2. **DB Schema Addition**
   ```
   subscriptions
     id: uuid PK
     user_id: uuid FK → users
     stripe_customer_id: varchar
     stripe_subscription_id: varchar
     plan: enum('free', 'pro', 'enterprise')
     status: enum('active', 'canceled', 'past_due')
     current_period_end: timestamp
     created_at: timestamp
     updated_at: timestamp
   ```

3. **API Implementation**
   - `POST /api/billing/checkout` — create Checkout session
   - `POST /api/billing/portal` — create Customer Portal session
   - `POST /api/webhooks/stripe` — webhook handler:
     - `checkout.session.completed` → start subscription
     - `customer.subscription.updated` → plan change
     - `customer.subscription.deleted` → cancellation
     - `invoice.payment_failed` → payment failure notification
   - Clerk `user.created` → auto-create Stripe Customer

4. **Plan Enforcement Middleware**
   - Session creation: check plan limits
   - Participant connection: check concurrent connection cap
   - AI features: Pro+ only
   - Feature flag pattern:
     ```typescript
     const planLimits = {
       free: { sessions: 3, participants: 50, ai: false },
       pro: { sessions: Infinity, participants: 500, ai: true },
       enterprise: { sessions: Infinity, participants: Infinity, ai: true },
     };
     ```

5. **Admin Dashboard Extensions**
   - Plan display + upgrade button
   - Link to Stripe Customer Portal
   - Usage display (sessions this month, AI usage, etc.)

### Done When
- Free plan session creation limit enforced
- Stripe Checkout flow completes for Pro plan purchase
- After purchase, AI features unlocked
- Customer Portal allows plan change and cancellation
- Webhooks sync state correctly

---

## Phase 8: Polish & Production Readiness

### Goal
Quality and operational readiness for production launch.

### Tasks

1. **Moderation Hardening**
   - Configurable blocked word filter
   - Comment rate limiting (1 per N seconds per user)
   - Spam detection (block rapid-fire posts)
   - AI moderation (auto-detect harmful comments)

2. **Analytics**
   - Per-session: comment count, participant count, vote results, engagement timeline
   - AI interaction stats
   - CSV export
   - PostHog event tracking

3. **Error Handling & Retries**
   - AI API error fallback (Claude → Groq)
   - WebSocket disconnect graceful degradation
   - Stripe webhook retry handling

4. **Performance Optimization**
   - Virtual scrolling for comment lists
   - Image capture compression/resize
   - AI response streaming optimization

5. **Desktop App Distribution**
   - electron-builder for Windows/macOS builds
   - Auto-update (electron-updater + R2)
   - Code signing
   - Download links on admin dashboard

6. **Documentation**
   - User-facing help docs
   - API documentation (Hono OpenAPI)

7. **CI/CD**
   - GitHub Actions: lint → test → build → deploy
   - Staging environment (CF Preview Deployments)
   - Desktop app auto-build & release

### Done When
- Stable in production environment
- Graceful behavior on errors
- Desktop app downloadable with auto-update
- Basic analytics functional

---

## Phase Dependency Graph

```
Phase 0 (Foundation)
  │
  ├──→ Phase 1 (Comments) ──→ Phase 2 (Admin + Auth)
  │                                │
  │                                ├──→ Phase 3 (Voting)
  │                                │
  │                                └──→ Phase 4 (Desktop)
  │                                        │
  │                                        └──→ Phase 5 (AI Text)
  │                                                │
  │                                                └──→ Phase 6 (AI Multimodal)
  │
  └──→ Phase 7 (Billing) ← Can start in parallel after Phase 2
  
  Phase 8 (Polish) ← After all phases complete
```

### Time Estimates (with Claude Code)

| Phase | Estimate | Key Complexity |
|---|---|---|
| 0: Foundation | 1 day | Turborepo + Cloudflare config |
| 1: Comments | 2-3 days | Durable Objects + WebSocket |
| 2: Admin + Auth | 2-3 days | Clerk integration + CRUD |
| 3: Voting | 1-2 days | Real-time aggregation |
| 4: Desktop | 3-5 days | Electron transparency + comment renderer |
| 5: AI Text | 2-3 days | Prompt design + trigger logic |
| 6: AI Multimodal | 3-5 days | STT + screen capture integration |
| 7: Billing | 1-2 days | Stripe integration |
| 8: Polish | 3-5 days | Quality & ops readiness |
| **Total** | **~18-29 days** | |

---

## Claude Code Instruction Template

Use this template when starting each phase:

```
This repository is the GEPPY project.
Implement Phase N from GEPPY_DEVELOPMENT_PLAN.md.

Prerequisites:
- Phases 0 through N-1 are complete
- Tech stack: [relevant tech for this phase]
- Done criteria: [copy from plan]

Guidelines:
- Maintain consistency with existing code
- Use packages/ shared modules actively
- Prioritize type safety (Zod + TypeScript strict)
- Do not skip error handling
```
