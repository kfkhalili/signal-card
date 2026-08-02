# Contract Tests (Sacred Contracts Enforcement)

This directory contains automated tests that enforce the **Sacred Contracts** defined in `docs/architecture/MASTER-ARCHITECTURE.md` Section 9.

## Purpose

The Sacred Contracts are the system's greatest defense against catastrophic bugs. These tests ensure that contracts are **enforced automatically** rather than relying on an "honor system" that can be ignored under pressure.

## Test Target

Contract tests run only against the local Supabase database. They execute inside
transactions and roll back their fixtures. Production is not a supported target
for this command.

## Running Tests

### Prerequisites

1. Node.js 20 or newer
2. Docker Desktop
3. `npm ci`
4. `npx supabase start`

The migration chain installs pgTAP automatically. No host `psql`, `jq`, or
`DATABASE_URL` is required.

### Run All Contract Tests

```bash
npm run test:contracts
```

### Run Individual Contract Tests

```bash
npx supabase test db --local \
  tests/contracts/test_contract_1_atomic_batch_claiming.sql
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
- ✅ **Contract #23:** Compass quality shadow audit remains read-only and service-only
- ✅ **Contract #24:** Compass Growth v2 remains PEG-free, read-only, and service-only

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
4. Document the test in this README

## Test Maintenance

**When modifying a function:**
1. Run all contract tests
2. If a test fails, **DO NOT** modify the test to pass
3. **FIX** the function to maintain the contract
4. If the contract is obsolete, remove both the contract AND the test

**This moves contracts from "documentation" to "executable code."**
