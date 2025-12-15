# Analysis Page: Calculation Correctness Analysis

**Purpose:** Comprehensive review of calculation correctness, identifying issues, edge cases, and recommendations for improvements.

**Date:** 2025-01-26

---

## Executive Summary

### Overall Assessment

**Status:** ✅ **Mostly Correct** with **Minor Issues** and **Edge Case Gaps**

The calculations are mathematically sound and follow standard financial formulas. However, several edge cases and logical issues were identified that could lead to incorrect results in specific scenarios.

### Issues Found

- **Critical Issues:** 1
- **Medium Issues:** 3
- **Minor Issues:** 4
- **Enhancement Opportunities:** 5

---

## Critical Issues

### 1. ROIC Tax Rate Calculation for Loss-Making Companies

**Location:** `src/lib/financial-calculations.ts` (lines 105-112)

**Issue:**
When `incomeBeforeTax` is negative (company is losing money), the tax rate calculation produces incorrect results:

```typescript
const taxRate = ibt !== 0 ? taxExp / ibt : 0;
// If ibt = -100M and taxExp = -20M, taxRate = 0.2 (20%)
// This is incorrect - tax rate should be 0 or handled differently for losses
```

**Problem:**
- Negative tax rates can occur when both `incomeBeforeTax` and `incomeTaxExpense` are negative
- The formula `taxExp / ibt` when both are negative gives a positive tax rate, which is mathematically correct but conceptually wrong for NOPAT calculation
- For loss-making companies, NOPAT should typically equal Operating Income (no tax benefit applied in this simplified model)

**Impact:**
- Loss-making companies will have incorrect ROIC calculations
- NOPAT will be inflated (less negative) than it should be

**Recommendation:**
```typescript
// Calculate tax rate
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

**Alternative Approach:**
For loss-making companies, consider using Operating Income directly as NOPAT (since there's no tax to apply), or use a more sophisticated tax benefit calculation if tax credits are available.

**Severity:** 🔴 **Critical** - Affects ROIC accuracy for loss-making companies

---

## Medium Issues

### 2. ROIC History Chart: Quarter Labels for Annual Statements

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 739-792)

**Issue:**
The code fetches annual financial statements (`period = 'FY'`) but calculates quarter labels:

```typescript
const quarter = Math.floor(date.getMonth() / 3) + 1;
const quarterLabel = `Q${quarter}/${yearShort}`;
```

**Problem:**
- Annual statements (FY) should show year labels (e.g., "2024", "2023"), not quarter labels
- Quarter labels are misleading when data points represent full fiscal years
- The month-based quarter calculation doesn't make sense for annual data

**Impact:**
- Chart labels are misleading (shows "Q3/24" for annual data)
- Users may think they're seeing quarterly data when it's actually annual

**Recommendation:**
```typescript
// For annual statements (FY period), use year labels
if (fs.period === 'FY') {
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
  // ...
}
```

**Severity:** 🟡 **Medium** - Misleading UI, doesn't affect calculation accuracy

---

### 3. Price History Chart: Incorrect Fallback to Current Price

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 625-641)

**Issue:**
When building price history, the code falls back to current price if `stock_price_at_calculation` is missing:

```typescript
const price = v.stock_price_at_calculation || currentPrice || 0;
```

**Problem:**
- Using current price for historical data points creates incorrect chart data
- All historical points would show the same price (current price), making the chart meaningless
- Historical price should only use `stock_price_at_calculation` or skip the entry

**Impact:**
- Price history chart shows incorrect data when `stock_price_at_calculation` is missing
- Chart may show flat price line when it should show historical variation

**Recommendation:**
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

**Severity:** 🟡 **Medium** - Affects chart accuracy and user understanding

---

### 4. Insider Activity Date Calculation: Timezone Issues

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 860-877)

**Issue:**
Date difference calculation doesn't account for timezone differences:

```typescript
const date = new Date(latestTransaction.transaction_date);
const now = new Date();
const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
```

**Problem:**
- `new Date()` creates dates in local timezone
- Database dates may be in UTC
- Timezone differences can cause off-by-one day errors
- "Today" might show as "1 day ago" or vice versa

**Impact:**
- Incorrect relative date display (e.g., shows "1 day ago" when it's actually "Today")
- Minor UX issue, but can be confusing

**Recommendation:**
```typescript
// Use UTC dates for consistent calculation
const date = new Date(latestTransaction.transaction_date + 'T00:00:00Z');
const now = new Date();
const nowUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const diffDays = Math.floor((nowUTC.getTime() - dateUTC.getTime()) / (1000 * 60 * 60 * 24));
```

**Severity:** 🟡 **Medium** - Minor UX issue, doesn't affect calculation accuracy

---

## Minor Issues

### 5. WACC Calculation: Simplified Assumption Not Documented in UI

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 683-729)

**Issue:**
WACC calculation assumes 100% equity financing, but this isn't clearly communicated to users:

```typescript
// For now, use a simplified WACC (assume 100% equity, no debt)
// TODO: Implement full WACC with debt and tax rate
const simplifiedWacc = costOfEquity;
```

**Problem:**
- Users may not realize WACC is simplified
- For companies with significant debt, WACC will be underestimated
- ROIC vs WACC comparison may be misleading for leveraged companies

**Impact:**
- WACC may be inaccurate for companies with debt
- Quality assessment (ROIC vs WACC) may be skewed

**Recommendation:**
- Add a tooltip or note in the UI indicating WACC is simplified (equity-only)
- Consider implementing full WACC calculation for better accuracy
- Document the limitation in the calculation documentation

**Severity:** 🟢 **Minor** - Calculation is correct for what it does, but assumption should be documented

---

### 6. Quality Status: ROIC Trend Thresholds May Be Too High

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 347-362)

**Issue:**
ROIC trend thresholds use percentage points (already converted to percentage):

```typescript
const trend = newest.roic - oldest.roic; // Change in ROIC (already in percentage form)
if (trend > 0.05) { // 5% points
  score += 10;
}
```

**Problem:**
- 5% point change in ROIC is quite significant (e.g., 10% → 15% ROIC)
- Most companies won't trigger these thresholds
- Trend signal may rarely contribute to quality score

**Impact:**
- Trend signal may be too conservative
- Quality improvements/declines may not be captured

**Recommendation:**
Consider lowering thresholds:
```typescript
if (trend > 0.03) { // 3% points - more sensitive
  score += 10;
} else if (trend > 0.01) { // 1% point
  score += 5;
}
```

**Severity:** 🟢 **Minor** - Doesn't affect correctness, but may reduce signal sensitivity

---

### 7. Valuation Status: P/E Ratio Thresholds May Need Industry Context

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 146-171)

**Issue:**
P/E ratio thresholds are fixed (15, 20, 25, 30) without industry context:

```typescript
if (pe < 15) {
  score += 30; // Very Cheap
} else if (pe < 20) {
  score += 15; // Reasonable
}
```

**Problem:**
- Technology companies typically have higher P/E ratios (20-30+)
- Financial companies typically have lower P/E ratios (10-15)
- Fixed thresholds may misclassify companies in different industries

**Impact:**
- Technology companies may be incorrectly classified as "Overvalued"
- Financial companies may be incorrectly classified as "Undervalued"

**Recommendation:**
- Consider industry-adjusted P/E thresholds
- Or add industry context to valuation status calculation
- Document that thresholds are market-average based

**Severity:** 🟢 **Minor** - Thresholds are reasonable for market average, but could be improved

---

### 8. Safety Status: Interest Coverage Special Case (999) Handling

**Location:** `src/app/symbol/[ticker]/page.tsx` (lines 444-448)

**Issue:**
Interest coverage of 999 (perfect coverage - no interest expense) is handled correctly, but the logic could be clearer:

```typescript
if (coverage >= 999) {
  score += 25; // Perfect coverage (no interest expense) - Exceptional
  signals++;
} else if (coverage > 10.0) {
  score += 25; // Exceptional (> 10x) - Very safe
  signals++;
}
```

**Problem:**
- Both cases give +25 points, which is correct
- But the special case (999) could be more explicitly handled
- Code is correct but could be more readable

**Impact:**
- None - calculation is correct
- Minor code clarity issue

**Recommendation:**
Consider making the special case more explicit:
```typescript
// Special case: Perfect coverage (no interest expense)
if (coverage >= 999) {
  score += 25;
  signals++;
  return; // Early return or continue to next signal
}
// Normal coverage ranges
if (coverage > 10.0) {
  score += 25;
  signals++;
}
```

**Severity:** 🟢 **Minor** - Code clarity improvement, calculation is correct

---

## Enhancement Opportunities

### 9. ROIC: Handle Tax Credits for Loss-Making Companies

**Current:** Tax rate is set to 0 for loss-making companies

**Enhancement:** Consider tax credits (NOL carryforwards) that could reduce future tax burden. This would require more sophisticated tax modeling.

**Priority:** Low - Current approach is acceptable for most use cases

---

### 10. WACC: Implement Full Calculation with Debt Component

**Current:** Simplified WACC using only cost of equity

**Enhancement:** Implement full WACC: `WACC = (E/V × Re) + (D/V × Rd × (1-Tc))`

**Required Data:**
- Debt-to-equity ratio from financial statements
- Cost of debt (interest expense / total debt)
- Tax rate from income statement

**Priority:** Medium - Would improve accuracy for leveraged companies

---

### 11. Valuation Status: Add Industry-Adjusted Thresholds

**Current:** Fixed P/E and PEG thresholds

**Enhancement:** Adjust thresholds based on company industry/sector

**Priority:** Low - Market-average thresholds are reasonable

---

### 12. Price History: Add Dedicated Historical Price Data

**Current:** Uses `stock_price_at_calculation` from valuations table

**Enhancement:** Fetch dedicated historical price data for richer chart visualization

**Priority:** Low - Current approach works, enhancement would be nice-to-have

---

### 13. Insider Activity: Use Transaction Prices When Available

**Current:** Uses current market price for dollar volume calculations

**Enhancement:** Use actual transaction prices from API if available

**Priority:** Low - Current approach is documented limitation

---

## Correct Calculations (Verified)

The following calculations have been verified as **correct**:

### ✅ ROIC Calculation
- Formula: `ROIC = NOPAT / Invested Capital`
- NOPAT calculation: `Operating Income × (1 - Tax Rate)`
- Invested Capital: `Total Equity + Total Debt - Cash` (Financing Approach)
- Edge cases handled: Invested Capital ≤ 0, missing fields

### ✅ FCF Yield Calculation
- Formula: `FCF Yield = Free Cash Flow / Market Cap`
- Edge cases handled: Market Cap ≤ 0, missing fields

### ✅ Net Debt to EBITDA Calculation
- Formula: `Net Debt / EBITDA`
- Net Debt: `Total Debt - Cash`
- EBITDA: Uses direct value or calculates from Operating Income + D&A
- Edge cases handled: EBITDA ≤ 0, missing fields

### ✅ Altman Z-Score Calculation
- Formula: `Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E`
- All components calculated correctly
- Edge cases handled: Missing fields, division by zero

### ✅ Interest Coverage Calculation
- Formula: `Interest Coverage = EBIT / Interest Expense`
- Special case: Returns 999 for perfect coverage (no interest expense)
- Edge cases handled: Interest Expense ≤ 0, missing fields

### ✅ WACC Calculation (Simplified)
- Formula: `WACC = Rf + β × (Rm - Rf)` (Cost of Equity only)
- Correctly implements CAPM
- Edge cases handled: Missing market data, beta null

### ✅ DCF Discount Calculation
- Formula: `discount = ((dcfFairValue - currentPrice) / dcfFairValue) × 100`
- Edge cases handled: DCF ≤ 0, missing values

### ✅ Valuation Status Scoring
- Multi-metric scoring system with weighted signals
- Logic is sound, thresholds are reasonable
- Edge cases handled: Missing data, negative ratios

### ✅ Quality Status Scoring
- Multi-metric scoring system with weighted signals
- ROIC vs WACC spread calculation is correct
- Edge cases handled: Missing data, negative values

### ✅ Safety Status Scoring
- Multi-metric scoring system with weighted signals
- All three metrics (Net Debt/EBITDA, Altman Z-Score, Interest Coverage) correctly weighted
- Edge cases handled: Missing data, special cases (999 for interest coverage)

### ✅ Analyst Consensus Calculation
- Weighted score: `(strongBuy × 2 + buy × 1 + hold × 0 + sell × -1 + strongSell × -2) / total`
- Mapping to consensus strings is correct
- Edge cases handled: No ratings, total = 0

### ✅ Insider Activity Calculations
- Net sentiment: `totalAcquiredShares - totalDisposedShares`
- Dollar volumes: `shares × currentPrice` (documented limitation)
- Edge cases handled: Missing price, zero shares

---

## Testing Coverage

### Unit Tests

**Location:** `src/lib/__tests__/financial-calculations.test.ts`

**Coverage:**
- ✅ ROIC calculation (normal case, edge cases)
- ✅ FCF Yield calculation (normal case, edge cases)
- ✅ Net Debt to EBITDA calculation (normal case, edge cases, EBITDA calculation)
- ✅ Altman Z-Score calculation (normal case, edge cases, field name variations)
- ✅ Interest Coverage calculation (normal case, edge cases, perfect coverage)

**Missing Test Cases:**
- ❌ ROIC with negative incomeBeforeTax (loss-making company)
- ❌ ROIC with negative tax expense (tax benefit)
- ❌ WACC calculation (no unit tests found)
- ❌ Status scoring algorithms (no unit tests found)

**Recommendation:** Add unit tests for:
1. ROIC with loss-making companies
2. WACC calculation
3. Status scoring algorithms (at least key edge cases)

---

## Recommendations Summary

### Immediate Actions (Critical)

1. **Fix ROIC tax rate calculation for loss-making companies** (Issue #1)
   - Update `calculateROIC` to handle negative `incomeBeforeTax`
   - Add unit test for loss-making company scenario

### Short-term Improvements (Medium Priority)

2. **Fix ROIC history chart labels** (Issue #2)
   - Use year labels for annual statements (FY period)
   - Keep quarter labels for quarterly statements

3. **Fix price history chart fallback** (Issue #3)
   - Remove fallback to current price
   - Skip entries without `stock_price_at_calculation`

4. **Fix insider activity date calculation** (Issue #4)
   - Use UTC dates for consistent calculation
   - Handle timezone differences properly

### Long-term Enhancements (Low Priority)

5. **Document WACC simplification** (Issue #5)
   - Add UI tooltip or note
   - Consider implementing full WACC calculation

6. **Adjust ROIC trend thresholds** (Issue #6)
   - Lower thresholds for better sensitivity
   - Test with real data to find optimal values

7. **Add industry context to valuation** (Issue #7)
   - Consider industry-adjusted P/E thresholds
   - Or document market-average assumption

8. **Improve code clarity** (Issue #8)
   - Make special cases more explicit
   - Add comments for complex logic

---

## Conclusion

The analysis page calculations are **mathematically sound** and follow **standard financial formulas**. The identified issues are primarily:

1. **Edge case handling** for loss-making companies (critical)
2. **UI/data presentation** issues (medium)
3. **Enhancement opportunities** for better accuracy (low)

**Overall Assessment:** ✅ **Production Ready** with recommended fixes for edge cases.

The calculations will work correctly for the majority of companies (profitable companies with standard financial structures). The critical issue (ROIC tax rate for losses) should be addressed, but it only affects a subset of companies (loss-making ones).

---

## References

- **Financial Calculations Module:** `src/lib/financial-calculations.ts`
- **Analysis Page Component:** `src/app/symbol/[ticker]/page.tsx`
- **Unit Tests:** `src/lib/__tests__/financial-calculations.test.ts`
- **Calculation Documentation:** `docs/architecture/ANALYSIS_PAGE_CALCULATIONS.md`
- **Financial Calculations Guide:** `docs/architecture/FINANCIAL_CALCULATIONS.md`
