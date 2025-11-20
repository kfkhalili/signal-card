# API Call Queue Error Analysis

**Analysis Date:** 2025-11-20
**Time Range:** Last 7 days
**Total Failed Jobs:** 31

## Summary

The queue has 31 failed jobs across 7 data types. The primary issues are:

1. **Zod Validation Errors (Profile)** - 5 failures
2. **Foreign Key Constraint Violations** - 23 failures (cascade from profile failures)
3. **Empty API Responses** - 1 failure
4. **Other Errors** - 2 failures (old/exchange closed)

## Error Breakdown by Data Type

| Data Type | Failure Count | Unique Symbols | Latest Failure |
|-----------|--------------|----------------|----------------|
| dividend-history | 7 | 3 | 2025-11-20 06:50:00 |
| ratios-ttm | 7 | 3 | 2025-11-20 06:50:00 |
| financial-statements | 6 | 2 | 2025-11-19 22:08:00 |
| profile | 5 | 2 | 2025-11-20 06:50:00 |
| quote | 2 | 1 | 2025-11-18 06:32:00 |
| grades-historical | 2 | 1 | 2025-11-19 21:54:00 |
| revenue-product-segmentation | 2 | 1 | 2025-11-19 21:54:00 |

## Error Patterns

### 1. Zod Validation Errors (Profile) - 5 failures

**Affected Symbols:** `AAACX`, `AABPX`

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

### 2. Foreign Key Constraint Violations - 23 failures

**Affected Tables:**
- `dividend_history` - 7 failures
- `financial_statements` - 6 failures
- `ratios_ttm` - 6 failures
- `grades_historical` - 2 failures
- `revenue_product_segmentation` - 2 failures

**Error Message Pattern:**
```
Database upsert failed: insert or update on table "X" violates foreign key constraint "fk_X_symbol"
```

**Root Cause:**
Foreign key constraints reference `profiles(symbol)`. When profile jobs fail (due to validation errors), the profile record doesn't exist in the `profiles` table. Subsequent jobs for dependent data types (financial-statements, ratios-ttm, etc.) fail because they cannot insert/update records without a valid profile.

**Cascade Failure Pattern:**
1. Profile job fails (Zod validation)
2. Profile record not created in `profiles` table
3. Financial-statements job attempts to insert → FK violation
4. Ratios-ttm job attempts to insert → FK violation
5. Dividend-history job attempts to insert → FK violation
6. etc.

**Affected Symbols:**
- `AABPX`: 16 failures (profile + 3 dependent types)
- `A`: 10 failures (profile missing, 5 dependent types)
- `AAACX`: 3 failures (profile + 2 dependent types)

### 3. Empty API Responses - 1 failure

**Symbol:** `AAACX`
**Data Type:** `ratios-ttm`
**Error:** `FMP API returned empty array or invalid response for AAACX`

**Root Cause:**
FMP API returned an empty array for this symbol. This is expected behavior for symbols that don't have ratios data available.

### 4. Other Errors - 2 failures

**Exchange Closed Error:**
- Symbol: `AAPL`
- Data Type: `quote`
- Error: `Exchange NASDAQ is closed for symbol AAPL. Skipping quote fetch.`
- Date: 2025-11-18 (old error, likely before exchange status check was removed)

**Stale Data Error:**
- Error: `FMP returned 200 OK but data is stale...`
- Date: 2025-11-17 (old error)

## Symbols with Most Failures

| Symbol | Total Failures | Affected Data Types | Primary Issue |
|--------|---------------|---------------------|---------------|
| AABPX | 16 | 4 | Profile validation + cascade failures |
| A | 10 | 5 | Foreign key violations (profile missing) |
| AAACX | 3 | 3 | Profile validation + cascade failures |
| AAPL | 2 | 1 | Exchange closed (old error) |

## Recommended Fixes

### Priority 1: Fix Zod Schema for Profile (High Impact)

**File:** `supabase/functions/lib/fetch-fmp-profile.ts`

**Change:** Make all optional fields nullable to handle FMP API returning `null`:

```typescript
const FmpProfileSchema = z.object({
  // ... existing fields ...
  cik: z.string().nullable().optional(),
  cusip: z.string().nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal('')),
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
- Fixes 5 profile validation errors
- Prevents 23 cascade failures (foreign key violations)
- Allows profile records to be created even when FMP API returns null for optional fields

### Priority 2: Handle Empty API Responses Gracefully

**Current Behavior:**
- Empty API responses cause job failures
- Jobs retry 3 times before failing

**Recommended:**
- For data types that can legitimately have no data (ratios-ttm, dividend-history, etc.), create sentinel records to prevent infinite retries
- Already implemented for `dividend-history` and `revenue-product-segmentation`
- Consider extending to `ratios-ttm` if empty responses are common

### Priority 3: Improve Error Handling for Missing Profiles

**Current Behavior:**
- When profile doesn't exist, all dependent jobs fail with FK violations
- No clear indication that the root cause is a missing profile

**Recommended:**
- Add pre-check in dependent data type processors to verify profile exists
- If profile missing, fail fast with clear error: "Profile not found for symbol X. Profile job must succeed first."
- This makes debugging easier and prevents unnecessary processing

## Testing Recommendations

1. **Test with symbols that have null fields:**
   - `AAACX` - Has many null fields
   - `AABPX` - Has null fullTimeEmployees (already fixed, test other nulls)

2. **Test cascade failure scenario:**
   - Create a profile job that will fail
   - Verify dependent jobs fail with clear error messages

3. **Test empty API responses:**
   - Symbols that don't have data in FMP
   - Verify sentinel records are created (where applicable)

## Next Steps

1. ✅ Fix `fullTimeEmployees` nullable (already done in commit `5bbda40`)
2. ⏳ Fix remaining nullable fields in Zod schema
3. ⏳ Test with problematic symbols (`AAACX`, `AABPX`)
4. ⏳ Monitor queue for reduction in failures

