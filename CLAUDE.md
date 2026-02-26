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
