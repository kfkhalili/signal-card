# Migration Scan Results
**Date:** 2025-11-19
**Purpose:** Identify remaining migrations that violate "final state" principle

---

## Issues Found

### 1. 🔴 **Redundant Cron Job Reschedule**

**File:** `20251117120100_update_analytics_refresh_frequency.sql`
- **Issue:** Unschedule and reschedule `refresh-analytics-v2` to run every minute
- **Problem:** `20251117074150_create_cron_jobs_v2.sql` already schedules it with `'* * * * *'` (every minute)
- **Action:** Delete `20251117120100` - it's redundant

---

### 2. 🔴 **Function Modified After Creation**

**File:** `20251117120000_update_analytics_refresh_to_edge_function.sql`
- **Issue:** Modifies `refresh_analytics_from_presence_v2()` created in `20251117073833_create_analytics_refresh_v2.sql`
- **Problem:** Original has placeholder, this updates it to call Edge Function
- **Action:** Merge Edge Function call into `20251117073833` and delete `20251117120000`

---

### 3. 🔴 **RLS Disable/Re-enable Pattern**

**Files:**
- `20250525192560_temporarily_disable_rls.sql` - Disables RLS
- `20250525192564_reenable_rls_on_user_profiles.sql` - Re-enables RLS

**Issue:** RLS is disabled then re-enabled. Final state should have RLS enabled.
**Problem:** This is historical debugging that shouldn't be in migrations.
**Action:**
- Check if original creation (`20250525192551_02_create_user_profiles_and_auth_triggers.sql`) has RLS enabled
- If not, enable it in the original
- Delete both disable/re-enable migrations

---

### 4. 🔴 **Registry Entry Created with Wrong Value, Then Fixed**

**Files:**
- `20251117210000_add_financial_statements_to_registry.sql` - Creates entry with `edge_function_name = 'fetch-fmp-financial-statements'`
- `20251117220000_add_ratios_ttm_to_registry.sql` - Creates entry with `edge_function_name = 'fetch-fmp-ratios-ttm'`
- `20251118010000_fix_edge_function_name_for_financial_statements_and_ratios_ttm.sql` - Updates both to `'queue-processor-v2'`

**Issue:** Entries created with wrong value, then corrected later.
**Problem:** Should be created with correct value from the start.
**Action:**
- Update `20251117210000` to use `'queue-processor-v2'` instead of `'fetch-fmp-financial-statements'`
- Update `20251117220000` to use `'queue-processor-v2'` instead of `'fetch-fmp-ratios-ttm'`
- Delete `20251118010000`

---

### 5. 🟡 **Data Backfill Migration**

**File:** `20250623100903_fix_gravatar_backfill_for_empty_urls.sql`
- **Issue:** Updates existing user data (backfill)
- **Problem:** This is data migration, not infrastructure
- **Action:** Remove (data migrations shouldn't be in infrastructure migrations)

---

### 6. 🟡 **RLS Policy Fix Migration**

**File:** `20250525192558_fix_user_profiles_rls_safe.sql`
- **Issue:** Modifies RLS policies created earlier
- **Problem:** Policies should be created correctly from the start
- **Action:** Check if this can be merged into original policy creation

---

## Summary

**High Priority (Must Fix):**
1. ✅ Delete redundant cron reschedule (`20251117120100`) - **FIXED**
2. ✅ Merge Edge Function update into original function creation (`20251117120000` → `20251117073833`) - **FIXED**
3. ✅ Fix registry entries to use correct values from start (`20251118010000` → merge into `20251117210000` and `20251117220000`) - **FIXED**
4. ✅ Remove RLS disable/re-enable pattern (`20250525192560`, `20250525192564`) - **FIXED**

**Medium Priority (Should Fix):**
5. ✅ Remove data backfill migration (`20250623100903`) - **FIXED**
6. ✅ Merge RLS policy fix into original creation (`20250525192558`) - **FIXED**

---

## Fixes Applied

### 1. Analytics Refresh Function
- **Merged:** Edge Function implementation into `20251117073833_create_analytics_refresh_v2.sql`
- **Removed:** `20251117120000_update_analytics_refresh_to_edge_function.sql`
- **Removed:** `20251117120100_update_analytics_refresh_frequency.sql` (redundant)

### 2. Registry Entries
- **Updated:** `20251117210000_add_financial_statements_to_registry.sql` - now uses `'queue-processor-v2'`
- **Updated:** `20251117220000_add_ratios_ttm_to_registry.sql` - now uses `'queue-processor-v2'`
- **Removed:** `20251118010000_fix_edge_function_name_for_financial_statements_and_ratios_ttm.sql`

### 3. RLS Policies
- **Updated:** `20250525192555_06_apply_rls_policies.sql` - now includes service_role bypass and GRANT
- **Removed:** `20250525192558_fix_user_profiles_rls_safe.sql`
- **Removed:** `20250525192560_temporarily_disable_rls.sql`
- **Removed:** `20250525192564_reenable_rls_on_user_profiles.sql`

### 4. Data Migrations
- **Removed:** `20250623100903_fix_gravatar_backfill_for_empty_urls.sql` (data migration, not infrastructure)

---

## Final State

✅ **All migrations now represent final state**
✅ **No intermediate modifications**
✅ **Fresh database gets correct final state immediately**
✅ **Cleaner migration history**

**Total migrations removed:** 7 (first pass) + 4 (second pass) = 11
**Total migrations updated:** 4 (first pass) + 3 (second pass) = 7

