# Failing Tests Analysis

This document summarizes the root causes and fixes for currently failing checks.

---

## 1. `npm run lint:check` — "Invalid project directory provided, no such directory: .../lint"

### Root cause

- **Next.js 16** no longer registers a `lint` subcommand in the CLI (`node_modules/next/dist/bin/next`).
- The default command is `dev` (`isDefault: true`).
- When you run `next lint`, Commander treats `lint` as the first positional argument to the default command, i.e. **the project directory**.
- So the run is effectively `next dev lint` → `getProjectDir("lint")` → `path.resolve("lint")` → `.../tickered/lint` (does not exist) → error.

### Fix

Use ESLint directly instead of `next lint` for the check script, since the project already uses a flat ESLint config (`eslint.config.mjs`).

- **Option A (recommended):** Point `lint:check` at the same command as `lint` so the same config and rules run:
  - In `package.json`: set `"lint:check": "eslint . --ext .ts,.tsx"` (or use the same command as `lint` if it differs).
- **Option B:** Keep using Next for lint only if/when a future Next version reintroduces a `lint` command and you want to rely on it.

---

## 2. `supabase/functions/__tests__/manual-test-sec.ts` — Jest fails to run

### Root cause

- The file is a **Deno script**: it uses `import ... from 'https://esm.sh/@supabase/supabase-js@2'`, `Deno.args`, `Deno.env.get`, `Deno.exit`.
- Jest runs in **Node** and cannot resolve `https://esm.sh/...` or run Deno APIs.
- So Jest fails with: `Cannot find module 'https://esm.sh/@supabase/supabase-js@2'`.

### Fix

- This is a **manual/integration** script for SEC outstanding shares, not a unit test.
- **Exclude it from Jest** via `testPathIgnorePatterns` in `jest.config.mjs` (e.g. add `supabase/functions/__tests__/manual-test-sec.ts`).
- Run it manually with Deno when needed: `deno run --allow-env --allow-net ... manual-test-sec.ts AAPL`.

---

## 3. `npm run typecheck` — Storybook and react-leaflet type errors

### Root cause

- **Storybook:** `@storybook/nextjs` (and possibly other `@storybook/*` packages) are not installed in the project, or TypeScript is resolving the wrong package, so `Cannot find module '@storybook/nextjs'` (and similar) appear.
- **react-leaflet:** `Cannot find module 'react-leaflet'` — types may be missing (`@types/leaflet` is present; `react-leaflet` types can be from the package itself or `@types/react-leaflet`).

These are **environment/type-resolution** issues, not caused by the compass or leaderboard changes.

### Fix (optional)

- Ensure all Storybook-related deps are installed and that `tsconfig.json` (or `references`) does not pull in Storybook from a path that doesn’t exist.
- For typecheck-only runs, you can **exclude** Storybook and/or the leaflet component from `tsc` (e.g. via `exclude` in `tsconfig.json` or a dedicated `tsconfig.build.json`) so the rest of the app typechecks. Prefer fixing the missing types or install path so the full project typechecks.

---

## Summary

| Check           | Cause                                      | Fix                                                                 |
|----------------|--------------------------------------------|---------------------------------------------------------------------|
| **lint:check** | Next.js 16 has no `lint` command; `lint` used as dev dir | Use ESLint in `lint:check` (e.g. same as `lint`)                    |
| **manual-test-sec.ts** | Deno script run by Jest (Node)             | Add to `testPathIgnorePatterns` in Jest; run with Deno when needed |
| **typecheck**  | Storybook / react-leaflet type resolution  | Fix deps/paths or exclude those paths from `tsc`                    |

Applying the lint:check and Jest fixes in the repo next.
