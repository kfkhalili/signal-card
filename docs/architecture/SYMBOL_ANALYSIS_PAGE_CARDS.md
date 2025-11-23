# Symbol Analysis Page: Card Value & Data Requirements

**Purpose:** Analysis of each card on `/symbol/[ticker]` page for investment decision-making value and data requirements.

---

## Executive Summary

### Current Status
- ✅ **Working with Real Data**: Insider Activity, Price, P/E Ratio, Gross Margin
- ⚠️ **Partially Working**: Some metrics from `ratios_ttm` and `financial_statements`
- ❌ **Hardcoded/Placeholder**: DCF, ROIC, WACC, Safety metrics, Institutional data, Analyst data

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
**Status**: ⚠️ **Partially Functional** (3/4 metrics are placeholders)

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Valuation** | ❌ Hardcoded (145.0) | ⭐⭐⭐⭐⭐ Critical | DCF Fair Value calculation |
| **Health** | ❌ Hardcoded (0.8) | ⭐⭐⭐⭐⭐ Critical | Net Debt/EBITDA from financials |
| **Quality (ROIC)** | ❌ Hardcoded (22.0) | ⭐⭐⭐⭐⭐ Critical | ROIC calculation from financials |
| **Sentiment** | ❌ Hardcoded ("Buy") | ⭐⭐⭐ Medium | Analyst consensus from API |

**Investment Value**: ⭐⭐⭐⭐⭐ **Critical** - This is the "at-a-glance" decision framework

**Data Requirements**:
1. **DCF Fair Value**: Calculate from `financial_statements` (Free Cash Flow, growth rates, discount rate)
2. **Net Debt/EBITDA**: Calculate from `financial_statements` (Total Debt - Cash, EBITDA)
3. **ROIC**: Calculate from `financial_statements` (NOPAT / Invested Capital)
4. **Analyst Consensus**: New data type needed (FMP API: `/v3/rating/{symbol}` or `/v3/analyst-estimates/{symbol}`)

---

### ZONE B: Thesis Builder (Left Column - 66%)

#### B1. Valuation Card: "Is it Cheap?"
**Status**: ⚠️ **Partially Functional**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **DCF Fair Value** | ❌ Hardcoded (145.0) | ⭐⭐⭐⭐⭐ Critical | Calculate from financials |
| **Current Price** | ✅ Live | ⭐⭐⭐⭐⭐ Critical | Already working |
| **P/E (TTM)** | ✅ Live | ⭐⭐⭐⭐ High | Already working |
| **PEG Ratio** | ❌ Hardcoded (1.1) | ⭐⭐⭐ Medium | P/E / Growth Rate |
| **Price vs DCF Chart** | ❌ Empty | ⭐⭐ Nice-to-have | Historical price + DCF data |

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
   - **New Data Type Needed**: Historical price data (daily/weekly)
   - **FMP API**: `/v3/historical-price-full/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD`
   - **Table**: New `historical_prices` table
   - **TTL**: 1440 minutes (24 hours) - historical data doesn't change

**Calculation Complexity**: 🔴 **High** - DCF requires financial modeling expertise

---

#### B2. Quality Card: "Is the Business Good?"
**Status**: ⚠️ **Partially Functional**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **ROIC** | ❌ Hardcoded (22.0) | ⭐⭐⭐⭐⭐ Critical | Calculate from financials |
| **WACC** | ❌ Hardcoded (8.5) | ⭐⭐⭐⭐ High | Calculate (complex) |
| **Gross Margin** | ✅ Live | ⭐⭐⭐⭐ High | Already working |
| **FCF Yield** | ❌ Hardcoded (4.2) | ⭐⭐⭐⭐ High | FCF / Market Cap |
| **ROIC vs WACC Chart** | ❌ Empty | ⭐⭐ Nice-to-have | Historical ROIC/WACC |

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
**Status**: ❌ **Fully Hardcoded**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Net Debt/EBITDA** | ❌ Hardcoded (0.8) | ⭐⭐⭐⭐⭐ Critical | Calculate from financials |
| **Altman Z-Score** | ❌ Hardcoded (4.5) | ⭐⭐⭐⭐ High | Calculate from financials |
| **Interest Coverage** | ❌ Hardcoded (18.0) | ⭐⭐⭐⭐ High | Calculate from financials |

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
**Status**: ❌ **Fully Hardcoded**

| Metric | Status | Investment Value | Data Needed |
|--------|--------|------------------|-------------|
| **Short Interest** | ❌ Hardcoded (2.1%) | ⭐⭐⭐ Medium | FMP API: Short interest |
| **Analyst Consensus** | ❌ Hardcoded ("Buy") | ⭐⭐⭐ Medium | FMP API: Analyst ratings |
| **Price Target** | ❌ Hardcoded (180) | ⭐⭐⭐ Medium | FMP API: Analyst price targets |

**Investment Value**: ⭐⭐⭐ **Medium** - Useful contrarian signals, but not decision-critical

**Data Requirements**:
1. **Short Interest**:
   - **FMP API**: `/v3/short-interest/{symbol}` or check if available in `live_quote_indicators`
   - **New Table**: `short_interest` (if not in quote table)
   - **Fields**: `symbol`, `short_interest_ratio`, `short_interest_percentage`, `date`
   - **TTL**: 1440 minutes (24 hours)

2. **Analyst Consensus**:
   - **FMP API**: `/v3/rating/{symbol}` or `/v3/analyst-estimates/{symbol}`
   - **New Table**: `analyst_ratings` (or extend `grades_historical` if it has this)
   - **Fields**: `symbol`, `rating` (Buy/Hold/Sell), `rating_score`, `analyst_count`, `date`
   - **TTL**: 1440 minutes (24 hours)
   - **Calculation**: Average rating or most common rating

3. **Price Target**:
   - **FMP API**: `/v3/analyst-estimates/{symbol}` or `/v3/price-target/{symbol}`
   - **New Table**: `analyst_price_targets` (or extend `analyst_ratings`)
   - **Fields**: `symbol`, `target_price`, `target_high`, `target_low`, `target_median`, `date`
   - **TTL**: 1440 minutes (24 hours)

**Calculation Complexity**: 🟢 **Low** - Direct API data, minimal calculation

---

## Data Priority Matrix

### 🔴 **Critical Priority** (Must Have for Investment Decisions)
1. **DCF Fair Value** - Core valuation metric
2. **ROIC** - Business quality indicator
3. **Net Debt/EBITDA** - Financial safety
4. **Altman Z-Score** - Bankruptcy risk
5. **Interest Coverage** - Debt serviceability
6. **FCF Yield** - Cash generation efficiency

### 🟡 **High Priority** (Important but Can Use Estimates)
1. **WACC** - Can use industry averages initially
2. **PEG Ratio** - Growth-adjusted valuation
3. **Analyst Consensus** - Market sentiment
4. **Price Target** - Analyst expectations

### 🟢 **Medium Priority** (Nice to Have)
1. **Institutional Holdings** - Ownership structure
2. **Short Interest** - Contrarian signal
3. **Historical Charts** - Visual context

---

## Implementation Roadmap

### Phase 1: Safety Metrics (Easiest, High Value)
**Estimated Effort**: 2-3 days
- ✅ Calculate Net Debt/EBITDA from `financial_statements`
- ✅ Calculate Altman Z-Score from `financial_statements`
- ✅ Calculate Interest Coverage from `financial_statements`
- **Impact**: Unlocks Safety Card completely

### Phase 2: Quality Metrics (Medium Complexity, High Value)
**Estimated Effort**: 3-5 days
- ✅ Calculate ROIC from `financial_statements`
- ✅ Calculate FCF Yield from `financial_statements` + `live_quote_indicators`
- ⚠️ Calculate WACC (simplified version using industry averages)
- **Impact**: Unlocks Quality Card mostly

### Phase 3: Valuation Metrics (High Complexity, Critical Value)
**Estimated Effort**: 5-7 days
- ✅ Calculate DCF Fair Value (simplified 2-stage model)
- ✅ Calculate PEG Ratio (P/E / Growth Rate)
- **Impact**: Unlocks Valuation Card completely

### Phase 4: Market Sentiment Data (Low Complexity, Medium Value)
**Estimated Effort**: 2-3 days
- ✅ Add institutional holdings data type
- ✅ Add analyst ratings/consensus data type
- ✅ Add short interest data type
- ✅ Add price target data type
- **Impact**: Unlocks Smart Money and Contrarian Indicators cards

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

### Need to Add
1. **Institutional Holdings** - New data type + table
2. **Analyst Ratings** - New data type + table (or extend `grades_historical`)
3. **Short Interest** - New data type + table (or add to `live_quote_indicators`)
4. **Price Targets** - New data type + table (or combine with analyst ratings)
5. **Historical Prices** - New data type + table (for charts)

### Calculation Functions Needed
1. **DCF Calculator** - Edge function or database function
2. **ROIC Calculator** - Can be calculated in frontend or database function
3. **WACC Calculator** - Complex, may need external data (risk-free rate, beta)
4. **Safety Metrics Calculator** - Simple calculations, can be frontend

---

## Investment Decision Framework

### Current State: ⚠️ **Partially Functional**
- **Can Make Decisions On**: Insider activity, current valuation (P/E), basic quality (gross margin)
- **Cannot Make Decisions On**: True intrinsic value (DCF), business quality (ROIC), financial safety (debt metrics)

### Target State: ✅ **Fully Functional**
- **Valuation**: DCF vs Price comparison → "Is it cheap?"
- **Quality**: ROIC vs WACC → "Is the business good?"
- **Safety**: Debt metrics → "Is it safe?"
- **Sentiment**: Insider activity, analyst consensus → "What do smart people think?"

---

## Recommendations

### Immediate Actions (This Week)
1. **Implement Safety Metrics** (Phase 1) - Easiest, unlocks Safety Card
2. **Implement ROIC and FCF Yield** (Phase 2, partial) - High value, medium complexity

### Short Term (Next 2 Weeks)
3. **Implement DCF Calculation** (Phase 3) - Critical for valuation
4. **Add Analyst Data** (Phase 4) - Completes sentiment analysis

### Medium Term (Next Month)
5. **Implement WACC** (Phase 2, complete) - Completes quality analysis
6. **Add Historical Charts** (Phase 5) - Visual polish

### Long Term (Future)
7. **Advanced DCF Models** - Multi-stage, sensitivity analysis
8. **Peer Comparison** - Compare metrics to industry averages
9. **Historical Trend Analysis** - Track metrics over time

---

## Conclusion

**Current Investment Value**: ⭐⭐⭐ (3/5) - Can make basic decisions, but missing critical metrics

**Target Investment Value**: ⭐⭐⭐⭐⭐ (5/5) - Complete framework for intelligent investment decisions

**Key Gaps**:
1. DCF Fair Value (critical for valuation)
2. ROIC (critical for quality)
3. Safety metrics (critical for risk assessment)
4. Market sentiment data (important for contrarian analysis)

**Estimated Total Effort**: 14-21 days to reach full functionality

---

**Last Updated**: 2025-01-22
**Next Review**: After Phase 1 completion

