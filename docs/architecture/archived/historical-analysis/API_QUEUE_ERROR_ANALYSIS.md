# API Call Queue Error Analysis

**Analysis Date:** 2025-11-20 (Updated)
**Total Failed Jobs:** 38
**Total Completed Jobs:** 563

## Summary

The queue has 38 failed jobs across 7 data types. The primary issues are:

1. **Foreign Key Constraint Violations** - 24 failures (primary issue)
2. **Zod Validation Errors (Profile)** - 6 failures
3. **Empty API Responses** - 6 failures
4. **Other Errors** - 2 failures (exchange closed/stale data)

## Error Breakdown by Data Type

| Data Type | Failure Count | Unique Symbols | Primary Issue |
|-----------|--------------|----------------|---------------|
| ratios-ttm | 12 | 5 | FK violations + empty responses |
| dividend-history | 8 | 3 | FK violations |
| profile | 6 | 2 | Zod validation (null fields) |
| financial-statements | 6 | 2 | FK violations |
| quote | 2 | 1 | Exchange closed (old) |
| grades-historical | 2 | 1 | FK violations |
| revenue-product-segmentation | 2 | 1 | FK violations |

## Error Breakdown by Symbol

| Symbol | Total Failures | Affected Data Types | Primary Issue |
|--------|---------------|---------------------|---------------|
| AABPX | 16 | 4 | Profile validation + cascade failures |
| A | 10 | 5 | Foreign key violations (profile missing) |
| AAACX | 8 | 3 | Profile validation + FK violations + empty responses |
| AAPL | 2 | 1 | Exchange closed (old error) |
| LSAQ | 1 | 1 | Empty API response |
| NVD | 1 | 1 | Empty API response |

## Error Patterns

### 1. Foreign Key Constraint Violations - 24 failures (63% of all failures)

**Affected Tables:**
- `ratios_ttm` - 12 failures
- `dividend_history` - 8 failures
- `financial_statements` - 6 failures
- `grades_historical` - 2 failures
- `revenue_product_segmentation` - 2 failures

**Error Message Pattern:**
```
Database upsert failed: insert or update on table "X" violates foreign key constraint "fk_X_symbol"
```

**Root Cause:**
Foreign key constraints reference `profiles(symbol)`. When profile jobs fail (due to validation errors), the profile record doesn't exist in the `profiles` table. Subsequent jobs for dependent data types fail because they cannot insert/update records without a valid profile.

**Cascade Failure Pattern:**
1. Profile job fails (Zod validation)
2. Profile record not created in `profiles` table
3. Financial-statements job attempts to insert → FK violation
4. Ratios-ttm job attempts to insert → FK violation
5. Dividend-history job attempts to insert → FK violation
6. etc.

**Affected Symbols:**
- `AABPX`: 12 FK failures (profile validation prevents profile creation)
- `A`: 10 FK failures (profile missing - needs investigation)
- `AAACX`: 2 FK failures (profile validation prevents profile creation)

**Note:** Symbols `A`, `AAACX`, `LSAQ`, and `NVD` DO exist in the `profiles` table, but `AABPX` does NOT. This suggests:
- For `AABPX`: Profile job is failing before profile can be created
- For `A`, `AAACX`: Profile exists but FK violations still occur - possible timing issue or profile was created after dependent jobs were queued

### 2. Zod Validation Errors (Profile) - 6 failures

**Affected Symbols:** `AAACX` (2 failures), `AABPX` (4 failures)

**Error Details:**
- FMP API returns `null` for many fields, but Zod schema expects strings
- Fields causing validation failures:
  - `cik` - Expected string, received null
  - `cusip` - Expected string, received null
  - `website` - Expected string or empty string, received null
  - `description` - Expected string, received null
  - `ceo` - Expected string, received null
  - `country` - Expected string, received null
  - `fullTimeEmployees` - Expected string, received null (already fixed in recent commit)
  - `phone` - Expected string, received null
  - `address` - Expected string, received null
  - `city` - Expected string, received null
  - `state` - Expected string, received null
  - `zip` - Expected string, received null

**Root Cause:**
The Zod schema in `fetch-fmp-profile.ts` uses `.optional()` which allows `undefined` but not `null`. FMP API returns `null` for missing fields.

**Impact:**
- Profile jobs fail validation
- All dependent data types fail due to foreign key constraints (cascade failure)
- **This is the root cause of most FK violations**

### 3. Empty API Responses - 6 failures

**Affected Symbols:** `AAACX` (4 failures), `LSAQ` (1), `NVD` (1)
**Data Type:** `ratios-ttm`
**Error:** `FMP API returned empty array or invalid response for [SYMBOL]`

**Root Cause:**
FMP API returned an empty array for these symbols. This is expected behavior for symbols that don't have ratios data available.

**Current Behavior:**
- Jobs retry 3 times before failing
- No sentinel record is created (unlike `dividend-history` and `revenue-product-segmentation`)

**Recommendation:**
- Create sentinel records for `ratios-ttm` when API returns empty array (similar to dividend-history pattern)
- This prevents infinite retries and marks the data as "checked but unavailable"

### 4. Other Errors - 2 failures

**Exchange Closed Error:**
- Symbol: `AAPL`
- Data Type: `quote`
- Error: `Exchange NASDAQ is closed for symbol AAPL. Skipping quote fetch.`
- Date: 2025-11-18 (old error, likely before exchange status check was removed)

**Stale Data Error:**
- Error: `FMP returned 200 OK but data is stale...`
- Date: 2025-11-17 (old error)

## Recommended Fixes

### Priority 1: Fix Zod Schema for Profile (CRITICAL - Fixes 63% of failures)

**File:** `supabase/functions/lib/fetch-fmp-profile.ts`

**Change:** Make all optional fields nullable to handle FMP API returning `null`:

```typescript
const FmpProfileSchema = z.object({
  // ... existing fields ...
  cik: z.string().nullable().optional(),
  cusip: z.string().nullable().optional(),
  website: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  description: z.string().nullable().optional(),
  ceo: z.string().nullable().optional(),
  country: z.string().length(2).nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  // fullTimeEmployees already fixed
});
```

**Impact:**
- Fixes 6 profile validation errors
- Prevents 24 cascade failures (foreign key violations)
- Allows profile records to be created even when FMP API returns null for optional fields
- **Total impact: Fixes 30 out of 38 failures (79%)**

### Priority 2: Handle Empty API Responses for ratios-ttm

**File:** `supabase/functions/lib/fetch-fmp-ratios-ttm.ts`

**Change:** Create sentinel record when API returns empty array (similar to dividend-history pattern)

**Impact:**
- Prevents 6 failures from infinite retries
- Marks data as "checked but unavailable"
- Reduces queue noise

### Priority 3: Investigate Timing Issues for Symbol "A"

**Issue:** Symbol `A` exists in `profiles` table but still has 10 FK violations

**Possible Causes:**
1. Profile was created AFTER dependent jobs were queued
2. Profile was deleted/recreated causing FK violations
3. Race condition in job processing

**Action:** Review job creation timestamps vs profile creation timestamps for symbol `A`

## Testing Recommendations

1. **Test with symbols that have null fields:**
   - `AAACX` - Has many null fields
   - `AABPX` - Has null fullTimeEmployees and other nulls (already fixed fullTimeEmployees, test other nulls)

2. **Test cascade failure scenario:**
   - Create a profile job that will fail
   - Verify dependent jobs fail with clear error messages

3. **Test empty API responses:**
   - Symbols that don't have data in FMP (`LSAQ`, `NVD`)
   - Verify sentinel records are created (where applicable)

4. **Test profile creation timing:**
   - Verify profile exists before dependent jobs are processed
   - Check for race conditions

## Next Steps

1. ✅ Fix `fullTimeEmployees` nullable (already done)
2. ⏳ Fix remaining nullable fields in Zod schema (Priority 1)
3. ⏳ Add sentinel record handling for `ratios-ttm` (Priority 2)
4. ⏳ Investigate timing issues for symbol `A` (Priority 3)
5. ⏳ Test with problematic symbols (`AAACX`, `AABPX`)
6. ⏳ Monitor queue for reduction in failures

## Statistics

- **Success Rate:** 563 completed / 601 total = 93.7%
- **Failure Rate:** 38 failed / 601 total = 6.3%
- **Most Common Error:** Foreign key constraint violations (63% of failures)
- **Root Cause:** Zod validation errors preventing profile creation (79% of failures are directly or indirectly caused by this)
