# Implementation Plan: On-Demand API Strategy

## Overview

This document provides a detailed, step-by-step implementation plan for migrating from scheduled bulk API calls to an on-demand, quota-aware system. The plan accounts for all FMP API endpoints and ensures we stay within the 20 GB monthly data transfer limit.

## Current State

### Completed ✅
- Exchange-wide bulk update crons disabled
- Exchange-wide endpoint calls removed
- Individual symbol cron frequency reduced/removed
- All bulk update crons removed
- All scheduled quote update crons removed

### Remaining Endpoints to Handle

1. **Quotes** (`fetch-fmp-quote-indicators`) - Individual symbol quotes
2. **Profiles** (`fetch-fmp-profiles`) - Company profiles (currently hourly)
3. **Financial Statements** (`fetch-fmp-financial-statements`) - Income, balance sheet, cash flow (currently monthly)
4. **Ratios TTM** (`fetch-fmp-ratios-ttm`) - Trailing twelve months ratios (currently daily)
5. **Shares Float** (`fetch-fmp-shares-float`) - Shares float data (currently daily)
6. **Dividend History** (`fetch-fmp-dividend-history`) - Historical dividends (currently quarterly)
7. **Revenue Segmentation** (`fetch-fmp-revenue-segmentation`) - Revenue breakdown (currently yearly)
8. **Grades Historical** (`fetch-fmp-grades-historical`) - Analyst grades (currently monthly)
9. **Exchange Variants** (`fetch-fmp-exchange-variants`) - Exchange variant info (currently daily)
10. **Exchange Market Status** (`fetch-fmp-all-exchange-market-status`) - Market status (currently daily, small data)
11. **Exchange Rates** (`fetch-exchange-rates`) - Currency exchange rates (currently daily, small data)
12. **Available Exchanges** (`fetch-fmp-available-exchanges`) - Exchange list (likely not scheduled)

---

## Phase 1: Foundation - Database Schema & Tracking (Week 1-2)

### Task 1.1: Create Symbol Usage Metrics Table
**File:** `supabase/migrations/[timestamp]_create_symbol_usage_metrics.sql`

```sql
CREATE TABLE IF NOT EXISTS public.symbol_usage_metrics (
  symbol TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_priority INTEGER DEFAULT 0,
  estimated_data_size_kb INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_symbol_usage_priority ON public.symbol_usage_metrics(fetch_priority DESC, last_viewed_at DESC);
CREATE INDEX idx_symbol_usage_last_viewed ON public.symbol_usage_metrics(last_viewed_at DESC);

COMMENT ON TABLE public.symbol_usage_metrics IS 'Tracks symbol popularity and usage patterns for prioritizing API calls';
```

**Dependencies:** None
**Estimated Time:** 30 minutes

---

### Task 1.2: Create API Data Usage Tracking Table
**File:** `supabase/migrations/[timestamp]_create_api_data_usage.sql`

```sql
CREATE TABLE IF NOT EXISTS public.api_data_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  data_size_bytes BIGINT NOT NULL,
  symbol TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_data_usage_created_at ON public.api_data_usage(created_at DESC);
CREATE INDEX idx_api_data_usage_endpoint ON public.api_data_usage(endpoint, created_at DESC);
CREATE INDEX idx_api_data_usage_symbol ON public.api_data_usage(symbol, created_at DESC);

COMMENT ON TABLE public.api_data_usage IS 'Tracks data transfer for rolling 30-day quota management';
```

**Dependencies:** None
**Estimated Time:** 30 minutes

---

### Task 1.3: Create API Call Queue Table
**File:** `supabase/migrations/[timestamp]_create_api_call_queue.sql`

```sql
CREATE TABLE IF NOT EXISTS public.api_call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'quote', 'profile', 'financial-statements', 'ratios', etc.
  priority INTEGER NOT NULL DEFAULT 0, -- 0=critical, 1=high, 2=medium, 3=low
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  estimated_data_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb -- Additional context for the request
);

CREATE INDEX idx_queue_priority ON public.api_call_queue(priority DESC, created_at ASC)
WHERE status = 'pending';
CREATE INDEX idx_queue_status ON public.api_call_queue(status, created_at ASC);
CREATE INDEX idx_queue_symbol_type ON public.api_call_queue(symbol, data_type, status);

COMMENT ON TABLE public.api_call_queue IS 'Queue for managing on-demand API calls with priority and quota awareness';
```

**Dependencies:** None
**Estimated Time:** 30 minutes

---

### Task 1.4: Create Quota Management Functions
**File:** `supabase/migrations/[timestamp]_create_quota_management_functions.sql`

```sql
-- Function to get rolling 30-day usage
CREATE OR REPLACE FUNCTION get_rolling_monthly_data_usage()
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(data_size_bytes), 0)
  FROM public.api_data_usage
  WHERE created_at >= NOW() - INTERVAL '30 days';
$$ LANGUAGE sql STABLE;

-- Function to check if quota available
CREATE OR REPLACE FUNCTION is_quota_available(required_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  monthly_usage BIGINT;
  quota_limit BIGINT := 20 * 1024 * 1024 * 1024; -- 20 GB in bytes
BEGIN
  monthly_usage := get_rolling_monthly_data_usage();
  RETURN (monthly_usage + required_bytes) <= quota_limit;
END;
$$ LANGUAGE plpgsql STABLE;

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
$$ LANGUAGE plpgsql STABLE;

-- Function to record data usage
CREATE OR REPLACE FUNCTION record_data_usage(
  p_endpoint TEXT,
  p_data_size_bytes BIGINT,
  p_symbol TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.api_data_usage (endpoint, data_size_bytes, symbol)
  VALUES (p_endpoint, p_data_size_bytes, p_symbol)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
```

**Dependencies:** Task 1.2
**Estimated Time:** 1 hour

---

### Task 1.5: Add Freshness Tracking to Existing Tables
**File:** `supabase/migrations/[timestamp]_add_freshness_tracking.sql`

```sql
-- Add freshness tracking to live_quote_indicators
ALTER TABLE public.live_quote_indicators
ADD COLUMN IF NOT EXISTS cache_ttl_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_live_quote_stale
ON public.live_quote_indicators(is_stale, fetched_at DESC)
WHERE is_stale = TRUE;

-- Add freshness tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_stale
ON public.profiles(is_stale, last_fetched_at DESC)
WHERE is_stale = TRUE;

-- Function to mark stale quotes
CREATE OR REPLACE FUNCTION mark_stale_quotes()
RETURNS void AS $$
UPDATE public.live_quote_indicators
SET is_stale = TRUE
WHERE fetched_at < NOW() - INTERVAL '5 minutes'
  AND is_stale = FALSE;
$$ LANGUAGE sql;

-- Function to mark stale profiles
CREATE OR REPLACE FUNCTION mark_stale_profiles()
RETURNS void AS $$
UPDATE public.profiles
SET is_stale = TRUE
WHERE last_fetched_at < NOW() - INTERVAL '24 hours'
  AND is_stale = FALSE;
$$ LANGUAGE sql;
```

**Dependencies:** None
**Estimated Time:** 1 hour

---

## Phase 2: Core On-Demand Infrastructure (Week 2-3)

### Task 2.1: Create Refresh Symbol Data Edge Function
**File:** `supabase/functions/refresh-symbol-data/index.ts`

**Purpose:** On-demand data refresh triggered by user requests

**Features:**
- Check cache freshness
- Return cached data immediately (stale-while-revalidate)
- Queue API call if stale/missing
- Check quota before queuing
- Support multiple data types (quote, profile, financial-statements, ratios, etc.)

**Input:**
```typescript
{
  symbol: string;
  dataTypes: ('quote' | 'profile' | 'financial-statements' | 'ratios' | 'shares-float' | 'dividend-history' | 'revenue-segmentation' | 'grades-historical' | 'exchange-variants')[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  forceRefresh?: boolean;
}
```

**Dependencies:** Tasks 1.1, 1.2, 1.3, 1.4
**Estimated Time:** 4-6 hours

---

### Task 2.2: Create Queue Processor Edge Function
**File:** `supabase/functions/process-api-queue/index.ts`

**Purpose:** Process queued API calls with rate limiting and quota management

**Features:**
- Process queue items in priority order
- Check quota before processing
- Respect rate limits (300 calls/minute)
- Track data size for each call
- Handle retries with exponential backoff
- Update queue status

**Dependencies:** Tasks 1.3, 1.4
**Estimated Time:** 4-6 hours

---

### Task 2.3: Create Rate Limiter Utility
**File:** `supabase/functions/_shared/rate-limiter.ts`

**Purpose:** Token bucket algorithm for rate limiting

**Features:**
- 300 tokens per minute
- Automatic refill
- Thread-safe (for Deno)

**Dependencies:** None
**Estimated Time:** 2 hours

---

### Task 2.4: Create Data Size Estimator Utility
**File:** `supabase/functions/_shared/data-size-estimator.ts`

**Purpose:** Estimate data size for different endpoints

**Features:**
- Per-endpoint size estimates
- Symbol-specific estimates
- Update estimates based on actual usage

**Dependencies:** None
**Estimated Time:** 1 hour

---

### Task 2.5: Update Existing Edge Functions to Support On-Demand
**Files:**
- `supabase/functions/fetch-fmp-quote-indicators/index.ts`
- `supabase/functions/fetch-fmp-profiles/index.ts`
- `supabase/functions/fetch-fmp-financial-statements/index.ts`
- `supabase/functions/fetch-fmp-ratios-ttm/index.ts`
- `supabase/functions/fetch-fmp-shares-float/index.ts`
- `supabase/functions/fetch-fmp-dividend-history/index.ts`
- `supabase/functions/fetch-fmp-revenue-segmentation/index.ts`
- `supabase/functions/fetch-fmp-grades-historical/index.ts`
- `supabase/functions/fetch-fmp-exchange-variants/index.ts`

**Changes:**
- Add data size tracking (record_data_usage)
- Add support for single symbol requests (not just bulk)
- Return data size in response
- Add error handling for quota exhaustion

**Dependencies:** Task 1.4
**Estimated Time:** 8-10 hours (1-1.5 hours per function)

---

## Phase 3: Frontend Integration (Week 3-4)

### Task 3.1: Create Refresh Hook
**File:** `src/hooks/useRefreshSymbolData.ts`

**Purpose:** React hook for triggering on-demand data refresh

**Features:**
- Check cache freshness
- Trigger refresh if stale
- Handle loading states
- Error handling

**Dependencies:** Task 2.1
**Estimated Time:** 2-3 hours

---

### Task 3.2: Update useStockData Hook
**File:** `src/hooks/useStockData.ts`

**Changes:**
- Integrate refresh hook
- Check freshness before displaying
- Trigger refresh on mount if stale
- Show refresh status

**Dependencies:** Task 3.1
**Estimated Time:** 2-3 hours

---

### Task 3.3: Update Card Initializers
**Files:**
- `src/components/game/cards/profile-card/profileCardUtils.ts`
- `src/components/game/cards/price-card/priceCardUtils.ts`
- Other card initializers as needed

**Changes:**
- Check freshness before initializing
- Trigger refresh if stale
- Show loading states

**Dependencies:** Task 3.1
**Estimated Time:** 4-6 hours

---

### Task 3.4: Add Refresh UI Components
**Files:**
- `src/components/ui/refresh-button.tsx` (new)
- Update card headers to show refresh status

**Features:**
- Manual refresh button
- Refresh status indicator
- Last updated timestamp

**Dependencies:** Task 3.1
**Estimated Time:** 2-3 hours

---

## Phase 4: Queue Processing & Scheduling (Week 4-5)

### Task 4.1: Create Queue Processor Cron Job
**File:** `supabase/migrations/[timestamp]_schedule_queue_processor.sql`

**Purpose:** Schedule queue processor to run every 10 seconds

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-api-queue'
  ) THEN
    PERFORM cron.schedule(
      'process-api-queue',
      '*/10 * * * * *', -- Every 10 seconds
      $cron$
      SELECT
        net.http_post(
            url := current_setting('supabase.functions.url') || '/process-api-queue',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
            ),
            body := '{}'::jsonb
        ) AS request_id;
      $cron$
    );
  END IF;
END $$;
```

**Dependencies:** Task 2.2
**Estimated Time:** 30 minutes

---

### Task 4.2: Update Existing Cron Jobs (Keep Only Essential)
**File:** `supabase/migrations/[timestamp]_update_remaining_cron_jobs.sql`

**Changes:**
- Keep exchange market status (daily, small data)
- Keep exchange rates (daily, small data)
- Remove or convert to on-demand:
  - Profiles (hourly → on-demand)
  - Ratios TTM (daily → on-demand)
  - Shares Float (daily → on-demand)
  - Exchange Variants (daily → on-demand)
- Keep low-frequency updates:
  - Financial Statements (monthly - can stay, but make on-demand available)
  - Dividend History (quarterly - can stay, but make on-demand available)
  - Revenue Segmentation (yearly - can stay, but make on-demand available)
  - Grades Historical (monthly - can stay, but make on-demand available)

**Dependencies:** None
**Estimated Time:** 1-2 hours

---

### Task 4.3: Implement Symbol Usage Tracking
**File:** `supabase/functions/_shared/track-symbol-usage.ts`

**Purpose:** Track when symbols are viewed/used

**Features:**
- Update view_count
- Update last_viewed_at
- Calculate fetch_priority
- Update symbol_usage_metrics table

**Dependencies:** Task 1.1
**Estimated Time:** 2 hours

---

### Task 4.4: Integrate Usage Tracking in Frontend
**Files:** Card components, useStockData hook

**Changes:**
- Call track-symbol-usage when symbol is viewed
- Update on card mount/focus

**Dependencies:** Task 4.3
**Estimated Time:** 2-3 hours

---

## Phase 5: Monitoring & Observability (Week 5-6)

### Task 5.1: Create Data Usage Dashboard Function
**File:** `supabase/functions/get-data-usage-stats/index.ts`

**Purpose:** Return data usage statistics for monitoring

**Returns:**
- Rolling 30-day usage (GB)
- Remaining quota (GB)
- Daily average usage (GB/day)
- Projected monthly usage (GB)
- Usage by endpoint type
- Usage by symbol
- Average data size per API call

**Dependencies:** Task 1.4
**Estimated Time:** 3-4 hours

---

### Task 5.2: Create Alerting System
**File:** `supabase/functions/check-quota-alerts/index.ts`

**Purpose:** Check quota status and send alerts if needed

**Alerts:**
- Daily usage > 15 GB (75% of quota)
- Daily usage > 18 GB (90% of quota)
- Quota exhausted (20 GB reached)
- Average daily usage > 800 MB/day
- Average daily usage > 1 GB/day

**Dependencies:** Task 1.4
**Estimated Time:** 2-3 hours

---

### Task 5.3: Schedule Alert Checker
**File:** `supabase/migrations/[timestamp]_schedule_quota_alerts.sql`

**Purpose:** Run alert checker every hour

**Dependencies:** Task 5.2
**Estimated Time:** 30 minutes

---

### Task 5.4: Create Admin Dashboard (Optional)
**File:** `src/app/admin/data-usage/page.tsx` (new)

**Purpose:** Admin dashboard to view data usage

**Features:**
- Real-time quota usage
- Usage charts
- Endpoint breakdown
- Symbol usage stats

**Dependencies:** Task 5.1
**Estimated Time:** 4-6 hours

---

## Phase 6: Testing & Optimization (Week 6-7)

### Task 6.1: Unit Tests
**Files:** Test files for new functions

**Coverage:**
- Rate limiter
- Data size estimator
- Queue processor
- Quota management functions

**Estimated Time:** 4-6 hours

---

### Task 6.2: Integration Tests
**Files:** E2E tests

**Coverage:**
- On-demand refresh flow
- Queue processing
- Quota enforcement
- Error handling

**Estimated Time:** 4-6 hours

---

### Task 6.3: Performance Testing
**Purpose:** Ensure system handles load

**Tests:**
- Concurrent refresh requests
- Queue processing under load
- Database query performance

**Estimated Time:** 2-3 hours

---

### Task 6.4: Optimize Data Size Estimates
**Purpose:** Refine estimates based on actual usage

**Changes:**
- Update estimates based on recorded data
- Symbol-specific estimates
- Endpoint-specific estimates

**Dependencies:** Task 5.1
**Estimated Time:** 2 hours

---

## Phase 7: Documentation & Deployment (Week 7-8)

### Task 7.1: Update API Documentation
**File:** Update relevant docs

**Content:**
- How to use refresh-symbol-data
- Queue system documentation
- Quota management guide

**Estimated Time:** 2-3 hours

---

### Task 7.2: Create Migration Guide
**File:** `docs/migration-guide-on-demand-api.md`

**Content:**
- Step-by-step migration
- Rollback procedures
- Monitoring checklist

**Estimated Time:** 2 hours

---

### Task 7.3: Deploy to Staging
**Steps:**
1. Deploy database migrations
2. Deploy edge functions
3. Update frontend
4. Test thoroughly
5. Monitor quota usage

**Estimated Time:** 4-6 hours

---

### Task 7.4: Deploy to Production
**Steps:**
1. Final testing
2. Deploy during low-traffic window
3. Monitor closely
4. Rollback plan ready

**Estimated Time:** 2-3 hours

---

## Data Type Mapping

| Data Type | Endpoint Function | Estimated Size | TTL | Priority |
|-----------|------------------|----------------|-----|----------|
| quote | fetch-fmp-quote-indicators | ~2 KB | 5 min | High |
| profile | fetch-fmp-profiles | ~5 KB | 24 hours | Medium |
| financial-statements | fetch-fmp-financial-statements | ~50 KB | 30 days | Low |
| ratios | fetch-fmp-ratios-ttm | ~2 KB | 24 hours | Medium |
| shares-float | fetch-fmp-shares-float | ~1 KB | 24 hours | Low |
| dividend-history | fetch-fmp-dividend-history | ~10 KB | 90 days | Low |
| revenue-segmentation | fetch-fmp-revenue-segmentation | ~20 KB | 365 days | Low |
| grades-historical | fetch-fmp-grades-historical | ~5 KB | 30 days | Low |
| exchange-variants | fetch-fmp-exchange-variants | ~3 KB | 24 hours | Low |
| exchange-status | fetch-fmp-all-exchange-market-status | ~50 KB total | 24 hours | Medium |
| exchange-rates | fetch-exchange-rates | ~10 KB total | 24 hours | Medium |

---

## Priority Levels

- **P0 (Critical):** User is actively viewing symbol, data is stale
- **P1 (High):** User recently viewed symbol, data is stale
- **P2 (Medium):** Scheduled refresh for popular symbols
- **P3 (Low):** Bulk updates during off-peak hours (minimal)

---

## Risk Mitigation

1. **Quota Exhaustion:** Pause non-critical updates, only process P0 items
2. **Rate Limit Hit:** Queue items, process when tokens available
3. **API Failures:** Retry with exponential backoff, return cached data
4. **Database Load:** Proper indexing, query optimization
5. **Queue Backlog:** Priority system, quota checks

---

## Success Metrics

- **Data Usage:** < 3 GB/month (vs 20 GB limit)
- **API Calls:** < 100 calls/minute average
- **Cache Hit Rate:** > 80%
- **User Experience:** < 500ms initial load, < 2s refresh
- **Quota Utilization:** < 15% of monthly limit

---

## Timeline Summary

- **Week 1-2:** Foundation (Database schema, tracking)
- **Week 2-3:** Core infrastructure (Edge functions, queue system)
- **Week 3-4:** Frontend integration
- **Week 4-5:** Queue processing & scheduling
- **Week 5-6:** Monitoring & observability
- **Week 6-7:** Testing & optimization
- **Week 7-8:** Documentation & deployment

**Total Estimated Time:** 7-8 weeks

---

## Next Steps

1. Review and approve this plan
2. Create implementation tickets
3. Set up project tracking
4. Begin Phase 1 implementation

