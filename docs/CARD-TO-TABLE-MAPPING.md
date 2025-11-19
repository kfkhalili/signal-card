# Card Type → Database Table Mapping

**Purpose:** Complete reference mapping each card type to the database tables it uses, including testing and troubleshooting information.

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
| | `financial-statements` | `financial_statements` | `symbol` | `fetched_at` | 43200 (30d) | Total revenue (for consistency with revenue card) |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **analystgrades** | `grades-historical` | `grades_historical` | `symbol` | `fetched_at` | 43200 (30d) | Analyst ratings |
| | | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo (optional) |
| **exchangevariants** | `exchange-variants` | `exchange_variants` | `base_symbol` ⚠️ | `fetched_at` | 1440 (24h) | Variant data (primary) - base exchange determined from base variant |
| | `profile` | `profiles` | `symbol` | `modified_at` | 1440 (24h) | Company name/logo/website |
| | | `available_exchanges` | N/A | N/A | N/A | N/A | Exchange metadata (country info) - read-only reference data |
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
   - Used by: `profile`, `revenue`, `solvency`, `cashuse`, `revenuebreakdown` cards
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`
   - Contains: Income statements, balance sheets, cash flow statements
   - Note: `revenuebreakdown` uses this for total revenue display (consistent with revenue card)

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
   - Note: Used for segment-level breakdown data. Total revenue comes from `financial_statements` for consistency.

7. **`grades_historical`** - Historical analyst grades
   - Used by: `analystgrades` card
   - Symbol column: `symbol`
   - Timestamp: `fetched_at`

8. **`exchange_variants`** - Exchange variant information
   - Used by: `exchangevariants` card (primary data source)
   - Symbol column: `base_symbol` (⚠️ different from other tables)
   - Timestamp: `fetched_at`
   - **CRITICAL:** Base exchange is determined from base variant (where `variant_symbol === symbol`)
   - **CRITICAL:** Only actively trading variants are shown (`is_actively_trading = true`)
   - **CRITICAL:** Realtime enabled (2025-11-19) - card re-renders when data arrives

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

### Detailed Flow Example

**User adds a "Key Ratios" card for AAPL:**

1. **Frontend Tracking**
   - `useSubscriptionManager` hook maps card type `keyratios` → data type `ratios-ttm`
   - Creates subscription in `active_subscriptions_v2`:
     ```sql
     INSERT INTO active_subscriptions_v2 (user_id, symbol, data_type, subscribed_at, last_seen_at)
     VALUES (user_id, 'AAPL', 'ratios-ttm', NOW(), NOW());
     ```

2. **Staleness Check**
   - Background cron job runs `check_and_queue_stale_data_from_presence_v2()` every minute
   - Checks if data in `ratios_ttm` table is stale for AAPL
   - Uses `fetched_at` column and TTL of 1440 minutes (24 hours)
   - If stale, creates job in `api_call_queue_v2_pending`

3. **Queue Processing**
   - Processor cron job runs `invoke_processor_loop_v2()` every minute
   - Fetches batch from `api_call_queue_v2_pending`
   - Routes to `fetchRatiosTtmLogic()` based on `data_type = 'ratios-ttm'`
   - Fetches from FMP API and upserts into `ratios_ttm` table

4. **Real-time Update**
   - Card subscribes to Realtime changes on `ratios_ttm` table
   - When data is updated, card receives update automatically
   - Card UI refreshes with new data

---

## Special Cases

### 1. Multiple Cards Share Same Data Type
- **revenue**, **solvency**, **cashuse**, **revenuebreakdown** all use `financial-statements`
- Adding any of these cards tracks the same data type
- Only one subscription needed per symbol for `financial-statements`
- All four cards benefit from the same refresh
- **revenuebreakdown** uses `financial-statements` for total revenue (consistent with revenue card), while segment breakdown comes from `revenue-product-segmentation`

### 2. Exchange Variants Special Case
- Uses `base_symbol` column (not `symbol`)
- Registry configured with `symbol_column = 'base_symbol'`
- Staleness check queries: `WHERE base_symbol = 'AAPL'`
- Card queries: `WHERE base_symbol = 'AAPL'`

### 3. Profile Card
- Uses `modified_at` timestamp (not `fetched_at`)
- This is because profile data can be updated from multiple sources
- Registry configured with `timestamp_column = 'modified_at'`

---

## Expected Behavior

### When Card is Added:
1. ✅ Subscription created in `active_subscriptions_v2`
2. ✅ Heartbeat starts (updates `last_seen_at` every minute)
3. ✅ Staleness check runs (checks if data is stale)
4. ✅ If stale, job queued in `api_call_queue_v2_pending`

### When Card is Removed:
1. ✅ Subscription deleted from `active_subscriptions_v2`
2. ✅ Heartbeat stops
3. ✅ No more staleness checks for this symbol/data_type
4. ✅ Background cleanup removes if heartbeat stops for 5+ minutes

### When Data is Stale:
1. ✅ Job created in queue
2. ✅ Processor picks up job
3. ✅ FMP API called
4. ✅ Data upserted to table
5. ✅ `fetched_at` updated
6. ✅ Realtime broadcast triggers card update

---

## Testing Checklist

### For Each Card Type:

1. **Add Card**
   - [ ] Card appears in workspace
   - [ ] Subscription created in `active_subscriptions_v2`
   - [ ] Check: `SELECT * FROM active_subscriptions_v2 WHERE symbol = 'AAPL' AND data_type = 'ratios-ttm';`

2. **Check Staleness**
   - [ ] Manually trigger staleness check:
     ```sql
     SELECT check_and_queue_stale_batch_v2('AAPL', ARRAY['ratios-ttm'], 1);
     ```
   - [ ] Verify job created in queue:
     ```sql
     SELECT * FROM api_call_queue_v2_pending WHERE symbol = 'AAPL' AND data_type = 'ratios-ttm';
     ```

3. **Process Job**
   - [ ] Wait for processor cron (or manually trigger):
     ```sql
     SELECT invoke_processor_loop_v2(3, 10);
     ```
   - [ ] Check job status:
     ```sql
     SELECT status, * FROM api_call_queue_v2_completed WHERE symbol = 'AAPL' AND data_type = 'ratios-ttm' ORDER BY created_at DESC LIMIT 1;
     ```

4. **Verify Data Update**
   - [ ] Check table was updated:
     ```sql
     SELECT symbol, fetched_at, updated_at FROM ratios_ttm WHERE symbol = 'AAPL';
     ```
   - [ ] Verify `fetched_at` is recent (within last few minutes)

5. **Test Real-time**
   - [ ] Card should update automatically when data changes
   - [ ] Check browser console for Realtime subscription messages

---

## Quick Test Queries

### Check All Subscriptions
```sql
SELECT
  user_id,
  symbol,
  data_type,
  subscribed_at,
  last_seen_at,
  NOW() - last_seen_at AS age
FROM active_subscriptions_v2
ORDER BY last_seen_at DESC;
```

### Check Queue Status
```sql
SELECT
  status,
  data_type,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM api_call_queue_v2
GROUP BY status, data_type
ORDER BY status, data_type;
```

### Check Data Freshness
```sql
-- For a specific symbol and data type
SELECT
  'ratios-ttm' as data_type,
  symbol,
  fetched_at,
  NOW() - fetched_at as age,
  CASE
    WHEN NOW() - fetched_at > INTERVAL '1440 minutes' THEN 'STALE'
    ELSE 'FRESH'
  END as status
FROM ratios_ttm
WHERE symbol = 'AAPL';
```

### Manually Trigger Refresh
```sql
-- Queue a refresh for a specific symbol/data type
SELECT queue_refresh_if_not_exists_v2('AAPL', 'ratios-ttm', 0);
```

---

## Troubleshooting

### Card not updating?
1. Check subscription exists: `SELECT * FROM active_subscriptions_v2 WHERE symbol = 'AAPL' AND data_type = 'ratios-ttm';`
2. Check if data is stale: `SELECT is_data_stale_v2('ratios-ttm', 'AAPL');`
3. Check queue for jobs: `SELECT * FROM api_call_queue_v2 WHERE symbol = 'AAPL' AND data_type = 'ratios-ttm' ORDER BY created_at DESC LIMIT 5;`
4. Check processor logs: Look for Edge Function logs in Supabase dashboard

### Job stuck in processing?
1. Check for stuck jobs: `SELECT * FROM api_call_queue_v2_processing WHERE created_at < NOW() - INTERVAL '5 minutes';`
2. Recover stuck jobs: `SELECT recover_stuck_jobs_v2();`

### Data not refreshing?
1. Check TTL: `SELECT default_ttl_minutes FROM data_type_registry_v2 WHERE data_type = 'ratios-ttm';`
2. Check timestamp: `SELECT fetched_at, NOW() - fetched_at FROM ratios_ttm WHERE symbol = 'AAPL';`
3. Manually trigger: `SELECT queue_refresh_if_not_exists_v2('AAPL', 'ratios-ttm', 0);`

---

## Notes

- **Profile card** is the most complex, using 4 different tables
- **Most cards** also fetch from `profiles` for company name/logo (optional)
- **Exchange variants** is unique in using `base_symbol` instead of `symbol`
- **Custom cards** don't use any database tables (user-created content)
- All tables use Realtime subscriptions for live updates
- TTL (Time To Live) determines how often data is refreshed
