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

## Cleanup Migrations Created

1. **`20251119210000_consolidate_staleness_checker_with_all_fixes.sql`**
   - Consolidates all fixes for `check_and_queue_stale_data_from_presence_v2`
   - Includes: LEFT JOIN, timeout logic, exchange status check with data existence check
   - Supersedes: 20251117180100, 20251118000000, 20251118030000, 20251119000000

2. **`20251119220000_remove_redundant_processor_optimization.sql`**
   - Documents that 20251117180000 is superseded by 20251117180200
   - Updates function comment to reflect final state

3. **`20251119230000_add_superseded_comments_to_migrations.sql`**
   - Adds informational notices about superseded migrations
   - Documents migration history for audit purposes

