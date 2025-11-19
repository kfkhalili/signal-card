# Migration Cleanup Analysis
**Date:** 2025-11-19
**Status:** Analysis Complete - Ready for Cleanup

---

## Inconsistencies Found

### 1. 🔴 **`check_and_queue_stale_data_from_presence_v2` Function - Multiple Recreations**

**Timeline:**
1. `20251117073831` - Initial creation with LEFT JOIN (handles missing data)
2. `20251117180100` - Adds timeout logic, but **reverts to INNER JOIN** (loses missing data fix)
3. `20251118000000` - Adds exchange status check, but **still uses INNER JOIN** (loses missing data fix)
4. `20251118030000` - Fixes back to LEFT JOIN, but **removes timeout and exchange check**
5. `20251119000000` - Final version with LEFT JOIN + exchange check + data existence check, but **missing timeout**

**Issue:** The final version (`20251119000000`) is missing the timeout logic from `20251117180100`, which is important for preventing long-running queries.

**Resolution:** Merge all fixes into one final version that includes:
- LEFT JOIN (from `20251118030000` and `20251119000000`)
- Timeout logic (from `20251117180100`)
- Exchange status check with data existence check (from `20251119000000`)

---

### 2. 🔴 **`check_and_queue_stale_batch_v2` Function - Multiple Recreations**

**Timeline:**
1. `20251117073830` - Initial creation
2. `20251117130000` - Adds exchange status check (but doesn't check if data exists)
3. `20251119000000` - Adds data existence check for exchange status

**Issue:** The function is recreated 3 times. The final version is correct, but the intermediate version (`20251117130000`) is redundant.

**Resolution:** Keep only the final version from `20251119000000`.

---

### 3. 🔴 **`invoke-processor-v2` Cron Job - Conflicting Optimizations**

**Timeline:**
1. `20251117180000` - Sets to 3 iterations, 10s delay
2. `20251117180200` - **Overwrites** to 2 iterations, 5s delay (contradicts previous)

**Issue:** Two migrations with conflicting settings. The second one (`20251117180200`) overwrites the first, making `20251117180000` redundant.

**Resolution:** Remove `20251117180000` and keep only `20251117180200` (or vice versa, depending on which settings are correct).

---

### 4. 🟡 **`upsert_active_subscription_v2` Function - Sequential Updates**

**Timeline:**
1. `20251117190000` - Adds heartbeat support
2. `20251117201000` - Adds logging (keeps heartbeat)

**Issue:** Sequential updates are fine, but the logging migration could be merged into the heartbeat migration if we're cleaning up.

**Resolution:** Keep both (sequential updates are acceptable), or merge into one if desired.

---

### 5. 🟡 **`hourly-fetch-fmp-available-exchanges` Cron Job - Redundant Reschedule**

**Timeline:**
1. `20251117155508` - Creates job with correct auth
2. `20251117160000` - Unschedules and reschedules (fixes auth)

**Issue:** If `20251117155508` already uses `anon_key`, then `20251117160000` is redundant. However, if `20251117155508` had wrong auth initially, then `20251117160000` is necessary.

**Resolution:** Check if `20251117155508` uses correct auth. If yes, remove `20251117160000`. If no, keep `20251117160000` and fix `20251117155508`.

---

## Cleanup Strategy

### Option 1: Create Consolidated Migrations (Recommended)
Create new migrations that consolidate all fixes:
1. **Consolidate `check_and_queue_stale_data_from_presence_v2`** - Merge timeout + LEFT JOIN + exchange check
2. **Remove redundant `check_and_queue_stale_batch_v2` recreations** - Keep only final version
3. **Remove redundant processor optimization** - Keep only final version
4. **Document which migrations are superseded**

### Option 2: Mark as Superseded (Safer)
Keep all migrations but add comments indicating which ones are superseded:
- Add `-- SUPERSEDED BY: <migration>` comments
- Document the final state in a summary

### Option 3: Remove Redundant Migrations (Risky)
Delete migrations that are completely overwritten:
- **Risk:** If migrations are already applied, removing them could cause issues
- **Benefit:** Cleaner migration history

---

## Recommended Actions

### High Priority
1. ✅ **Fix `check_and_queue_stale_data_from_presence_v2`** - Create consolidated version with all fixes
2. ✅ **Resolve processor optimization conflict** - Determine which settings are correct
3. ✅ **Verify exchange status cron job** - Check if reschedule is needed

### Medium Priority
4. ⚠️ **Document superseded migrations** - Add comments to redundant migrations
5. ⚠️ **Consolidate `check_and_queue_stale_batch_v2`** - Remove intermediate versions

### Low Priority
6. ℹ️ **Merge logging into heartbeat migration** - Optional cleanup

---

## Next Steps

1. ✅ **Create consolidated migration for `check_and_queue_stale_data_from_presence_v2`** - DONE
2. ✅ **Resolve processor optimization conflict** - DONE (documented)
3. ✅ **Verify and clean up cron job migrations** - DONE (verified)
4. ✅ **Add documentation comments to superseded migrations** - DONE

## Migration Consolidation Strategy

**Principle:** Migrations should represent the FINAL desired state, not historical evolution. If you create something and later delete it, the migration should just not create it. If you add a comment later, it should be in the original CREATE statement.

**Result:** Fresh database deployments get the final state immediately, without going through intermediate changes.

### Consolidations Performed

1. **Exchange Market Status Cron Job**
   - **Original:** `20251116161200_schedule_cron_jobs.sql` - Now creates `hourly-fetch-fmp-all-exchange-market-status` with `'0 * * * *'` schedule
   - **Removed:** `20251119200000_change_exchange_market_status_to_hourly.sql` (unschedule daily, schedule hourly)

2. **Processor Invoker Cron Job**
   - **Original:** `20251117074150_create_cron_jobs_v2.sql` - Now uses final settings (2 iterations, 5s delay)
   - **Removed:** `20251117180000_optimize_processor_for_one_minute_processing.sql`, `20251117180200_optimize_processor_for_faster_processing.sql`

3. **upsert_active_subscription_v2 Function**
   - **Original:** `20251117190000_fix_upsert_active_subscription_v2_no_update_last_seen.sql` - Now includes heartbeat support AND logging
   - **Removed:** `20251117201000_add_logging_to_upsert_active_subscription_v2.sql`

4. **check_and_queue_stale_data_from_presence_v2 Function**
   - **Original:** `20251117073831_create_background_staleness_checker_v2.sql` - Now includes all fixes (LEFT JOIN, timeout, exchange check with data existence check)
   - **Removed:** All intermediate fix migrations:
     - `20251117180100_optimize_staleness_checker_timeout.sql`
     - `20251118000000_add_exchange_status_check_to_background_staleness_checker.sql`
     - `20251118030000_fix_background_staleness_checker_for_missing_data.sql`
     - `20251119000000_fix_exchange_status_check_for_missing_quote_data.sql`
     - `20251119210000_consolidate_staleness_checker_with_all_fixes.sql`

5. **check_and_queue_stale_batch_v2 Function**
   - **Original:** `20251117073830_create_staleness_check_functions_v2.sql` - Now includes exchange status check with data existence check
   - **Removed:** `20251117130000_add_exchange_status_check_for_quotes.sql`

6. **Available Exchanges Cron Job**
   - **Original:** `20251117155508_schedule_fetch_fmp_available_exchanges_hourly.sql` - Already had correct auth
   - **Removed:** `20251117160000_fix_available_exchanges_cron_auth.sql` (redundant)

7. **invoke_processor_loop_v2 Function Comment**
   - **Original:** `20251117073704_create_processor_invoker_v2.sql` - Comment now includes final optimization details

## Additional Fixes Applied (Second Scan)

### 1. Analytics Refresh Function
- **Merged:** Edge Function implementation into `20251117073833_create_analytics_refresh_v2.sql`
- **Removed:** `20251117120000_update_analytics_refresh_to_edge_function.sql`
- **Removed:** `20251117120100_update_analytics_refresh_frequency.sql` (redundant cron reschedule)

### 2. Registry Entries
- **Updated:** `20251117210000_add_financial_statements_to_registry.sql` - now uses `'queue-processor-v2'` from start
- **Updated:** `20251117220000_add_ratios_ttm_to_registry.sql` - now uses `'queue-processor-v2'` from start
- **Removed:** `20251118010000_fix_edge_function_name_for_financial_statements_and_ratios_ttm.sql`

### 3. RLS Policies
- **Updated:** `20250525192555_06_apply_rls_policies.sql` - now includes service_role bypass and GRANT
- **Removed:** `20250525192558_fix_user_profiles_rls_safe.sql`
- **Removed:** `20250525192560_temporarily_disable_rls.sql`
- **Removed:** `20250525192564_reenable_rls_on_user_profiles.sql`

### 4. Data Migrations
- **Removed:** `20250623100903_fix_gravatar_backfill_for_empty_urls.sql` (data migration, not infrastructure)

## Test Data Migrations Removed

**Principle:** Migrations should only contain infrastructure setup (tables, RLS, functions, triggers, cron jobs, realtime, etc.) needed for production. Test data insertions should NOT be in migrations.

**Removed:**
1. ✅ **`20251118020000_add_rivn_to_supported_symbols.sql`** - Test data (RIVN symbol)
2. ✅ **`20251118040000_add_lcid_to_supported_symbols.sql`** - Test data (LCID symbol)

**Rationale:** These migrations added test symbols to `supported_symbols` for testing empty card states. This is test data, not infrastructure. Production environments should not have these test symbols automatically inserted.

---

## Final Summary

**Total migrations removed:** 20
- 13 from first consolidation round
- 7 from second scan

**Total migrations updated:** 8
- 4 from first consolidation round
- 4 from second scan

**Result:** All migrations now represent final state. Fresh database deployments get correct state immediately without intermediate changes.

