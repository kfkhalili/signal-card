# How Contract Enforcement Works

## Overview

Contract enforcement transforms **documentation** (which can be ignored) into **executable code** (which cannot be ignored). The tests automatically verify that Sacred Contracts are maintained, catching violations before they reach production.

## The Enforcement Mechanism

### 1. **Static Analysis of Function Definitions**

The tests use PostgreSQL's `pg_get_functiondef()` to inspect the **actual source code** of functions at runtime. They don't just check if functions exist—they verify the **structure and patterns** within the code.

**Example: Contract #2 (SKIP LOCKED)**

```sql
-- Test checks if function definition contains the required pattern
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.proname = 'recover_stuck_jobs_v2'
      AND pg_get_functiondef(p.oid) LIKE '%FOR UPDATE SKIP LOCKED%'
  ),
  'Contract #2: recover_stuck_jobs_v2 uses FOR UPDATE SKIP LOCKED'
);
```

**What this catches:**
- ✅ If someone removes `SKIP LOCKED` → Test fails
- ✅ If someone changes it to `FOR UPDATE` → Test fails
- ✅ If someone removes the lock entirely → Test fails

### 2. **Pattern Matching on Source Code**

Tests use regex patterns to verify specific code structures:

**Example: Contract #1 (Atomic Batch Claiming)**

```sql
-- Verifies the function contains BOTH patterns:
-- 1. FOR UPDATE SKIP LOCKED
-- 2. Atomic UPDATE with WHERE id IN SELECT
AND pg_get_functiondef(p.oid) ~* 'UPDATE.*api_call_queue.*SET.*status.*=.*[''"]processing[''"]'
AND pg_get_functiondef(p.oid) ~* 'WHERE.*id.*IN.*SELECT'
```

**What this catches:**
- ✅ If someone separates SELECT and UPDATE → Test fails (missing atomic pattern)
- ✅ If someone removes the UPDATE → Test fails
- ✅ If someone changes the WHERE clause → Test fails

### 3. **Metadata Inspection**

Tests check PostgreSQL system catalogs for function properties:

**Example: Contract #18 (SECURITY DEFINER)**

```sql
-- Checks the function's security property directly
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.proname = 'check_and_queue_stale_batch_v2'
      AND p.prosecdef = true  -- SECURITY DEFINER flag
  ),
  'Contract #18: check_and_queue_stale_batch_v2 uses SECURITY DEFINER'
);
```

**What this catches:**
- ✅ If someone removes `SECURITY DEFINER` → Test fails
- ✅ If someone changes function security → Test fails

### 4. **Parameter Validation**

Tests verify function signatures don't have forbidden defaults:

**Example: Contract #13 (No TTL Defaults)**

```sql
-- Checks function definition for DEFAULT clauses
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.proname = 'is_data_stale_v2'
      AND (
        pg_get_functiondef(p.oid) ~* 'p_ttl_minutes.*DEFAULT'
        OR pg_get_functiondef(p.oid) ~* 'DEFAULT.*p_ttl_minutes'
      )
  ),
  'Contract #13: is_data_stale_v2 has no default value for p_ttl_minutes'
);
```

**What this catches:**
- ✅ If someone adds `DEFAULT 5` to TTL parameter → Test fails
- ✅ If someone adds any default value → Test fails

## When Enforcement Happens

### Current State: Manual Execution

```bash
npm run test:contracts
```

Tests run manually during development. If any test fails:
- ❌ Script exits with error code 1
- ❌ Clear error messages show which contract was violated
- ❌ Developer must fix the function (not the test)

### Future State: CI/CD Integration (Required)

**GitHub Actions Workflow** (to be created):

```yaml
# .github/workflows/database-contracts.yml
name: Database Contract Tests

on: [pull_request]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Supabase
        uses: supabase/setup-cli@v1
      - name: Start local Supabase
        run: supabase start
      - name: Install pgTAP
        run: psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;"
      - name: Run contract tests
        run: npm run test:contracts
        env:
          DATABASE_URL: $(supabase status | grep 'DB URL' | awk '{print $NF}')
```

**What this enforces:**
- ✅ **PR cannot be merged** if any contract test fails
- ✅ **All team members** see the failure in PR status
- ✅ **Automatic blocking** prevents violations from reaching production

## How It Prevents Violations

### Scenario 1: Developer Removes SKIP LOCKED

**What happens:**
1. Developer modifies `recover_stuck_jobs_v2` and removes `SKIP LOCKED`
2. Developer runs `npm run test:contracts` (or CI/CD runs it)
3. **Contract #2 test fails** with clear error message
4. Developer **cannot merge PR** until fix is applied
5. Developer restores `SKIP LOCKED` to pass test

**Result:** Deadlock bug prevented before production

### Scenario 2: Developer Adds TTL Default

**What happens:**
1. Developer adds `DEFAULT 5` to `is_data_stale_v2` parameter
2. CI/CD runs contract tests on PR
3. **Contract #13 test fails** immediately
4. PR is blocked from merging
5. Developer removes default to pass test

**Result:** Split-brain TTL bug prevented

### Scenario 3: Developer Removes Advisory Lock

**What happens:**
1. Developer "optimizes" `queue_scheduled_refreshes_v2` and removes advisory lock
2. Contract test runs
3. **Contract #3 test fails** (advisory lock 43 missing)
4. PR cannot merge
5. Developer restores lock

**Result:** Cron pile-up bug prevented

## Why This Is Better Than Documentation

### Documentation (Honor System) ❌

```
Developer reads: "Must use SKIP LOCKED"
Developer thinks: "I know better, I'll remove it for performance"
Developer commits: Removes SKIP LOCKED
Result: Deadlocks in production
```

### Automated Tests (Enforcement) ✅

```
Developer removes: SKIP LOCKED
CI/CD runs tests: Contract #2 fails
PR status: ❌ Blocked
Developer: Must restore SKIP LOCKED to merge
Result: Deadlock prevented
```

## Test Execution Flow

```
┌─────────────────────────────────────┐
│  Developer modifies function       │
│  (e.g., removes SKIP LOCKED)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PR created / Tests run             │
│  (manual or CI/CD)                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  pgTAP tests execute                │
│  - Query pg_get_functiondef()       │
│  - Check for required patterns      │
│  - Verify function properties       │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────┐    ┌──────────────┐
│  PASS    │    │  FAIL        │
│          │    │              │
│  ✅ All  │    │  ❌ Contract │
│  contracts│    │  violated    │
│  enforced│    │              │
└────┬─────┘    └──────┬───────┘
     │                 │
     │                 │
     ▼                 ▼
┌──────────┐    ┌──────────────┐
│  PR can  │    │  PR BLOCKED  │
│  merge   │    │              │
│          │    │  Developer   │
│  ✅      │    │  must fix    │
│          │    │  function    │
└──────────┘    └──────────────┘
```

## Key Principles

### 1. **Tests Are Immutable**

**Rule:** If a test fails, **DO NOT** modify the test to pass.

**Why:** The test is the contract. If the test is wrong, the contract is wrong. Fix the contract (and test) together, or fix the function.

### 2. **Fail Fast, Fail Clear**

Tests provide **specific error messages**:
```
not ok 2 - Contract #2: recover_stuck_jobs_v2 uses FOR UPDATE SKIP LOCKED
# Failed test 2: "Contract #2: recover_stuck_jobs_v2 uses FOR UPDATE SKIP LOCKED"
```

Developer immediately knows:
- Which contract was violated
- Which function has the problem
- What pattern is missing

### 3. **Read-Only Verification**

Tests **never modify** the database. They only:
- ✅ Read function definitions
- ✅ Check system catalogs
- ✅ Verify patterns in source code

This makes tests safe to run against any database (local, staging, production).

## Integration Points

### Pre-Commit Hook (Optional)

Add to `.husky/pre-commit`:
```bash
npm run test:contracts
```

**Benefit:** Catches violations before commit (fast feedback)

### CI/CD Pipeline (Required)

**GitHub Actions** runs on every PR:
- ✅ Blocks merge if tests fail
- ✅ Visible to all reviewers
- ✅ Prevents violations from reaching main branch

### Local Development

Developers run tests manually:
```bash
npm run test:contracts
```

**Benefit:** Immediate feedback during development

## What Gets Enforced

### ✅ Currently Enforced (8 SQL Contracts)

1. **Atomic Batch Claiming** - Prevents race conditions
2. **SKIP LOCKED** - Prevents deadlocks
3. **Advisory Locks** - Prevents cron pile-ups
4. **Scheduled Job Priority** - Prevents priority inversion
5. **No TTL Defaults** - Prevents split-brain bugs
6. **Circuit Breaker Sensitivity** - Prevents retry thundering herd
7. **Polite Partition Maintenance** - Prevents stop-the-world deadlocks
8. **SECURITY DEFINER** - Prevents RLS permission failures

### 🔜 To Be Enforced (TypeScript Contracts)

- Contract #5: Strict Zod schema parsing (ESLint rules)
- Contract #6a: Content-Length quota tracking (ESLint rules)
- Contract #14: Source timestamp checking (ESLint rules)
- Contract #19: Monofunction processor (ESLint rules)
- Contract #21: Aggressive internal timeouts (ESLint rules)
- Contract #22: Schema migration atomicity (CI/CD validation)

## Summary

**Contract enforcement works by:**

1. **Inspecting actual code** - Uses `pg_get_functiondef()` to read function source
2. **Pattern matching** - Verifies required code patterns exist
3. **Metadata checking** - Validates function properties (SECURITY DEFINER, etc.)
4. **Automated execution** - Runs in CI/CD to block violating PRs
5. **Clear failures** - Provides specific error messages for quick fixes

**Result:** Sacred Contracts become **executable code**, not just documentation. Violations are caught automatically before they reach production.

