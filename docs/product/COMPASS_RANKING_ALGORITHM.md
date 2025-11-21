# Compass Ranking Algorithm: Technical Documentation

## Document Purpose

This document provides a complete, standalone analysis of the Compass ranking algorithm. It contains all necessary context, definitions, examples, and mathematical formulations required to understand, evaluate, and analyze the algorithm without access to the codebase, database, or any external systems.

**Intended Audience**: Financial analysts, data scientists, product managers, investors, and technical reviewers who need to understand how stocks are ranked in the Compass system.

**Document Scope**: This document covers the complete algorithm from raw financial data to final ranked output, including all intermediate calculations, design decisions, and practical examples.

---

## Overview

The Compass ranking algorithm is a sophisticated multi-factor stock ranking system that evaluates companies across five investment pillars: **Value**, **Growth**, **Profitability**, **Income**, and **Health**. The algorithm normalizes financial metrics, aggregates them into pillar scores, and combines them using user-configurable weights to produce a composite score that ranks stocks from 0-100.

### Key Characteristics

- **Multi-Factor**: Evaluates stocks across 8 financial ratios grouped into 5 investment pillars
- **Normalized**: All metrics converted to 0-100 scale using percentile ranking
- **Configurable**: User-adjustable weights allow customization for different investment styles
- **Relative**: Ranks stocks relative to the current universe, not absolute benchmarks
- **Filtered**: Only includes actively trading equity securities (excludes funds, ETFs, ADRs)
- **Top 50**: Returns the highest-ranked 50 stocks for the given weight configuration

## Table of Contents

1. [Financial Metrics Reference](#financial-metrics-reference)
2. [Algorithm Architecture](#algorithm-architecture)
3. [Step 1: Metric Normalization](#step-1-metric-normalization)
4. [Step 2: Pillar Score Calculation](#step-2-pillar-score-calculation)
5. [Step 3: Composite Score Calculation](#step-3-composite-score-calculation)
6. [Step 4: Ranking and Filtering](#step-4-ranking-and-filtering)
7. [Investor Profiles](#investor-profiles)
8. [Data Sources and Universe](#data-sources-and-universe)
9. [Implementation Details](#implementation-details)
10. [Comprehensive Example Calculations](#comprehensive-example-calculations)
11. [Edge Cases and Special Scenarios](#edge-cases-and-special-scenarios)
12. [Design Rationale](#design-rationale)
13. [Interpretation Guide](#interpretation-guide)
14. [Validation and Testing](#validation-and-testing)

---

## Financial Metrics Reference

Before understanding the algorithm, it's essential to understand what each financial metric represents, what "good" and "bad" values look like, and how they're interpreted in the context of stock analysis.

### Value Metrics (Lower is Better)

These metrics measure how "cheap" a stock is relative to its fundamentals. Lower ratios indicate the stock is trading at a discount to its intrinsic value.

#### Price-to-Book Ratio (P/B)

**Definition**: Market price per share divided by book value per share.

**Formula**: `P/B = Market Price / Book Value per Share`

**Interpretation**:
- **P/B < 1.0**: Stock trading below book value (potentially undervalued)
- **P/B = 1.0**: Stock trading at book value
- **P/B > 1.0**: Stock trading above book value (premium valuation)
- **P/B > 3.0**: Often considered expensive

**Typical Range**: 0.5 to 10.0 (can be higher for growth stocks or lower for distressed companies)

**Why Lower is Better**: A lower P/B suggests you're paying less for each dollar of the company's net assets.

**Example**: If a stock has P/B = 0.8, you're paying $0.80 for each $1.00 of book value.

#### Price-to-Sales Ratio (P/S)

**Definition**: Market capitalization divided by total revenue.

**Formula**: `P/S = Market Cap / Total Revenue`

**Interpretation**:
- **P/S < 1.0**: Very cheap relative to sales
- **P/S = 1.0-3.0**: Moderate valuation
- **P/S > 5.0**: Expensive relative to sales

**Typical Range**: 0.1 to 20.0 (varies significantly by industry)

**Why Lower is Better**: A lower P/S means you're paying less for each dollar of revenue the company generates.

**Example**: If a company has $1B in revenue and $2B market cap, P/S = 2.0.

#### Enterprise Value Multiple (EVM)

**Definition**: Enterprise value divided by EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization).

**Formula**: `EVM = Enterprise Value / EBITDA`

**Interpretation**:
- **EVM < 5.0**: Potentially undervalued
- **EVM = 5.0-10.0**: Moderate valuation
- **EVM > 15.0**: Expensive

**Typical Range**: 2.0 to 30.0 (highly variable by industry)

**Why Lower is Better**: Lower EVM indicates the company's operations are valued more reasonably relative to its cash-generating ability.

**Note**: Enterprise Value = Market Cap + Debt - Cash, so it accounts for the company's capital structure.

#### Price-to-Earnings Growth Ratio (PEG)

**Definition**: Price-to-Earnings ratio divided by earnings growth rate.

**Formula**: `PEG = (P/E Ratio) / (Earnings Growth Rate %)`

**Interpretation**:
- **PEG < 1.0**: Potentially undervalued relative to growth
- **PEG = 1.0**: Fairly valued
- **PEG > 2.0**: Potentially overvalued relative to growth

**Typical Range**: 0.1 to 10.0

**Why Lower is Better**: A lower PEG means you're paying less for each percentage point of earnings growth.

**Example**: If P/E = 20 and earnings growth = 10%, PEG = 2.0 (expensive). If P/E = 15 and growth = 20%, PEG = 0.75 (cheap).

**Note**: This metric is used for the Growth pillar, not Value, because it measures growth value.

### Positive Metrics (Higher is Better)

These metrics measure desirable financial characteristics. Higher values indicate stronger performance.

#### Net Profit Margin (NPM)

**Definition**: Net income divided by total revenue, expressed as a percentage.

**Formula**: `NPM = (Net Income / Revenue) × 100%`

**Interpretation**:
- **NPM < 5%**: Low profitability (common in retail, grocery)
- **NPM = 5-15%**: Moderate profitability
- **NPM > 20%**: High profitability (common in software, pharmaceuticals)

**Typical Range**: -50% to 50% (can be negative for unprofitable companies)

**Why Higher is Better**: Higher margins mean the company keeps more profit from each dollar of revenue.

**Example**: If revenue = $100M and net income = $15M, NPM = 15%.

**Industry Context**: Software companies often have 20-30% margins, while grocery stores have 1-3% margins.

#### Asset Turnover (AT)

**Definition**: Total revenue divided by average total assets.

**Formula**: `AT = Revenue / Average Total Assets`

**Interpretation**:
- **AT < 0.5**: Low efficiency (assets not generating much revenue)
- **AT = 0.5-1.5**: Moderate efficiency
- **AT > 2.0**: High efficiency (assets generating significant revenue)

**Typical Range**: 0.1 to 5.0

**Why Higher is Better**: Higher turnover means the company generates more revenue per dollar of assets invested.

**Example**: If assets = $50M and revenue = $75M, AT = 1.5.

**Industry Context**: Retail companies often have high asset turnover (2.0+), while utilities have low turnover (0.3-0.5).

#### Dividend Yield

**Definition**: Annual dividend per share divided by stock price, expressed as a percentage.

**Formula**: `Dividend Yield = (Annual Dividend / Stock Price) × 100%`

**Interpretation**:
- **Yield < 1%**: Low dividend (growth companies, tech)
- **Yield = 1-3%**: Moderate dividend
- **Yield > 4%**: High dividend (income stocks, REITs, utilities)

**Typical Range**: 0% to 15% (can be 0% for non-dividend payers)

**Why Higher is Better**: Higher yield provides more income to shareholders.

**Example**: If stock price = $100 and annual dividend = $3, yield = 3%.

**Note**: Very high yields (>10%) may indicate financial distress or unsustainable dividends.

### Health Metric (Lower is Better)

#### Debt-to-Equity Ratio (D/E)

**Definition**: Total debt divided by total shareholders' equity.

**Formula**: `D/E = Total Debt / Total Equity`

**Interpretation**:
- **D/E < 0.5**: Low leverage (conservative)
- **D/E = 0.5-1.5**: Moderate leverage
- **D/E > 2.0**: High leverage (risky)
- **D/E > 5.0**: Very high leverage (distressed)

**Typical Range**: 0.0 to 10.0+ (can be negative if equity is negative)

**Why Lower is Better**: Lower debt means less financial risk and more financial flexibility.

**Example**: If debt = $50M and equity = $100M, D/E = 0.5.

**Industry Context**: Utilities and real estate often have high D/E (2.0-4.0), while tech companies often have low D/E (<0.5).

**Note**: Negative D/E (negative equity) indicates the company has more liabilities than assets, a sign of financial distress.

---

## Algorithm Architecture

The algorithm follows a three-stage pipeline:

```
Raw Financial Ratios
    ↓
[Step 1: Normalization]
    ↓
Normalized Metrics (0-100 scale)
    ↓
[Step 2: Pillar Aggregation]
    ↓
Pillar Scores (Value, Growth, Profitability, Income, Health)
    ↓
[Step 3: Weighted Combination]
    ↓
Composite Score (0-100)
    ↓
[Step 4: Ranking]
    ↓
Top 50 Ranked Stocks
```

---

## Step 1: Metric Normalization

### Purpose

Financial ratios have vastly different scales and distributions. A Price-to-Book ratio might range from 0.5 to 50, while a Net Profit Margin ranges from -10% to 30%. Normalization converts all metrics to a 0-100 scale, making them comparable and preventing any single metric from dominating the ranking.

### Method: Percentile Ranking

The algorithm uses PostgreSQL's `PERCENT_RANK()` window function, which calculates the relative rank of a value within its distribution:

```
PERCENT_RANK() = (Number of values below this value) / (Total number of values - 1)
```

This produces a value between 0 and 1, which is then multiplied by 100 to get a 0-100 score.

### Normalized Metrics

#### Value Metrics (Lower is Better → Inverted)

These metrics measure how "cheap" a stock is relative to its fundamentals. Lower ratios indicate better value, so the algorithm inverts the percentile rank:

**1. Price-to-Book Ratio (P/B)**
```sql
norm_pb = (1 - PERCENT_RANK() OVER (ORDER BY price_to_book_ratio_ttm ASC)) * 100
```
- **Source**: `ratios_ttm.price_to_book_ratio_ttm`
- **Interpretation**: A stock with P/B in the 10th percentile (very low) gets a score of 90
- **Example**: If a stock has the lowest P/B ratio, `PERCENT_RANK()` = 0, so `norm_pb` = 100

**2. Price-to-Sales Ratio (P/S)**
```sql
norm_ps = (1 - PERCENT_RANK() OVER (ORDER BY price_to_sales_ratio_ttm ASC)) * 100
```
- **Source**: `ratios_ttm.price_to_sales_ratio_ttm`
- **Interpretation**: Lower P/S ratios score higher

**3. Enterprise Value Multiple (EVM)**
```sql
norm_evm = (1 - PERCENT_RANK() OVER (ORDER BY enterprise_value_multiple_ttm ASC)) * 100
```
- **Source**: `ratios_ttm.enterprise_value_multiple_ttm`
- **Interpretation**: Lower EVM ratios score higher

**4. Price-to-Earnings Growth Ratio (PEG)**
```sql
norm_peg = (1 - PERCENT_RANK() OVER (ORDER BY price_to_earnings_growth_ratio_ttm ASC)) * 100
```
- **Source**: `ratios_ttm.price_to_earnings_growth_ratio_ttm`
- **Interpretation**: Lower PEG ratios indicate better growth value
- **Note**: This metric is used directly for the Growth pillar score

#### Positive Metrics (Higher is Better)

These metrics measure desirable financial characteristics. Higher values are better, so the percentile rank is used directly:

**5. Net Profit Margin (NPM)**
```sql
norm_npm = PERCENT_RANK() OVER (ORDER BY net_profit_margin_ttm ASC) * 100
```
- **Source**: `ratios_ttm.net_profit_margin_ttm`
- **Interpretation**: A stock with the highest profit margin gets a score of 100

**6. Asset Turnover (AT)**
```sql
norm_at = PERCENT_RANK() OVER (ORDER BY asset_turnover_ttm ASC) * 100
```
- **Source**: `ratios_ttm.asset_turnover_ttm`
- **Interpretation**: Higher asset turnover indicates more efficient use of assets

**7. Dividend Yield**
```sql
norm_div_yield = PERCENT_RANK() OVER (ORDER BY dividend_yield_ttm ASC) * 100
```
- **Source**: `ratios_ttm.dividend_yield_ttm`
- **Interpretation**: Higher dividend yields score higher
- **Note**: This metric is used directly for the Income pillar score

#### Health Metric (Lower is Better → Inverted)

**8. Debt-to-Equity Ratio (D/E)**
```sql
norm_de = (1 - PERCENT_RANK() OVER (ORDER BY debt_to_equity_ratio_ttm ASC)) * 100
```
- **Source**: `ratios_ttm.debt_to_equity_ratio_ttm`
- **Interpretation**: Lower debt-to-equity ratios indicate better financial health
- **Note**: This metric is used directly for the Health pillar score

### Why Percentile Ranking?

1. **Robust to Outliers**: Extreme values don't skew the entire distribution
2. **Scale-Independent**: Works regardless of the original metric's scale
3. **Relative Comparison**: Ranks stocks relative to the entire universe, not absolute values
4. **Handles Missing Data**: Stocks with missing ratios get a percentile rank based on available data

### Percentile Ranking Example

To illustrate how percentile ranking works, consider a universe of 10 stocks with the following P/B ratios:

| Stock | P/B Ratio | Rank (Ascending) | Percentile Rank | Normalized Score (Inverted) |
|-------|----------|------------------|-----------------|----------------------------|
| A     | 0.5      | 1                | 0.0             | 100.0                      |
| B     | 1.0      | 2                | 0.11            | 88.9                       |
| C     | 1.5      | 3                | 0.22            | 77.8                       |
| D     | 2.0      | 4                | 0.33            | 66.7                       |
| E     | 2.5      | 5                | 0.44            | 55.6                       |
| F     | 3.0      | 6                | 0.56            | 44.4                       |
| G     | 4.0      | 7                | 0.67            | 33.3                       |
| H     | 5.0      | 8                | 0.78            | 22.2                       |
| I     | 7.0      | 9                | 0.89            | 11.1                       |
| J     | 10.0     | 10               | 1.0             | 0.0                        |

**Calculation for Stock C (P/B = 1.5, Rank 3)**:
- Percentile Rank = (3 - 1) / (10 - 1) = 2/9 = 0.222...
- Since P/B is inverted (lower is better): Normalized Score = (1 - 0.222) × 100 = 77.78

**Key Insight**: Stock A with the lowest P/B (0.5) gets the highest normalized score (100), while Stock J with the highest P/B (10.0) gets the lowest score (0).

### Handling Missing Data

If a stock has a NULL value for a metric:
- It's excluded from the percentile ranking calculation for that metric
- The percentile rank is calculated only among stocks with non-NULL values
- If all stocks have NULL for a metric, all get a percentile rank of 0.5 (middle score)

**Example**: If 100 stocks have P/B data and 10 have NULL:
- Percentile ranks are calculated among the 100 stocks with data
- The 10 stocks with NULL are not included in the ranking
- If a stock needs a P/B score but has NULL, it may be excluded from pillar calculations or assigned a default value

---

## Step 2: Pillar Score Calculation

The normalized metrics are aggregated into five investment pillars, each representing a different investment philosophy.

### 1. Value Score

**Formula:**
```sql
value_score = (norm_pb + norm_ps + norm_evm) / 3
```

**Components:**
- Price-to-Book Ratio (norm_pb)
- Price-to-Sales Ratio (norm_ps)
- Enterprise Value Multiple (norm_evm)

**Rationale**: Value investing seeks stocks trading below their intrinsic value. By averaging three valuation metrics, the algorithm captures different aspects of value (book value, sales, enterprise value).

**Range**: 0-100

### 2. Growth Score

**Formula:**
```sql
growth_score = norm_peg
```

**Components:**
- Price-to-Earnings Growth Ratio (norm_peg)

**Rationale**: The PEG ratio measures how much investors pay for each unit of earnings growth. Lower PEG ratios indicate better growth value, which is why the normalized PEG (which inverts low values to high scores) is used directly.

**Range**: 0-100

### 3. Profitability Score

**Formula:**
```sql
profitability_score = (norm_npm + norm_at) / 2
```

**Components:**
- Net Profit Margin (norm_npm)
- Asset Turnover (norm_at)

**Rationale**: Profitability combines efficiency (how much profit per dollar of revenue) with asset utilization (how efficiently assets generate revenue).

**Range**: 0-100

### 4. Income Score

**Formula:**
```sql
income_score = norm_div_yield
```

**Components:**
- Dividend Yield (norm_div_yield)

**Rationale**: Income-focused investors prioritize dividend payments. The normalized dividend yield directly represents this pillar.

**Range**: 0-100

### 5. Health Score

**Formula:**
```sql
health_score = norm_de
```

**Components:**
- Debt-to-Equity Ratio (norm_de)

**Rationale**: Financial health is measured by leverage. Lower debt-to-equity ratios indicate stronger balance sheets and lower financial risk.

**Range**: 0-100

---

## Step 3: Composite Score Calculation

The final composite score is a weighted sum of the five pillar scores:

```sql
final_score =
  (value_score × value_weight) +
  (growth_score × growth_weight) +
  (profitability_score × profitability_weight) +
  (income_score × income_weight) +
  (health_score × health_weight)
```

### Weight Constraints

- All weights must sum to 1.0 (100%)
- Each weight is a decimal between 0 and 1
- Weights are user-configurable via the Compass UI

### Default Weights (Balanced Profile)

```json
{
  "value": 0.2,
  "growth": 0.2,
  "profitability": 0.2,
  "income": 0.2,
  "health": 0.2
}
```

### Range

The composite score ranges from **0 to 100**, where:
- **100**: Perfect score across all pillars (theoretical maximum)
- **0**: Worst score across all pillars (theoretical minimum)
- **50**: Average performance relative to the stock universe

---

## Step 4: Ranking and Filtering

### Ranking

Stocks are ranked by their composite score in descending order:

```sql
RANK() OVER (ORDER BY final_score DESC) as rank
```

### Filtering

**Active Symbols Only:**
```sql
INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
WHERE ls.is_active = TRUE
```

The algorithm only considers symbols where `listed_symbols.is_active = TRUE`. Symbols are marked inactive if they are:
- Funds (`is_fund = TRUE`)
- ADRs (`is_adr = TRUE`)
- ETFs (`is_etf = TRUE`)
- Not actively trading (`is_actively_trading = FALSE`)
- Have no volume (`volume IS NULL OR volume = 0`)
- Have no market cap (`market_cap IS NULL OR market_cap = 0`)
- Company name variants (preferred stock classes, warrants, etc.)

### Result Limit

The algorithm returns the **top 50 ranked stocks**:

```sql
LIMIT 50
```

---

## Investor Profiles

The Compass UI provides pre-configured investor profiles with different weight allocations:

### 1. Value Investor
```json
{
  "value": 0.5,
  "growth": 0.1,
  "profitability": 0.2,
  "income": 0.1,
  "health": 0.1
}
```
**Focus**: Finding undervalued stocks trading below intrinsic value.

### 2. Growth Investor
```json
{
  "value": 0.1,
  "growth": 0.5,
  "profitability": 0.3,
  "income": 0.0,
  "health": 0.1
}
```
**Focus**: Companies with strong earnings growth potential.

### 3. Smart Growth (GARP)
```json
{
  "value": 0.3,
  "growth": 0.4,
  "profitability": 0.2,
  "income": 0.0,
  "health": 0.1
}
```
**Focus**: Growth at a reasonable price - balancing growth and value.

### 4. Income Investor
```json
{
  "value": 0.1,
  "growth": 0.1,
  "profitability": 0.2,
  "income": 0.5,
  "health": 0.1
}
```
**Focus**: High dividend yields for regular income.

### 5. Quality Investing
```json
{
  "value": 0.1,
  "growth": 0.1,
  "profitability": 0.4,
  "income": 0.1,
  "health": 0.3
}
```
**Focus**: Companies with strong profitability and financial health.

### 6. Defensive
```json
{
  "value": 0.2,
  "growth": 0.1,
  "profitability": 0.2,
  "income": 0.2,
  "health": 0.3
}
```
**Focus**: Lower risk, stable companies with strong balance sheets.

### 7. Balanced
```json
{
  "value": 0.2,
  "growth": 0.2,
  "profitability": 0.2,
  "income": 0.2,
  "health": 0.2
}
```
**Focus**: Equal weighting across all pillars for diversified exposure.

---

## Data Sources and Universe

### Stock Universe

The algorithm operates on a universe of **actively trading equity securities** listed on major U.S. exchanges (NYSE, NASDAQ, etc.). As of the latest analysis:

- **Total Symbols in Database**: ~17,983 symbols
- **Active Symbols (is_active = TRUE)**: ~5,263 symbols (29%)
- **Inactive Symbols**: ~12,720 symbols (71%)

### What Gets Excluded

Symbols are marked inactive (`is_active = FALSE`) if they meet any of these criteria:

1. **Funds** (`is_fund = TRUE`): Mutual funds, closed-end funds
2. **ADRs** (`is_adr = TRUE`): American Depositary Receipts (foreign companies)
3. **ETFs** (`is_etf = TRUE`): Exchange-Traded Funds
4. **Not Actively Trading** (`is_actively_trading = FALSE`): Delisted, suspended, or inactive stocks
5. **No Volume** (`volume IS NULL OR volume = 0`): Stocks with no trading activity
6. **No Market Cap** (`market_cap IS NULL OR market_cap = 0`): Stocks without market capitalization data
7. **Company Name Variants**: Preferred stock classes (e.g., BAC-PB, BAC-PE), warrants (e.g., -WT), units (e.g., -UN)

**Rationale**: The Compass is designed for stock discovery, focusing on individual companies rather than funds, ETFs, or derivative securities.

### Primary Table: `ratios_ttm`

The algorithm reads from the `ratios_ttm` table, which contains **trailing twelve months (TTM)** financial ratios. TTM means the ratios are calculated using the most recent 12 months of financial data, providing a current view of company performance.

**Table Structure**:
- `symbol` (text): Stock ticker symbol (e.g., "AAPL", "MSFT")
- `price_to_book_ratio_ttm` (numeric): Price-to-Book ratio
- `price_to_sales_ratio_ttm` (numeric): Price-to-Sales ratio
- `enterprise_value_multiple_ttm` (numeric): Enterprise Value Multiple (EV/EBITDA)
- `price_to_earnings_growth_ratio_ttm` (numeric): PEG ratio
- `net_profit_margin_ttm` (numeric): Net Profit Margin (%)
- `asset_turnover_ttm` (numeric): Asset Turnover ratio
- `dividend_yield_ttm` (numeric): Dividend Yield (%)
- `debt_to_equity_ratio_ttm` (numeric): Debt-to-Equity ratio
- `updated_at` (timestamp): Last update timestamp

**Data Characteristics**:
- Ratios are calculated from quarterly financial statements
- TTM values smooth out seasonal variations
- NULL values are possible if data is unavailable
- Ratios can be negative (e.g., negative profit margins, negative equity)

### Filtering Table: `listed_symbols`

The `listed_symbols` table controls which symbols are eligible for ranking:

- `symbol` (text): Stock ticker symbol
- `is_active` (boolean): Flag indicating if symbol should appear in Compass
- `last_processed_at` (timestamp): Last time the symbol was processed

**Filtering Logic**:
```sql
INNER JOIN public.listed_symbols ls ON rt.symbol = ls.symbol
WHERE ls.is_active = TRUE
```

Only symbols where `is_active = TRUE` are included in the ranking calculation.

### Data Freshness

**Update Frequency**:
- Ratios are updated via an automated API call queue system
- Data is fetched from FinancialModelingPrep (FMP) API
- Staleness checker ensures data is refreshed regularly (typically monthly)
- TTM ratios are recalculated when new quarterly financial statements are released

**Data Quality**:
- Source: FinancialModelingPrep (FMP) API, a financial data provider
- Coverage: ~5,000+ active U.S. stocks
- Lag: Typically 1-2 days behind market data (after earnings releases)
- Completeness: Some ratios may be missing for smaller companies or recent IPOs

### Typical Data Distributions

Based on analysis of the actual stock universe (12,291 symbols with ratio data), here are the observed distributions:

**Price-to-Book Ratio**:
- **Total Symbols with Data**: 12,291
- **25th Percentile (P25)**: 0.14
- **Median (P50)**: 1.06
- **75th Percentile (P75)**: 2.56
- **Range**: -136,540,892 to 35,203,810 (extreme outliers exist)
- **Interpretation**: Most stocks have P/B between 0.14 and 2.56, with median around 1.06

**Net Profit Margin**:
- **Total Symbols with Data**: 12,291
- **25th Percentile (P25)**: -16.3% (negative margins common)
- **Median (P50)**: 0% (half of companies are unprofitable)
- **75th Percentile (P75)**: 11.6%
- **Range**: -759,700% to 10,595,491% (extreme outliers exist)
- **Interpretation**: Many companies have negative or zero margins; profitable companies typically have margins above 11.6%

**Debt-to-Equity Ratio**:
- **Total Symbols with Data**: 12,291
- **25th Percentile (P25)**: 0.0 (no debt)
- **Median (P50)**: 0.09 (very low leverage)
- **75th Percentile (P75)**: 0.65 (moderate leverage)
- **Range**: -11,410 to 809,017 (extreme outliers exist)
- **Interpretation**: Most companies have low to moderate debt; median company has D/E of 0.09

**Key Observations**:
1. **Extreme Outliers**: The data contains extreme outliers (negative equity, very high ratios), which percentile ranking handles robustly
2. **Negative Values Common**: Negative profit margins and negative equity are common, especially for smaller or distressed companies
3. **Zero Values Common**: Many companies have zero debt (D/E = 0) or zero dividends (yield = 0%)
4. **Industry Variation**: These distributions vary significantly by industry (tech vs. utilities vs. financials)

**Note**: These distributions are based on the actual database as of the latest analysis. They will change over time as companies' financials change and as the universe of active symbols evolves.

---

## Implementation Details

### SQL Function

The algorithm is implemented as a PostgreSQL function:

**Function Name**: `get_weighted_leaderboard`

**Location**: `supabase/migrations/20251012111055_create_weighted_leaderboard_function.sql`

**Parameters**:
- `weights` (jsonb): JSON object with five keys: `value`, `growth`, `profitability`, `income`, `health`

**Returns**:
- `rank` (bigint): Ranking position (1 = highest score)
- `symbol` (text): Stock ticker symbol
- `composite_score` (numeric): Final weighted composite score (0-100)

### Frontend Integration

**Store**: `src/stores/compassStore.ts`

The Zustand store manages:
- Current weights (default: balanced 0.2 each)
- Leaderboard data
- Loading/error states
- Weight updates

**UI Component**: `src/app/compass/page.tsx`

The Compass page provides:
- Weight sliders for each pillar
- Pre-configured investor profile buttons
- Leaderboard display with rank, symbol, and score

### Performance Considerations

1. **Window Functions**: `PERCENT_RANK()` and `RANK()` are computed efficiently by PostgreSQL
2. **Indexing**: The `ratios_ttm` table should have indexes on `symbol` and the ratio columns
3. **Active Filter**: The `is_active` filter reduces the dataset early in the query
4. **Limit**: Returning only top 50 reduces result set size

---

## Comprehensive Example Calculations

### Example 1: High-Quality Growth Stock (Apple Inc. - "AAPL")

**Assumed Raw Metrics** (hypothetical values for illustration):
- P/B Ratio: 2.0 (moderate valuation)
- P/S Ratio: 3.5 (moderate valuation)
- EVM: 4.0 (reasonable valuation)
- PEG Ratio: 1.2 (moderate growth value)
- Net Profit Margin: 25% (high profitability)
- Asset Turnover: 0.8 (moderate efficiency)
- Dividend Yield: 0.5% (low dividend)
- Debt-to-Equity: 0.2 (very low leverage)

**Step 1: Percentile Ranks in Universe** (assumed):
- P/B: 30th percentile (70% of stocks have higher P/B)
- P/S: 40th percentile (60% of stocks have higher P/S)
- EVM: 25th percentile (75% of stocks have higher EVM)
- PEG: 35th percentile (65% of stocks have higher PEG)
- NPM: 90th percentile (10% of stocks have higher NPM)
- AT: 50th percentile (50% of stocks have higher AT)
- Dividend Yield: 20th percentile (80% of stocks have higher yield)
- D/E: 5th percentile (95% of stocks have higher D/E)

**Step 2: Normalized Metrics** (0-100 scale):
- `norm_pb` = (1 - 0.30) × 100 = **70.0** (inverted: lower P/B is better)
- `norm_ps` = (1 - 0.40) × 100 = **60.0** (inverted)
- `norm_evm` = (1 - 0.25) × 100 = **75.0** (inverted)
- `norm_peg` = (1 - 0.35) × 100 = **65.0** (inverted)
- `norm_npm` = 0.90 × 100 = **90.0** (direct: higher is better)
- `norm_at` = 0.50 × 100 = **50.0** (direct)
- `norm_div_yield` = 0.20 × 100 = **20.0** (direct)
- `norm_de` = (1 - 0.05) × 100 = **95.0** (inverted: lower D/E is better)

**Step 3: Pillar Scores**:
- `value_score` = (70.0 + 60.0 + 75.0) / 3 = **68.33**
- `growth_score` = 65.0
- `profitability_score` = (90.0 + 50.0) / 2 = **70.0**
- `income_score` = 20.0
- `health_score` = 95.0

**Step 4: Composite Scores with Different Profiles**:

**Balanced Profile** (0.2 each):
```
final_score = (68.33 × 0.2) + (65.0 × 0.2) + (70.0 × 0.2) + (20.0 × 0.2) + (95.0 × 0.2)
            = 13.67 + 13.0 + 14.0 + 4.0 + 19.0
            = 63.67
```

**Value Investor Profile** (value: 0.5, others: 0.1-0.2):
```
final_score = (68.33 × 0.5) + (65.0 × 0.1) + (70.0 × 0.2) + (20.0 × 0.1) + (95.0 × 0.1)
            = 34.17 + 6.5 + 14.0 + 2.0 + 9.5
            = 66.17
```

**Growth Investor Profile** (growth: 0.5, profitability: 0.3):
```
final_score = (68.33 × 0.1) + (65.0 × 0.5) + (70.0 × 0.3) + (20.0 × 0.0) + (95.0 × 0.1)
            = 6.83 + 32.5 + 21.0 + 0.0 + 9.5
            = 69.83
```

**Quality Investing Profile** (profitability: 0.4, health: 0.3):
```
final_score = (68.33 × 0.1) + (65.0 × 0.1) + (70.0 × 0.4) + (20.0 × 0.1) + (95.0 × 0.3)
            = 6.83 + 6.5 + 28.0 + 2.0 + 28.5
            = 71.83
```

**Analysis**: This stock scores highest (71.83) with the Quality Investing profile because it has strong profitability (90) and excellent health (95), which are weighted heavily in that profile.

---

### Example 2: Value Stock (Undervalued Company)

**Assumed Raw Metrics**:
- P/B Ratio: 0.8 (very cheap)
- P/S Ratio: 0.5 (very cheap)
- EVM: 3.0 (cheap)
- PEG Ratio: 0.6 (excellent growth value)
- Net Profit Margin: 5% (low profitability)
- Asset Turnover: 1.2 (moderate efficiency)
- Dividend Yield: 4.5% (high dividend)
- Debt-to-Equity: 1.5 (moderate leverage)

**Assumed Percentile Ranks**:
- P/B: 5th percentile (95% of stocks have higher P/B)
- P/S: 10th percentile (90% of stocks have higher P/S)
- EVM: 15th percentile (85% of stocks have higher EVM)
- PEG: 10th percentile (90% of stocks have higher PEG)
- NPM: 30th percentile (70% of stocks have higher NPM)
- AT: 60th percentile (40% of stocks have higher AT)
- Dividend Yield: 85th percentile (15% of stocks have higher yield)
- D/E: 60th percentile (40% of stocks have higher D/E)

**Normalized Metrics**:
- `norm_pb` = (1 - 0.05) × 100 = **95.0**
- `norm_ps` = (1 - 0.10) × 100 = **90.0**
- `norm_evm` = (1 - 0.15) × 100 = **85.0**
- `norm_peg` = (1 - 0.10) × 100 = **90.0**
- `norm_npm` = 0.30 × 100 = **30.0**
- `norm_at` = 0.60 × 100 = **60.0**
- `norm_div_yield` = 0.85 × 100 = **85.0**
- `norm_de` = (1 - 0.60) × 100 = **40.0**

**Pillar Scores**:
- `value_score` = (95.0 + 90.0 + 85.0) / 3 = **90.0**
- `growth_score` = 90.0
- `profitability_score` = (30.0 + 60.0) / 2 = **45.0**
- `income_score` = 85.0
- `health_score` = 40.0

**Composite Scores**:

**Value Investor Profile**:
```
final_score = (90.0 × 0.5) + (90.0 × 0.1) + (45.0 × 0.2) + (85.0 × 0.1) + (40.0 × 0.1)
            = 45.0 + 9.0 + 9.0 + 8.5 + 4.0
            = 75.5
```

**Income Investor Profile**:
```
final_score = (90.0 × 0.1) + (90.0 × 0.1) + (45.0 × 0.2) + (85.0 × 0.5) + (40.0 × 0.1)
            = 9.0 + 9.0 + 9.0 + 42.5 + 4.0
            = 73.5
```

**Analysis**: This stock scores highest (75.5) with the Value Investor profile because it has excellent value metrics (90.0) and strong growth value (90.0), which are weighted heavily in that profile.

---

### Example 3: Comparison Table

The following table shows how three different stocks rank with different investor profiles:

| Stock Type | Value Score | Growth Score | Profitability Score | Income Score | Health Score | Balanced | Value Investor | Growth Investor | Income Investor | Quality Investing |
|------------|-------------|--------------|---------------------|--------------|--------------|----------|----------------|-----------------|-----------------|-------------------|
| Growth Stock (Example 1) | 68.33 | 65.0 | 70.0 | 20.0 | 95.0 | 63.67 | 66.17 | 69.83 | 45.0 | **71.83** |
| Value Stock (Example 2) | 90.0 | 90.0 | 45.0 | 85.0 | 40.0 | 70.0 | **75.5** | 72.0 | 73.5 | 58.5 |
| Income Stock | 50.0 | 30.0 | 60.0 | 95.0 | 80.0 | 63.0 | 58.0 | 48.0 | **78.0** | 68.0 |

**Key Insight**: The same stock can rank very differently depending on the investor profile. A value stock might rank #1 for a Value Investor but #50 for a Growth Investor.

---

## Design Rationale

### Why Percentile Ranking?

1. **Handles Different Scales**: P/B ratios (0.5-50) and profit margins (-10% to 30%) are normalized to the same 0-100 scale
2. **Robust to Outliers**: A single stock with an extreme ratio doesn't skew the entire distribution
3. **Relative Comparison**: Ranks stocks relative to the current universe, not historical benchmarks
4. **Missing Data Tolerance**: Stocks with missing ratios still get percentile ranks based on available data

### Why Five Pillars?

The five pillars represent distinct investment philosophies:
- **Value**: Buy cheap stocks
- **Growth**: Buy growing companies
- **Profitability**: Buy efficient companies
- **Income**: Buy dividend payers
- **Health**: Buy financially stable companies

This structure allows the algorithm to serve multiple investor types while maintaining interpretability.

### Why User-Configurable Weights?

Different investors have different priorities. A retiree might prioritize income and health, while a young investor might prioritize growth. Configurable weights allow the same algorithm to serve diverse needs.

### Why Top 50?

1. **UI Constraints**: Displaying more than 50 stocks would be overwhelming
2. **Performance**: Limiting results improves query performance
3. **Focus**: Top 50 represents the "best" stocks for the given profile, which is sufficient for discovery

### Why Filter Active Symbols?

The Compass is designed for stock discovery, not fund/ETF/ADR analysis. Filtering ensures users only see tradable equity securities that represent actual companies.

---

## Edge Cases and Special Scenarios

### Negative Values

Some financial ratios can be negative, which requires special handling:

**Negative Profit Margins**: If a company is losing money, `net_profit_margin_ttm` can be negative (e.g., -5%). The percentile ranking still works: companies with the most negative margins get the lowest percentile rank (0), while companies with positive margins get higher ranks.

**Negative Equity**: If a company has more liabilities than assets, `debt_to_equity_ratio_ttm` can be negative or undefined. The algorithm handles this by:
- Including negative values in the percentile ranking
- Companies with negative equity typically get very low health scores

**Negative PEG**: If earnings are declining (negative growth), PEG can be negative. The algorithm treats negative PEGs as worse than positive ones, so they get lower percentile ranks.

### Missing Data (NULL Values)

**Handling Strategy**:
- If a metric is NULL for a stock, it's excluded from that metric's percentile ranking
- The percentile rank is calculated only among stocks with non-NULL values
- If a stock has NULL for a pillar component, the pillar score may be:
  - Calculated using only available metrics (e.g., if P/S is NULL, Value Score uses only P/B and EVM)
  - Assigned a default value (e.g., 50 for neutral)
  - Excluded from ranking entirely

**Example**: If a stock has NULL for `dividend_yield_ttm`:
- It's excluded from the dividend yield percentile ranking
- The Income Score pillar would be NULL or 0
- The composite score calculation would need to handle this (either exclude Income or weight it as 0)

### Extreme Outliers

**Very High P/B Ratios**: Some growth stocks have P/B ratios > 50. The percentile ranking naturally handles this:
- The stock with the highest P/B gets percentile rank 1.0
- After inversion, it gets normalized score 0
- This doesn't affect other stocks' rankings

**Very High Debt-to-Equity**: Some companies (e.g., REITs) have D/E > 10.0:
- They get very low percentile ranks
- After inversion, they get very low health scores
- This correctly reflects high financial risk

### Zero Values

**Zero Dividend Yield**: Many growth stocks pay no dividends (yield = 0%):
- They get percentile rank based on their position among all stocks (including other zero-yield stocks)
- Typically, zero-yield stocks cluster at the bottom of the distribution
- They get low Income Scores, which is appropriate for growth-focused companies

**Zero Debt**: Some companies have no debt (D/E = 0):
- They get the highest percentile rank (1.0) for D/E
- After inversion, they get the highest health score (100)
- This correctly reflects excellent financial health

### Industry Variations

Different industries have different typical ranges for metrics:

**Technology Companies**:
- High P/B ratios (5-20) → Lower value scores
- High profit margins (20-30%) → Higher profitability scores
- Low debt (D/E < 0.5) → Higher health scores
- Low/no dividends → Lower income scores

**Financial Companies**:
- Moderate P/B ratios (1-3) → Moderate value scores
- Moderate profit margins (10-15%) → Moderate profitability scores
- High debt (D/E 2-5) → Lower health scores
- Moderate dividends (2-4%) → Moderate income scores

**Utilities**:
- Low P/B ratios (1-2) → Higher value scores
- Low profit margins (5-10%) → Lower profitability scores
- Very high debt (D/E 3-6) → Lower health scores
- High dividends (4-6%) → Higher income scores

The percentile ranking accounts for these variations by ranking within the entire universe, not by industry.

---

## Interpretation Guide

### Understanding Composite Scores

**Score Ranges and Meaning**:

- **90-100**: Exceptional stock across all pillars (rare, top 1-2% of universe)
- **80-89**: Excellent stock, strong across multiple pillars (top 5-10%)
- **70-79**: Very good stock, strong in key areas (top 10-20%)
- **60-69**: Good stock, above average (top 20-40%)
- **50-59**: Average stock, middle of the pack (40-60%)
- **40-49**: Below average stock (60-80%)
- **30-39**: Poor stock, weak in multiple areas (80-90%)
- **0-29**: Very poor stock, weak across all pillars (bottom 10%)

**Important Note**: These ranges are approximate and depend on the current stock universe and weight configuration.

### Comparing Scores Across Profiles

**Same Stock, Different Profiles**:
- A stock with score 65 in "Balanced" profile might score 75 in "Value Investor" profile
- This doesn't mean the stock is "better" - it means it aligns better with value investing criteria
- Always compare scores within the same profile/weight configuration

**Different Stocks, Same Profile**:
- Stock A: 75 vs Stock B: 65 → Stock A ranks higher
- The 10-point difference represents meaningful separation in the ranking

### Understanding Rank vs. Score

**Rank**: Position in the leaderboard (1 = highest score, 50 = lowest score in top 50)
**Score**: The actual composite score (0-100)

**Example**:
- Rank 1: Score 85.2
- Rank 2: Score 84.9
- Rank 3: Score 84.5

The scores are very close, indicating these are the top 3 stocks, but there's little difference between them.

### Practical Use Cases

**Stock Discovery**:
- Use Balanced profile to find well-rounded stocks
- Use specific profiles to find stocks matching your investment style

**Portfolio Construction**:
- Top 10 stocks from Value profile → Value-focused portfolio
- Top 10 from Growth profile → Growth-focused portfolio
- Mix of top stocks from different profiles → Diversified portfolio

**Screening**:
- Adjust weights to emphasize specific characteristics
- Compare how stocks rank under different scenarios
- Identify stocks that rank highly across multiple profiles (quality companies)

---

## Validation and Testing

### Algorithm Validation

To validate the algorithm works correctly, verify:

1. **Normalization**: All normalized metrics are between 0 and 100
2. **Pillar Scores**: All pillar scores are between 0 and 100
3. **Composite Scores**: All composite scores are between 0 and 100
4. **Weight Sum**: Weights sum to 1.0 (100%)
5. **Ranking**: Ranks are sequential (1, 2, 3, ..., 50)
6. **Filtering**: Only active symbols appear in results

### Expected Behaviors

**When Increasing Value Weight**:
- Stocks with low P/B, P/S, EVM should move up in ranking
- Growth stocks with high valuations should move down

**When Increasing Growth Weight**:
- Stocks with low PEG ratios should move up
- Value stocks with slow growth should move down

**When Increasing Income Weight**:
- High-dividend stocks (utilities, REITs) should move up
- Growth stocks with no dividends should move down

**When Increasing Health Weight**:
- Low-debt companies should move up
- High-leverage companies should move down

### Testing Scenarios

**Scenario 1: Extreme Weights**
- Set value weight to 1.0, all others to 0
- Verify only value metrics matter
- Top stocks should have lowest P/B, P/S, EVM

**Scenario 2: Equal Weights**
- Set all weights to 0.2 (balanced)
- Verify ranking reflects overall quality
- Top stocks should score well across all pillars

**Scenario 3: Missing Data**
- Test with stocks that have NULL ratios
- Verify algorithm handles gracefully
- Check that missing data doesn't break calculations

**Scenario 4: Single Stock Universe**
- Test with only one active symbol
- Verify it gets rank 1 and score based on its metrics
- Check percentile ranks are calculated correctly (should be 0 or 100)

---

## Future Enhancements

Potential improvements to consider:

1. **Sector/Industry Normalization**: Rank stocks within their sector to avoid sector bias
   - Example: Tech stocks might always rank low on value due to high P/B ratios
   - Solution: Calculate percentile ranks within each sector, then combine

2. **Market Cap Weighting**: Consider market cap when calculating percentile ranks
   - Example: Weight large-cap stocks more heavily in percentile calculations
   - Solution: Use market-cap-weighted percentile ranks

3. **Time-Weighted Metrics**: Incorporate trend analysis (improving vs. declining metrics)
   - Example: Reward stocks with improving profit margins
   - Solution: Add momentum scores based on metric trends

4. **Additional Pillars**: Add momentum, quality, or ESG pillars
   - Example: Add a "Momentum" pillar based on price performance
   - Solution: Extend the algorithm to include additional normalized metrics

5. **Dynamic Weights**: Adjust weights based on market conditions
   - Example: Increase value weight during market downturns
   - Solution: Implement market-regime detection and automatic weight adjustment

6. **Custom Metrics**: Allow users to add custom financial ratios
   - Example: Add industry-specific metrics (e.g., same-store sales for retail)
   - Solution: Extend the algorithm to support user-defined metrics

7. **Confidence Intervals**: Provide uncertainty estimates for scores
   - Example: Show that a score of 75 has ±5 point confidence interval
   - Solution: Calculate standard errors based on data quality and completeness

8. **Backtesting**: Validate algorithm performance against historical returns
   - Example: Test if top-ranked stocks outperform the market
   - Solution: Implement backtesting framework with historical data

---

## Conclusion

The Compass ranking algorithm provides a flexible, interpretable, and robust method for ranking stocks across multiple investment dimensions. By normalizing metrics, aggregating into pillars, and allowing user-configurable weights, it serves diverse investor needs while maintaining mathematical rigor and transparency.

### Key Strengths

1. **Transparency**: Every calculation step is explicit and verifiable
2. **Flexibility**: Configurable weights adapt to different investment styles
3. **Robustness**: Percentile ranking handles outliers and missing data
4. **Interpretability**: Pillar structure makes scores understandable
5. **Completeness**: Covers major investment dimensions (value, growth, profitability, income, health)

### Limitations

1. **Relative Ranking**: Ranks stocks relative to current universe, not absolute benchmarks
2. **No Time Series**: Doesn't consider trends or momentum
3. **Equal Industry Weighting**: Doesn't account for industry-specific characteristics
4. **Static Weights**: Weights don't adapt to market conditions
5. **Limited Metrics**: Only 8 financial ratios, may miss important factors

### Recommended Use

- **Primary Use**: Stock discovery and screening
- **Secondary Use**: Portfolio construction and diversification
- **Not Recommended**: Sole basis for investment decisions (should be combined with fundamental analysis, research, and risk assessment)

---

## Appendix: Quick Reference

### Formula Summary

**Normalization (Value Metrics)**:
```
norm_metric = (1 - PERCENT_RANK(metric ASC)) × 100
```

**Normalization (Positive Metrics)**:
```
norm_metric = PERCENT_RANK(metric ASC) × 100
```

**Pillar Scores**:
```
value_score = (norm_pb + norm_ps + norm_evm) / 3
growth_score = norm_peg
profitability_score = (norm_npm + norm_at) / 2
income_score = norm_div_yield
health_score = norm_de
```

**Composite Score**:
```
final_score = Σ(pillar_score × pillar_weight)
```

### Default Configuration

**Weights**: 0.2 each (balanced)
**Universe**: ~5,263 active symbols
**Output**: Top 50 ranked stocks
**Update Frequency**: Monthly (TTM ratios)

### Contact and Support

For questions, issues, or suggestions regarding the Compass ranking algorithm, refer to the main project documentation or contact the development team.

