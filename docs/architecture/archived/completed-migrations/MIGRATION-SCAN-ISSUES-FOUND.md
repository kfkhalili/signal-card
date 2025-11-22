# Migration Scan - Issues Found

**Date:** 2025-11-19
**Status:** ✅ Fixed

---

## Issue Found

### Problem: Non-Idempotent Cron Job Scheduling

**File:** `supabase/migrations/20251117074150_create_cron_jobs_v2.sql`

**Issue:** The migration used `SELECT cron.schedule(...)` directly without checking if jobs already exist. This is NOT idempotent and could create duplicate cron jobs if the migration is run multiple times.

**Impact:**
- Running the migration multiple times would create duplicate cron jobs
- Could cause jobs to run multiple times per schedule
- Inconsistent with other cron job migrations which use `IF NOT EXISTS` checks

**Fix Applied:**
- Changed all `SELECT cron.schedule(...)` calls to use `DO $$ BEGIN IF NOT EXISTS ...` pattern
- Now matches the idempotent pattern used in:
  - `20251116161200_schedule_cron_jobs.sql`
  - `20251117155508_schedule_fetch_fmp_available_exchanges_hourly.sql`
  - `20251109101340_update_quote_indicators_schedule.sql`

**Jobs Fixed:**
1. `check-stale-data-v2`
2. `queue-scheduled-refreshes-v2`
3. `invoke-processor-v2`
4. `maintain-queue-partitions-v2`
5. `refresh-analytics-v2`

---

## Verification

✅ **No duplicate cron jobs found in database** (verified via SQL query)
✅ **All cron job migrations now use idempotent pattern**
✅ **Migration can be safely re-run without creating duplicates**

---

## Other Checks Performed

✅ **No duplicate function definitions** - Each function created once
✅ **No test data insertions** - All migrations are infrastructure-only
✅ **No data backfill migrations** - All migrations represent final state
✅ **No inconsistent vault secret names** - All use `project_url` or `latest_project_url` consistently
✅ **All table creations include RLS, grants, and realtime** - Properly consolidated

---

## Migration Count

**Total Migrations:** 55 (excluding test files)

**Status:** ✅ All migrations are clean and represent final state

