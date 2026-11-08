# CLAUDE.md

Agent policy for this repository. It is self-contained: a fresh session needs nothing else to start work. Detail lives in the docs it links; when this file and a doc disagree, this file wins and the doc gets fixed. `.cursorrules` and `.cursor/rules/` are older Cursor-only rules and are not read here.

## Behavioral principles

Adapted from [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills). They bias toward caution over speed; for trivial tasks, use judgment.

1. **Think before coding.** State assumptions. If there are several readings, present them; don't pick silently. If something is unclear, stop and name it.
2. **Simplicity first.** Minimum code that solves the problem. No features, abstractions, configurability or error handling nobody asked for. If 200 lines could be 50, rewrite it.
3. **Surgical changes.** Touch only what the request needs. Match existing style. Remove only the orphans your change created; mention other dead code, don't delete it.
4. **Goal-driven execution.** Turn the task into a check: "fix the bug" → a test that reproduces it, then make it pass. For multi-step work, state each step with how it will be verified.

## Project

Tickered: stock research through interactive financial cards and **Compass**, a ranking of stocks by weighted pillars. Next.js 15 (App Router) + Tailwind/shadcn on Vercel; Supabase (Postgres, auth, Realtime, Deno edge functions); market data from FinancialModelingPrep (FMP).

- `src/app/` routes · `src/components/game/cards/` one folder per card type · `src/hooks/`, `src/stores/` client state · `src/lib/` shared modules (`src/lib/supabase/` clients and realtime)
- `supabase/functions/` edge functions: `queue-processor-v2` (runs queue jobs), `lib/` (one fetcher per data type), `_shared/`, `__tests__/` (Deno)
- `supabase/migrations/` schema, functions, cron · `tests/contracts/` SQL contract tests · `e2e/` Playwright · `eslint-rules/` contract lint rules

**Domain words.** A **data type** is one kind of FMP data (`quote`, `profile`, `financial-statements`, …), registered as a row of `data_type_registry_v2`. A **queue job** fetches one data type for one symbol. A row is **stale** when the registry's rules say it must be fetched again; **freshness** is when it was last fetched, including a fetch that legitimately found no data. A **card type** is one kind of card on a workspace. A **pillar** is one ranked dimension of Compass.

## Commands

- `npm ci` — first, in every new worktree (worktrees don't share `node_modules`).
- `npm run dev` — port 3000.
- `npm run typecheck` · `npm run lint` · `npm test` (Jest) · `npm run test:e2e` (Playwright) · `npm run build`
- `npm run test:contracts` — SQL contract tests against the local Supabase stack (`supabase start` first; Docker must be running).
- `npm run knip` — unused files, exports and dependencies.
- `npm run test:deno` — edge-function tests that call `Deno.test` (Deno via `npx`). Jest skips exactly these files, so `supabase/functions/__tests__/` holds both kinds: a test that calls `Deno.test` runs under Deno, any other under Jest.
- Before calling work done: `typecheck`, `lint` and `npm test` pass; `test:deno` too when `supabase/functions/` changed; `test:contracts` when a migration changed; `test:e2e` when something on screen changed. Say plainly which checks you did not run.

## Where decisions live

- **The Sacred Contracts** (`docs/architecture/MASTER-ARCHITECTURE.md`, "Maintainer's Governance & Sacred Contracts", #1–#21) are non-negotiable. Read the contract before touching the queue, staleness, quota, cron or processor code it names. Three are lint-enforced (`eslint-rules/`), the database ones by `tests/contracts/`.
- **New decisions go in `docs/adr/NNNN-title.md`** (create the folder with the first one). An ADR states the *current* decision as fact, its reason, and when to reopen it. Fold corrections in place: no "Amendment" or "Update" sections; git holds the history. Cite `ADR-NNNN`. A decision a future session might re-litigate belongs in an ADR, not a comment or a chat.
- **Docs describe current behaviour**, never a roadmap, and are updated in the same change as the code they describe.

## Hard rules

### TypeScript

- **No `any`.** `unknown` only at input boundaries (`fetch`, `JSON.parse`, `localStorage`, `catch`), narrowed in the same module — with a Zod schema for anything from FMP or the network (Contract #5).
- **No `as unknown as T`.** Use a typed factory, a schema or a test helper that builds a real value.
- **No `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`.** Fix the cause. If a rule is genuinely wrong for a scope, change it in `eslint.config.mjs` with a comment saying why.
- **Expected failures are values, not throws:** return a neverthrow `Result` (or a typed outcome). Throw only for programmer errors.

### Ownership: one place per concern

- **A concern has one owner module; callers ask it, they don't redo it.** Before writing logic, search for the module that owns it. If two places already do the same thing, don't add a third: extend one and say so.
- **Pages, hooks and stores are wiring.** Calculations, ranking display rules and data shaping live in plain TypeScript modules that import no React and no Supabase, and are tested directly. Don't put domain logic in JSX, an IIFE in a component, or a `useEffect`.
- **Behaviour comes from tables, not from testing names.** Don't branch on `card.type === "…"` or `data_type === "…"` outside the module that owns that table; add a field to the table instead. Prefer `Record<CardType, …>` (or keyed by data type) so a new key fails to compile until every table has its row.
- **A data type's name is defined once per side and checked across the seam.** The registry (`data_type_registry_v2`) owns table names and per-type rules; TypeScript reads the same names from one typed list. When both sides must agree, a test reads the committed migrations and fails on drift. Don't add another hand-written `CASE`/`switch` over data type names.
- **Database access goes through the module that owns that read.** Don't add a new `supabase.from("table")` to a component, card or page when a hook or lib module already reads that table.
- **Dependency direction:** `src/` never imports `supabase/functions/`, and edge functions never import `src/`. Pure domain modules import neither React nor Supabase.

### Tests

- **Tests import the real code.** Never re-implement the logic under test inside the test ("simulate the calculation from the component"). If the logic can't be imported, move it to a module that can.
- **Test through the module's interface**, asserting outcomes, not internal calls. A test that must change when the implementation changes is testing past the interface.
- **A bug fix starts with a failing test** that reproduces it.
- **A test leaves nothing behind:** restore stubbed globals (`globalThis.fetch`, env vars), timers and mocks in `afterEach` or `finally`.

### Supabase and migrations

- **Every schema, function, policy, cron or index change is a migration** in `supabase/migrations/YYYYMMDDHHMMSS_snake_case.sql`, timestamped with `date -u +%Y%m%d%H%M%S` and later than the newest file there. Data fixes and test data are not migrations.
- **A migration that has reached any shared database is immutable.** Fix it with a new migration. Amend a migration in place only while it exists on your branch alone.
- **Develop and test against the local stack** (`supabase start`). Never run `supabase db push`, `supabase db reset --linked` or other `--linked` writes from a session. Production changes go through the owner.
- **Functions** set `search_path`; `SECURITY DEFINER` only where a Sacred Contract or ADR says so (Contract #18), and never without RLS reasoning in the migration's comment.

### Paths and secrets

- **No absolute or machine-specific paths** (`/home/…`, `/Users/…`) in committed files. Reference files relative to the consuming file.
- **No secrets in code, tests, logs or docs.** Read keys from env at call time, not at import time, so tests can supply them.

## Known debt: don't copy these patterns

These exist today and are being worked down. Don't extend them, and don't use them as templates:

- `supabase/functions/lib/fetch-fmp-*.ts` each re-implement the same HTTP, timeout, byte counting, upsert and error handling, and `supabase/functions/lib/README.md` documents that copy-paste template. Only some record freshness or report real bytes on failure. When touching one, don't add a new copy.
- `supabase/functions/fetch-fmp-*/index.ts` (the per-type edge functions) are an older second copy of fetch logic whose crons were removed. Don't edit them to match changes in `lib/`; raise their deletion instead.
- `queue-processor-v2/index.ts` dispatches with a hand-written `switch` and redeclares `QueueJob` (the type lives in `lib/types.ts`).
- Card types register through four side-effect import lists (`initializers.ts`, `rehydrators.ts`, `updateHandlerInitializer.ts`, `rendererRegistryInitializer.tsx`), and `useWorkspaceManager.ts` branches on card names.
- `src/app/symbol/[ticker]/page.tsx` and `src/app/compass/page.tsx` hold domain logic inline, and some tests in `src/app/symbol/__tests__/` re-implement it.

## Git

- Work on a branch; `main` changes only through a PR. Commit messages: `type(scope): summary` (feat, fix, refactor, test, docs, chore).
- **Before every commit, review the full diff.** Split commits by intent (behaviour, tests, docs, refactor) and don't mix unrelated edits.
- Branch names never appear in commit or merge subjects.
- **No AI attribution:** no `Co-Authored-By: Claude …` trailer in commits and no `🤖 Generated with [Claude Code]` line in PRs.
- **Never bypass the git hooks** (`--no-verify`, `HUSKY=0`), not even for a docs-only commit. If a hook can't run (missing `node_modules`, Docker down), fix that and run it.
- **A follow-up found mid-work that is real work becomes a GitHub issue**, not a memory note or a sentence in a reply. A small one with nothing to decide is fixed where found and mentioned in a line.
