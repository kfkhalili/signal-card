# When Contract Tests Run

## Current State (Automated + Manual)

### ✅ Available Now

**Manual Execution:**
```bash
npm run test:contracts
```

**When to run manually:**
- During local development (before committing)
- After modifying any function referenced in contracts
- When debugging contract violations

**Automated Execution:**
- ✅ **CI/CD runs automatically** on every PR
- ✅ **PR blocking** if any test fails
- ✅ **Visible status** in GitHub PR checks
- ✅ **Cannot merge** violating code

## CI/CD Integration (Implemented)

### ✅ Step 3: CI/CD Integration (Complete)

**GitHub Actions Workflow** (`.github/workflows/database-contracts.yml`):

```yaml
# .github/workflows/database-contracts.yml
name: Database Contract Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start local Supabase
        run: supabase start
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Install pgTAP
        run: |
          DATABASE_URL=$(supabase status --output json | jq -r '.DB_URL')
          psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;"

      - name: Run contract tests
        run: npm run test:contracts
        env:
          DATABASE_URL: $(supabase status --output json | jq -r '.DB_URL')

      - name: Stop Supabase
        if: always()
        run: supabase stop
```

**What this enforces:**
- ✅ **Automatic execution** on every PR to `main` or `develop`
- ✅ **PR blocking** if any test fails (GitHub prevents merge)
- ✅ **Visible status** in GitHub PR checks (green checkmark or red X)
- ✅ **Cannot merge** violating code (enforced by GitHub)

### Optional: Pre-Commit Hook

**Add to `.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
set -e

# Run contract tests before commit
npm run test:contracts
```

**Benefits:**
- ✅ Fast feedback before commit
- ✅ Catches violations early
- ✅ Reduces failed PRs

**Drawbacks:**
- ⚠️ Slower commits (adds ~5-10 seconds)
- ⚠️ Requires local Supabase running
- ⚠️ Can be bypassed with `--no-verify`

**Recommendation:** Skip pre-commit hook, rely on CI/CD for enforcement.

## Test Execution Timeline

### Current Flow (Manual)

```
Developer modifies function
    ↓
Developer remembers to run tests (optional)
    ↓
npm run test:contracts
    ↓
┌─────────────┬─────────────┐
│   PASS      │    FAIL     │
│             │             │
│  ✅ All     │  ❌ Contract│
│  contracts  │  violated   │
│  enforced   │             │
└──────┬──────┴──────┬───────┘
       │            │
       │            │
       ▼            ▼
Developer can    Developer can
commit anyway    commit anyway
(no enforcement) (no enforcement)
```

### Future Flow (CI/CD)

```
Developer modifies function
    ↓
Developer creates PR
    ↓
GitHub Actions triggers
    ↓
CI/CD runs contract tests
    ↓
┌─────────────┬─────────────┐
│   PASS      │    FAIL     │
│             │             │
│  ✅ All     │  ❌ Contract│
│  contracts  │  violated   │
│  enforced   │             │
└──────┬──────┴──────┬───────┘
       │            │
       │            │
       ▼            ▼
PR can merge      PR BLOCKED
✅ Green check    ❌ Red X
                  Cannot merge
                  until fixed
```

## When Tests Should Run

### ✅ Required Scenarios

1. **Before PR Merge** (CI/CD)
   - Every PR that touches database functions
   - Every PR that modifies contract-related code
   - Automatic blocking if tests fail

2. **During Development** (Manual)
   - After modifying any function in contracts
   - Before committing function changes
   - When debugging contract violations

3. **After Schema Changes** (Manual)
   - After applying migrations that modify functions
   - After refactoring database functions
   - When adding new Sacred Contracts

### ❌ Not Required (But Helpful)

1. **Pre-Commit Hook** (Optional)
   - Fast feedback before commit
   - Can be bypassed with `--no-verify`
   - Not a replacement for CI/CD

2. **Local Development** (Optional)
   - Run manually when needed
   - Not enforced, but recommended

## Implementation Status

### ✅ CI/CD Workflow

**Status:** ✅ Implemented

**Location:** `.github/workflows/database-contracts.yml`

**Features:**
- ✅ Runs on every PR to `main` or `develop`
- ✅ Automatically starts local Supabase instance
- ✅ Installs pgTAP extension
- ✅ Runs all contract tests
- ✅ Blocks PR merge if tests fail
- ✅ Cleans up Supabase instance after tests

### Missing: Pre-Commit Hook

**Status:** ❌ Not implemented (intentionally)

**Impact:**
- No fast feedback before commit
- Developers must remember to run tests

**Action Required:**
- Optional: Add to `.husky/pre-commit`
- Not critical if CI/CD is in place

## Summary

### Current State

| Execution Point | Status | Enforcement |
|----------------|--------|--------------|
| Manual (`npm run test:contracts`) | ✅ Available | ✅ Developer responsibility |
| Pre-commit hook | ❌ Not implemented | ⚠️ Optional (can be bypassed) |
| CI/CD on PR | ✅ **Implemented** | ✅ **Blocks PR merge** |

### Implementation Complete

| Execution Point | Status | Enforcement |
|----------------|--------|--------------|
| Manual (`npm run test:contracts`) | ✅ Available | ✅ Developer responsibility |
| Pre-commit hook | ❌ Not implemented | ⚠️ Optional (can be bypassed) |
| CI/CD on PR | ✅ **Implemented** | ✅ **Blocks PR merge** |

**Status:** ✅ Step 3 (CI/CD Integration) complete. Contract tests now run automatically on every PR and block merges if violations are detected.

