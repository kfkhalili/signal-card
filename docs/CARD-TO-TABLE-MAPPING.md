# Card Type → Database Table Mapping

**Purpose:** Complete reference mapping each card type to the database tables it uses.

---

## Complete Mapping

| Card Type | Data Type(s) | Database Table(s) | Symbol Column | Timestamp Column | TTL (Minutes) | Notes |
|-----------|--------------|-------------------|---------------|------------------|---------------|-------|
| **profile** | `profile` | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Primary company data |
| | `quote` | `live_quote_indicators` | `symbol` | `fetched_at` | 1 | Real-time price/market cap |
| | `financial-statements` | `financial_statements` | `symbol` | `fetched_at` | 43200 (30d) | Revenue (TTM) |
| | `ratios-ttm` | `ratios_ttm` | `symbol` | `fetched_at` | 1440 (24h) | EPS, P/E, P/B ratios |
| **price** | `quote` | `live_quote_indicators` | `symbol` | `fetched_at` | 1 | Real-time price data |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **revenue** | `financial-statements` | `financial_statements` | `symbol` | `fetched_at` | 43200 (30d) | Income statements |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **solvency** | `financial-statements` | `financial_statements` | `symbol` | `fetched_at` | 43200 (30d) | Balance sheets |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **cashuse** | `financial-statements` | `financial_statements` | `symbol` | `fetched_at` | 43200 (30d) | Cash flow statements |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **keyratios** | `ratios-ttm` | `ratios_ttm` | `symbol` | `fetched_at` | 1440 (24h) | TTM financial ratios |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| | | `financial_statements` | `symbol` | `fetched_at` | 43200 (30d) | For some ratio calculations (optional) |
| **dividendshistory** | `dividend-history` | `dividend_history` | `symbol` | `fetched_at` | 129600 (90d) | Historical dividends |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **revenuebreakdown** | `revenue-product-segmentation` | `revenue_product_segmentation` | `symbol` | `fetched_at` | 525600 (365d) | Revenue by segment |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **analystgrades** | `grades-historical` | `grades_historical` | `symbol` | `fetched_at` | 43200 (30d) | Analyst ratings |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **exchangevariants** | `exchange-variants` | `exchange_variants` | `base_symbol` ⚠️ | `fetched_at` | 1440 (24h) | International listings |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| | | `available_exchanges` | N/A | N/A | N/A | N/A | Exchange metadata (read-only) |
| **custom** | None | None | N/A | N/A | N/A | Custom cards don't use database tables |

⚠️ **Note:** `exchange-variants` uses `base_symbol` instead of `symbol` in the registry.

---

## Table Details

### Primary Data Tables

1. **`profiles`** - Company profile information
   - Used by: All cards (for company name/logo)
   - Primary use: `profile` card
   - Symbol column: `symbol`
   - Timestamp: `modified_at` (auto-updated by trigger)

2. **`live_quote_indicators`** - Real-time market data
   - Used by: `profile`, `price` cards
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`
   - Updates: Every minute

3. **`financial_statements`** - Financial statement data
   - Used by: `profile`, `revenue`, `solvency`, `cashuse` cards
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`
   - Contains: Income statements, balance sheets, cash flow statements

4. **`ratios_ttm`** - Trailing twelve months ratios
   - Used by: `profile`, `keyratios` cards
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`

5. **`dividend_history`** - Historical dividend data
   - Used by: `dividendshistory` card
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`

6. **`revenue_product_segmentation`** - Revenue breakdown by segment
   - Used by: `revenuebreakdown` card
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`

7. **`grades_historical`** - Historical analyst grades
   - Used by: `analystgrades` card
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`

8. **`exchange_variants`** - Exchange variant information
   - Used by: `exchangevariants` card
   - Symbol column: `base_symbol` (⚠️ different from other tables)
   - Timestamp: `fetched_at`

9. **`available_exchanges`** - Available exchanges list
   - Used by: `exchangevariants` card (for exchange metadata)
   - Read-only reference data

### Supporting Tables

- **`active_subscriptions_v2`** - Tracks active subscriptions (analytics only)
- **`api_call_queue_v2`** - Queue for API calls
- **`data_type_registry_v2`** - Metadata registry for data types
- **`exchange_market_status`** - Market status for exchanges
- **`supported_symbols`** - Available stock symbols

---

## Data Flow

1. **Card Added** → Subscription created in `active_subscriptions_v2`
2. **Staleness Check** → Background cron checks if data is stale
3. **Job Created** → If stale, job added to `api_call_queue_v2`
4. **Data Fetched** → Edge Function fetches from FMP API
5. **Data Stored** → Upserted into appropriate table(s)
6. **Realtime Update** → Card receives update via Supabase Realtime
7. **UI Updates** → Card displays new data

---

## Notes

- **Profile card** is the most complex, using 4 different tables
- **Most cards** also fetch from `profiles` for company name/logo (optional)
- **Exchange variants** is unique in using `base_symbol` instead of `symbol`
- **Custom cards** don't use any database tables (user-created content)
- All tables use Realtime subscriptions for live updates
- TTL (Time To Live) determines how often data is refreshed

