# Phase 1 Prep Plan

Repository housekeeping to close the gaps found in the post-Phase-0 inventory
(2026-06-12), so Phase 1 (Real-time Comment Streaming) starts on a clean
foundation. All items below are infrastructure/chore work — no product code.

Branch: `chore/phase1-prep`

---

## Current State (inventory summary)

Phase 0 is complete and healthy:

- Turborepo + pnpm workspaces wired (`dev` / `build` / `lint` / `type-check` / `format` / `test`)
- `apps/user`, `apps/admin`: Next.js Static Export rendering shadcn/ui placeholders
- `apps/api`: Hono with `GET /health` only; permissive CORS (`cors()` with no options)
- `apps/desktop`: plain Electron window (transparency etc. is Phase 4 — as planned)
- `packages/ui`: Button, Card, `cn`
- `packages/db`: `createDb` (Neon HTTP + Drizzle), drizzle-kit `generate`/`migrate` scripts wired, schema empty
- `packages/realtime`: `WSMessage` type definitions only
- `packages/shared`, `packages/ai`: placeholders
- Upstash leftovers removed from `apps/api/.env.example` (Redis was dropped from the design)

## Gaps to Close

| # | Gap | Why it matters |
|---|---|---|
| 1 | Branch is `master`; repo rules and plan say `main` | Tooling, docs, and habits should agree before PRs start |
| 2 | Uncommitted work: `AGENTS.md`, revised `COMMENTOO_DEVELOPMENT_PLAN.md`, `docs/`, `.env.example` fix | Plan revisions must land before Phase 1 references them |
| 3 | `pnpm test` is wired but vitest is not installed anywhere | Phase 1's first pure logic (token signing, rate limiting) needs colocated tests from day one |
| 4 | No CI (`.github/workflows` absent) | Repo rules require PRs to pass CI; Phase 1 work happens in PRs |
| 5 | wrangler 3.x | Durable Objects land in Phase 1; upgrading to 4.x before writing the DO is the cheapest moment |

Deliberately NOT in scope (Phase 1 proper, not prep):

- Aligning `packages/realtime` payload types with Zod schemas in `packages/shared`
  (done when the schemas are created in Phase 1)
- Deploy automation (stays in Phase 8; CI here is checks-only)
- Tightening CORS to per-environment origins (Phase 1, alongside the first real endpoints)

---

## Work Items

### 1. Rename `master` → `main`

> Touches the remote default branch — confirmed with the owner before execution.

- Rename local branch and push: `git branch -m master main && git push -u origin main`
- Update the remote default branch (GitHub settings / `gh api`), then delete remote `master`
- Verify `origin/HEAD` points to `main`

### 2. Commit outstanding changes

Atomic commits on `chore/phase1-prep` (branched from `main` after item 1):

- `docs: revise development plan (architecture + UX review)` — `COMMENTOO_DEVELOPMENT_PLAN.md`
- `docs: add repository rules and design docs` — `AGENTS.md`, `docs/`
- `chore: drop Upstash Redis env vars` — `apps/api/.env.example`

### 3. Add vitest

- Add `vitest` to the root (or per-package) devDependencies
- Shared `vitest.config.ts` base; colocated `*.test.ts` convention per repo rules
- Wire `test` script in each package that has testable source (start with
  `packages/shared`, `packages/db`, `packages/realtime`; others as code appears)
- One smoke test so `pnpm test` exercises the toolchain end to end

### 4. Add minimal CI

- `.github/workflows/ci.yml`: on PR and push to `main`
- Steps: pnpm install (with store cache) → `pnpm lint` → `pnpm type-check` → `pnpm build` → `pnpm test`
- No deploy steps — deploy automation remains Phase 8

### 5. Upgrade wrangler to 4.x

- Bump `wrangler` in `apps/api`, follow the v3→v4 migration notes
- Verify: `pnpm --filter @commentoo/api dev` serves `/health`, `build` (dry-run deploy) passes

---

## Done When

- Default branch is `main`; `master` no longer exists locally or on origin
- Working tree is clean; plan revisions and docs are on `main` via a merged PR
- `pnpm test` runs vitest and passes with at least one real test
- CI runs lint, type-check, build, and test on every PR and blocks merge on failure
- `apps/api` builds and serves locally on wrangler 4
