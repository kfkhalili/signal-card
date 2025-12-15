# Analysis Page Calculations: Fix Plan

**Purpose:** Comprehensive plan to fix all identified issues in the Analysis Page calculations.

**Date:** 2025-01-26

**Status:** Planning Phase

---

## Executive Summary

This document outlines the plan to fix **1 Critical**, **3 Medium**, and **4 Minor** issues identified in the calculation correctness analysis. The fixes are prioritized by severity and impact on calculation accuracy.

### Priority Breakdown

- **Critical (P0):** 1 issue - Affects calculation accuracy for loss-making companies
- **Medium (P1):** 3 issues - Affects UI/data presentation and user understanding
- **Minor (P2):** 4 issues - Code clarity, documentation, and enhancement opportunities

---

## Phase 1: Critical Fixes (P0)

### Issue #1: ROIC Tax Rate Calculation for Loss-Making Companies

**Location:** `src/lib/financial-calculations.ts` (lines 105-112)

**Problem:**
- When `incomeBeforeTax` is negative (loss-making company), tax rate calculation produces incorrect results
- Formula `taxExp / ibt` when both are negative gives positive tax rate, which is conceptually wrong for NOPAT
- For loss-making companies, NOPAT should typically equal Operating Income (no tax benefit in simplified model)

**Current Code:**
```typescript
const taxRate = ibt !== 0 ? taxExp / ibt : 0;
return opInc * (1 - taxRate);
```

**Fix:**
```typescript
// Calculate tax rate - only for profitable companies
let taxRate = 0;
if (ibt > 0 && taxExp > 0) {
  // Only calculate tax rate for profitable companies
  taxRate = taxExp / ibt;
} else if (ibt < 0) {
  // For loss-making companies, tax rate is 0 (no tax benefit in NOPAT)
  taxRate = 0;
}
// NOPAT = Operating Income × (1 - Tax Rate)
return opInc * (1 - taxRate);
```

**Testing:**
- Add unit test for loss-making company scenario
- Test with negative `incomeBeforeTax` and negative `incomeTaxExpense`
- Test with negative `incomeBeforeTax` and positive `incomeTaxExpense` (tax benefit)

**Estimated Time:** 1-2 hours

**Dependencies:** None

---

## Phase 2: Medium Priority Fixes (P1)

### Issue #2: ROIC History Chart Labels

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 743-792)

**Problem:**
- Code fetches annual financial statements (`period = 'FY'`) but calculates quarter labels
- Quarter labels are misleading when data points represent full fiscal years
- Should show year labels (e.g., "2024", "2023") instead of quarter labels (e.g., "Q3/24")

**Current Code:**
```typescript
const quarter = Math.floor(date.getMonth() / 3) + 1;
const yearShort = String(date.getFullYear()).slice(-2);
const quarterLabel = `Q${quarter}/${yearShort}`;
```

**Fix:**
```typescript
// Check if this is an annual statement (FY period)
if (fs.period === 'FY') {
  // For annual statements, use year label
  const yearLabel = String(date.getFullYear());
  return {
    date: fs.date,
    dateLabel: yearLabel, // e.g., "2024"
    roic: r * 100,
    wacc: Option.match(wacc, {
      onNone: () => 0,
      onSome: (w) => w * 100,
    }),
  };
} else {
  // For quarterly statements, use quarter labels
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const yearShort = String(date.getFullYear()).slice(-2);
  const quarterLabel = `Q${quarter}/${yearShort}`;
  return {
    date: fs.date,
    dateLabel: quarterLabel, // e.g., "Q3/24"
    roic: r * 100,
    wacc: Option.match(wacc, {
      onNone: () => 0,
      onSome: (w) => w * 100,
    }),
  };
}
```

**Testing:**
- Verify annual statements show year labels
- Verify quarterly statements (if any) still show quarter labels
- Test with mixed data (annual and quarterly)

**Estimated Time:** 1 hour

**Dependencies:** None

---

### Issue #3: Price History Chart Fallback

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 625-641)

**Problem:**
- Code falls back to current price when `stock_price_at_calculation` is missing
- This creates incorrect chart data (all historical points show same price)
- Historical price should only use `stock_price_at_calculation` or skip the entry

**Current Code:**
```typescript
const price = v.stock_price_at_calculation || currentPrice || 0;
```

**Fix:**
```typescript
// Only use stock_price_at_calculation, skip entries without it
.map(v => {
  if (!v.stock_price_at_calculation) {
    return null; // Skip entries without historical price
  }
  return {
    date: v.date,
    price: v.stock_price_at_calculation,
    dcf: v.value,
  };
})
.filter(h => h !== null && h.price > 0);
```

**Testing:**
- Test with valuations that have `stock_price_at_calculation`
- Test with valuations missing `stock_price_at_calculation` (should be filtered out)
- Verify chart only shows valid historical data points

**Estimated Time:** 30 minutes

**Dependencies:** None

---

### Issue #4: Insider Activity Date Calculation Timezone

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 862-879)

**Problem:**
- Date difference calculation doesn't account for timezone differences
- `new Date()` creates dates in local timezone, but database dates may be in UTC
- Can cause off-by-one day errors (e.g., "Today" shows as "1 day ago")

**Current Code:**
```typescript
const date = new Date(latestTransaction.transaction_date);
const now = new Date();
const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
```

**Fix:**
```typescript
// Use UTC dates for consistent calculation
const dateStr = latestTransaction.transaction_date || latestTransaction.filing_date;
if (!dateStr) return "Unknown";

// Parse date string (YYYY-MM-DD) and create UTC date
const parts = dateStr.split('-');
if (parts.length !== 3) return "Unknown";

const year = parseInt(parts[0], 10);
const month = parseInt(parts[1], 10);
const day = parseInt(parts[2], 10);

// Create UTC dates for comparison
const dateUTC = new Date(Date.UTC(year, month - 1, day));
const now = new Date();
const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

const diffDays = Math.floor((nowUTC.getTime() - dateUTC.getTime()) / (1000 * 60 * 60 * 24));
```

**Testing:**
- Test with dates in different timezones
- Test with "Today" transactions (should show "Today")
- Test with dates from different days (should show correct day difference)

**Estimated Time:** 1 hour

**Dependencies:** None

---

## Phase 3: Minor Improvements (P2)

### Issue #5: WACC Simplification Documentation

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 723-725)

**Problem:**
- WACC calculation assumes 100% equity financing, but this isn't clearly communicated to users
- For companies with significant debt, WACC will be underestimated
- ROIC vs WACC comparison may be misleading for leveraged companies

**Fix:**
- Add tooltip or note in UI indicating WACC is simplified (equity-only)
- Consider adding a small info icon next to WACC label with explanation
- Document the limitation in calculation documentation

**UI Enhancement:**
```typescript
<MetricRow
  label="WACC"
  value={Option.match(qualityMetrics.wacc, {
    onNone: () => null,
    onSome: (v) => (v * 100).toFixed(1) + "%",
  })}
  subtext="Cost of Capital (Equity-only)"
  tooltip="WACC is calculated using cost of equity only. Full WACC calculation (including debt component) coming soon."
/>
```

**Estimated Time:** 30 minutes

**Dependencies:** None

---

### Issue #6: ROIC Trend Thresholds

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 354-361)

**Problem:**
- ROIC trend thresholds use 5% points, which is quite significant
- Most companies won't trigger these thresholds
- Trend signal may rarely contribute to quality score

**Current Code:**
```typescript
if (trend > 0.05) {
  score += 10; // Improving significantly (>5% points)
} else if (trend > 0.02) {
  score += 5; // Improving moderately (2-5% points)
}
```

**Fix:**
```typescript
if (trend > 0.03) {
  score += 10; // Improving significantly (>3% points) - more sensitive
} else if (trend > 0.01) {
  score += 5; // Improving moderately (1-3% points)
} else if (trend < -0.03) {
  score -= 10; // Declining significantly (<-3% points)
} else if (trend < -0.01) {
  score -= 5; // Declining moderately (-1 to -3% points)
}
```

**Note:** Test with real data to find optimal threshold values. May need adjustment based on actual company data distribution.

**Estimated Time:** 30 minutes + testing

**Dependencies:** None

---

### Issue #7: P/E Ratio Thresholds (Industry Context)

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 151-171)

**Problem:**
- P/E ratio thresholds are fixed (15, 20, 25, 30) without industry context
- Technology companies typically have higher P/E ratios (20-30+)
- Financial companies typically have lower P/E ratios (10-15)
- Fixed thresholds may misclassify companies in different industries

**Current Approach:**
- Keep fixed thresholds for now (market-average based)
- Document that thresholds are market-average based
- Future enhancement: Add industry-adjusted P/E thresholds

**Fix:**
- Add comment documenting market-average assumption
- Consider adding industry context in future enhancement

**Estimated Time:** 15 minutes (documentation only)

**Dependencies:** None (future enhancement would require industry data)

---

### Issue #8: Interest Coverage Special Case Handling

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 446-448)

**Problem:**
- Interest coverage of 999 (perfect coverage - no interest expense) is handled correctly, but logic could be clearer
- Both cases (999 and >10x) give +25 points, which is correct but could be more explicit

**Current Code:**
```typescript
if (coverage >= 999) {
  score += 25; // Perfect coverage (no interest expense) - Exceptional
  signals++;
} else if (coverage > 10.0) {
  score += 25; // Exceptional (> 10x) - Very safe
  signals++;
}
```

**Fix:**
```typescript
// Special case: Perfect coverage (no interest expense)
if (coverage >= 999) {
  score += 25; // Perfect coverage (no interest expense) - Exceptional
  signals++;
} else if (coverage > 10.0) {
  score += 25; // Exceptional (> 10x) - Very safe
  signals++;
}
```

**Note:** Code is already correct, just adding comment for clarity.

**Estimated Time:** 5 minutes

**Dependencies:** None

---

## Testing Strategy

### Unit Tests

**New Tests Needed:**
1. ROIC with negative `incomeBeforeTax` (loss-making company)
2. ROIC with negative `incomeBeforeTax` and negative `incomeTaxExpense`
3. ROIC with negative `incomeBeforeTax` and positive `incomeTaxExpense` (tax benefit)

**Test File:** `src/lib/__tests__/financial-calculations.test.ts`

### Integration Tests

**Test Scenarios:**
1. ROIC history chart with annual statements (verify year labels)
2. ROIC history chart with quarterly statements (verify quarter labels)
3. Price history chart with missing `stock_price_at_calculation` (verify filtering)
4. Insider activity date calculation with different timezones
5. WACC tooltip/note display

### Manual Testing

**Test Cases:**
1. Loss-making company (negative incomeBeforeTax) - verify ROIC calculation
2. Annual financial statements - verify year labels in chart
3. Price history chart - verify only valid data points shown
4. Insider activity - verify correct relative dates ("Today", "1 day ago", etc.)
5. WACC display - verify tooltip/note appears

---

## Implementation Order

### Sprint 1: Critical Fix (P0)
1. Fix ROIC tax rate calculation for loss-making companies
2. Add unit tests for loss-making scenarios
3. Manual testing with loss-making companies

### Sprint 2: Medium Priority Fixes (P1)
1. Fix ROIC history chart labels
2. Fix price history chart fallback
3. Fix insider activity date calculation
4. Integration testing for all three fixes

### Sprint 3: Minor Improvements (P2)
1. Add WACC documentation/tooltip
2. Adjust ROIC trend thresholds
3. Document P/E ratio thresholds
4. Improve interest coverage code clarity

---

## Risk Assessment

### Low Risk
- All fixes are isolated to specific functions
- No breaking changes to API or data structures
- Changes are backward compatible

### Medium Risk
- ROIC fix may affect existing calculations for loss-making companies
- Chart label changes may affect user expectations
- Date calculation changes may affect relative date display

### Mitigation
- Comprehensive unit tests before deployment
- Manual testing with real company data
- Gradual rollout with monitoring

---

## Success Criteria

### Phase 1 (Critical)
- ✅ ROIC correctly calculates for loss-making companies
- ✅ Unit tests pass for all loss-making scenarios
- ✅ No regression in existing ROIC calculations

### Phase 2 (Medium)
- ✅ ROIC history chart shows correct labels (year for annual, quarter for quarterly)
- ✅ Price history chart only shows valid historical data points
- ✅ Insider activity dates show correct relative times

### Phase 3 (Minor)
- ✅ WACC simplification is clearly documented in UI
- ✅ ROIC trend thresholds are more sensitive (if adjusted)
- ✅ Code clarity improvements are implemented

---

## Future Enhancements

### Not in Scope (Low Priority)
1. Full WACC calculation with debt component
2. Industry-adjusted P/E thresholds
3. Historical price data for richer charts
4. Transaction prices for insider activity dollar volumes

These are documented in `ANALYSIS_PAGE_CALCULATIONS_CORRECTNESS.md` as enhancement opportunities.

---

## References

- **Calculation Documentation:** `docs/architecture/ANALYSIS_PAGE_CALCULATIONS.md`
- **Correctness Analysis:** `docs/architecture/ANALYSIS_PAGE_CALCULATIONS_CORRECTNESS.md`
- **Financial Calculations Module:** `src/lib/financial-calculations.ts`
- **Analysis Page Component:** `src/app/symbol/[ticker]/page.tsx`
- **Unit Tests:** `src/lib/__tests__/financial-calculations.test.ts`

---

## Timeline Estimate

- **Phase 1 (Critical):** 1-2 hours
- **Phase 2 (Medium):** 2.5-3 hours
- **Phase 3 (Minor):** 1-1.5 hours
- **Testing:** 2-3 hours
- **Total:** 6.5-9.5 hours

**Recommended Approach:** Complete Phase 1 immediately, then Phase 2, then Phase 3 as time permits.

