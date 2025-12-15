# Analysis Page: On-the-Fly Calculations

**Purpose:** Comprehensive documentation of all calculations performed dynamically on the Symbol Analysis Page (`/symbol/[ticker]`).

**Last Updated:** 2025-01-26

---

## Table of Contents

1. [Overview](#overview)
2. [Valuation Calculations](#valuation-calculations)
3. [Quality Calculations](#quality-calculations)
4. [Safety Calculations](#safety-calculations)
5. [Insider Activity Calculations](#insider-activity-calculations)
6. [Analyst Data Calculations](#analyst-data-calculations)
7. [Status Classification Algorithms](#status-classification-algorithms)
8. [Chart Data Processing](#chart-data-processing)
9. [Implementation Details](#implementation-details)

---

## Overview

The Symbol Analysis Page performs numerous calculations in real-time to transform raw financial data into actionable investment insights. All calculations are performed client-side using React hooks and memoization for performance.

### Calculation Categories

1. **Valuation Metrics**: DCF discount, price ratios, valuation status
2. **Quality Metrics**: ROIC, WACC, FCF Yield, quality status
3. **Safety Metrics**: Debt ratios, bankruptcy risk, interest coverage
4. **Insider Activity**: Net sentiment, dollar volumes, latest trades
5. **Analyst Data**: Consensus scoring, price target upside
6. **Status Classifications**: Multi-metric scoring systems for visual indicators

### Data Sources

- **Database Tables**: `profiles`, `live_quote_indicators`, `ratios_ttm`, `financial_statements`, `valuations`, `insider_trading_statistics`, `insider_transactions`, `grades_historical`, `analyst_price_targets`, `market_risk_premiums`, `treasury_rates`
- **Real-time Updates**: Calculations automatically update when subscribed tables receive new data
- **Calculation Functions**: Located in `src/lib/financial-calculations.ts` and `src/app/symbol/[ticker]/page.tsx`

---

## Valuation Calculations

### 1. DCF Discount Percentage

**Formula:**
```
discount = ((dcfFairValue - currentPrice) / dcfFairValue) × 100
```

**Inputs:**
- `dcfFairValue`: Latest DCF value from `valuations` table (where `valuation_type = 'dcf'`)
- `currentPrice`: Current stock price from `live_quote_indicators.current_price`

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (line ~124)

**Description:** Calculates the percentage discount (or premium) of current price relative to DCF fair value. Positive values indicate undervaluation, negative values indicate overvaluation.

**Edge Cases:**
- If `dcfFairValue ≤ 0`: Treated as "Overvalued" (distressed company)
- If `dcfFairValue` is null: Status becomes "Unknown"
- Division by zero protection: Validates `dcfFairValue > 0` before calculation

**Usage:**
- Displayed as "Upside" subtext in Valuation card
- Used in valuation status calculation (40% weight)

**Example:**
- DCF: $149.17, Price: $271.49
- Discount: ((149.17 - 271.49) / 149.17) × 100 = -82.0%
- Interpretation: Stock is trading 82% above fair value

---

### 2. Price History Chart Data

**Formula:**
```typescript
priceHistory = valuations
  .filter(v => v.valuation_type === 'dcf')
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .map(v => ({
    date: v.date,
    price: v.stock_price_at_calculation || currentPrice || 0,
    dcf: v.value
  }))
  .filter(h => h.price > 0)
```

**Inputs:**
- `valuations`: Array of DCF valuations from `valuations` table
- `currentPrice`: Fallback price from `live_quote_indicators.current_price`

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~625-641)

**Description:** Builds historical price vs DCF chart data. Uses `stock_price_at_calculation` from valuations table when available, otherwise falls back to current price.

**Limitations:**
- Only shows data points where DCF was calculated (typically 1-2 entries currently)
- Future enhancement: Could add dedicated historical price data for richer visualization

**Usage:**
- Rendered in Valuation card as Price vs DCF chart (Recharts ComposedChart)

---

### 3. Valuation Status (Composite Score)

**Formula:** Multi-metric scoring system with weighted signals

**Calculation Steps:**

1. **DCF Discount Signal (40% weight)**:
   - `discount > 20%` → +40 points (Undervalued)
   - `discount < -20%` → -40 points (Overvalued)
   - `discount > 0%` → +20 points (Slightly Undervalued)
   - `discount ≤ 0%` → -20 points (Slightly Overvalued)

2. **P/E Ratio Signal (30% weight)**:
   - `P/E < 0` or `P/E = null` → -30 points (Very Expensive - Loss-making)
   - `P/E < 15` → +30 points (Very Cheap)
   - `15 ≤ P/E < 20` → +15 points (Reasonable)
   - `20 ≤ P/E ≤ 25` → 0 points (Neutral)
   - `25 < P/E ≤ 30` → -15 points (Expensive)
   - `P/E > 30` → -30 points (Very Expensive)

3. **PEG Ratio Signal (30% weight)**:
   - `PEG < 0` or `PEG = null` → -30 points (Very Overvalued)
   - `PEG < 1.0` → +30 points (Undervalued)
   - `1.0 ≤ PEG < 1.5` → +15 points (Good)
   - `1.5 ≤ PEG ≤ 2.0` → 0 points (Neutral)
   - `2.0 < PEG ≤ 2.5` → -15 points (Overvalued)
   - `PEG > 2.5` → -30 points (Very Overvalued)

4. **Composite Score**:
   - Sum all signal points
   - Requires at least 2 signals to use composite score
   - If fewer than 2 signals, fall back to DCF-only logic

5. **Status Determination**:
   - `score ≥ 30` → **Undervalued** (Green border)
   - `score ≤ -30` → **Overvalued** (Red border)
   - `-30 < score < 30` → **Fair** (Yellow border)

**Inputs:**
- DCF Fair Value (from `valuations` table)
- Current Price (from `live_quote_indicators` table)
- P/E Ratio (from `ratios_ttm.price_to_earnings_ratio_ttm`)
- PEG Ratio (from `ratios_ttm.price_to_earnings_growth_ratio_ttm`)

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~105-220)

**Usage:**
- Determines colored border and status badge on Valuation card
- Visual indicator: Green = Undervalued, Red = Overvalued, Yellow = Fair

---

## Quality Calculations

### 1. ROIC (Return on Invested Capital)

**Formula:**
```
ROIC = NOPAT / Invested Capital
```

**Where:**
- **NOPAT** = Operating Income × (1 - Tax Rate)
  - Tax Rate = Income Tax Expense / Income Before Tax
- **Invested Capital** = Total Equity + Total Debt - Cash (Financing Approach)
  - Total Debt = Short Term Debt + Long Term Debt

**Inputs (from `financial_statements` table):**

**Income Statement (`income_statement_payload`):**
- `operatingIncome`
- `incomeBeforeTax`
- `incomeTaxExpense`

**Balance Sheet (`balance_sheet_payload`):**
- `totalStockholdersEquity`
- `shortTermDebt`
- `longTermDebt`
- `cashAndCashEquivalents`

**Calculation Location:** `src/lib/financial-calculations.ts` (lines ~73-135)

**Description:** Measures how efficiently a company uses its capital to generate profits. Higher ROIC indicates better capital allocation.

**Edge Cases:**
- If `Invested Capital ≤ 0`: Returns `None` (distressed company)
- If `NOPAT < 0`: ROIC will be negative (value destruction)
- Missing required fields: Returns `None`

**Usage:**
- Displayed as "ROIC" in Quality card
- Used in quality status calculation (40% weight for ROIC vs WACC spread)
- Used in ROIC history chart

**Why Financing Approach?**
- Less prone to accounting anomalies in Current Liabilities (e.g., deferred revenue, accounts payable)
- Ensures Debt is correctly captured as capital employed
- More reliable than Operating Approach which requires excluding non-interest-bearing current liabilities

---

### 2. WACC (Weighted Average Cost of Capital)

**Formula (Simplified - Cost of Equity Only):**
```
WACC = Re = Rf + β × (Rm - Rf)
```

**Where:**
- **Re** = Cost of Equity (using CAPM)
- **Rf** = Risk-Free Rate (10-year Treasury rate from `treasury_rates.year10`)
- **β** = Beta (from `profiles.beta`)
- **(Rm - Rf)** = Equity Risk Premium (from `market_risk_premiums.total_equity_risk_premium`)

**Inputs:**
- **Risk-Free Rate**: Latest 10-year Treasury rate from `treasury_rates` table
- **Beta**: Company beta from `profiles.beta`
- **Equity Risk Premium**: Market risk premium for company's country from `market_risk_premiums` table
  - Falls back to "United States" if company country not found
  - Falls back to first available if no match

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~683-729)

**Description:** Currently calculates simplified WACC using only cost of equity (assumes 100% equity financing). Full WACC calculation would include debt component: `WACC = (E/V × Re) + (D/V × Rd × (1-Tc))`.

**Edge Cases:**
- If market risk premiums or treasury rates not loaded: Returns `None`
- If beta is null: Returns `None`
- Missing country match: Falls back to United States, then first available

**Usage:**
- Displayed as "WACC" in Quality card
- Used in quality status calculation (ROIC vs WACC spread)
- Used in ROIC history chart (WACC line)

**Future Enhancement:**
- Implement full WACC with debt component
- Use actual debt-to-equity ratio from financial statements
- Include tax rate in calculation

---

### 3. FCF Yield (Free Cash Flow Yield)

**Formula:**
```
FCF Yield = Free Cash Flow / Market Cap
```

**Inputs:**
- **Free Cash Flow**: From `financial_statements.cash_flow_payload.freeCashFlow`
- **Market Cap**: From `live_quote_indicators.market_cap`

**Calculation Location:** `src/lib/financial-calculations.ts` (lines ~146-178)

**Description:** Measures the percentage return an investor would get if all free cash flow were paid out as dividends. Higher yield indicates better cash generation relative to market value.

**Edge Cases:**
- If `Market Cap ≤ 0`: Returns `None`
- If `Free Cash Flow` is negative: Yield will be negative (acceptable, indicates cash burn)
- Missing required fields: Returns `None`

**Usage:**
- Displayed as "FCF Yield" in Quality card
- Used in quality status calculation (15% weight)

---

### 4. ROIC History Chart Data

**Formula:**
```typescript
roicHistory = financialStatementsHistory
  .map(fs => {
    const roic = calculateROIC(fs);
    return {
      date: fs.date,
      dateLabel: `Q${quarter}/${yearShort}`, // e.g., "Q3/24"
      roic: roic * 100, // Convert to percentage
      wacc: wacc * 100  // Convert to percentage
    };
  })
  .filter(h => h !== null)
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
```

**Inputs:**
- `financialStatementsHistory`: Array of annual financial statements (FY period) from `financial_statements` table
- `wacc`: Current WACC value (constant across all data points)

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~739-792)

**Description:** Builds historical ROIC vs WACC chart data. Calculates ROIC for each financial statement and pairs with current WACC value. Deduplicates by fiscal year (keeps latest `fetched_at` for each year).

**Quarter Label Calculation:**
- Parses date string to extract year and month
- Calculates quarter: `Math.floor(month / 3) + 1`
- Formats as: `Q{quarter}/{last2DigitsOfYear}` (e.g., "Q3/24")

**Edge Cases:**
- Invalid date format: Returns `null` for that entry
- ROIC calculation fails: Returns `null` for that entry
- Missing WACC: Uses 0 for WACC line

**Usage:**
- Rendered in Quality card as ROIC vs WACC chart (Recharts ComposedChart)
- Shows up to 12 annual data points (3 years)

---

### 5. Quality Status (Composite Score)

**Formula:** Multi-metric scoring system with weighted signals

**Calculation Steps:**

1. **ROIC vs WACC Spread Signal (40% weight)**:
   - `spread > 10%` → +40 points (Exceptional value creation)
   - `spread > 5%` → +30 points (Strong value creation)
   - `spread > 0%` → +15 points (Creating value)
   - `spread > -5%` → -15 points (Marginally destroying value)
   - `spread ≤ -5%` → -40 points (Significantly destroying value)
   - If no WACC, uses absolute ROIC thresholds:
     - `ROIC > 20%` → +30 points
     - `ROIC > 15%` → +20 points
     - `ROIC > 10%` → +10 points
     - `ROIC > 5%` → 0 points
     - `ROIC > 0%` → -20 points
     - `ROIC ≤ 0%` → -40 points

2. **ROIC Absolute Level Signal (25% weight)**:
   - `ROIC > 20%` → +25 points (Exceptional)
   - `ROIC > 15%` → +20 points (Excellent)
   - `ROIC > 10%` → +10 points (Good)
   - `ROIC > 5%` → 0 points (Average)
   - `ROIC > 0%` → -15 points (Poor)
   - `ROIC ≤ 0%` → -30 points (Destroying value)

3. **Gross Margin Signal (20% weight)**:
   - `margin > 60%` → +20 points (Exceptional pricing power)
   - `margin > 40%` → +15 points (Strong pricing power)
   - `margin > 30%` → +5 points (Moderate pricing power)
   - `margin > 20%` → -5 points (Weak pricing power)
   - `margin ≤ 20%` → -15 points (Very weak pricing power)

4. **FCF Yield Signal (15% weight)**:
   - `yield > 10%` → +15 points (Exceptional cash generation)
   - `yield > 5%` → +10 points (Strong cash generation)
   - `yield > 3%` → +5 points (Moderate cash generation)
   - `yield > 0%` → -5 points (Weak cash generation)
   - `yield ≤ 0%` → -15 points (Negative cash flow)

5. **ROIC Trend Signal (bonus/penalty)**:
   - If `roicHistory.length >= 2`:
     - `trend > 5% points` → +10 points (Improving significantly)
     - `trend > 2% points` → +5 points (Improving moderately)
     - `trend < -5% points` → -10 points (Declining significantly)
     - `trend < -2% points` → -5 points (Declining moderately)

6. **Status Determination**:
   - Requires at least 2 signals for valid assessment
   - `score ≥ 50` → **Excellent** (Green)
   - `score ≥ 20` → **Good** (Green)
   - `score ≥ -10` → **Average** (Yellow)
   - `score < -10` → **Poor** (Red)

**Inputs:**
- ROIC (calculated from `financial_statements`)
- WACC (calculated from market data)
- Gross Margin (from `ratios_ttm.gross_profit_margin_ttm`)
- FCF Yield (calculated from `financial_statements` and `live_quote_indicators`)
- ROIC History (array of historical ROIC values)

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~222-379)

**Usage:**
- Determines status badge and colored border on Quality card
- Determines status badge in Intelligent Scorecard at top of page

---

## Safety Calculations

### 1. Net Debt to EBITDA

**Formula:**
```
Net Debt / EBITDA
```

**Where:**
- **Net Debt** = Total Debt - Cash and Cash Equivalents
  - Total Debt = Short Term Debt + Long Term Debt
- **EBITDA** = EBITDA from income statement (or Operating Income + Depreciation & Amortization)

**Inputs (from `financial_statements` table):**

**Balance Sheet (`balance_sheet_payload`):**
- `shortTermDebt`
- `longTermDebt`
- `cashAndCashEquivalents`

**Income Statement (`income_statement_payload`):**
- `ebitda` (preferred) or `operatingIncome + depreciationAndAmortization`

**Calculation Location:** `src/lib/financial-calculations.ts` (lines ~193-252)

**Description:** Measures how many years it would take to pay off net debt using EBITDA. Lower ratio indicates better debt management.

**Edge Cases:**
- If `EBITDA ≤ 0`: Returns `None` (company is losing money, ratio not meaningful)
- Missing required fields: Returns `None`

**Usage:**
- Displayed as "Net Debt/EBITDA" in Safety card
- Used in safety status calculation (40% weight)

**Interpretation:**
- `< 1.0x`: Exceptional (very low debt burden)
- `1.0-2.0x`: Excellent (low debt burden)
- `2.0-3.0x`: Good (safe level)
- `3.0-5.0x`: Moderate (moderate risk)
- `5.0-7.0x`: Risky (high debt burden)
- `> 7.0x`: Very Risky (very high debt burden)

---

### 2. Altman Z-Score

**Formula:**
```
Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
```

**Where:**
- **A** = Working Capital / Total Assets
  - Working Capital = Current Assets - Current Liabilities
- **B** = Retained Earnings / Total Assets
- **C** = EBIT / Total Assets
  - Uses `ebit` if available, otherwise falls back to `operatingIncome`
- **D** = Market Value of Equity / Total Liabilities
  - Market Value of Equity = Market Cap (from `live_quote_indicators`)
- **E** = Sales (Revenue) / Total Assets

**Inputs (from `financial_statements` and `live_quote_indicators`):**

**Balance Sheet (`balance_sheet_payload`):**
- `totalAssets`
- `totalCurrentAssets` or `currentAssets` (supports both field names)
- `totalCurrentLiabilities` or `currentLiabilities` (supports both field names)
- `retainedEarnings`
- `totalLiabilities`

**Income Statement (`income_statement_payload`):**
- `ebit` or `operatingIncome`
- `revenue`

**Market Data:**
- `market_cap` (from `live_quote_indicators`)

**Calculation Location:** `src/lib/financial-calculations.ts` (lines ~275-350)

**Description:** Bankruptcy risk indicator. Higher Z-Score indicates lower bankruptcy risk.

**Edge Cases:**
- If `marketCap` is missing: Returns `None`
- Missing required fields: Returns `None`
- Division by zero protection: Validates denominators before division

**Usage:**
- Displayed as "Altman Z-Score" in Safety card
- Used in safety status calculation (35% weight)

**Interpretation:**
- `Z > 2.99`: Safe Zone (low bankruptcy risk)
- `1.81 < Z ≤ 2.99`: Grey Zone (moderate risk)
- `Z ≤ 1.81`: Distress Zone (high bankruptcy risk)

---

### 3. Interest Coverage Ratio

**Formula:**
```
Interest Coverage = EBIT / Interest Expense
```

**Where:**
- **EBIT** = Earnings Before Interest and Taxes (or Operating Income)
- **Interest Expense** = Interest expense from income statement

**Inputs (from `financial_statements.income_statement_payload`):**
- `ebit` (preferred) or `operatingIncome`
- `interestExpense`

**Calculation Location:** `src/lib/financial-calculations.ts` (lines ~367-405)

**Description:** Measures ability to pay interest obligations. Higher ratio indicates better ability to service debt.

**Edge Cases:**
- If `Interest Expense ≤ 0`: Returns `999` (perfect/infinite coverage - company has no interest expense or has interest income)
- Missing required fields: Returns `None`

**Usage:**
- Displayed as "Interest Coverage" in Safety card
- Used in safety status calculation (25% weight)

**Interpretation:**
- `> 10x`: Exceptional (very safe)
- `5-10x`: Excellent (safe)
- `3-5x`: Good (adequate)
- `1.5-3x`: Moderate (tight coverage)
- `0-1.5x`: Risky (may struggle to pay interest)
- `< 0`: Critical (cannot cover interest)
- `999x`: Perfect coverage (no interest expense)

---

### 4. Safety Status (Composite Score)

**Formula:** Multi-metric scoring system with weighted signals

**Calculation Steps:**

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
   - `≥ 999x` → +25 points (Perfect coverage - no interest expense)
   - `> 10x` → +25 points (Exceptional)
   - `5-10x` → +20 points (Excellent)
   - `3-5x` → +10 points (Good)
   - `1.5-3x` → -15 points (Moderate)
   - `0-1.5x` → -30 points (Risky)
   - `< 0` → -40 points (Critical)

4. **Status Determination**:
   - Requires at least 2 signals for valid assessment
   - `score ≥ 50` → **Safe** (Green)
   - `score ≥ 10` → **Moderate** (Yellow)
   - `score < 10` → **Risky** (Red)

**Inputs:**
- Net Debt to EBITDA (calculated from `financial_statements`)
- Altman Z-Score (calculated from `financial_statements` + `live_quote_indicators`)
- Interest Coverage (calculated from `financial_statements`)

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~381-483)

**Usage:**
- Determines status badge and colored border on Safety card
- Determines status badge in Intelligent Scorecard at top of page

---

## Insider Activity Calculations

### 1. Net Insider Sentiment

**Formula:**
```
netSentiment = totalAcquiredShares - totalDisposedShares
```

**Where:**
- **totalAcquiredShares** = Sum of `total_acquired` from last 6 months (2 quarters)
- **totalDisposedShares** = Sum of `total_disposed` from last 6 months (2 quarters)

**Inputs (from `insider_trading_statistics` table):**
- Last 2 quarters of data (sorted by year and quarter descending)
- `total_acquired` field
- `total_disposed` field

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~829-835)

**Description:** Calculates net insider sentiment by subtracting total disposed shares from total acquired shares over the last 6 months. Positive values indicate net accumulation (bullish), negative values indicate net distribution (bearish).

**Usage:**
- Determines colored border on Insider Activity card:
  - `netSentiment > 0` → Green border (Net Accumulation)
  - `netSentiment < 0` → Red border (Net Distribution)
  - `netSentiment = 0` → Default border (Neutral)

---

### 2. Net Buy Volume (Dollar Value)

**⚠️ Important Note:** This metric represents the **current market value** of shares acquired, not the actual capital committed at the time of purchase. If an insider bought shares at $10 and the price is now $100, this will show 10x the actual purchase amount.

**Formula:**
```
netBuyVolume = totalAcquiredShares × currentPrice
```

**Inputs:**
- **totalAcquiredShares**: Sum of `total_acquired` from last 6 months (from `insider_trading_statistics` table)
- **currentPrice**: Current stock price from `live_quote_indicators.current_price`

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~841-843)

**Description:** Converts total acquired shares to dollar value using **current stock price** (not transaction price).

**Limitations:**
- Does not reflect actual purchase price paid by insiders
- Future enhancement: If FMP API provides `transaction_price`, should use: `sum(securities_transacted × transaction_price)` for accurate volume

**Edge Cases:**
- If `currentPrice` is null: Returns `None`
- If `totalAcquiredShares = 0`: Returns `None`

**Usage:**
- Displayed as "Buying" value in Insider Activity card
- Formatted as currency: `formatFinancialValue(netBuyVolume, "USD", 1, exchangeRates)`

---

### 3. Net Sell Volume (Dollar Value)

**⚠️ Important Note:** This metric represents the **current market value** of shares disposed, not the actual proceeds received at the time of sale. If an insider sold shares at $10 and the price is now $100, this will show 10x the actual sale proceeds.

**Formula:**
```
netSellVolume = totalDisposedShares × currentPrice
```

**Inputs:**
- **totalDisposedShares**: Sum of `total_disposed` from last 6 months (from `insider_trading_statistics` table)
- **currentPrice**: Current stock price from `live_quote_indicators.current_price`

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~844-846)

**Description:** Converts total disposed shares to dollar value using **current stock price** (not transaction price).

**Limitations:**
- Does not reflect actual sale price received by insiders
- Future enhancement: If FMP API provides `transaction_price`, should use: `sum(securities_transacted × transaction_price)` for accurate volume

**Edge Cases:**
- If `currentPrice` is null: Returns `None`
- If `totalDisposedShares = 0`: Returns `None`

**Usage:**
- Displayed as "Selling" value in Insider Activity card
- Formatted as currency: `formatFinancialValue(netSellVolume, "USD", 1, exchangeRates)`

---

### 4. Latest Trade Information

**Formula:**
```typescript
latestTrade = {
  name: latestTransaction.reporting_name || "Unknown",
  action: latestTransaction.acquisition_or_disposition === "A" ? "Bought" : "Sold",
  shares: Number(latestTransaction.securities_transacted || 0),
  date: formatRelativeDate(latestTransaction.transaction_date || latestTransaction.filing_date)
}
```

**Inputs (from `insider_transactions` table):**
- Most recent transaction (sorted by `transaction_date` or `filing_date` descending)
- `reporting_name`: Name of the insider
- `acquisition_or_disposition`: "A" = Acquisition (Bought), "D" = Disposition (Sold)
- `securities_transacted`: Number of shares transacted
- `transaction_date` or `filing_date`: Date of the transaction

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~848-880)

**Description:** Extracts and formats the most recent insider transaction for display.

**Date Formatting:**
- Calculates days difference from current date
- Formats as: "Today", "1 day ago", or "{n} days ago"
- Falls back to `filing_date` if `transaction_date` is not available

**Edge Cases:**
- If no transactions: Returns `None`
- Missing date fields: Returns "Unknown" for date

**Usage:**
- Displayed as "Latest" trade in Insider Activity card
- Shows: `{name} {action} {shares} shares ({date})`

---

## Analyst Data Calculations

### 1. Analyst Consensus (Weighted Score)

**Formula:**
```
weightedScore = (strongBuy × 2 + buy × 1 + hold × 0 + sell × -1 + strongSell × -2) / total
```

**Where:**
- **strongBuy**, **buy**, **hold**, **sell**, **strongSell**: Counts from latest `grades_historical` entry
- **total**: Sum of all rating counts

**Inputs (from `grades_historical` table):**
- Latest entry (sorted by `date` descending)
- `analyst_ratings_strong_buy`
- `analyst_ratings_buy`
- `analyst_ratings_hold`
- `analyst_ratings_sell`
- `analyst_ratings_strong_sell`

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~898-932)

**Description:** Calculates weighted consensus score from analyst ratings. Maps score to consensus string.

**Mapping:**
- `weightedScore ≥ 1.5` → "Strong Buy"
- `weightedScore ≥ 0.5` → "Buy"
- `weightedScore ≥ -0.5` → "Hold"
- `weightedScore ≥ -1.5` → "Sell"
- `weightedScore < -1.5` → "Strong Sell"

**Edge Cases:**
- If no grades data: Returns `None`
- If total = 0: Returns `None`

**Usage:**
- Displayed as "Analyst Consensus" in Contrarian Indicators card
- Used in contrarian indicators status calculation

---

### 2. Price Target Upside

**Formula:**
```
upside = ((priceTarget - currentPrice) / currentPrice) × 100
```

**Inputs:**
- **priceTarget**: Analyst price target consensus from `analyst_price_targets.target_consensus`
- **currentPrice**: Current stock price from `live_quote_indicators.current_price`

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (implicit in contrarian status calculation)

**Description:** Calculates the percentage upside (or downside) to analyst price target. Positive values indicate upside potential, negative values indicate downside risk.

**Usage:**
- Displayed as subtext in Contrarian Indicators card
- Used in contrarian indicators status calculation

---

### 3. Contrarian Indicators Status

**Formula:** Signal-based scoring system

**Calculation Steps:**

1. **Analyst Consensus Signal**:
   - "Strong Buy" → +2 bullish signals
   - "Buy" → +1 bullish signal
   - "Sell" → +1 bearish signal
   - "Strong Sell" → +2 bearish signals

2. **Price Target Upside Signal**:
   - `upside > 10%` → +2 bullish signals (Strong bullish)
   - `upside > 0%` → +1 bullish signal (Moderate bullish)
   - `upside < -10%` → +2 bearish signals (Strong bearish)
   - `upside < 0%` → +1 bearish signal (Moderate bearish)

3. **Status Determination**:
   - `bullishSignals > bearishSignals && bullishSignals ≥ 2` → **Bullish** (Green)
   - `bearishSignals > bullishSignals && bearishSignals ≥ 2` → **Bearish** (Red)
   - `bullishSignals > bearishSignals` → **Moderately Bullish** (Green)
   - `bearishSignals > bullishSignals` → **Moderately Bearish** (Red)
   - Otherwise → **Neutral** (Yellow)

**Inputs:**
- Analyst Consensus (calculated from `grades_historical`)
- Price Target (from `analyst_price_targets.target_consensus`)
- Current Price (from `live_quote_indicators.current_price`)

**Calculation Location:** `src/app/symbol/[ticker]/page.tsx` (lines ~485-537)

**Usage:**
- Determines status badge and colored border on Contrarian Indicators card

---

## Status Classification Algorithms

### Overview

The analysis page uses composite scoring systems to classify metrics into status categories (Undervalued/Fair/Overvalued, Excellent/Good/Average/Poor, Safe/Moderate/Risky). These classifications are used for visual indicators (colored borders, badges) and help users quickly assess investment quality.

### Common Patterns

1. **Weighted Signals**: Each metric contributes points based on its importance (weight)
2. **Threshold-Based Scoring**: Points are assigned based on value ranges
3. **Composite Score**: All signal points are summed
4. **Status Mapping**: Composite score maps to status category
5. **Minimum Signals**: Requires minimum number of signals for valid assessment

### Status Color Coding

- **Green**: Positive status (Undervalued, Excellent, Good, Safe, Bullish)
- **Yellow**: Neutral/moderate status (Fair, Average, Moderate, Neutral)
- **Red**: Negative status (Overvalued, Poor, Risky, Bearish)
- **Gray/Muted**: Unknown status (missing data)

---

## Chart Data Processing

### 1. Price vs DCF Chart

**Data Source:** `valuations` table (filtered for `valuation_type = 'dcf'`)

**Processing:**
1. Filter for DCF valuations only
2. Sort by date ascending
3. Map to chart format: `{ date, price, dcf }`
4. Use `stock_price_at_calculation` if available, otherwise fall back to current price
5. Filter out entries with invalid prices (`price > 0`)

**Chart Type:** Recharts ComposedChart with Area (DCF) and Line (Price)

**Limitations:**
- Only shows data points where DCF was calculated
- Typically 1-2 entries currently
- Future: Could add dedicated historical price data

---

### 2. ROIC vs WACC Chart

**Data Source:** `financial_statements` table (filtered for `period = 'FY'`)

**Processing:**
1. Fetch annual financial statements (FY period)
2. Deduplicate by fiscal year (keep latest `fetched_at` for each year)
3. Calculate ROIC for each statement
4. Pair with current WACC value (constant across all points)
5. Format quarter labels: `Q{quarter}/{yearShort}`
6. Convert ROIC and WACC to percentages (× 100)
7. Sort chronologically
8. Limit to latest 12 data points (3 years)

**Chart Type:** Recharts ComposedChart with Area (ROIC) and Line (WACC)

**Quarter Label Calculation:**
- Parse date string: `YYYY-MM-DD`
- Extract year and month
- Calculate quarter: `Math.floor(month / 3) + 1`
- Format: `Q{quarter}/{last2DigitsOfYear}`

---

## Implementation Details

### Calculation Timing

Calculations are performed:
- **On initial page load**: When data is first fetched from database
- **On real-time updates**: When subscribed tables receive updates via Supabase Realtime
- **Reactively**: Using React hooks (`useMemo`, `useEffect`) and state management

### Performance Optimizations

1. **Memoization**: Expensive calculations are memoized using `useMemo` to prevent unnecessary recalculations
2. **Lazy Evaluation**: Calculations only run when required data is available
3. **Batch Processing**: Multiple calculations grouped in single `useMemo` hooks
4. **Conditional Rendering**: Charts and metrics only render when data is available

### Error Handling

1. **Option Types**: Uses Effect library's `Option` type for safe handling of potentially missing data
2. **Edge Case Validation**: All calculations validate inputs before processing
3. **Graceful Degradation**: Missing data results in "Unknown" status rather than errors
4. **Console Logging**: Errors logged to console for debugging

### Data Validation

1. **Type Guards**: TypeScript interfaces ensure type safety
2. **Null Checks**: All calculations check for null/undefined values
3. **Finite Checks**: Validates `isFinite()` for all numeric results
4. **Division by Zero**: All divisions validate denominators before calculation

### Real-time Updates

Calculations automatically update when:
- `live_quote_indicators` table receives price updates
- `ratios_ttm` table receives ratio updates
- `valuations` table receives new DCF calculations
- `insider_trading_statistics` or `insider_transactions` receive new data
- `financial_statements` receive new statements

Subscriptions are managed via Supabase Realtime and React hooks.

---

## References

- **Financial Calculations Module**: `src/lib/financial-calculations.ts`
- **Analysis Page Component**: `src/app/symbol/[ticker]/page.tsx`
- **Financial Calculations Documentation**: `docs/architecture/FINANCIAL_CALCULATIONS.md`
- **Symbol Analysis Page Cards**: `docs/architecture/SYMBOL_ANALYSIS_PAGE_CARDS.md`

---

## Future Enhancements

1. **Full WACC Calculation**: Include debt component and tax rate
2. **Historical Price Data**: Add dedicated historical price data for richer charts
3. **Transaction Price Tracking**: Use actual transaction prices for insider activity dollar volumes
4. **Industry Benchmarking**: Compare metrics to industry averages
5. **Peer Comparison**: Compare metrics to similar companies
6. **Automated Alerts**: Notify when metrics cross thresholds
7. **Sensitivity Analysis**: Show metric ranges based on different assumptions
