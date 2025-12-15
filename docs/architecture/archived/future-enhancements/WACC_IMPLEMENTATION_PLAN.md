# WACC Implementation Plan

**Status**: Planning
**Priority**: High (completes Quality Card)
**Estimated Effort**: 2-3 days

---

## WACC Formula

```
WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
```

Where:
- **E** = Market value of equity (Market Cap)
- **D** = Market value of debt (Total Debt)
- **V** = Total value (E + D)
- **Re** = Cost of equity (CAPM: Rf + β × (Rm - Rf))
- **Rd** = Cost of debt (Interest Expense / Total Debt)
- **Tc** = Corporate tax rate (Income Tax Expense / Income Before Tax)

---

## Data Availability Analysis

### ✅ **Available Data** (Already in Database)

1. **Beta (β)**
   - **Source**: `profiles.beta`
   - **Status**: ✅ Already fetched from FMP API
   - **Update Frequency**: Daily (via profile data type)

2. **Market Cap (E)**
   - **Source**: `live_quote_indicators.market_cap`
   - **Status**: ✅ Real-time data
   - **Update Frequency**: Every minute

3. **Total Debt (D)**
   - **Source**: `financial_statements.balance_sheet_payload.totalDebt`
   - **Status**: ✅ Available in JSONB payload
   - **Update Frequency**: Monthly (financial statements)

4. **Interest Expense**
   - **Source**: `financial_statements.income_statement_payload.interestExpense`
   - **Status**: ✅ Available in JSONB payload
   - **Update Frequency**: Monthly (financial statements)

5. **Tax Rate (Tc)**
   - **Source**: Calculated from `financial_statements.income_statement_payload`
   - **Formula**: `incomeTaxExpense / incomeBeforeTax`
   - **Status**: ✅ Can be calculated
   - **Update Frequency**: Monthly (financial statements)

### ✅ **Available via FMP API** (Need to Fetch and Store)

1. **Market Risk Premium (Rm - Rf)**
   - **FMP API Endpoint**: `/stable/market-risk-premium?apikey={key}`
   - **Response Field**: `totalEquityRiskPremium` (this is Rm - Rf)
   - **Status**: ✅ Available from FMP API
   - **Country-Specific**: Returns country-specific risk premiums
   - **Update Frequency**: Daily (relatively stable, can update weekly)
   - **Storage**: New table `market_risk_premiums` or cache in memory/edge function

2. **Risk-Free Rate (Rf) - US Companies**
   - **FMP API Endpoint**: `/stable/treasury-rates?apikey={key}`
   - **Response Field**: `year10` (10-year Treasury yield)
   - **Status**: ✅ Available from FMP API
   - **Country-Specific**: US Treasury rates only
   - **Update Frequency**: Daily (changes with market conditions)
   - **Storage**: New table `treasury_rates` or cache in memory/edge function

3. **Risk-Free Rate (Rf) - Non-US Companies**
   - **Challenge**: FMP treasury-rates endpoint is US-specific
   - **Options**:
     - **Option A**: Use US Treasury rate as proxy (common practice for international companies)
     - **Option B**: Use country-specific rate from market-risk-premium API (if available)
     - **Option C**: Use default based on country (e.g., EU companies use EU rates)
     - **Recommendation**: **Option A** (use US Treasury rate) - Most international companies use US rates for WACC calculations

---

## Implementation Strategy

### Phase 1: Real-Time WACC with FMP API - **Recommended**

**Approach**: Fetch Market Risk Premium and Treasury Rates from FMP API

**Data Sources**:
1. **Market Risk Premium**: Fetch from `/stable/market-risk-premium` API
   - Use `totalEquityRiskPremium` for the company's country
   - Fallback to US rate if country not found
2. **Risk-Free Rate**: Fetch from `/stable/treasury-rates` API
   - Use `year10` (10-year Treasury yield) for all companies
   - US companies: Direct match
   - Non-US companies: Use US Treasury rate as proxy (standard practice)

**Advantages**:
- ✅ Real-time data (updates daily)
- ✅ Country-specific market risk premiums
- ✅ Accurate risk-free rates
- ✅ Professional-grade WACC calculations

**Disadvantages**:
- ⚠️ Requires API calls (can cache for 24 hours)
- ⚠️ Slightly more complex implementation

**Formula**:
```typescript
// Fetch from APIs (cached for 24 hours)
const marketRiskPremium = await fetchMarketRiskPremium(country); // totalEquityRiskPremium
const riskFreeRate = await fetchTreasuryRates(); // year10

// Cost of Equity (Re) using CAPM
Re = Rf + β × (Rm - Rf)
Re = riskFreeRate + beta × marketRiskPremium

// Cost of Debt (Rd)
Rd = Interest Expense / Total Debt

// Tax Rate (Tc)
Tc = Income Tax Expense / Income Before Tax

// WACC
WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
```

### Phase 2: Enhanced WACC (Future - Optional)

**Potential Enhancements**:
1. **Country-Specific Risk-Free Rates**: For non-US companies, fetch country-specific rates
2. **Historical WACC Tracking**: Store calculated WACC values over time
3. **Industry-Specific Adjustments**: Apply industry-specific risk premiums
4. **Sensitivity Analysis**: Calculate WACC ranges based on different assumptions

**Estimated Effort**: Additional 2-3 days (if needed)

---

## Implementation Steps

### Step 1: Create WACC Calculation Function

**File**: `src/lib/financial-calculations.ts`

**Function**: `calculateWACC()`

**Inputs**:
- Financial statement (for debt, interest expense, tax rate)
- Market cap (from quote)
- Beta (from profile)

**Outputs**:
- WACC as decimal (e.g., 0.085 = 8.5%)

**Edge Cases**:
- Missing beta → Return None
- Missing debt → Use 0 for debt portion
- Missing interest expense → Use 0 for cost of debt
- Zero or negative debt → Handle gracefully
- Missing tax rate → Use 0.21 (21% corporate tax rate as default)

### Step 2: Integrate into Symbol Page

**File**: `src/app/symbol/[ticker]/page.tsx`

**Changes**:
1. Import `calculateWACC` function
2. Calculate WACC in `qualityMetrics` calculation
3. Replace hardcoded `wacc: Option.some(8.5)` with calculated value

### Step 3: Update Documentation

**Files**:
- `docs/architecture/FINANCIAL_CALCULATIONS.md` - Add WACC calculation details
- `docs/architecture/SYMBOL_ANALYSIS_PAGE_CARDS.md` - Update status to "Live"

---

## Data Storage Strategy

### Option A: Cache in Edge Function (Recommended for MVP)

**Approach**: Fetch and cache in memory during WACC calculation

**Implementation**:
- Fetch Market Risk Premium and Treasury Rates in the calculation function
- Cache results for 24 hours (using edge function memory or simple timestamp check)
- No database changes required

**Pros**:
- ✅ Quick to implement
- ✅ No schema changes
- ✅ Fresh data on each calculation

**Cons**:
- ⚠️ API calls on every calculation (mitigated by caching)
- ⚠️ Cache lost on edge function restart

### Option B: Store in Database Tables (Recommended for Production)

**Approach**: Create tables to store Market Risk Premium and Treasury Rates

**Tables Needed**:
1. `market_risk_premiums` - Store country-specific risk premiums
2. `treasury_rates` - Store US Treasury rates

**Pros**:
- ✅ Persistent storage
- ✅ Can be updated via scheduled jobs
- ✅ No API calls during calculation

**Cons**:
- ⚠️ Requires migration and data type setup
- ⚠️ More complex initial setup

**Recommendation**: Start with **Option A** (cache in edge function), upgrade to **Option B** if needed

### Default Values (Fallback)

```typescript
// Default risk-free rate (if API fails)
const DEFAULT_RISK_FREE_RATE = 0.04; // 4.0%

// Default market risk premium (if API fails or country not found)
const DEFAULT_MARKET_RISK_PREMIUM = 0.055; // 5.5%

// Default corporate tax rate (if not available from financials)
const DEFAULT_TAX_RATE = 0.21; // 21%
```

---

## Testing Strategy

### Test Cases

1. **Normal Case**: Company with all data available
   - Beta: 1.2
   - Market Cap: $1,000,000,000
   - Total Debt: $500,000,000
   - Interest Expense: $25,000,000
   - Tax Rate: 0.21

2. **Missing Beta**: Should return None
3. **Zero Debt**: Should calculate equity-only WACC
4. **Missing Interest Expense**: Should use 0 for cost of debt
5. **Missing Tax Rate**: Should use default 0.21
6. **Negative Debt**: Should handle gracefully (return None)

### Expected Results

**Normal Case Calculation**:
```
E = $1,000,000,000
D = $500,000,000
V = $1,500,000,000

Re = 0.04 + 1.2 × 0.055 = 0.106 (10.6%)
Rd = $25,000,000 / $500,000,000 = 0.05 (5%)
Tc = 0.21

WACC = (1,000/1,500 × 0.106) + (500/1,500 × 0.05 × (1-0.21))
WACC = 0.0707 + 0.0132 = 0.0839 (8.39%)
```

---

## Future Enhancements

1. **Real-Time Risk-Free Rate**
   - Fetch from FMP API or Treasury API
   - Store in database
   - Update daily

2. **Dynamic Market Risk Premium**
   - Calculate from historical S&P 500 returns
   - Update quarterly

3. **Industry-Specific WACC**
   - Use industry averages for missing data
   - More accurate for companies with incomplete financials

4. **Historical WACC Tracking**
   - Store calculated WACC values over time
   - Enable ROIC vs WACC trend chart

---

## Decision: Implementation Approach

**Recommendation**: Implement **Phase 1 (Real-Time WACC with FMP API)**

**Rationale**:
1. ✅ Uses real-time data from FMP API (already integrated)
2. ✅ Country-specific market risk premiums (more accurate)
3. ✅ Current Treasury rates (reflects interest rate environment)
4. ✅ Professional-grade calculations
5. ✅ Completes Quality Card functionality
6. ✅ Can cache API responses to minimize calls

**Trade-offs**:
- ⚠️ Requires API calls (mitigated by caching)
- ⚠️ Slightly more complex than constants
- ✅ Much more accurate than static constants
- ✅ Updates automatically with market conditions

---

## Implementation Details

### Step 1: Create API Fetch Functions

**File**: `src/lib/financial-calculations.ts` (or new file `src/lib/wacc-data.ts`)

**Functions Needed**:
1. `fetchMarketRiskPremium(country: string): Promise<number>`
   - Fetches from FMP API: `/stable/market-risk-premium`
   - Finds country match, returns `totalEquityRiskPremium`
   - Fallback to US rate if country not found
   - Cache for 24 hours

2. `fetchTreasuryRates(): Promise<number>`
   - Fetches from FMP API: `/stable/treasury-rates`
   - Returns latest `year10` value
   - Cache for 24 hours

### Step 2: Create WACC Calculation Function

**File**: `src/lib/financial-calculations.ts`

**Function**: `calculateWACC()`

**Inputs**:
- Financial statement (for debt, interest expense, tax rate)
- Market cap (from quote)
- Beta (from profile)
- Country (from profile) - for market risk premium lookup

**Implementation**:
```typescript
export async function calculateWACC(
  financialStatement: FinancialStatementDBRow | null | undefined,
  marketCap: Option.Option<number>,
  beta: Option.Option<number>,
  country: Option.Option<string>
): Promise<Option.Option<number>> {
  // 1. Fetch market risk premium and treasury rates (with caching)
  // 2. Calculate cost of equity (Re)
  // 3. Calculate cost of debt (Rd)
  // 4. Calculate tax rate (Tc)
  // 5. Calculate WACC
}
```

### Step 3: Integrate into Symbol Page

**File**: `src/app/symbol/[ticker]/page.tsx`

**Changes**:
1. Import `calculateWACC` function
2. Get country from profile
3. Calculate WACC in `qualityMetrics` (make it async or use useEffect)
4. Replace hardcoded `wacc: Option.some(8.5)` with calculated value

### Step 4: Handle Non-US Companies

**Strategy**: Use US Treasury rate for all companies
- US companies: Direct match
- Non-US companies: Use US Treasury rate as proxy (standard practice)

**Alternative**: Could use country-specific rates if available, but US rate is acceptable for most cases.

## Next Steps

1. ✅ Review and approve this plan
2. Create API fetch functions for Market Risk Premium and Treasury Rates
3. Implement `calculateWACC()` function with async API calls
4. Integrate into symbol page (handle async calculation)
5. Test with real data (US and non-US companies)
6. Update documentation
7. Deploy and verify

---

**Last Updated**: 2025-01-22 (Updated with FMP API endpoints)
**Status**: Ready for Implementation

