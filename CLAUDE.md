# Commentoo - Repository Rules

## Project

Interactive live comment + AI companion system for presentations.
See `COMMENTOO_DEVELOPMENT_PLAN.md` for architecture and phasing.

## Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps (turbo dev)
pnpm build                # Build all apps (turbo build)
pnpm lint                 # Lint all packages
pnpm type-check           # TypeScript check
pnpm format               # Prettier format
pnpm format:check         # Check formatting
pnpm test                 # Run all tests (vitest)
pnpm --filter @commentoo/<app> dev   # Run single app
pnpm --filter @commentoo/db generate # Drizzle migration generate
pnpm --filter @commentoo/db migrate  # Run migrations
```

## Git Strategy

- **Main branch**: `main` — always deployable
- **Branch from `main`** for all work
- **Branch naming**: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **Atomic commits**: one logical change per commit
- **No force-push to `main`**
- **Squash merge** PRs into `main`

## Code Review Rules

- All changes go through PR — no direct push to `main`
- PR must pass CI (lint, type-check, build, test) before merge
- PR title follows conventional commit format
- PR description includes: what changed, why, and how to test
- Keep PRs small and focused — one feature or fix per PR
- Address all review comments before merging

## Code Style

### Language
- Code, comments, commits, docs: **English**
- User-facing UI: **Japanese** (primary) + English

### TypeScript
- Strict mode (`"strict": true`) — no exceptions
- No `any` — use `unknown` + narrowing or generics
- Prefer `interface` for object shapes, `type` for unions/intersections
- Export shared types from `packages/shared` — never duplicate across apps

### Naming
- Files: `kebab-case.ts` / React components: `PascalCase.tsx`
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DB tables/columns: `snake_case` (tables plural)
- API routes: `kebab-case` (`/api/admin/sessions`)
- Package scope: `@commentoo/<name>`

### React / Next.js
- Server Components by default; `"use client"` only when needed
- Shared UI in `packages/ui`, app-specific in `apps/<app>/src/components/`
- shadcn/ui + Tailwind CSS v4 — no other UI/CSS libraries
- State with React hooks — no external state library unless justified

### API (Hono)
- Routes in `apps/api/src/routes/<resource>.ts`
- Validate with Zod schemas at API boundary
- Consistent error shape: `{ error: { code: string; message: string } }`
- All shared schemas defined in `packages/shared`

### Testing
- Vitest for unit/integration tests
- Colocated test files: `foo.ts` → `foo.test.ts`
- Playwright for E2E (critical flows only)

## Design System

Source of truth: the **Commentoo Design System** on claude.ai/design
(`https://api.anthropic.com/v1/design/h/DA_E_Q2aeyEt9O4cW8cZdA`). Tokens are
synced into `packages/ui/src/styles.css` (Tailwind v4 `@theme` + CSS custom
properties). Visual direction: **"Faithful" Sci-Fi** — a flat instrument-panel
aesthetic. See `COMMENTOO_DEVELOPMENT_PLAN.md` → Design System for the full rationale.

### Non-negotiables
- **Never hardcode hex/px** for color, type, spacing, radius, shadow, or motion.
  Always reference tokens (`var(--primary)`, `--space-4`, `--text-base`,
  `--radius`, `--dur-fast`, …). Raw values are a review blocker.
- **Token naming follows shadcn/ui.** `--ai` and `--cheer` (+ their `-subtle`
  tints) are the ONLY additions — do not invent new role tokens.

### Color — 4 roles only
- `--primary` (Spotlight / ink) — buttons, actions, brand. Things you tap.
- `--ai` (Companion / petrol teal) — **reserved exclusively for AI.** Never on
  human-authored UI or comments (Design Principle 4).
- `--cheer` (coral) — reactions, bursts, LIVE pill, comment surge. The one hot lamp.
- Backstage neutrals (sage/khaki ramp) — backgrounds, text, borders.
- Semantics: `--destructive` (brick), `--success` (olive). Coral ≠ destructive.

### Surfaces & theming
- **Participant app** (`apps/user`, mobile PWA): **dark-first** (`.dark`).
- **Admin dashboard** (`apps/admin`, desktop web): **light** (`:root`).
- **Desktop overlay** (`apps/desktop`, Electron): **transparent** — slides are the background.

### Typography
- `--font-sans` leads with embedded **Martian Mono** (Latin/numerals/labels);
  **Noto Sans JP** carries Japanese (Hiragino fallback). Express hierarchy with
  size + weight + color, never by switching fonts.
- 5-step scale: `--text-xs` 12 / `--text-sm` 14 / `--text-base` 16 / `--text-lg`
  20 / `--text-xl` 28. Weights 400/500/600/700. Numeric readouts use `tabular-nums`.

### Spacing, radius, shadow
- Spacing on a **4px base** (`--space-1` … `--space-16`). Tap targets **44px min,
  52px comfortable** (participant app).
- **Sharp corners by default** — `--radius*` are `0`. `--radius-pill` (999px) is
  ONLY for true circles (dots, avatars, the overlay arrow button).
- **Flat design:** no gradients (except the `--hatch` data-fill), no glassmorphism,
  no backdrop-blur. 1px `--border`/`--rule` does most separation; shadows minimal
  (`--shadow-sm`/`-md`) on genuinely floating surfaces only.

### Motion
- Snappy UI feedback 100–200ms (`--dur-fast`/`-base`/`-slow`, `--ease-out`).
- Honor `prefers-reduced-motion` (durations collapse to 0).
- **Freshness rule:** a late animation or stale quip is skipped, never shown delayed.

### Icons & emoji
- **Lucide** (outline, 1.75–2px stroke; 24px default / 20px dense / 18px inline).
  Icons inherit `currentColor`; use `--ai` only on AI-related controls.
- Emoji are functional and limited to the reaction set **👏 🤣 ❓ 💡** and the AI
  badge **🤖**. No other emoji in UI chrome or copy.

### Components & content
- Build UI from the shared library in `packages/ui` (Button, Badge, Input, Switch,
  Card, CommentItem, NicknameChip, AIBadge, ReactionButton, LivePill, PollOption) —
  map every screen to these shadcn-based components.
- Japanese-first copy; warm, brief, MC-like voice. AI comments always carry the
  🤖 badge + `--ai` color.

## Environment Variables

- Local dev: `.env` files (gitignored)
- Provide `.env.example` for required variables
- Never commit secrets or API keys
- Cloudflare secrets via `wrangler secret`

## CI Requirements

All of the following must pass before merge:
1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm build`
4. `pnpm test`

## Security

- Validate all inputs with Zod
- Sanitize user content before rendering (XSS prevention)
- Rate limit API endpoints
- Verify Clerk JWT on admin endpoints
- Verify Stripe webhook signatures
- CORS configured per environment
