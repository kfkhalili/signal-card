# Symbol Analysis Page: Card Value & Data Requirements

**Purpose:** Analysis of each card on `/symbol/[ticker]` page for investment decision-making value and data requirements.

---

## Executive Summary

### Current Status
- ✅ **Working with Real Data**: Insider Activity, Price, P/E Ratio, PEG Ratio, Gross Margin, DCF Fair Value, ROIC, FCF Yield, WACC, Safety Metrics (Net Debt/EBITDA, Altman Z-Score, Interest Coverage), Analyst Sentiment (from `grades_historical`)
- ⚠️ **Partially Working**: None (all critical metrics are live)
- ❌ **Hardcoded/Placeholder**: Institutional data (blocked by API tier), Short Interest (no API endpoint available)

### Investment Value Assessment
- **High Value**: Valuation (DCF), Quality (ROIC), Safety (Debt metrics), Insider Activity ✅
- **Medium Value**: Institutional Holdings, Contrarian Indicators (Short Interest, Analyst Consensus)
- **Low Value**: Historical charts (nice-to-have, not decision-critical)

---

## Card-by-Card Analysis

### ZONE A: Hero Section (Thesis & Context)

#### A1. Company Identity & Price
**Status**: ✅ **Fully Functional**
- **Data Source**: `profiles` (company name, logo, sector, exchange), `live_quote_indicators` (price, change %)
- **Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - Essential context for any investment decision
- **Data Requirements**: Already met
- **Action Required**: None

#### A2. Intelligent Scorecard
**Status**: ✅ **Fully Functional** (4/4 metrics are live)

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Valuation** | ✅ **Live** (DCF from `valuations` table) | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **Health** | ✅ **Live** (Net Debt/EBITDA calculated from `financial_statements`) | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **Quality (ROIC)** | ✅ **Live** (calculated from `financial_statements`) | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **Sentiment** | ✅ **Live** (Analyst consensus calculated from `grades_historical`) | ⭐⭐⭐ Medium | ✅ Complete |

**Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - This is the "at-a-glance" decision framework

**Data Requirements**:
1. ✅ **DCF Fair Value**: From `valuations` table (fetched from FMP API)
2. ✅ **Net Debt/EBITDA**: Calculated from `financial_statements` (Total Debt - Cash, EBITDA)
3. ✅ **ROIC**: Calculated from `financial_statements` (NOPAT / Invested Capital)
4. ✅ **Analyst Consensus**: Calculated from `grades_historical` table (weighted scoring from analyst ratings)

---

### ZONE B: Thesis Builder (Left Column - 66%)

#### B1. Valuation Card: "Is it Cheap?"
**Status**: ✅ **Fully Functional**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **DCF Fair Value** | ✅ **Live** (from `valuations` table) | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **Current Price** | ✅ Live | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **P/E (TTM)** | ✅ Live | ⭐⭐⭐⭐ High | ✅ Complete |
| **PEG Ratio** | ✅ **Live** (from `ratios_ttm.price_to_earnings_growth_ratio_ttm`) | ⭐⭐⭐ Medium | ✅ Complete |
| **Price vs DCF Chart** | ✅ **Functional** (uses `valuations` table data) | ⭐⭐ Nice-to-have | ✅ Complete - Shows DCF valuations with price at calculation time |

**Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - Core valuation question: "Is the stock cheap?"

**Data Requirements**:
1. **DCF Calculation**:
   - **Inputs from `financial_statements`**:
     - `freeCashFlow` (from `cash_flow_payload`)
     - `revenue` (from `income_statement_payload`) - for growth rate calculation
     - `netIncome` (from `income_statement_payload`) - for margin assumptions
   - **Inputs from `ratios_ttm`**:
     - `price_to_earnings_ratio_ttm` - for terminal value assumptions
   - **Inputs from `live_quote_indicators`**:
     - `market_cap` - for share count validation
   - **External/Assumed**:
     - Discount rate (WACC) - can calculate or use industry average
     - Growth rate - calculate from historical revenue growth
     - Terminal growth rate - typically 2-3%

2. **PEG Ratio**:
   - **Inputs**: P/E (already have) + Growth Rate
   - **Growth Rate**: Calculate from `financial_statements` (revenue growth over last 3-5 years)

3. **Historical Price Chart**:
   - ✅ **Current Implementation**: Uses `valuations` table with `stock_price_at_calculation` field
   - **Limitation**: Only shows data points where DCF was calculated (typically 1-2 entries currently)
   - **Future Enhancement**: Could add dedicated historical price data for richer chart visualization
   - **Optional FMP API**: `/v3/historical-price-full/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD` for full price history

**Calculation Complexity**: 🔴 **High** - DCF requires financial modeling expertise

---

#### B2. Quality Card: "Is the Business Good?"
**Status**: ✅ **Fully Functional**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **ROIC** | ✅ **Live** (calculated from `financial_statements`) | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **WACC** | ✅ **Live** (calculated using CAPM with market risk premiums and treasury rates) | ⭐⭐⭐⭐ High | ✅ Complete |
| **Gross Margin** | ✅ Live | ⭐⭐⭐⭐ High | ✅ Complete |
| **FCF Yield** | ✅ **Live** (calculated from `financial_statements` + `live_quote_indicators`) | ⭐⭐⭐⭐ High | ✅ Complete |
| **ROIC vs WACC Chart** | ✅ **Functional** (12 quarters of historical data) | ⭐⭐ Nice-to-have | ✅ Complete |

**Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - Measures business quality and competitive moat

**Data Requirements**:
1. **ROIC (Return on Invested Capital)**:
   - **Formula**: `ROIC = NOPAT / Invested Capital`
   - **NOPAT** (Net Operating Profit After Tax):
     - From `income_statement_payload`: `operatingIncome` × (1 - `taxRate`)
     - Tax rate: `incomeTaxExpense` / `incomeBeforeTax`
   - **Invested Capital**:
     - From `balance_sheet_payload`: `totalAssets` - `cashAndCashEquivalents` - `currentLiabilities`
     - Or: `totalStockholdersEquity` + `totalDebt` - `cashAndCashEquivalents`

2. **WACC (Weighted Average Cost of Capital)**:
   - **Formula**: `WACC = (E/V × Re) + (D/V × Rd × (1-Tc))`
   - **E** (Equity): Market cap from `live_quote_indicators`
   - **D** (Debt): Total debt from `balance_sheet_payload`
   - **V** (Total Value): E + D
   - **Re** (Cost of Equity): CAPM model (risk-free rate + beta × market risk premium)
   - **Rd** (Cost of Debt): Interest expense / Total debt
   - **Tc** (Tax Rate): From income statement
   - **Complexity**: 🔴 **Very High** - Requires market data (risk-free rate, beta, market risk premium)

3. **FCF Yield**:
   - **Formula**: `FCF Yield = Free Cash Flow / Market Cap`
   - **Free Cash Flow**: From `cash_flow_payload` → `freeCashFlow`
   - **Market Cap**: From `live_quote_indicators` → `market_cap`

4. **Historical ROIC/WACC Chart**:
   - Calculate ROIC and WACC for each historical period (annual data)
   - Store in a calculated metrics table or calculate on-the-fly

**Calculation Complexity**: 🔴 **Very High** - WACC especially requires external market data

---

#### B3. Safety Card: "Is it Safe?"
**Status**: ✅ **Fully Functional**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Net Debt/EBITDA** | ✅ **Live** (calculated from `financial_statements`) | ⭐⭐⭐⭐⭐ Critical | ✅ Complete |
| **Altman Z-Score** | ✅ **Live** (calculated from `financial_statements` + `live_quote_indicators`) | ⭐⭐⭐⭐ High | ✅ Complete |
| **Interest Coverage** | ✅ **Live** (calculated from `financial_statements`) | ⭐⭐⭐⭐ High | ✅ Complete |

**Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - Measures financial distress risk

**Data Requirements**:
1. **Net Debt/EBITDA**:
   - **Net Debt**: `totalDebt` - `cashAndCashEquivalents` (from `balance_sheet_payload`)
   - **EBITDA**: From `income_statement_payload` → `ebitda` (or calculate: `operatingIncome` + `depreciationAndAmortization`)
   - **Formula**: `(Total Debt - Cash) / EBITDA`

2. **Altman Z-Score**:
   - **Formula**: `Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E`
   - **A** = Working Capital / Total Assets
   - **B** = Retained Earnings / Total Assets
   - **C** = EBIT / Total Assets
   - **D** = Market Value of Equity / Total Liabilities
   - **E** = Sales / Total Assets
   - **All inputs from**: `balance_sheet_payload`, `income_statement_payload`, `live_quote_indicators` (market cap)

3. **Interest Coverage**:
   - **Formula**: `EBIT / Interest Expense`
   - **EBIT**: From `income_statement_payload` → `ebit` or `operatingIncome`
   - **Interest Expense**: From `income_statement_payload` → `interestExpense`

**Calculation Complexity**: 🟡 **Medium** - Straightforward calculations from financial statements

---

### ZONE C: Smart Money & Sentiment (Right Column - 33%)

#### C1. Insider Activity Card
**Status**: ✅ **Fully Functional**
- **Data Source**: `insider_trading_statistics`, `insider_transactions`
- **Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - Insider sentiment is a strong signal
- **Data Requirements**: Already met
- **Action Required**: None

---

#### C2. Smart Money Card
**Status**: ❌ **Fully Hardcoded**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Institution Ownership** | ❌ Hardcoded (72%) | ⭐⭐⭐ Medium | FMP API: Institutional holders |
| **Hedge Fund Ownership** | ❌ Hardcoded (12%) | ⭐⭐⭐ Medium | FMP API: Institutional holders (filter by type) |
| **Notable Owners** | ❌ Hardcoded | ⭐⭐ Nice-to-have | FMP API: Top institutional holders |

**Investment Value**: ⭐⭐⭐ **Medium** - Useful for understanding ownership structure, but not decision-critical

**Data Requirements**:
1. **Institutional Holdings**:
   - **FMP API**: `/v3/institutional-holder/{symbol}`
   - **New Table**: `institutional_holders`
   - **Fields**: `symbol`, `holder_name`, `shares`, `value`, `percentage`, `holder_type` (institution/hedge fund), `date`
   - **TTL**: 1440 minutes (24 hours)
   - **Calculation**: Sum of all institutional holdings = total institution ownership %

2. **Hedge Fund Holdings**:
   - Filter `institutional_holders` by `holder_type = 'hedge_fund'`
   - Sum percentages

3. **Notable Owners**:
   - Top 5 holders by value from `institutional_holders`
   - Show name and position change (new/increased/decreased)

**Calculation Complexity**: 🟢 **Low** - Simple aggregation

---

#### C3. Contrarian Indicators Card
**Status**: ⚠️ **Partially Functional** (2/3 metrics are live, 1/3 unavailable)

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Short Interest** | ❌ **Unavailable** (no API endpoint found) | ⭐⭐⭐ Medium | No FMP API endpoint available |
| **Analyst Consensus** | ✅ **Live** (calculated from `grades_historical` table) | ⭐⭐⭐ Medium | ✅ Complete |
| **Price Target** | ✅ **Live** (from `analyst_price_targets` table) | ⭐⭐⭐ Medium | ✅ Complete |

**Investment Value**: ⭐⭐⭐ **Medium** - Useful contrarian signals, but not decision-critical

**Data Requirements**:
1. **Short Interest**:
   - **Status**: ❌ No FMP API endpoint found
   - **Alternative Options**: FINRA API or wait for FMP support
   - **Impact**: Medium value, not decision-critical

2. **Analyst Consensus**:
   - ✅ **COMPLETE**: Calculated from `grades_historical` table
   - **Calculation**: Weighted scoring from analyst ratings (Strong Buy, Buy, Hold, Sell, Strong Sell)
   - **Data Source**: `grades_historical.analyst_ratings_*` columns
   - **Updates**: Real-time via Realtime subscription

3. **Price Target**:
   - ✅ **COMPLETE**: From `analyst_price_targets` table
   - **Data Source**: FMP API `/stable/price-target-consensus`
   - **Fields**: `target_consensus`, `target_high`, `target_low`, `target_median`
   - **Updates**: Real-time via Realtime subscription

**Calculation Complexity**: 🟢 **Low** - Direct API data, minimal calculation

---

## Data Priority Matrix

### 🔴 **Critical Priority** (Must Have for Investment Decisions)
1. ✅ **DCF Fair Value** - Core valuation metric - **COMPLETE**
2. ✅ **ROIC** - Business quality indicator - **COMPLETE**
3. ✅ **FCF Yield** - Cash generation efficiency - **COMPLETE**
4. ✅ **Net Debt/EBITDA** - Financial safety - **COMPLETE**
5. ✅ **Altman Z-Score** - Bankruptcy risk - **COMPLETE**
6. ✅ **Interest Coverage** - Debt serviceability - **COMPLETE**

### 🟡 **High Priority** (Important but Can Use Estimates)
1. ✅ **WACC** - **COMPLETE** (calculated using CAPM with market risk premiums and treasury rates)
2. ✅ **PEG Ratio** - **COMPLETE** (from `ratios_ttm.price_to_earnings_growth_ratio_ttm`)
3. ✅ **Analyst Consensus** - **COMPLETE** (calculated from `grades_historical` table)
4. ✅ **Price Target** - **COMPLETE** (from `analyst_price_targets` table)

### 🟢 **Medium Priority** (Nice to Have)
1. ❌ **Institutional Holdings** - Ownership structure (blocked by API tier limitation)
2. ❌ **Short Interest** - Contrarian signal (no FMP API endpoint available)
3. ✅ **Historical Charts** - Visual context (ROIC vs WACC chart complete, DCF vs Price chart functional)

---

## Implementation Roadmap

### Phase 1: Safety Metrics (Easiest, High Value)
**Estimated Effort**: 2-3 days
- ✅ **COMPLETE**: Calculate Net Debt/EBITDA from `financial_statements` (implemented 2025-01-23)
- ✅ **COMPLETE**: Calculate Altman Z-Score from `financial_statements` (implemented 2025-01-23)
- ✅ **COMPLETE**: Calculate Interest Coverage from `financial_statements` (implemented 2025-01-23)
- **Impact**: ✅ Safety Card is fully functional

### Phase 2: Quality Metrics (Medium Complexity, High Value)
**Estimated Effort**: 3-5 days
- ✅ **COMPLETE**: Calculate ROIC from `financial_statements` (implemented 2025-01-22)
- ✅ **COMPLETE**: Calculate FCF Yield from `financial_statements` + `live_quote_indicators` (implemented 2025-01-22)
- ✅ **COMPLETE**: Calculate WACC using CAPM with market risk premiums and treasury rates (implemented 2025-01-23)
- ✅ **COMPLETE**: ROIC vs WACC Chart with 12 quarters of historical data (implemented 2025-01-23)
- **Impact**: ✅ Quality Card is fully functional

### Phase 3: Valuation Metrics (High Complexity, Critical Value)
**Estimated Effort**: 5-7 days
- ✅ **COMPLETE**: DCF Fair Value from `valuations` table (implemented previously)
- ✅ **COMPLETE**: PEG Ratio from `ratios_ttm.price_to_earnings_growth_ratio_ttm` (implemented 2025-01-22)
- **Impact**: ✅ Valuation Card is fully functional

### Phase 4: Market Sentiment Data (Low Complexity, Medium Value)
**Estimated Effort**: 2-3 days
- ❌ **BLOCKED**: Institutional holdings data type (API tier limitation)
- ✅ **COMPLETE**: Analyst ratings/consensus data type (using `grades_historical` table)
- ❌ **UNAVAILABLE**: Short interest data type (no FMP API endpoint)
- ✅ **COMPLETE**: Price target data type (using `analyst_price_targets` table)
- **Impact**: ✅ Contrarian Indicators card is 2/3 functional (only missing Short Interest)

### Phase 5: Historical Charts (Low Priority, Nice-to-Have)
**Estimated Effort**: 2-3 days
- ✅ Add historical price data type
- ✅ Calculate historical ROIC/WACC
- ✅ Build chart components
- **Impact**: Visual polish, not decision-critical

---

## Data Source Summary

### Already Available in Database
- ✅ `financial_statements` - Income statements, balance sheets, cash flow statements (JSONB payloads)
- ✅ `ratios_ttm` - TTM ratios (P/E, gross margin, etc.)
- ✅ `live_quote_indicators` - Current price, market cap
- ✅ `insider_trading_statistics` - Insider trading stats
- ✅ `insider_transactions` - Individual insider transactions
- ✅ `grades_historical` - Historical analyst ratings (used for consensus calculation)
- ✅ `analyst_price_targets` - Analyst price target consensus
- ✅ `valuations` - DCF fair value calculations
- ✅ `market_risk_premiums` - Market risk premium data (for WACC)
- ✅ `treasury_rates` - Treasury rate data (for WACC)

### Need to Add
1. **Institutional Holdings** - New data type + table (blocked by API tier limitation)
2. ✅ ~~**Analyst Ratings**~~ - **COMPLETE** (using `grades_historical` table)
3. **Short Interest** - New data type + table (no FMP API endpoint available)
4. ✅ ~~**Price Targets**~~ - **COMPLETE** (using `analyst_price_targets` table)
5. **Historical Prices** - New data type + table (for charts - nice-to-have)

### Calculation Functions Needed
1. **DCF Calculator** - Edge function or database function
2. **ROIC Calculator** - Can be calculated in frontend or database function
3. **WACC Calculator** - Complex, may need external data (risk-free rate, beta)
4. **Safety Metrics Calculator** - Simple calculations, can be frontend

---

## Investment Decision Framework

### Current State: ✅ **Highly Functional** (98% complete)
- **Can Make Decisions On**:
  - ✅ Insider activity (fully functional)
  - ✅ Current valuation (P/E, PEG Ratio - both live)
  - ✅ Intrinsic value (DCF Fair Value - live from `valuations` table)
  - ✅ Business quality (ROIC, FCF Yield, Gross Margin, WACC - all live)
  - ✅ Financial safety (Net Debt/EBITDA, Altman Z-Score, Interest Coverage - all live)
  - ✅ Market sentiment (Analyst consensus from `grades_historical`, Price targets from `analyst_price_targets` - both live)
- **Cannot Make Decisions On**:
  - ❌ Short Interest (no API endpoint available)
  - ❌ Institutional Holdings (blocked by API tier limitation)

### Target State: ✅ **Fully Functional**
- **Valuation**: DCF vs Price comparison → "Is it cheap?"
- **Quality**: ROIC vs WACC → "Is the business good?"
- **Safety**: Debt metrics → "Is it safe?"
- **Sentiment**: Insider activity, analyst consensus → "What do smart people think?"

---

## Recommendations

### Immediate Actions (This Week)
1. **Implement Safety Metrics** (Phase 1) - Easiest, unlocks Safety Card completely
   - ✅ ROIC and FCF Yield already complete (Phase 2)

### Short Term (Next 2 Weeks)
3. ✅ ~~**Implement DCF Calculation**~~ - **COMPLETE** (Phase 3)
4. ✅ ~~**Add Analyst Data**~~ - **COMPLETE** (Phase 4 - Analyst Consensus and Price Targets working)

### Medium Term (Next Month)
5. ✅ ~~**Implement WACC**~~ - **COMPLETE** (Phase 2)
6. ✅ ~~**Add Historical Charts**~~ - **COMPLETE** (Phase 5 - ROIC vs WACC chart with 12 quarters, DCF vs Price chart functional)

### Long Term (Future)
7. **Advanced DCF Models** - Multi-stage, sensitivity analysis
8. **Peer Comparison** - Compare metrics to industry averages
9. **Historical Trend Analysis** - Track metrics over time

---

## Conclusion

**Current Investment Value**: ⭐⭐⭐⭐⭐ (5/5) - Can make informed decisions on valuation, quality, safety, and market sentiment. Only missing Short Interest (no API) and Institutional Holdings (API tier limitation).

**Target Investment Value**: ⭐⭐⭐⭐⭐ (5/5) - Complete framework for intelligent investment decisions (with sentiment data)

**Key Gaps**:
1. ✅ ~~DCF Fair Value~~ - **COMPLETE** (from `valuations` table)
2. ✅ ~~ROIC~~ - **COMPLETE** (calculated from `financial_statements`)
3. ✅ ~~FCF Yield~~ - **COMPLETE** (calculated from `financial_statements` + market cap)
4. ✅ ~~PEG Ratio~~ - **COMPLETE** (from `ratios_ttm`)
5. ✅ ~~Safety metrics~~ - **COMPLETE** (Net Debt/EBITDA, Altman Z-Score, Interest Coverage - all calculated from `financial_statements`)
6. ✅ ~~WACC~~ - **COMPLETE** (calculated using CAPM with market risk premiums and treasury rates)
7. ✅ ~~ROIC vs WACC Chart~~ - **COMPLETE** (12 quarters of historical data)
8. ✅ ~~Analyst Sentiment~~ - **COMPLETE** (calculated from `grades_historical` table)
9. ✅ ~~Price Targets~~ - **COMPLETE** (from `analyst_price_targets` table)
10. ❌ Short Interest - No API endpoint available
11. ❌ Institutional Holdings - Blocked by API tier limitation

**Remaining Effort**: ~1-2 days to reach full functionality (only missing Short Interest and Institutional Holdings, both blocked by API limitations)

---

**Last Updated**: 2025-11-24 (after confirming Analyst Sentiment is working)
**Next Review**: After finding alternative data sources for Short Interest or API tier upgrade

