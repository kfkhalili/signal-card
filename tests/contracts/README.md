# Contract Tests (Sacred Contracts Enforcement)

This directory contains automated tests that enforce the **Sacred Contracts** defined in `docs/architecture/MASTER-ARCHITECTURE.md` Section 9.

## Purpose

The Sacred Contracts are the system's greatest defense against catastrophic bugs. These tests ensure that contracts are **enforced automatically** rather than relying on an "honor system" that can be ignored under pressure.

## Test Target: Local vs Production

**Default: Local Supabase Database** ✅

Contract tests should **primarily run against your local Supabase database** because:

1. **Safety** - No risk to production data or systems
2. **Speed** - Faster iteration during development
3. **Pre-deployment validation** - Catch contract violations before deploying
4. **Read-only** - Tests check function definitions/structure, not data

**Production Testing (Optional):**

You can run tests against production for verification, but:
- ⚠️ **Be explicit** - Set `DATABASE_URL` to production connection string
- ⚠️ **Tests are read-only** - They only check function definitions, but still exercise the database
- ⚠️ **Use with caution** - Prefer local testing for development

**Best Practice:**
- ✅ Run tests locally during development
- ✅ Run tests in CI/CD against a test/staging database
- ✅ Optionally verify against production after deployment (with explicit DATABASE_URL)

## Prerequisites

### 1. Install pgTAP Extension

**For Local Development:**
```sql
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
```

**Note:** We use the `extensions` schema for consistency with other non-system extensions in the project (pg_net, moddatetime, pgcrypto, etc.).

**For Supabase Production:**
- pgTAP may require superuser privileges
- Contact Supabase support to enable the extension
- Or use a local PostgreSQL instance for testing

### 2. Verify Installation

```sql
SELECT * FROM pg_available_extensions WHERE name = 'pgtap';
```

If pgTAP is not available, tests will fail with a clear error message.

## Running Tests

### Prerequisites

1. **Set DATABASE_URL** (or let the script auto-detect from Supabase CLI):
   ```bash
   # Option 1: Auto-detect from Supabase (if running locally)
   # The script will try to get it automatically

   # Option 2: Set manually
   export DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'

   # Option 3: Get from Supabase CLI
   export DATABASE_URL=$(supabase status | grep -i 'database url' | awk '{print $NF}')
   ```

   See `DATABASE_URL_SETUP.md` for detailed instructions.

2. **Install pgTAP extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
   ```

### Run All Contract Tests

```bash
npm run test:contracts
```

The script will automatically try to detect `DATABASE_URL` from Supabase CLI if not set.

Or directly:
```bash
cd tests/contracts
psql $DATABASE_URL -f run_all_contracts.sql
```

### Run Individual Contract Tests

```bash
psql $DATABASE_URL -f tests/contracts/test_contract_1_atomic_batch_claiming.sql
```

## Test Structure

Each contract test file follows this pattern:

```sql
BEGIN;
SELECT plan(1); -- Number of tests

-- Test implementation
SELECT ok(
  -- Test condition
  EXISTS (...),
  'Contract #X: Description'
);

SELECT * FROM finish();
ROLLBACK;
```

## Contract Coverage

### SQL Contracts (Database Unit Tests)

- ✅ **Contract #1:** Atomic batch claiming (`get_queue_batch_v2`)
- ✅ **Contract #2:** `SKIP LOCKED` in recovery (`recover_stuck_jobs_v2`)
- ✅ **Contract #3:** Advisory locks on cron jobs
- ✅ **Contract #4:** Exception blocks in `check_and_queue_stale_batch_v2`
- ✅ **Contract #8:** Scheduled job priority = -1 (`queue_scheduled_refreshes_v2`)
- ✅ **Contract #9:** TABLESAMPLE in `queue_scheduled_refreshes_v2`
- ✅ **Contract #11:** Table partitioning (`api_call_queue_v2`)
- ✅ **Contract #12:** Symbol-by-symbol query pattern (`check_and_queue_stale_data_from_presence_v2`)
- ✅ **Contract #13:** No TTL defaults (`is_data_stale_v2`, `is_profile_stale_v2`)
- ✅ **Contract #15:** Circuit breaker sensitivity (`invoke_processor_loop_v2`)
- ✅ **Contract #16:** Polite partition maintenance (`maintain_queue_partitions_v2`)
- ✅ **Contract #17:** Deadlock-aware error handling (processor)
- ✅ **Contract #18:** `SECURITY DEFINER` on `check_and_queue_stale_batch_v2`

### TypeScript Contracts (ESLint Rules)

These are enforced via custom ESLint rules (see `eslint-rules/` directory):

- **Contract #5:** Strict Zod schema parsing
- **Contract #6a:** Content-Length quota tracking
- **Contract #14:** Source timestamp checking
- **Contract #19:** Monofunction processor architecture
- **Contract #21:** Aggressive internal timeouts
- **Contract #22:** Schema migration atomicity

## CI/CD Integration

✅ **These tests run automatically in CI/CD before any PR merge.**

See `.github/workflows/database-contracts.yml` for the GitHub Actions workflow.

**Status:**
- ✅ Workflow configured
- ✅ Runs on every PR to `main` or `develop`
- ✅ Blocks PR merge if any test fails
- ✅ Visible in GitHub PR checks

## Adding New Contract Tests

When adding a new Sacred Contract:

1. Add the contract to `docs/architecture/MASTER-ARCHITECTURE.md` Section 9
2. **IMMEDIATELY** write a test that enforces it
3. Add the test to this directory
4. Update `run_all_contracts.sql` to include the new test
5. Document the test in this README

## Test Maintenance

**When modifying a function:**
1. Run all contract tests
2. If a test fails, **DO NOT** modify the test to pass
3. **FIX** the function to maintain the contract
4. If the contract is obsolete, remove both the contract AND the test

**This moves contracts from "documentation" to "executable code."**

