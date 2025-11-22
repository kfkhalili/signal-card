# Supabase Advisor Issues Analysis

**Generated:** 2025-01-22
**Total Issues:** 40 (33 Security, 7 Performance)

## 🔴 Critical Security Issues

### 1. Function Search Path Mutable (28 functions) - **WARN**

**Issue:** Functions missing `SET search_path` parameter, making them vulnerable to search path injection attacks.

**Affected Functions:**
- `is_quote_stale_v2`
- `record_baseline_metric`
- `set_ui_job_max_retries`
- `capture_system_baseline`
- `upsert_profile`
- `is_feature_enabled`
- `update_updated_at_column`
- `invoke_processor_loop_v2`
- `check_stuck_jobs_alert`
- `check_quota_usage_alert`
- `check_and_queue_stale_data_from_presence_v2`
- `invoke_processor_if_healthy_v2`
- `invoke_edge_function_v2`
- `check_cron_job_health`
- `queue_refresh_if_not_exists_v2`
- `is_valid_identifier`
- `is_data_stale_v2`
- `is_profile_stale_v2`
- `check_queue_success_rate_alert`
- `complete_queue_job_v2` (appears twice)
- `on_realtime_subscription_insert`
- `recover_stuck_jobs_v2`
- `queue_scheduled_refreshes_v2`
- `maintain_queue_partitions_v2`
- `fail_queue_job_v2`
- `is_exchange_open_for_symbol_v2`
- `is_quota_exceeded_v2`
- `get_queue_batch_v2`
- `increment_api_calls`
- `reserve_api_calls`
- `release_api_calls_reservation`
- `should_stop_processing_api_calls`
- `get_weighted_leaderboard`
- `check_and_queue_stale_batch_v2`
- `get_active_subscriptions_from_realtime`

**Remediation:** Add `SET search_path = public, extensions` to all function definitions.

**Example Fix:**
```sql
CREATE OR REPLACE FUNCTION public.get_queue_batch_v2(...)
RETURNS ...
LANGUAGE plpgsql
SET search_path = public, extensions  -- Add this line
AS $$
BEGIN
  -- function body
END;
$$;
```

**Remediation URL:** https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

---

### 2. RLS Enabled But No Policies (4 tables) - **INFO**

**Issue:** Row Level Security is enabled on partition tables, but no policies exist.

**Affected Tables:**
- `public.api_call_queue_v2_completed`
- `public.api_call_queue_v2_failed`
- `public.api_call_queue_v2_pending`
- `public.api_call_queue_v2_processing`

**Remediation:** Either:
1. Add RLS policies to these tables, OR
2. Disable RLS if these tables don't need it (they're internal partitions)

**Note:** These are partition tables for `api_call_queue_v2`. If the parent table has RLS policies, these may not need separate policies.

**Remediation URL:** https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

---

### 3. Vulnerable Postgres Version - **WARN**

**Issue:** Current Postgres version `supabase-postgres-15.8.1.084` has outstanding security patches available.

**Remediation:** Upgrade database to receive latest security patches.

**Remediation URL:** https://supabase.com/docs/guides/platform/upgrading

---

## ⚠️ Performance Issues

### 1. Auth RLS Initialization Plan (2 policies) - **WARN**

**Issue:** RLS policies on `user_profiles` table re-evaluate `auth.uid()` for each row, causing suboptimal query performance.

**Affected Policies:**
- `Users can view their own profile`
- `Allow users to insert their own profile`

**Remediation:** Replace `auth.uid()` with `(select auth.uid())` in policy definitions.

**Example Fix:**
```sql
-- Before (slow):
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- After (fast):
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING ((select auth.uid()) = user_id);
```

**Remediation URL:** https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

---

### 2. Unused Indexes (5 indexes) - **INFO**

**Issue:** These indexes have never been used and may be candidates for removal.

**Affected Indexes:**
- `idx_dividend_history_record_date` on `public.dividend_history`
- `idx_live_quote_indicators_symbol` on `public.live_quote_indicators`
- `idx_migration_baseline_metric_name` on `public.migration_baseline`
- `idx_api_data_usage_v2_job_id` on `public.api_data_usage_v2`
- `idx_feature_flags_enabled` on `public.feature_flags`

**Remediation:**
- Review if these indexes are needed for future queries
- If not needed, drop them to reduce write overhead
- If needed, verify they're being used by query planner

**Remediation URL:** https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

---

### 3. Table Bloat - **INFO**

**Issue:** Table `net._http_response` has excessive bloat.

**Remediation:**
- Consider running `VACUUM FULL` (WARNING: incurs downtime)
- Tweak autovacuum settings to reduce bloat

**Note:** This is in the `net` schema (likely Supabase internal), not our `public` schema.

---

## Priority Recommendations

### 🔴 High Priority (Security)

1. **Fix Function Search Path** (28 functions)
   - **Impact:** Security vulnerability (search path injection)
   - **Effort:** Medium (requires migration for each function)
   - **Action:** Create migration to add `SET search_path` to all functions

2. **Upgrade Postgres Version**
   - **Impact:** Security patches
   - **Effort:** Low (Supabase handles upgrade)
   - **Action:** Schedule upgrade via Supabase dashboard

### ⚠️ Medium Priority (Performance)

3. **Fix Auth RLS Policies** (2 policies)
   - **Impact:** Query performance at scale
   - **Effort:** Low (simple policy update)
   - **Action:** Update `user_profiles` RLS policies

4. **Review RLS on Partition Tables** (4 tables)
   - **Impact:** Security clarity
   - **Effort:** Low (either add policies or disable RLS)
   - **Action:** Decide if partition tables need RLS policies

### ℹ️ Low Priority (Optimization)

5. **Review Unused Indexes** (5 indexes)
   - **Impact:** Write performance (minor)
   - **Effort:** Low (investigation, then drop if not needed)
   - **Action:** Analyze query patterns, drop unused indexes

6. **Table Bloat** (1 table)
   - **Impact:** Storage/performance (minor)
   - **Effort:** Low (autovacuum tuning)
   - **Action:** Monitor, adjust autovacuum if needed

---

## Next Steps

1. **Create migration** to fix function search paths (28 functions)
2. **Update RLS policies** on `user_profiles` table (2 policies)
3. **Review partition table RLS** - decide if policies needed or disable RLS
4. **Schedule Postgres upgrade** via Supabase dashboard
5. **Review unused indexes** - drop if not needed

---

## References

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Function Search Path Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [RLS Performance Optimization](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Upgrading Postgres](https://supabase.com/docs/guides/platform/upgrading)

