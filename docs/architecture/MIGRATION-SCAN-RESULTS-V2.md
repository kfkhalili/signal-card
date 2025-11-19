# Migration Scan Results (Second Pass)
**Date:** 2025-11-19
**Purpose:** Identify remaining migrations that violate "final state" principle after first cleanup

---

## Issues Found

### 1. 🔴 **Function Created Then Removed**

**Files:**
- `20250525192551_02_create_user_profiles_and_auth_triggers.sql` - Creates `handle_new_user()` function
- `20250525192563_remove_broken_auth_automation.sql` - Removes `handle_new_user()` function and trigger

**Issue:** Function is created then removed. Final state should not have this function.
**Problem:** Original creation should not create the function if it's not in final state.
**Action:** Remove function creation from `20250525192551` and delete `20250525192563`

---

### 2. 🔴 **Function Modified Multiple Times**

**Files:**
- `20250525192559_create_user_profile_webhook_function.sql` - Creates `handle_user_created_webhook` (basic version)
- `20250623091129_add_gravatar_to_user_profile.sql` - Adds Gravatar URL generation
- `20250623105638_fix_user_creation_webhook.sql` - Adds `full_name` and `is_profile_complete` handling

**Issue:** Function is modified twice after creation.
**Problem:** Should be created with final implementation from the start.
**Action:** Merge all modifications into `20250525192559` and delete the other two

---

### 3. 🔴 **RLS Policy Modified After Creation**

**File:** `20250623223929_fix_user_profile_update_policy.sql`
- **Issue:** Modifies UPDATE policy created in `20250525192555_06_apply_rls_policies.sql`
- **Problem:** Policy should be created correctly from the start
- **Action:** Merge `WITH CHECK` clause into original policy creation

---

### 4. 🟡 **Column Added with Data Migration**

**File:** `20250623102243_add_profile_complete_flag.sql`
- **Issue:** Adds column (infrastructure) but also has `UPDATE` statement (data migration)
- **Problem:** The `UPDATE` is a one-time backfill for existing users
- **Action:** Keep column addition, but the `UPDATE` is data migration (should be removed or kept as one-time backfill is acceptable for infrastructure setup)

---

## Summary

**High Priority (Must Fix):**
1. Remove `handle_new_user()` function creation from original (it gets removed later)
2. Merge all `handle_user_created_webhook` modifications into original creation
3. Merge UPDATE policy fix into original RLS policies

**Medium Priority (Should Review):**
4. Review `is_profile_complete` column migration - UPDATE is data migration but might be acceptable as one-time backfill

---

## Expected Outcome

After fixes:
- No functions created then removed
- No functions modified multiple times
- All policies created correctly from start
- Cleaner migration history

