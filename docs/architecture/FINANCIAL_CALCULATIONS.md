# Financial Calculations Documentation

This document describes all financial calculations performed in the Tickered application, distinguishing between:
- **Calculated Metrics**: Metrics we compute from raw data
- **FMP API Data**: Metrics provided directly by FinancialModelingPrep API (attributed to source)

**⚠️ Important**: This document has been reviewed for financial accuracy. All formulas have been validated for mathematical soundness and edge case handling.

---

## Table of Contents

1. [Valuation Metrics](#valuation-metrics)
2. [Quality Metrics](#quality-metrics)
3. [Safety Metrics](#safety-metrics)
4. [Insider Trading Metrics](#insider-trading-metrics)
5. [Status Classifications](#status-classifications)

---

## Valuation Metrics

### DCF Fair Value

**Source**: FinancialModelingPrep API
**API Endpoint**: `/stable/discounted-cash-flow?symbol={symbol}`
**Table**: `valuations` (column: `value`, where `valuation_type = 'dcf'`)
**Data Type**: `valuations`

**Description**: Discounted Cash Flow (DCF) fair value is provided directly by FMP API. We store the latest DCF value and the stock price at the time of calculation.

**Usage**:
- Displayed as "DCF Fair Value" in the Valuation card
- Used in DCF vs Price chart
- Used in valuation status calculation

---

### P/E Ratio (Price-to-Earnings)

**Source**: FinancialModelingPrep API
**API Endpoint**: `/stable/ratios-ttm?symbol={symbol}`
**Table**: `ratios_ttm` (column: `price_to_earnings_ratio_ttm`)
**Data Type**: `ratios-ttm`

**Description**: Trailing Twelve Months (TTM) Price-to-Earnings ratio is provided directly by FMP API.

**Usage**:
- Displayed as "P/E (TTM)" in the Valuation card
- Used in valuation status calculation (30% weight)

---

### PEG Ratio (Price/Earnings to Growth)

**Source**: FinancialModelingPrep API
**API Endpoint**: `/stable/ratios-ttm?symbol={symbol}`
**Table**: `ratios_ttm` (column: `price_to_earnings_growth_ratio_ttm`)
**Data Type**: `ratios-ttm`

**Description**: Price-to-Earnings Growth ratio is provided directly by FMP API.

**Usage**:
- Displayed as "PEG Ratio" in the Valuation card
- Used in valuation status calculation (30% weight)

---

### DCF Discount Percentage

**Formula**:
```
discount = ((dcfFairValue - currentPrice) / dcfFairValue) × 100
```

**Inputs**:
- `dcfFairValue`: Latest DCF value from `valuations` table
- `currentPrice`: Current stock price from `live_quote_indicators` table

**Description**: Calculates the percentage discount (or premium) of the current price relative to DCF fair value. Positive values indicate the stock is trading below fair value (undervalued), negative values indicate it's trading above fair value (overvalued).

**Usage**:
- Displayed as "Upside" subtext in the Valuation card
- Used in valuation status calculation (40% weight)

**Example**:
- DCF: $149.17, Price: $271.49
- Discount: ((149.17 - 271.49) / 149.17) × 100 = -82.0%
- Interpretation: Stock is trading 82% above fair value (overvalued)

**Edge Cases**:
- If `dcfFairValue ≤ 0`: Handle as "Overvalued" (negative or zero fair value indicates distress)
- If `dcfFairValue` is null: Return "Unknown" status
- Division by zero protection: Ensure `dcfFairValue > 0` before calculation

---

### Price Target Upside

**Formula**:
```
upside = ((priceTarget - currentPrice) / currentPrice) × 100
```

**Inputs**:
- `priceTarget`: Analyst price target (from contrarian indicators, currently hardcoded)
- `currentPrice`: Current stock price from `live_quote_indicators` table

**Description**: Calculates the percentage upside (or downside) to analyst price target.

**Usage**:
- Displayed as subtext in Contrarian Indicators card

---

### Valuation Status (Composite Score)

**Formula**: Multi-metric scoring system with weighted signals

**Calculation Steps**:

1. **DCF Discount Signal (40% weight)**:
   - `discount > 20%` → +40 points (Undervalued)
   - `discount < -20%` → -40 points (Overvalued)
   - `discount > 0%` → +20 points (Slightly Undervalued)
   - `discount ≤ 0%` → -20 points (Slightly Overvalued)

2. **P/E Ratio Signal (30% weight)**:
   - `P/E < 0` or `P/E = null` → -30 points (Very Expensive - Loss-making company, no earnings yield)
   - `P/E < 15` → +30 points (Very Cheap)
   - `15 ≤ P/E < 20` → +15 points (Reasonable)
   - `20 ≤ P/E ≤ 25` → 0 points (Neutral)
   - `25 < P/E ≤ 30` → -15 points (Expensive)
   - `P/E > 30` → -30 points (Very Expensive)

   **Edge Case Handling**:
   - Negative P/E (loss-making companies): Treated as "Very Expensive" since there is no earnings yield
   - Null/undefined P/E: Treated as "Very Expensive" (missing data indicates no earnings)

3. **PEG Ratio Signal (30% weight)**:
   - `PEG < 0` or `PEG = null` → -30 points (Very Overvalued - Negative growth or earnings)
   - `PEG < 1.0` → +30 points (Undervalued)
   - `1.0 ≤ PEG < 1.5` → +15 points (Good)
   - `1.5 ≤ PEG ≤ 2.0` → 0 points (Neutral)
   - `2.0 < PEG ≤ 2.5` → -15 points (Overvalued)
   - `PEG > 2.5` → -30 points (Very Overvalued)

   **Edge Case Handling**:
   - Negative PEG (negative growth or earnings): Treated as "Very Overvalued"
   - Null/undefined PEG: Treated as "Very Overvalued" (missing data)

4. **Composite Score**:
   - Sum all signal points
   - Requires at least 2 signals to use composite score
   - If fewer than 2 signals, fall back to DCF-only logic

5. **Status Determination**:
   - `score ≥ 30` → **Undervalued** (Green)
   - `score ≤ -30` → **Overvalued** (Red)
   - `-30 < score < 30` → **Fair** (Yellow)

**Inputs**:
- DCF Fair Value (from `valuations` table)
- Current Price (from `live_quote_indicators` table)
- P/E Ratio (from `ratios_ttm` table)
- PEG Ratio (from `ratios_ttm` table)

**Usage**:
- Determines colored border and status badge on Valuation card
- Visual indicator: Green border = Undervalued, Red border = Overvalued, Yellow border = Fair

---

## Quality Metrics

### Gross Profit Margin

**Source**: FinancialModelingPrep API
**API Endpoint**: `/stable/ratios-ttm?symbol={symbol}`
**Table**: `ratios_ttm` (column: `gross_profit_margin_ttm`)
**Data Type**: `ratios-ttm`

**Description**: Gross profit margin (as a decimal, e.g., 0.45 = 45%) is provided directly by FMP API.

**Usage**:
- Displayed as "Gross Margin" in the Quality card
- Converted to percentage for display: `(grossMargin × 100).toFixed(1) + "%"`

---

### ROIC (Return on Invested Capital)

**Status**: ⚠️ Currently hardcoded (22.0%)
**Formula**: `ROIC = NOPAT / Invested Capital`

**Inputs** (from `financial_statements` table):
- **NOPAT** (Net Operating Profit After Tax):
  - `operatingIncome × (1 - taxRate)`
  - Tax rate: `incomeTaxExpense / incomeBeforeTax`

- **Invested Capital** (Financing Approach - Recommended):
  - `Invested Capital = Total Equity + Total Debt - Cash`
  - `totalStockholdersEquity + (shortTermDebt + longTermDebt) - cashAndCashEquivalents`

  **Why Financing Approach?**
  - Less prone to accounting anomalies in Current Liabilities (e.g., deferred revenue, accounts payable)
  - Ensures Debt is correctly captured as capital employed
  - More reliable than Operating Approach which requires excluding non-interest-bearing current liabilities

**Alternative (Operating Approach)** - Not Recommended:
  - `totalAssets - cashAndCashEquivalents - (currentLiabilities - shortTermDebt)`
  - More complex and error-prone due to NIBCL exclusion requirements

**Current Implementation**: Hardcoded value (TODO: Calculate from financials)

**Edge Cases**:
- If `Invested Capital ≤ 0`: Return `null` or handle as invalid (company may be in distress)
- If `NOPAT < 0`: ROIC will be negative (indicates value destruction)

---

### WACC (Weighted Average Cost of Capital)

**Status**: ⚠️ Currently hardcoded (8.5%)
**Planned Formula**: `WACC = (E/V × Re) + (D/V × Rd × (1-Tc))`

**Planned Inputs**:
- **E** (Equity): Market cap from `live_quote_indicators`
- **D** (Debt): Total debt from `financial_statements.balance_sheet_payload`
- **V** (Total Value): E + D
- **Re** (Cost of Equity): CAPM model (requires risk-free rate, beta, market risk premium)
- **Rd** (Cost of Debt): Interest expense / Total debt
- **Tc** (Tax Rate): From income statement

**Current Implementation**: Hardcoded value (TODO: Calculate)

**Note**: WACC calculation is complex and requires external market data (risk-free rate, beta, market risk premium). A simplified version using industry averages may be implemented initially.

---

### FCF Yield (Free Cash Flow Yield)

**Status**: ⚠️ Currently hardcoded (4.2%)
**Planned Formula**: `FCF Yield = Free Cash Flow / Market Cap`

**Planned Inputs**:
- **Free Cash Flow**: From `financial_statements.cash_flow_payload.freeCashFlow`
- **Market Cap**: From `live_quote_indicators.market_cap`

**Current Implementation**: Hardcoded value

**Alternative Calculation** (if FCF not available):
- Use `ratios_ttm.price_to_free_cash_flow_ratio_ttm`
- Invert: `FCF Yield = 1 / price_to_free_cash_flow_ratio_ttm`

---

### Quality Status

**Formula**: Threshold-based classification using ROIC

**Classification**:
- `ROIC > 15%` → **Moat** (Green) - Exceptional competitive advantage
- `10% < ROIC ≤ 15%` → **High** (Green) - Strong returns
- `5% < ROIC ≤ 10%` → **Moderate** (Yellow) - Average returns
- `ROIC ≤ 5%` → **Low** (Red) - Poor returns

**Inputs**:
- ROIC value (currently hardcoded, planned to calculate from financials)

**Usage**:
- Determines status badge in scorecard at top of page

---

## Safety Metrics

### Net Debt to EBITDA

**Status**: ✅ **Implemented** (calculated from `financial_statements`)
**Formula**: `Net Debt / EBITDA`

**Inputs** (from `financial_statements` table):
- **Net Debt**: `totalDebt - cashAndCashEquivalents` (from `balance_sheet_payload`)
  - `totalDebt = shortTermDebt + longTermDebt`
  - `netDebt = totalDebt - cashAndCashEquivalents`
- **EBITDA**: From `income_statement_payload.ebitda` (or calculate: `operatingIncome + depreciationAndAmortization`)

**Current Implementation**: Calculated in `calculateNetDebtToEbitda()` function

**Edge Cases**:
- If `EBITDA ≤ 0`: Return `None` (company is losing money, ratio is not meaningful)
- If any required field is missing: Return `None`

---

### Altman Z-Score

**Status**: ✅ **Implemented** (calculated from `financial_statements` + `live_quote_indicators`)
**Formula**: `Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E`

**Components** (from `financial_statements.balance_sheet_payload`, `income_statement_payload`, and `live_quote_indicators`):
- **A** = Working Capital / Total Assets
  - `Working Capital = currentAssets - currentLiabilities`
- **B** = Retained Earnings / Total Assets
- **C** = EBIT / Total Assets
  - Uses `ebit` if available, otherwise falls back to `operatingIncome`
- **D** = Market Value of Equity / Total Liabilities
  - `Market Value of Equity = market_cap` (from `live_quote_indicators`)
- **E** = Sales (Revenue) / Total Assets

**Current Implementation**: Calculated in `calculateAltmanZScore()` function

**Interpretation**:
- `Z > 2.99` → Safe Zone (low bankruptcy risk)
- `1.81 < Z ≤ 2.99` → Grey Zone (moderate risk)
- `Z ≤ 1.81` → Distress Zone (high bankruptcy risk)

**Edge Cases**:
- If `marketCap` is missing: Return `None`
- If any required field is missing: Return `None`

---

### Interest Coverage Ratio

**Status**: ✅ **Implemented** (calculated from `financial_statements`)
**Formula**: `Interest Coverage = EBIT / Interest Expense`

**Inputs** (from `financial_statements.income_statement_payload`):
- **EBIT**: Uses `ebit` if available, otherwise falls back to `operatingIncome`
- **Interest Expense**: `interestExpense`

**Current Implementation**: Calculated in `calculateInterestCoverage()` function

**Interpretation**:
- Higher is better (indicates ability to pay interest obligations)
- `> 5x` is generally considered safe
- `> 10x` is exceptional
- `< 1.5x` indicates risk of default
- `999x` (or very high value) indicates perfect coverage - company has no interest expense or has interest income

**Edge Cases**:
- If `Interest Expense ≤ 0`: Return `999` (perfect/infinite coverage - company has no interest expense or has interest income)
- If any required field is missing: Return `None`

---

### Safety Status

**Formula**: Composite scoring system using all three safety metrics

**Calculation Steps**:

1. **Net Debt to EBITDA Signal (40% weight)**:
   - `< 1.0x` → +40 points (Exceptional)
   - `1.0-2.0x` → +30 points (Excellent)
   - `2.0-3.0x` → +20 points (Good)
   - `3.0-5.0x` → -10 points (Moderate)
   - `5.0-7.0x` → -30 points (Risky)
   - `> 7.0x` → -40 points (Very Risky)

2. **Altman Z-Score Signal (35% weight)**:
   - `> 3.0` → +35 points (Safe Zone)
   - `2.7-3.0` → +20 points (Good)
   - `1.81-2.7` → -10 points (Grey Zone)
   - `1.0-1.81` → -30 points (Distress Zone)
   - `< 1.0` → -40 points (Critical)

3. **Interest Coverage Signal (25% weight)**:
   - `> 10x` → +25 points (Exceptional)
   - `5-10x` → +20 points (Excellent)
   - `3-5x` → +10 points (Good)
   - `1.5-3x` → -15 points (Moderate)
   - `0-1.5x` → -30 points (Risky)
   - `< 0` → -40 points (Critical)

4. **Status Determination**:
   - `score ≥ 50` → **Safe** (Green)
   - `score ≥ 10` → **Moderate** (Yellow)
   - `score < 10` → **Risky** (Red)
   - Requires at least 2 signals for valid assessment

**Inputs**:
- Net Debt to EBITDA ratio (calculated from `financial_statements`)
- Altman Z-Score (calculated from `financial_statements` + `live_quote_indicators`)
- Interest Coverage ratio (calculated from `financial_statements`)

**Usage**:
- Determines status badge and colored border on Safety card
- Determines status badge in scorecard at top of page

---

## Insider Trading Metrics

### Net Insider Sentiment

**Formula**:
```
netSentiment = totalAcquiredShares - totalDisposedShares
```

**Inputs** (from `insider_trading_statistics` table):
- **totalAcquiredShares**: Sum of `total_acquired` from last 6 months (2 quarters)
- **totalDisposedShares**: Sum of `total_disposed` from last 6 months (2 quarters)

**Data Source**: FinancialModelingPrep API
**API Endpoint**: `/stable/insider-trading/statistics?symbol={symbol}`
**Table**: `insider_trading_statistics`
**Data Type**: `insider-trading-statistics`

**Description**: Calculates net insider sentiment by subtracting total disposed shares from total acquired shares over the last 6 months.

**Usage**:
- Determines colored border on Insider Activity card:
  - `netSentiment > 0` → Green border (Net Accumulation)
  - `netSentiment < 0` → Red border (Net Distribution)
  - `netSentiment = 0` → Default border (Neutral)

---

### Net Buy Volume (Dollar Value)

**⚠️ Important Note**: This metric represents the **current market value** of shares acquired, not the actual capital committed at the time of purchase. If an insider bought shares at $10 and the price is now $100, this will show 10x the actual purchase amount.

**Formula**:
```
netBuyVolume = totalAcquiredShares × currentPrice
```

**Inputs**:
- **totalAcquiredShares**: Sum of `total_acquired` from last 6 months (from `insider_trading_statistics` table)
- **currentPrice**: Current stock price from `live_quote_indicators` table

**Description**: Converts total acquired shares to dollar value using **current stock price** (not transaction price).

**Limitations**:
- Does not reflect actual purchase price paid by insiders
- If FMP API provides `transaction_price` in future, should use: `sum(securities_transacted × transaction_price)` for accurate volume

**Usage**:
- Displayed as "Buying" value in Insider Activity card
- Formatted as currency: `formatFinancialValue(netBuyVolume, "USD", 1, exchangeRates)`
- **Label Consideration**: May be more accurate to label as "Current Value of Recent Buys" rather than "Buying Volume"

---

### Net Sell Volume (Dollar Value)

**⚠️ Important Note**: This metric represents the **current market value** of shares disposed, not the actual proceeds received at the time of sale. If an insider sold shares at $10 and the price is now $100, this will show 10x the actual sale proceeds.

**Formula**:
```
netSellVolume = totalDisposedShares × currentPrice
```

**Inputs**:
- **totalDisposedShares**: Sum of `total_disposed` from last 6 months (from `insider_trading_statistics` table)
- **currentPrice**: Current stock price from `live_quote_indicators` table

**Description**: Converts total disposed shares to dollar value using **current stock price** (not transaction price).

**Limitations**:
- Does not reflect actual sale price received by insiders
- If FMP API provides `transaction_price` in future, should use: `sum(securities_transacted × transaction_price)` for accurate volume

**Usage**:
- Displayed as "Selling" value in Insider Activity card
- Formatted as currency: `formatFinancialValue(netSellVolume, "USD", 1, exchangeRates)`
- **Label Consideration**: May be more accurate to label as "Current Value of Recent Sells" rather than "Selling Volume"

---

### Latest Trade Information

**Source**: FinancialModelingPrep API
**API Endpoint**: `/stable/insider-trading/search?symbol={symbol}&page=0&limit=500`
**Table**: `insider_transactions`
**Data Type**: `insider-transactions`

**Description**: Individual insider transactions are provided directly by FMP API. We display the most recent transaction.

**Fields Used**:
- `reporting_name`: Name of the insider
- `acquisition_or_disposition`: "A" = Acquisition (Bought), "D" = Disposition (Sold)
- `securities_transacted`: Number of shares transacted
- `transaction_date` or `filing_date`: Date of the transaction

**Usage**:
- Displayed as "Latest" trade in Insider Activity card
- Shows: `{name} {action} {shares} shares ({date})`
- Date is formatted as relative time (e.g., "11 days ago", "Today")

---

## Status Classifications

### Valuation Status Thresholds

| Status | Score Range | DCF Discount (Fallback) | Visual Indicator |
|--------|-------------|-------------------------|------------------|
| **Undervalued** | `score ≥ 30` | `discount > 20%` | Green border + badge |
| **Fair** | `-30 < score < 30` | `-20% ≤ discount ≤ 20%` | Yellow border + badge |
| **Overvalued** | `score ≤ -30` | `discount < -20%` | Red border + badge |
| **Unknown** | Missing data | Missing DCF or Price | Gray border + badge |

---

### Quality Status Thresholds

| Status | ROIC Range | Visual Indicator |
|--------|------------|------------------|
| **Moat** | `ROIC > 15%` | Green text |
| **High** | `10% < ROIC ≤ 15%` | Green text |
| **Moderate** | `5% < ROIC ≤ 10%` | Yellow text |
| **Low** | `ROIC ≤ 5%` | Red text |
| **Unknown** | Missing data | Muted text |

---

### Safety Status Thresholds

| Status | Net Debt/EBITDA Range | Visual Indicator |
|--------|----------------------|------------------|
| **Safe** | `< 3.0` | Green text |
| **Moderate** | `3.0 ≤ ratio < 5.0` | Yellow text |
| **Risky** | `≥ 5.0` | Red text |
| **Unknown** | Missing data | Muted text |

---

### Insider Activity Status

| Status | Net Sentiment | Visual Indicator |
|--------|---------------|------------------|
| **Net Accumulation** | `netSentiment > 0` | Green border + badge |
| **Net Distribution** | `netSentiment < 0` | Red border + badge |
| **Neutral** | `netSentiment = 0` | Default border |

---

## Data Flow Summary

### Real-Time Data Sources

All metrics are updated in real-time via Supabase Realtime subscriptions:

1. **Valuations**: Subscribed to `valuations` table
2. **Ratios**: Subscribed to `ratios_ttm` table
3. **Quotes**: Subscribed to `live_quote_indicators` table (via `RealtimeStockManager`)
4. **Insider Trading**: Subscribed to `insider_trading_statistics` and `insider_transactions` tables

### Calculation Triggers

Calculations are performed:
- **On initial page load**: When data is first fetched
- **On Realtime updates**: When subscribed tables receive updates
- **Reactively**: Using React hooks and state management

---

## Notes

### Hardcoded Values (To Be Implemented)

The following metrics are currently hardcoded and need to be calculated from financial statements:

1. **ROIC** - Requires NOPAT and Invested Capital calculation
2. **WACC** - Complex calculation requiring market data
3. **FCF Yield** - Requires Free Cash Flow from cash flow statements
4. **Net Debt/EBITDA** - Requires balance sheet and income statement data
5. **Altman Z-Score** - Requires multiple balance sheet and income statement components
6. **Interest Coverage** - Requires EBIT and Interest Expense

### Future Enhancements

- Historical trend calculations (ROIC vs WACC over time)
- Industry benchmarking (compare metrics to industry averages)
- Peer comparison (compare metrics to similar companies)
- Automated alerts (notify when metrics cross thresholds)

---

## Implementation Notes

### Type Safety Recommendations

When implementing ROIC calculation, use strict TypeScript interfaces to prevent runtime errors:

```typescript
interface BalanceSheetPayload {
  totalStockholdersEquity: number;
  shortTermDebt: number;
  longTermDebt: number;
  cashAndCashEquivalents: number;
}

/**
 * Calculates Invested Capital using the Financing Approach.
 * Why: This method is less prone to accounting anomalies in 'Current Liabilities'
 * (like deferred revenue or accounts payable) than the Operating Approach
 * and ensures Debt is correctly captured as capital employed.
 */
export const calculateInvestedCapital = (
  balanceSheet: BalanceSheetPayload
): number => {
  const {
    totalStockholdersEquity,
    shortTermDebt,
    longTermDebt,
    cashAndCashEquivalents,
  } = balanceSheet;

  const totalDebt = shortTermDebt + longTermDebt;

  // We subtract cash because we are calculating Operating ROIC,
  // assuming excess cash is not part of the core operations.
  return totalStockholdersEquity + totalDebt - cashAndCashEquivalents;
};
```

### Edge Case Handling Summary

1. **Negative DCF**: Treat as "Overvalued" (distressed company)
2. **Negative P/E**: Treat as "Very Expensive" (loss-making, no earnings yield)
3. **Negative PEG**: Treat as "Very Overvalued" (negative growth or earnings)
4. **Zero/Null Values**: Handle gracefully with appropriate status ("Unknown" or worst-case classification)
5. **Division by Zero**: Always validate denominators before division operations

---

## References

- **FinancialModelingPrep API**: https://financialmodelingprep.com/developer/docs/
- **DCF Methodology**: Standard discounted cash flow valuation model
- **Altman Z-Score**: Edward Altman's bankruptcy prediction model (1968)
- **ROIC Formula**: Standard return on invested capital calculation (Financing Approach)
- **WACC Formula**: Standard weighted average cost of capital calculation

