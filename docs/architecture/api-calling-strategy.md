# API Calling Strategy: Modern Scalable Approach for Financial Data

## Executive Summary

This document outlines a comprehensive strategy for managing FinancialModelingPrep (FMP) API calls in the Tickered application. The current approach of fetching all symbols every minute via cron jobs does not scale with:
- **300 calls/minute rate limit**
- **20 GB rolling monthly data transfer limit** (CRITICAL CONSTRAINT)

This document proposes a hybrid **database-first with stale-while-revalidate** pattern that prioritizes on-demand fetching, intelligent caching, and user-driven prioritization. **Bulk updates are strongly discouraged** due to the restrictive monthly data quota.

---

## Current State Analysis

### Current Architecture

1. **Scheduled Cron Jobs:**
   - `minute-fetch-fmp-quote-indicators`: Fetches quotes for ALL active symbols every minute
   - `daily-fetch-fmp-exchange-prices-api`: Fetches entire exchanges (NYSE, NASDAQ) daily
   - Various other scheduled jobs for profiles, financial statements, ratios, etc.

2. **Data Flow:**
   ```
   Cron Job → Edge Function → FMP API → Database → Realtime → Frontend
   ```

3. **Frontend Behavior:**
   - Queries database directly via Supabase
   - Subscribes to realtime updates
   - No direct API calls from frontend

### Critical Issues

1. **Rate Limit Violation:**
   - 300 calls/minute limit
   - If you have >300 active symbols, you cannot complete one full cycle per minute
   - Exchange endpoints return thousands of symbols in one call, but still count as one API call

2. **Data Transfer Limit Violation:**
   - **20 GB rolling monthly window limit** (CRITICAL CONSTRAINT)
   - Exchange-wide endpoints (NYSE, NASDAQ) can return 5-10+ MB per call
   - Bulk updates can easily exceed monthly limit
   - Example: 2 exchanges × 10 MB × 30 calls/month = 300 MB/month (just for quotes)
   - Financial statements, profiles, and other endpoints add significant data volume
   - **Monthly limit is ~667 MB/day average** - very restrictive for bulk operations

3. **Inefficient Resource Usage:**
   - Fetching data for symbols users aren't viewing
   - No prioritization based on user activity
   - Wasted API calls and data transfer for symbols whose exchanges are closed
   - Bulk updates consume precious data quota unnecessarily

4. **Scalability Bottleneck:**
   - As user base grows, more symbols become "active"
   - Linear increase in API calls and data transfer without corresponding value
   - Cannot scale horizontally with current approach

5. **User Experience:**
   - Users may see stale data for less popular symbols
   - No mechanism to refresh data on-demand when user requests it

---

## Recommended Architecture: Hybrid Database-First Strategy

### Core Principles

1. **Database as Source of Truth:** Always serve from database first
2. **Stale-While-Revalidate:** Return cached data immediately, refresh in background
3. **User-Driven Prioritization:** Fetch data ONLY for symbols users are actively viewing
4. **On-Demand First:** Prioritize on-demand fetching over scheduled bulk updates
5. **Data Transfer Management:** Track and limit daily data usage, avoid bulk operations
6. **Rate Limit Management:** Queue system with intelligent batching and data size awareness

### Architecture Overview

```
┌─────────────────┐
│   Frontend       │
│   (User Request) │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   API Gateway / Edge Function       │
│   - Check cache freshness            │
│   - Return cached data immediately   │
│   - Check data quota availability    │
│   - Queue refresh if stale & quota OK│
└────────┬─────────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────────────┐
│  Database    │   │  API Queue Manager    │
│  (Cache)     │   │  - Rate Limiter      │
│              │   │  - Data Quota Tracker│
│              │   │  - Priority Queue    │
└──────────────┘   └──────┬───────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  FMP API     │
                  │  - 300/min   │
                  │  - 20GB/month│
                  └──────────────┘
```

---

## Detailed Strategy

### 1. Data Freshness Tiers

Different data types have different freshness requirements:

| Data Type | Freshness Requirement | Update Frequency | Priority |
|-----------|----------------------|------------------|----------|
| **Live Quotes** | Critical (1-5 min) | On-demand + scheduled | High |
| **Profiles** | Moderate (1-24 hours) | On-demand + hourly bulk | Medium |
| **Financial Statements** | Low (monthly) | Monthly bulk | Low |
| **Ratios TTM** | Moderate (daily) | Daily bulk | Medium |
| **Dividend History** | Low (quarterly) | Quarterly bulk | Low |
| **Exchange Status** | Moderate (daily) | Daily bulk | Medium |

### 2. On-Demand Fetching Strategy

#### 2.1 User-Initiated Refresh

**When:** User opens a card, requests refresh, or navigates to a symbol

**How:**
1. Frontend checks database for existing data
2. If data exists and is fresh (< 5 min for quotes), return immediately
3. If data is stale or missing:
   - Return stale data immediately (stale-while-revalidate)
   - Queue API call in background
   - Update via realtime when fresh data arrives

**Implementation:**
```typescript
// New Edge Function: refresh-symbol-data
// Called from frontend when user requests data

async function refreshSymbolData(symbol: string, dataTypes: string[]) {
  // 1. Check cache freshness
  const cached = await getCachedData(symbol, dataTypes);
  const isStale = isDataStale(cached, dataTypes);

  // 2. Return cached data immediately
  if (cached && !isStale) {
    return cached;
  }

  // 3. Queue API call if stale/missing
  if (isStale || !cached) {
    await queueApiCall(symbol, dataTypes);
  }

  // 4. Return stale data (if available) while refreshing
  return cached || null;
}
```

#### 2.2 Priority Queue System

Implement a priority queue for API calls:

**Priority Levels:**
1. **P0 (Critical):** User is actively viewing symbol, data is stale
2. **P1 (High):** User recently viewed symbol, data is stale
3. **P2 (Medium):** Scheduled refresh for popular symbols
4. **P3 (Low):** Bulk updates during off-peak hours

**Queue Management:**
- Process P0 immediately (respecting rate limits)
- Batch P1-P3 during scheduled windows
- Use exponential backoff for failed requests

### 3. Smart Scheduled Updates

#### 3.1 Market Hours Awareness

**Symbol-Specific Market Hours:**
- Each symbol trades on a specific exchange (NYSE, NASDAQ, LSE, TSE, etc.)
- Market hours vary by exchange (e.g., NYSE: 9:30 AM - 4:00 PM ET, LSE: 8:00 AM - 4:30 PM GMT)
- Use the `exchange_market_status` table to determine if a symbol's exchange is currently open
- Check `live_quote_indicators.exchange` field to link symbol to its exchange

**During Symbol's Market Hours:**
- Prioritize on-demand fetching for active users viewing that symbol
- Optional: Minimal scheduled updates for "hot" symbols (top 20-30 most viewed) only if quota allows
- Focus updates on symbols whose exchanges are currently open

**During Symbol's Off-Market Hours:**
- **Avoid scheduled updates** - data won't change significantly when market is closed
- Rely on on-demand fetching if user requests (data will be stale but acceptable)
- **No bulk updates** - preserve monthly data quota for when markets are open

**Implementation:**
```typescript
// Check if symbol's exchange is open before scheduling update
async function shouldUpdateSymbol(symbol: string): Promise<boolean> {
  const quote = await getQuote(symbol);
  if (!quote?.exchange) return false;

  const exchangeStatus = await getExchangeStatus(quote.exchange);
  return exchangeStatus?.is_market_open ?? false;
}
```

#### 3.2 Symbol Prioritization

Track symbol popularity:
```sql
-- New table: symbol_usage_metrics
CREATE TABLE symbol_usage_metrics (
  symbol TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  last_fetched_at TIMESTAMP,
  fetch_priority INTEGER DEFAULT 0,
  estimated_data_size_kb INTEGER DEFAULT 0 -- Track data size per symbol
);
```

**Update Frequency Based on Priority:**
- **Tier 1 (Top 20-30):** On-demand + every 30-60 minutes **only when symbol's exchange is open** (highly optional, only if quota allows)
- **Tier 2 (Top 200):** On-demand only (no scheduled updates)
- **Tier 3 (All others):** **On-demand ONLY** - no scheduled updates

**⚠️ Note:** Market hours are checked per-symbol based on its exchange. A symbol on NYSE will only be updated during NYSE market hours, while a symbol on LSE will follow LSE market hours.

**⚠️ CRITICAL:** With 20 GB monthly limit (~667 MB/day average), scheduled bulk updates are STRONGLY DISCOURAGED. Prioritize on-demand fetching for user-requested symbols only.

#### 3.3 Revised Cron Schedule

**⚠️ CRITICAL:** With 20 GB monthly limit (~667 MB/day average), **bulk updates and exchange-wide endpoints MUST be avoided**. They will quickly exhaust the monthly quota.

**Recommended Schedule (Minimal - Optional):**

```sql
-- ONLY top 20-30 most popular symbols - every 30-60 minutes
-- This is HIGHLY OPTIONAL and should be disabled if data quota is tight
-- Note: Market hours check should be done per-symbol based on its exchange
-- This cron should check exchange_market_status.is_market_open before updating
'*/30 * * * *' -- Every 30 min (but only update if symbol's exchange is open)

-- Low-frequency updates for critical metadata (not quote data)
-- Exchange market status - once daily (small data size, ~10-50 KB)
'0 4 * * *' -- 4 AM UTC daily

-- Financial statements - monthly (as needed, not bulk)
'0 0 1 * *' -- Monthly on 1st
```

**Key Changes:**
- **Remove ALL bulk update crons** (exchange-wide endpoints consume too much data)
- **Remove minute-based cron for all symbols**
- **Remove or minimize scheduled quote updates** (consider removing entirely)
- **Prioritize on-demand fetching** - this should be the primary method
- Keep only minimal scheduled updates for top 20-30 symbols (highly optional)
- All other data: **on-demand only**

**Recommended: No Scheduled Quote Updates**
- **Strongly recommend removing ALL scheduled quote updates**
- Rely entirely on on-demand fetching triggered by user requests
- This maximizes monthly data quota for user-requested data
- With proper caching, users will see data immediately from database

### 4. Caching Strategy

#### 4.1 Database as Cache Layer

Your database (`live_quote_indicators`) already serves as a cache. Enhance it with:

**Freshness Tracking:**
```sql
ALTER TABLE live_quote_indicators
ADD COLUMN IF NOT EXISTS cache_ttl_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE;

-- Index for stale data queries
CREATE INDEX IF NOT EXISTS idx_live_quote_stale
ON live_quote_indicators(is_stale, fetched_at)
WHERE is_stale = TRUE;
```

**Stale Data Detection:**
```sql
-- Function to mark stale data
CREATE OR REPLACE FUNCTION mark_stale_quotes()
RETURNS void AS $$
UPDATE live_quote_indicators
SET is_stale = TRUE
WHERE fetched_at < NOW() - INTERVAL '5 minutes'
  AND is_stale = FALSE;
$$ LANGUAGE sql;
```

#### 4.2 Cache Invalidation Rules

| Data Type | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| Live Quotes | 5 minutes | Time-based + user request |
| Profiles | 24 hours | Time-based + user request |
| Financial Statements | 30 days | Time-based only |
| Ratios | 24 hours | Time-based + user request |

### 5. Rate Limit Management

#### 5.1 Token Bucket Algorithm

Implement a token bucket to manage rate limits:

```typescript
class RateLimiter {
  private tokens: number = 300;
  private lastRefill: number = Date.now();
  private refillRate: number = 300; // tokens per minute

  async acquire(): Promise<boolean> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000 / 60; // minutes
    this.tokens = Math.min(300, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
```

#### 5.2 Request Batching

**⚠️ CRITICAL:** Exchange-wide endpoints MUST be avoided due to monthly data transfer limits.

**Exchange-Wide Endpoints (STRICTLY AVOID):**
- ❌ `/api/v3/quotes/NYSE` returns 5-10+ MB per call
- ❌ Even 2 calls/day = 20-40 MB/day = 600-1200 MB/month (just for quotes)
- ❌ With financial statements, profiles, etc., easily exceeds 20 GB monthly limit
- ❌ **Monthly limit is ~667 MB/day average** - exchange endpoints consume this in days
- ✅ **Use individual symbol endpoints** - smaller, targeted data (~2 KB per symbol)

**Batch Individual Calls (Recommended):**
- Queue up to 50 symbols
- Process in batches of 50 every 10 seconds
- Respects 300/minute limit (50 * 6 = 300)
- **Track data size** for each batch to stay within monthly quota

### 6. Data Transfer Management

#### 6.1 Data Quota Tracking

**Track rolling monthly data usage:**
```sql
CREATE TABLE api_data_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  data_size_bytes BIGINT NOT NULL,
  symbol TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for rolling window queries
CREATE INDEX idx_api_data_usage_created_at ON api_data_usage(created_at DESC);

-- Function to get rolling 30-day usage
CREATE OR REPLACE FUNCTION get_rolling_monthly_data_usage()
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(data_size_bytes), 0)
  FROM api_data_usage
  WHERE created_at >= NOW() - INTERVAL '30 days';
$$ LANGUAGE sql;

-- Function to check if quota available (rolling 30-day window)
CREATE OR REPLACE FUNCTION is_quota_available(required_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  monthly_usage BIGINT;
  quota_limit BIGINT := 20 * 1024 * 1024 * 1024; -- 20 GB in bytes
BEGIN
  monthly_usage := get_rolling_monthly_data_usage();
  RETURN (monthly_usage + required_bytes) <= quota_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get remaining quota
CREATE OR REPLACE FUNCTION get_remaining_quota()
RETURNS BIGINT AS $$
DECLARE
  monthly_usage BIGINT;
  quota_limit BIGINT := 20 * 1024 * 1024 * 1024; -- 20 GB in bytes
BEGIN
  monthly_usage := get_rolling_monthly_data_usage();
  RETURN GREATEST(0, quota_limit - monthly_usage);
END;
$$ LANGUAGE plpgsql;
```

#### 6.2 Data Size Estimation

**Estimate data size per endpoint:**
```typescript
const ESTIMATED_DATA_SIZES = {
  'quote': 2 * 1024,           // ~2 KB per symbol
  'profile': 5 * 1024,          // ~5 KB per symbol
  'financial-statements': 50 * 1024,  // ~50 KB per symbol
  'ratios': 2 * 1024,           // ~2 KB per symbol
  'exchange-quotes': 10 * 1024 * 1024, // ~10 MB per exchange (AVOID)
};
```

**Track data size in queue:**
```sql
ALTER TABLE api_call_queue
ADD COLUMN estimated_data_size_bytes BIGINT DEFAULT 0;

-- Update queue processor to check quota
CREATE OR REPLACE FUNCTION can_process_queue_item(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  item_size BIGINT;
BEGIN
  SELECT estimated_data_size_bytes INTO item_size
  FROM api_call_queue
  WHERE id = item_id;

  RETURN is_quota_available(item_size);
END;
$$ LANGUAGE plpgsql;
```

#### 6.3 Quota-Aware Queue Processing

**Update queue processor to respect monthly data quota:**
```typescript
async function processQueueWithQuotaCheck() {
  const monthlyUsage = await getRollingMonthlyDataUsage();
  const quotaLimit = 20 * 1024 * 1024 * 1024; // 20 GB
  const remainingQuota = quotaLimit - monthlyUsage;

  // More conservative thresholds for monthly limit
  if (remainingQuota < 500 * 1024 * 1024) { // Less than 500 MB remaining (2.5% of quota)
    console.warn('Monthly quota nearly exhausted, pausing non-critical queue processing');
    // Only process P0 (critical user requests)
    return processCriticalItemsOnly();
  }

  if (remainingQuota < 2 * 1024 * 1024 * 1024) { // Less than 2 GB remaining (10% of quota)
    console.warn('Monthly quota low, processing only high-priority items');
    // Only process P0 and P1 items
  }

  // Process queue items, tracking data size
  const items = await getPendingQueueItems(50);
  let totalSize = 0;

  for (const item of items) {
    if (totalSize + item.estimatedSize > remainingQuota) {
      break; // Stop if would exceed quota
    }

    // Process item and track data size
    const response = await fetchFromAPI(item);
    const actualSize = response.headers.get('content-length') || item.estimatedSize;
    await recordDataUsage(item.endpoint, actualSize, item.symbol);

    totalSize += actualSize;
  }
}
```

#### 6.4 Data Usage Monitoring

**Key Metrics:**
- Rolling 30-day data usage (GB)
- Remaining quota (GB)
- Average daily usage (GB/day)
- Projected monthly usage (based on current rate)
- Data usage by endpoint type
- Data usage by symbol
- Average data size per API call

**Alerting:**
- Rolling monthly usage > 15 GB (75% of quota) - **CRITICAL**
- Rolling monthly usage > 18 GB (90% of quota) - **CRITICAL**
- Quota exhausted (20 GB reached) - **CRITICAL**
- Average daily usage > 800 MB/day (would exceed quota in 25 days)
- Average daily usage > 1 GB/day (would exceed quota in 20 days)

### 7. Implementation Phases

#### Phase 1: Foundation (Week 1-2)
1. Create `symbol_usage_metrics` table
2. Create `api_data_usage` table for quota tracking
3. Add freshness tracking to existing tables
4. Implement on-demand refresh edge function
5. Add priority queue system with data size tracking
6. Update frontend to call refresh function

#### Phase 2: Quota Management (Week 3-4)
1. Implement rolling monthly data quota tracking functions
2. Add data size estimation to queue items
3. Update queue processor to check quota before processing
4. Add data usage monitoring and alerting (rolling 30-day window)
5. **Disable ALL bulk update crons immediately**
6. **Disable or remove exchange-wide endpoint calls**

#### Phase 3: Smart Scheduling (Week 5-6)
1. Remove exchange-wide bulk update crons
2. Implement symbol-specific market hours detection (check exchange_market_status per symbol)
3. Add symbol popularity tracking
4. Keep only minimal scheduled updates (top 20-30 symbols, highly optional)
5. Prioritize on-demand fetching

#### Phase 4: Optimization (Week 7-8)
1. Implement rate limiter with quota awareness
2. Optimize data size per request
3. Add request deduplication (avoid fetching same symbol multiple times)
4. Fine-tune cache TTLs based on data usage patterns
5. Add comprehensive monitoring dashboard

#### Phase 5: Advanced Features (Week 9+)
1. ⚠️ Predictive prefetching (only if quota allows) - **NOT RECOMMENDED**
2. User-specific caching (premium users get faster updates)
3. Webhook support (if FMP offers it - would reduce quota usage)
4. Multi-API key rotation (if you have multiple keys)
5. Data compression strategies (if API supports it)

---

## Technical Implementation Details

### 1. New Edge Function: `refresh-symbol-data`

**Purpose:** On-demand data refresh triggered by user requests

**Input:**
```typescript
{
  symbol: string;
  dataTypes: ('quote' | 'profile' | 'financials' | 'ratios')[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
}
```

**Logic:**
1. Check cache freshness
2. If fresh, return immediately
3. If stale, queue API call and return cached data
4. Update via realtime when fresh data arrives

### 2. Queue System

**Database Table:**
```sql
CREATE TABLE api_call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_queue_priority ON api_call_queue(priority DESC, created_at ASC)
WHERE status = 'pending';
```

**Queue Processor (Cron Job):**
- Runs every 10 seconds
- Processes top 50 pending items
- Respects rate limits
- Handles retries with exponential backoff

### 3. Frontend Integration

**Update `useStockData` hook:**
```typescript
async function fetchQuoteWithRefresh(symbol: string) {
  // 1. Try database first
  const cached = await fetchFromDB(symbol);

  // 2. Check freshness
  if (isFresh(cached)) {
    return cached;
  }

  // 3. Trigger refresh (non-blocking)
  refreshSymbolData(symbol, ['quote']).catch(console.error);

  // 4. Return stale data immediately
  return cached;
}
```

### 4. Monitoring & Observability

**Key Metrics to Track:**
- API call rate (calls/minute)
- **Rolling 30-day data usage (GB) - CRITICAL**
- **Remaining quota (GB) - CRITICAL**
- **Average daily usage (GB/day) - CRITICAL**
- **Projected monthly usage (GB) - CRITICAL**
- Cache hit rate (% of requests served from cache)
- Average data freshness (time since last update)
- Queue depth (number of pending API calls)
- Error rate (failed API calls)
- Data usage by endpoint type
- Average data size per API call

**Alerting:**
- **Rolling monthly usage > 15 GB (75% of quota) - CRITICAL**
- **Rolling monthly usage > 18 GB (90% of quota) - CRITICAL**
- **Quota exhausted (20 GB reached) - CRITICAL**
- **Average daily usage > 800 MB/day (would exceed quota) - CRITICAL**
- **Average daily usage > 1 GB/day (would exceed quota) - CRITICAL**
- Rate limit approaching (250+ calls/minute)
- Queue depth > 1000
- Error rate > 5%
- Cache hit rate < 80%

---

## Migration Plan

### Step 1: Parallel Running (No Breaking Changes)
1. Deploy new refresh function alongside existing cron jobs
2. Deploy rolling monthly data quota tracking system
3. Update frontend to use refresh function for user-initiated requests
4. **Monitor current rolling monthly data usage** to establish baseline
5. Keep existing cron jobs running (but monitor data usage closely)
6. **Calculate current daily average** to project if quota will be exceeded

### Step 2: Gradual Migration (URGENT)
1. ✅ **Disable exchange-wide bulk update crons IMMEDIATELY** (highest data consumers) - **COMPLETED**
2. ✅ **Disable or remove exchange-wide endpoint calls** (NYSE, NASDAQ bulk fetches) - **COMPLETED**
3. ✅ Reduce individual symbol cron frequency (every minute → every 30-60 minutes, top 20-30 only, or remove entirely) - **COMPLETED**
4. Increase reliance on on-demand fetching
5. Monitor API usage, cache hit rates, and **rolling monthly data quota usage**
6. **Calculate if current usage rate will exceed 20 GB/month** - if yes, disable more crons

### Step 3: Full Migration
1. ✅ **Remove ALL bulk update crons** (exchange-wide endpoints) - **COMPLETED**
2. ✅ **Remove ALL scheduled quote update crons** (or keep only top 20-30, highly optional) - **COMPLETED**
3. **Rely primarily on on-demand fetching** for all quote data
4. Keep only minimal scheduled updates for critical metadata (exchange status, etc.)
5. All user-facing quote data comes from **on-demand fetching exclusively**

### Step 4: Optimization
1. Fine-tune priority tiers based on usage data and quota availability
2. Optimize batch sizes to minimize data transfer
3. **Avoid predictive prefetching** (consumes quota unnecessarily)
4. Focus on maximizing cache hit rate to reduce API calls

---

## Cost & Performance Benefits

### API Call Reduction

**Current (Estimated):**
- 300+ symbols × 1 call/minute = 300+ calls/minute (at limit)
- Exchange-wide updates: 2 calls/day × 10 MB = 20 MB/day = 600 MB/month (just quotes)
- Cannot scale beyond 300 symbols
- **Risk of exceeding 20 GB monthly quota with bulk operations**

**Proposed:**
- Top 20-30 symbols (highly optional): 2-4 calls/hour **only when their exchanges are open** = ~0.1-0.2 calls/minute average
- On-demand: ~50-100 calls/minute (user-driven, prioritized)
- **NO bulk updates** (exchange-wide endpoints disabled)
- **Total: ~50-100 calls/minute average** (67-83% reduction in calls)
- **Data usage: ~60-120 MB/day = ~1.8-3.6 GB/month** (vs potential 20+ GB with bulk updates)
- **80-90% reduction in data transfer** - critical for monthly quota

### User Experience Improvements

1. **Faster Initial Load:** Database queries are faster than API calls
2. **Always Responsive:** Stale-while-revalidate pattern ensures UI never blocks
3. **Fresher Data for Active Users:** On-demand ensures viewed symbols are up-to-date
4. **Better Scalability:** Can support unlimited symbols with smart prioritization

### Cost Savings

- **Reduced data transfer: 80-90% reduction** (from ~20 GB/month to ~1.8-3.6 GB/month)
- Reduced API calls: 67-83% reduction
- Reduced edge function invocations = lower Supabase costs
- Better resource utilization = improved performance
- **Avoid quota exhaustion penalties** (if applicable)
- **Stay well within monthly limit** - room for growth

---

## Risk Mitigation

### Risks

1. **Stale Data for Inactive Symbols:**
   - Mitigated by on-demand fetching when user requests
   - Acceptable trade-off to preserve data quota
   - Users see data when they need it, not proactively

2. **Quota Exhaustion:**
   - **CRITICAL RISK** - Mitigated by quota tracking and monitoring
   - Pause queue processing when quota low
   - Prioritize user-requested data over scheduled updates

3. **Queue Backlog:**
   - Mitigated by priority system, rate limiting, and quota checks
   - Low-priority items may wait if quota is limited

4. **API Failures:**
   - Mitigated by retry logic and graceful degradation
   - Return cached data if API unavailable

5. **Database Load:**
   - Mitigated by proper indexing and query optimization
   - Increased reliance on database as cache layer

### Fallback Strategies

1. **API Failure:** Return cached data, queue retry (respect quota)
2. **Rate Limit Hit:** Pause queue processing, resume when tokens available
3. **Quota Exhaustion (Monthly):**
   - **CRITICAL** - Pause ALL scheduled updates immediately
   - Only process user-requested (P0 priority) items
   - Return cached data for all other requests
   - Alert operations team immediately
   - May need to wait for rolling window to expire (30 days) before quota resets
4. **Database Issues:** Log errors, continue serving stale data
5. **High Load:** Throttle non-critical updates, prioritize user requests
6. **Quota Approaching Limit (>18 GB monthly):**
   - Disable ALL optional scheduled updates immediately
   - Increase cache TTLs temporarily
   - Only process critical user requests (P0 priority)
   - Consider extending cache TTLs for non-critical data
   - Monitor daily average to ensure staying within monthly limit

---

## Best Practices

### 1. Always Serve from Database First
Never make API calls from frontend. Always query database, trigger refresh if needed.

### 2. Stale-While-Revalidate Pattern
Return cached data immediately, refresh in background. Users see data instantly.

### 3. User-Driven Prioritization
Fetch data ONLY for symbols users are viewing. Don't waste API calls or data quota on unused symbols.

### 4. Data Quota Management
Track rolling monthly data usage. Pause non-critical updates when quota is low. Prioritize user-requested data over scheduled bulk updates.

### 5. Avoid Bulk Operations
**DO NOT use exchange-wide endpoints** - they consume too much data quota. Use individual symbol endpoints for targeted, smaller data transfers.

### 6. Respect Rate Limits
Always implement rate limiting. Never exceed API provider limits.

### 7. Monitor Everything
Track API usage, cache hit rates, queue depth, error rates, and rolling monthly data usage. Set up alerts.

### 8. Graceful Degradation
If API fails, serve stale data. If database fails, show error message. Never crash.

---

## Conclusion

The recommended hybrid approach combines:

1. **Database-first architecture** for fast, reliable data serving
2. **On-demand fetching** for user-requested symbols
3. **Smart scheduling** based on symbol-specific market hours (per exchange) and symbol popularity
4. **Intelligent caching** with freshness tracking
5. **Rate limit management** with queue system and batching

This strategy:
- ✅ Reduces API calls by 67-83%
- ✅ **Reduces data transfer by 80-90%** (critical for 20 GB monthly limit)
- ✅ **Stays well within monthly quota** (~1.8-3.6 GB/month vs 20 GB limit)
- ✅ Improves user experience with faster load times
- ✅ Scales to unlimited symbols with smart prioritization
- ✅ Maintains data freshness for active users (on-demand)
- ✅ Provides cost savings and better resource utilization
- ✅ **Prevents monthly quota exhaustion** through intelligent quota management
- ✅ **Uses rolling window tracking** to monitor 30-day usage accurately

**Next Steps:**
1. Review and approve this strategy
2. **Establish baseline rolling monthly data usage** (measure current 30-day consumption)
3. **Calculate if current usage will exceed 20 GB/month** - if yes, take immediate action
4. Create implementation tickets for Phase 1 (including rolling monthly quota tracking)
5. Set up monitoring and metrics (especially rolling monthly data quota)
6. **Begin phased migration IMMEDIATELY** (start by disabling bulk updates and exchange-wide endpoints)
7. **Consider removing ALL scheduled quote updates** to maximize quota for user requests

---

## Appendix: Code Examples

### Example: On-Demand Refresh Function

```typescript
// supabase/functions/refresh-symbol-data/index.ts
Deno.serve(async (req: Request) => {
  const { symbol, dataTypes, priority = 'medium' } = await req.json();

  // Check cache
  const cached = await getCachedData(symbol, dataTypes);
  const isStale = checkFreshness(cached, dataTypes);

  // Return immediately if fresh
  if (cached && !isStale) {
    return new Response(JSON.stringify({ data: cached, source: 'cache' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Queue refresh if stale
  if (isStale || !cached) {
    await queueApiCall(symbol, dataTypes, priority);
  }

  // Return stale data (or null) while refreshing
  return new Response(JSON.stringify({
    data: cached,
    source: 'cache-stale',
    refreshing: true
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Example: Queue Processor

```typescript
// supabase/functions/process-api-queue/index.ts
Deno.serve(async () => {
  const rateLimiter = new RateLimiter(300); // 300 calls/minute
  const BATCH_SIZE = 50;

  // Get pending items
  const pending = await getPendingQueueItems(BATCH_SIZE);

  for (const item of pending) {
    // Check rate limit
    if (!await rateLimiter.acquire()) {
      break; // Wait for next cycle
    }

    // Process item
    try {
      await fetchAndUpdate(item.symbol, item.data_type);
      await markCompleted(item.id);
    } catch (error) {
      await handleError(item, error);
    }
  }

  return new Response(JSON.stringify({ processed: pending.length }));
});
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-XX
**Author:** Senior Engineering Team
**Status:** Proposal - Pending Review

