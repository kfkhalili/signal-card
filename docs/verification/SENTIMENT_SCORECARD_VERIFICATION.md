# How to Verify Sentiment Scorecard is Working

## Overview
The Sentiment metric in the Intelligent Scorecard displays analyst consensus calculated from `grades_historical` table data.

## Data Flow

1. **Data Source**: `grades_historical` table
2. **Initial Fetch**: On page load, fetches latest 10 records from `grades_historical` table
3. **Realtime Subscription**: Subscribes to `grades_historical` table updates via `useStockData` hook
4. **Calculation**: `analystConsensus` is calculated using weighted scoring from latest grades entry
5. **Display**: Shows in scorecard with color coding (green for Buy, yellow for Hold, red for Sell)

## Verification Steps

### Step 1: Check Database Data
Verify that `grades_historical` table has data for your symbol:

```sql
-- Check if data exists for a symbol
SELECT
  symbol,
  date,
  analyst_ratings_strong_buy,
  analyst_ratings_buy,
  analyst_ratings_hold,
  analyst_ratings_sell,
  analyst_ratings_strong_sell,
  updated_at
FROM grades_historical
WHERE symbol = 'AAPL'
ORDER BY date DESC
LIMIT 5;
```

**Expected**: Should return at least one row with non-zero rating counts.

### Step 2: Check Browser Console
Open browser DevTools (F12) and check for:

1. **Initial Fetch Logs**: Look for any errors when fetching `grades_historical`
   - Should see: `[SymbolAnalysisPage] Error fetching grades historical:` if there's an error
   - If no errors, the fetch succeeded silently

2. **Realtime Subscription**: Check Network tab → WS (WebSocket) connections
   - Should see a WebSocket connection to Supabase
   - Should see subscription to `grades_historical` table

### Step 3: Check UI Display
Look at the Intelligent Scorecard on the symbol page:

**If Working Correctly:**
- ✅ Shows one of: "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"
- ✅ Color coding:
  - Green text for "Strong Buy" or "Buy"
  - Yellow text for "Hold"
  - Red text for "Sell" or "Strong Sell"

**If NOT Working:**
- ❌ Shows "Unknown" (gray text)
- ❌ This means `gradesHistorical.length === 0` or calculation returned `Option.none()`

### Step 4: Check Calculation Logic
The consensus is calculated using weighted scoring:

```typescript
// Weighted score: Strong Buy = 2, Buy = 1, Hold = 0, Sell = -1, Strong Sell = -2
const weightedScore = (strongBuy * 2 + buy * 1 + hold * 0 + sell * -1 + strongSell * -2) / total;

// Mapping:
// weightedScore >= 1.5  → "Strong Buy"
// weightedScore >= 0.5  → "Buy"
// weightedScore >= -0.5 → "Hold"
// weightedScore >= -1.5 → "Sell"
// weightedScore < -1.5  → "Strong Sell"
```

**Example Calculation:**
- 5 Strong Buy, 3 Buy, 2 Hold, 0 Sell, 0 Strong Sell
- Total = 10
- Weighted Score = (5×2 + 3×1 + 2×0 + 0×-1 + 0×-2) / 10 = 13/10 = 1.3
- Result: "Buy" (since 1.3 >= 0.5 but < 1.5)

### Step 5: Verify Realtime Updates
To test if realtime updates work:

1. **Manually update** a record in `grades_historical` table:
```sql
UPDATE grades_historical
SET analyst_ratings_buy = analyst_ratings_buy + 1
WHERE symbol = 'AAPL'
ORDER BY date DESC
LIMIT 1;
```

2. **Check if UI updates** automatically (should update within seconds)

### Step 6: Check Job Queue (If Data Missing)
If the scorecard shows "Unknown", check if a job exists to fetch the data:

```sql
-- Check for pending/completed jobs
SELECT
  symbol,
  data_type,
  status,
  created_at,
  processed_at
FROM api_call_queue_v2
WHERE symbol = 'AAPL'
  AND data_type = 'grades-historical'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Should see a `completed` job with recent `processed_at` timestamp.

## Common Issues

### Issue 1: Shows "Unknown"
**Possible Causes:**
- No data in `grades_historical` table for the symbol
- All rating counts are zero (total === 0)
- Initial fetch failed (check console for errors)

**Solution:**
1. Check database for data
2. Verify job was created and processed
3. Check browser console for fetch errors

### Issue 2: Shows Wrong Consensus
**Possible Causes:**
- Calculation logic issue
- Using old data (not latest entry)

**Solution:**
1. Verify calculation manually using the formula above
2. Check that `gradesHistorical` is sorted by date (descending) and using latest entry

### Issue 3: Not Updating in Real-time
**Possible Causes:**
- Realtime subscription not active
- WebSocket connection dropped

**Solution:**
1. Check Network tab for WebSocket connection
2. Verify subscription is active in browser console
3. Check Supabase dashboard → Realtime → Subscriptions

## Quick Test Script

Run this SQL to verify data exists and check the calculation:

```sql
-- Get latest grades for a symbol
WITH latest_grades AS (
  SELECT
    symbol,
    date,
    analyst_ratings_strong_buy,
    analyst_ratings_buy,
    analyst_ratings_hold,
    analyst_ratings_sell,
    analyst_ratings_strong_sell,
    (analyst_ratings_strong_buy * 2 +
     analyst_ratings_buy * 1 +
     analyst_ratings_hold * 0 +
     analyst_ratings_sell * -1 +
     analyst_ratings_strong_sell * -2)::numeric /
    NULLIF(analyst_ratings_strong_buy + analyst_ratings_buy +
           analyst_ratings_hold + analyst_ratings_sell +
           analyst_ratings_strong_sell, 0) AS weighted_score
  FROM grades_historical
  WHERE symbol = 'AAPL'
  ORDER BY date DESC
  LIMIT 1
)
SELECT
  *,
  CASE
    WHEN weighted_score >= 1.5 THEN 'Strong Buy'
    WHEN weighted_score >= 0.5 THEN 'Buy'
    WHEN weighted_score >= -0.5 THEN 'Hold'
    WHEN weighted_score >= -1.5 THEN 'Sell'
    ELSE 'Strong Sell'
  END AS expected_consensus
FROM latest_grades;
```

## Summary

✅ **Working Correctly If:**
- Scorecard shows a consensus value (not "Unknown")
- Color coding matches the consensus (green/yellow/red)
- Updates automatically when database changes

❌ **Not Working If:**
- Shows "Unknown"
- No data in `grades_historical` table
- Console shows fetch errors
- Realtime subscription not active

