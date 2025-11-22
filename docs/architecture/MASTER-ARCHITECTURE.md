# Master Architecture: Metadata-Driven Backend-Controlled Refresh System

**Version:** 2.4.0 (Production-Ready - Scale Optimizations Complete)
**Last Updated:** 2025-01-XX
**Status:** Approved Architecture

> **Performance Optimizations (v2.1):**
> - ✅ Heartbeat-based subscription management (client-driven with backend cleanup)
> - ✅ Fully autonomous staleness checking (background checker only, no event-driven check)
> - ✅ Queue throttling prevents bloat (protects high-priority inserts)
> - ✅ Fixed priority calculation (priority = viewer count)
> - ✅ Reduced to 2 cron jobs (from 3)
>
> **Hardening Fixes (v2.1.1):**
> - ✅ Background checker uses active_subscriptions_v2 table (updated by client heartbeats)
> - ✅ Truly generic staleness query (100% metadata-driven, zero hardcoded types)
> - ✅ Idempotent queueing (prevents race condition duplicates)
>
> **Final Polish (v2.1.2):**
> - ✅ Parallel on-subscribe checks (Promise.all for concurrent execution)
> - ✅ Consolidated background job (single RPC call or all in Postgres)
> - ✅ Type-by-type loop over metadata (fast), not row-by-row over data (slow)
>
> **Security & Robustness Hardening (v2.1.3):**
> - ✅ SQL injection protection (registry read-only, identifier validation)
> - ✅ Silent failure prevention (HTTP error checking in cron job)
> - ✅ Performance optimization (single batch RPC call for on-subscribe)
> - ✅ Set-based scheduled job (eliminates multiple full table scans)
>
> **Final Specification Hardening (v2.1.4):**
> - ✅ Fault tolerance (exception handling per data type - prevents single-fault failures)
> - ✅ Documentation consistency (corrected Presence parsing example)
> - ✅ Infrastructure prerequisites documented (pg_net extension requirements)
>
> **Critical Bug Fixes (v2.1.5):**
> - ✅ Atomic queue batch claiming (prevents race condition and job duplication)
> - ✅ Fail-safe to stale logic (failed checks assume stale and queue refresh)
> - ✅ Cron job function name corrected (matches actual function definition)
>
> **Operational Hardening (v2.1.6):**
> - ✅ Stuck job recovery mechanism (prevents poisoned batches from blocking queue)
> - ✅ Priority levels documentation aligned with implementation (removed non-existent P1/P2)
> - ✅ Client-driven subscription management with heartbeat system (client adds/removes subscriptions directly)
>
> **Subscription Management Hardening (v2.1.7):**
> - ✅ Centralized subscription manager with reference counting (prevents deleting subscriptions when multiple cards share same data type)
> - ✅ Fixed infinite job creation bug (fetched_at now properly updated on upsert for all multi-row tables)
> - ✅ Fixed subscription deletion bug (revenue + solvency + cashuse cards now correctly share single financial-statements subscription)
>
> **Red-Team Hardening (v2.1.7):**
> - ✅ Queue completion lifecycle (complete_queue_job/fail_queue_job prevent infinite retry loops)
> - ✅ Cron job self-contention prevention (advisory locks prevent overlapping executions)
> - ✅ TTL validation (CHECK constraints and function validation prevent infinite refresh loops)
>
> **Operational Readiness (v2.2.0):**
> - ✅ Observability sink requirements (warnings/notices must trigger alerts, not just logs)
> - ✅ Operational runbook (step-by-step troubleshooting guides for common failures)
> - ✅ Processor implementation constraints (concurrency limiting, rate limit awareness, batch processing)
>
> **Implementation Completeness (v2.2.1):**
> - ✅ Quota enforcement implemented (get_queue_batch checks quota before processing)
> - ✅ Data usage tracking (complete_queue_job logs usage for rolling 30-day calculation)
> - ✅ Processor execution model defined (looping processor for high throughput)
> - ✅ Queue processor cron job added (4th cron job invokes processor every minute)
>
> **Final Control Loops (v2.2.2):**
> - ✅ Quota-aware producers (check_and_queue_stale_data_from_presence and queue_scheduled_refreshes check quota first)
> - ✅ Circuit breaker for processor (invoke_processor_if_healthy prevents thundering herd of broken invocations)
> - ✅ Predictive quota check (get_queue_batch accounts for batch size before serving, with 95% safety buffer)
> - ✅ Estimate accuracy monitoring (alert when actual size > 2x estimated size)
>
> **Antifragile Hardening (v2.2.3):**
> - ✅ Edge Function data type validation (prevents silent failures from registry misconfiguration)
> - ✅ Edge Function API response validation (prevents infinite loops from "liar APIs" returning 200 OK with invalid data)
> - ✅ Recovery job deadlock prevention (FOR UPDATE SKIP LOCKED prevents self-contention with processor)
>
> **Meta-Level Hardening (v2.3.0):**
> - ✅ Analytics moved to batch operation (eliminates DoS vector from hot-path writes)
> - ✅ Invoker fault tolerance (exception handling for processor invocation failures)
> - ✅ Maintainer's governance (Sacred Contracts section prevents future "simplifications" from breaking the system)
>
> **Hidden Assumptions Hardened (v2.3.1):**
> - ✅ Accurate quota tracking (uses Content-Length header, not JSON.stringify().length)
> - ✅ Advisory lock timeout protection (5-second timeout prevents slow API griefing)
> - ✅ Proactive self-healing (recovery runs every minute via processor invoker, eliminating delayed immunity gaps)
>
> **Meta-Level Data & Scale Hardened (v2.3.2):**
> - ✅ Data sanity checks (Edge Functions validate logical correctness, not just shape, preventing permanent data corruption)
> - ✅ Priority inversion prevention (scheduled jobs hardcoded to -1, preventing low-value work from starving user-facing requests)
> - ✅ Scale performance optimization (TABLESAMPLE prevents "Day 365" performance failure as platform grows)
>
> **Environmental Hardening (v2.3.3):**
> - ✅ Complete cron hardening (all cron jobs use advisory locks, preventing cron pile-ups)
> - ✅ Table partitioning (api_call_queue partitioned by status, preventing Day 90 table bloat performance catastrophe)
> - ✅ Primary-only execution mandate (staleness/queue functions must run on primary, preventing read-replica lag issues)
>
> **Scale & Metadata Hardening (v2.3.4):**
> - ✅ Symbol-by-Symbol query pattern (inverted from Type-by-Type, prevents temp table thundering herd at 100k+ users)
> - ✅ Partition maintenance policy (weekly truncation of completed/failed partitions, prevents poisoned partition bloat)
> - ✅ Metadata-driven TTL enforcement (removed DEFAULT from is_data_stale, prevents split-brain TTL bugs)
>
> **Data Integrity & Operational Hardening (v2.3.5):**
> - ✅ Source timestamp awareness (Edge Functions validate API source timestamps, prevents "liar API stale data" laundering)
> - ✅ Circuit breaker sensitivity (monitors retry_count > 0, not status = 'failed', prevents retry thundering herd)
> - ✅ Polite partition maintenance (lock_timeout prevents "stop-the-world" deadlock with processors)
>
> **Contract Enforcement & Data Integrity (v2.3.6):**
> - ✅ Strict schema parsing (Edge Functions use Zod/validation libraries, prevents "schema drift" data corruption)
> - ✅ Database unit testing (Sacred Contracts enforced by automated tests in CI/CD, prevents unenforceable honor system)
> - ✅ Deadlock-aware error handling (processor explicitly handles 40P01, prevents mis-attributed failures)
>
> **Permissions, Scale & Contract Enforcement (v2.3.7):**
> - ✅ SECURITY DEFINER on on-subscribe RPC (check_and_queue_stale_batch executes with admin permissions, prevents RLS failure)
> - ✅ Monofunction processor architecture (imports logic directly, prevents connection pool exhaustion from FaaS-to-FaaS invocations)
> - ✅ Application contract linting (ESLint rules enforce TypeScript contracts, prevents unenforceable honor system for application code)
>
> **Scale, State & Governance (v2.3.8):**
> - ✅ Split "God Function" cron job (analytics refresh moved to separate job, prevents Job 1 from exceeding 5-minute window)
> - ✅ Stateless FaaS processor pattern (SQL loop invokes stateless Edge Function, prevents abandoned work from timeout-killed tasks)
> - ✅ Phase 0 governance mandate (contract enforcement CI/CD is blocking prerequisite, prevents unenforceable honor system)
>
> **Environmental Hardening (v2.3.9):**
> - ✅ Aggressive internal timeouts (10-second API call timeout prevents slow API throughput collapse)
> - ✅ Schema migration atomicity (schema + Zod + integration test in same PR prevents silent breakage)
> - ✅ External heartbeat monitor (pg_cron health check prevents single point of failure)
>
> **Scale Optimizations (v2.4.0):**
> - ✅ Immediate deadlock reset (5-minute delay → <1 second delay for fast retry)
> - ✅ Auto-correcting estimate registry (weighted moving average removes human from loop)
> - ✅ Sharded monofunctions roadmap (bundle size limit mitigation strategy documented)

---

## Executive Summary

This document defines the **canonical architecture** for Tickered's API calling strategy. All other architecture documents should align with this master plan.

### Core Principles

1. **Backend-Controlled:** Backend tracks active subscriptions and proactively refreshes stale data
2. **Metadata-Driven:** Zero hardcoded data types - all configuration in `data_type_registry` table
3. **Function-Based Staleness:** Option A - `is_data_stale()` function computes staleness on-the-fly
4. **Generic Queue System:** Works for all data types without code changes
5. **Minimal Scheduled Jobs:** Only 2 generic cron jobs (not 11+ individual jobs)
6. **Self-Organizing:** System automatically figures out what needs refreshing

### Key Constraints

- **300 calls/minute** rate limit
- **20 GB rolling monthly** data transfer limit (CRITICAL)
- **On-demand first:** Prioritize user-requested data over scheduled bulk updates

---

## Architecture Overview

**URL Structure:**
- **Frontend Application:** `https://www.tickered.com` (user-facing web application)
- **API & Edge Functions:** `https://api.tickered.com` (all backend endpoints, Edge Functions, and Realtime)

```
┌─────────────────────────────────────────┐
│  Frontend (Passive)                     │
│  - Joins Realtime channels with Presence│
│  - Tracks presence with metadata        │
│  - Receives updates automatically       │
│  - No staleness checking                │
└──────────────┬──────────────────────────┘
               │
               │ (Presence tracked)
               ▼
┌─────────────────────────────────────────┐
│  Supabase Realtime Presence             │
│  - Source of truth for active viewers   │
│  - Zero database load                   │
│  - Perfectly accurate, real-time        │
└──────────────┬──────────────────────────┘
               │
               │ (queried via pg_net/http)
               ▼
┌─────────────────────────────────────────┐
│  Postgres Database (Cron Jobs)          │
│  - check_and_queue_stale_data_from_     │
│    presence() (runs inside Postgres)    │
│  - Uses data_type_registry (Metadata)  │
│  - Cleans up stale subscriptions (> 5 minutes old) │
│  - queue_scheduled_refreshes()          │
│  - recover_stuck_jobs()                 │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ On-Demand    │  │ Scheduled    │
│ Staleness    │  │ Refreshes    │
│ Checker      │  │ (Generic)    │
│ (Generic)    │  │              │
│              │  │              │
│ - Event-     │  │ - Throttled  │
│   driven     │  │ - Queue depth│
│   (on        │  │   aware      │
│   subscribe)│  │              │
│   via Edge   │  │              │
│   Function   │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌─────────────────────────────────────────┐
│  api_call_queue (Generic)                │
│  - Works for all data types             │
│  - Priority-based processing            │
│  - Idempotent inserts                   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Generic      │  │ Generic      │
│ Queue        │  │ Processor    │
│ Inserter     │  │ (Calls edge  │
│              │  │  functions   │
│              │  │  dynamically)│
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  FMP API     │
                  │  - 300/min   │
                  │  - 20GB/month│
                  └──────────────┘

Note: active_subscriptions table (optional, analytics only)
      - Not shown in diagram (not part of core flow)
      - Presence is the source of truth

Implementation Note: This diagram shows the state-of-the-art "All in Postgres"
implementation (Section 4b), where the Postgres Database itself queries Realtime
Presence via pg_net/http extension. The alternative Edge Function approach
(also documented in Section 4b) is functionally equivalent but requires an
additional network hop.
```

---

## Core Components

### 1. Data Type Registry (Metadata Table)

**Purpose:** Single source of truth for all data types. Adding new types requires zero code changes.

```sql
CREATE TABLE data_type_registry (
  data_type TEXT PRIMARY KEY, -- 'quote', 'profile', 'financial-statements', etc.
  table_name TEXT NOT NULL, -- 'live_quote_indicators', 'profiles', etc.
  timestamp_column TEXT NOT NULL, -- 'fetched_at', 'modified_at', 'last_fetched_at'
  staleness_function TEXT NOT NULL, -- 'is_data_stale', 'is_profile_stale', etc.
  default_ttl_minutes INTEGER NOT NULL CHECK (default_ttl_minutes > 0), -- 5, 1440, 43200, etc. (must be positive)
  edge_function_name TEXT NOT NULL, -- 'fetch-fmp-quote-indicators', etc.
  refresh_strategy TEXT NOT NULL, -- 'on-demand', 'scheduled'
  refresh_schedule TEXT, -- Cron expression if scheduled (NULL for on-demand)
  priority INTEGER DEFAULT 0, -- For queue processing
  estimated_data_size_bytes BIGINT DEFAULT 0,
  symbol_column TEXT DEFAULT 'symbol', -- For generic queries
  source_timestamp_column TEXT NULL -- Optional: Column name in API response for source timestamp (e.g., 'lastUpdated', 'timestamp', 'date')
);

-- CRITICAL SECURITY: Make registry read-only for all non-super-admin roles
-- This prevents SQL injection via malicious registry entries
REVOKE ALL ON data_type_registry FROM PUBLIC;
GRANT SELECT ON data_type_registry TO authenticated, anon;
-- Only postgres super-admin can INSERT/UPDATE/DELETE
-- This is a non-negotiable security boundary

-- CRITICAL VALIDATION: Ensure TTL values are always positive
-- Negative TTLs would cause infinite refresh loops (data always considered stale)
-- This CHECK constraint prevents configuration errors from causing quota exhaustion
```

**Security Requirement: Registry Protection**

The `data_type_registry` table contains values that are injected into dynamic SQL queries using `format()`. **This table MUST be read-only** for all roles except the `postgres` super-admin to prevent SQL injection attacks.

**Why This Is Critical:**
- Malicious values in `staleness_function`, `table_name`, etc. could execute arbitrary SQL
- Example: `staleness_function = 'is_data_stale(fetched_at, 5); TRUNCATE TABLE auth.users; --'`
- Even with `%I` format specifier, if non-admin users can write to the registry, the system is vulnerable

**Implementation:**
- Use strict `GRANT`/`REVOKE` permissions (shown above)
- Or use Row Level Security (RLS) to deny all writes except from service role
- Validate identifiers before use (defense in depth - see helper function below)

**Identifier Validation Helper (Defense in Depth):**

```sql
-- Validate identifiers before use in dynamic SQL (additional safety layer)
CREATE OR REPLACE FUNCTION is_valid_identifier(p_identifier TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Simple check: ensure it contains only safe characters
  -- A more robust check would query information_schema.columns
  RETURN p_identifier ~ '^[a-zA-Z0-9_]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Per-Row TTL Override (Optional Feature):**

Data tables (e.g., `live_quote_indicators`, `profiles`) may optionally include a `cache_ttl_minutes` column. If present and not NULL, this column acts as a **per-row TTL override**, allowing granular control per symbol.

**Example:**
- `AAPL` in `profiles` table has `cache_ttl_minutes = 60` (1 hour)
- `XYZ` (penny stock) in `profiles` table has `cache_ttl_minutes = 43200` (30 days)
- Registry `default_ttl_minutes = 1440` (24 hours) is used as fallback

The staleness check uses: `COALESCE(t.cache_ttl_minutes, default_ttl_minutes)`, giving priority to the per-row override.

**CRITICAL: TTL Validation**

If using per-row TTL overrides, add a CHECK constraint to prevent negative values:

```sql
-- Example: Add to profiles table
ALTER TABLE profiles
ADD CONSTRAINT check_cache_ttl_positive
CHECK (cache_ttl_minutes IS NULL OR cache_ttl_minutes > 0);
```

Negative TTLs would cause infinite refresh loops (all data always considered stale), burning your API quota.

**Staleness Function Signature Constraint:**

The current generic staleness query (v2.1.2) assumes all staleness functions share a common signature: `(timestamp_column_value, ttl_minutes)`.

**Examples:**
- ✅ `is_data_stale(fetched_at, 5)` - Supported
- ✅ `is_profile_stale(modified_at, 1440)` - Supported
- ❌ `is_earnings_stale(last_fetched_at, earnings_report_date)` - Not supported (requires 2+ columns)

More complex staleness checks requiring multiple columns or different signatures would require an update to the `check_and_queue_stale_data_from_presence` function. This is a design constraint that limits future flexibility but keeps the current implementation simple and performant.

**Benefits:**
- ✅ Add new data type = INSERT one row
- ✅ Zero code changes needed
- ✅ Generic system works for all types
- ✅ Optional per-row TTL overrides for granular control

---

### 2. Active Subscriptions Tracking (Heartbeat-Based System)

**Purpose:** Client-driven subscription management with periodic heartbeats and backend cleanup.

**Key Insight:** Client manages subscriptions directly (adds on mount, removes on unmount) and sends periodic heartbeats to indicate active viewing. Backend cleanup removes stale subscriptions (> 5 minutes old) to handle abrupt browser closures.

```sql
-- Analytics table for tracking active subscriptions
-- Client is the source of truth (adds/removes entries directly)
CREATE TABLE active_subscriptions_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, symbol, data_type)
);
```

**How it works:**

1. **Frontend: Client manages subscriptions directly**
   ```typescript
   // When subscribing to a symbol (on component mount)
   // Client adds subscription via RPC call
   await supabase.rpc('upsert_active_subscription_v2', {
     p_user_id: user.id,
     p_symbol: symbol,
     p_data_type: dataType,
   });

   // Client sends heartbeat every 1 minute
   setInterval(() => {
     await supabase.rpc('upsert_active_subscription_v2', {
       p_user_id: user.id,
       p_symbol: symbol,
       p_data_type: dataType,
     });
   }, 60 * 1000); // 1 minute

   // When unsubscribing (on component unmount)
   // Client removes subscription directly
   await supabase
     .from('active_subscriptions_v2')
     .delete()
     .eq('user_id', user.id)
     .eq('symbol', symbol)
     .eq('data_type', dataType);
   ```

2. **Backend: Cleanup stale subscriptions**
   ```typescript
   // refresh-analytics-from-presence-v2 Edge Function runs every minute
   // CRITICAL: Only cleans up stale subscriptions, does NOT update last_seen_at
   const { data: staleSubscriptions } = await supabase
     .from('active_subscriptions_v2')
     .select('id, user_id, symbol, data_type, last_seen_at')
     .lt('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

   // Remove subscriptions older than 5 minutes
   if (staleSubscriptions && staleSubscriptions.length > 0) {
     const staleIds = staleSubscriptions.map(s => s.id);
     await supabase
       .from('active_subscriptions_v2')
       .delete()
       .in('id', staleIds);
   }
   ```

**Heartbeat Pattern:**
- **Client adds subscription** on mount (via `upsert_active_subscription_v2`)
- **Client sends heartbeat** every 1 minute (updates `last_seen_at`)
- **Client removes subscription** on unmount (normal cleanup)
- **Backend cleanup** removes subscriptions with `last_seen_at > 5 minutes` (abrupt browser closures)

**Benefits:**
- ✅ **Client-driven** - Client has full control over subscriptions
- ✅ **Reliable cleanup** - Backend handles abrupt browser closures
- ✅ **Simple architecture** - No Presence REST API queries needed
- ✅ **Accurate tracking** - Heartbeats indicate active viewing
- ✅ **Automatic cleanup** - Stale subscriptions removed after 5 minutes

**Why This Approach:**
- **Heartbeat interval:** 1 minute (client sends periodic updates)
- **Cleanup timeout:** 5 minutes (ensures heartbeat stops before cleanup)
- **Client control:** Client adds/removes subscriptions directly
- **Backend safety:** Backend only cleans up stale entries, never updates `last_seen_at`

---

### 3. Function-Based Staleness (Option A)

**Purpose:** Database computes staleness automatically, no cron jobs needed.

```sql
-- Universal staleness function
CREATE OR REPLACE FUNCTION is_data_stale(
  p_fetched_at TIMESTAMP WITH TIME ZONE,
  p_ttl_minutes INTEGER -- CRITICAL: No default - forces explicit TTL from registry (prevents split-brain)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive (defense in depth)
  -- Even with CHECK constraint on table, function should validate to prevent infinite loops
  IF p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Received: %', p_ttl_minutes;
  END IF;

  RETURN p_fetched_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Wrapper for profiles (uses modified_at)
CREATE OR REPLACE FUNCTION is_profile_stale(
  p_modified_at TIMESTAMP WITH TIME ZONE,
  p_ttl_minutes INTEGER -- CRITICAL: No default - forces explicit TTL from registry (prevents split-brain)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_modified_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Benefits:**
- ✅ Always accurate (computed at query time)
- ✅ No cron jobs needed for staleness
- ✅ Real-time detection

---

### 4. Autonomous Staleness Checking (Background Checker Only)

**Purpose:** Fully autonomous staleness checking via background cron job that reads from active_subscriptions_v2 table.

**Key Insight:** The system is **client-driven** - the client manages subscriptions directly (adds on mount, removes on unmount) and sends periodic heartbeats. The backend discovers subscriptions from the table and checks staleness automatically.

#### 4a. Heartbeat-Based Subscription Management

**How it works:**

1. **Client manages subscriptions** - Client adds subscription on mount and sends periodic heartbeats:
   - Client calls `upsert_active_subscription_v2` on mount (creates subscription)
   - Client sends heartbeat every 1 minute via `upsert_active_subscription_v2` (updates `last_seen_at`)
   - Client removes subscription on unmount (normal cleanup)
2. **Backend cleanup** - `refresh-analytics-from-presence-v2` Edge Function runs every minute:
   - **CRITICAL:** Only cleans up stale subscriptions (> 5 minutes old)
   - **CRITICAL:** Does NOT update `last_seen_at` - only client heartbeats update it
   - Removes subscriptions with `last_seen_at` older than 5 minutes
3. **Background staleness checker** - Runs every minute using `active_subscriptions_v2` table:
   - Checks all active subscriptions for stale data
   - Queues refreshes as needed
   - Frequency matches minimum TTL (1 minute for quotes)

**Benefits:**
- ✅ **Client-driven** - Client has full control over subscriptions
- ✅ **Reliable cleanup** - Backend handles abrupt browser closures
- ✅ **Simple architecture** - No Presence REST API queries needed
- ✅ **Accurate tracking** - Heartbeats indicate active viewing
- ✅ **No DoS vector** - Analytics cleanup is batch operation, not hot-path writes

**Trade-off:**
- **Latency:** Stale data may take up to 1 minute to refresh (vs immediate with event-driven)
- **Acceptable:** Background checker runs every minute, matching minimum TTL, so worst case is 1-minute delay
- **Benefit:** Simpler, more reliable, client-driven system with backend safety net

// Idempotent queue function (prevents race conditions)
async function queueRefreshIdempotent(
  symbol: string,
  dataType: string,
  options: { priority: number; immediate: boolean }
) {
  // Use same deduplication logic as background checker
  const { error } = await supabase.rpc('queue_refresh_if_not_exists', {
    p_symbol: symbol,
    p_data_type: dataType,
    p_priority: options.priority,
    p_estimated_size: getEstimatedDataSize(dataType),
  });

  if (error) {
    // If already queued, that's fine - idempotent operation
    if (error.code === '23505') return; // Unique constraint violation
    throw error;
  }
}
```

**SQL Functions:**

```sql
-- Idempotent queue function (used by batch checker)
CREATE OR REPLACE FUNCTION queue_refresh_if_not_exists(
  p_symbol TEXT,
  p_data_type TEXT,
  p_priority INTEGER,
  p_estimated_size BIGINT
)
RETURNS void AS $$
BEGIN
  INSERT INTO api_call_queue (symbol, data_type, priority, estimated_data_size_bytes)
  SELECT p_symbol, p_data_type, p_priority, p_estimated_size
  WHERE NOT EXISTS (
    SELECT 1 FROM api_call_queue
    WHERE symbol = p_symbol
      AND data_type = p_data_type
      AND status IN ('pending', 'processing')
  );
END;
$$ LANGUAGE plpgsql;

-- Batch staleness checker (single RPC call for on-subscribe)
-- CRITICAL: SECURITY DEFINER required - function is called by authenticated users
-- but needs to SELECT from data tables and INSERT into api_call_queue
-- Without SECURITY DEFINER, users would get 42501 (permission denied) errors
CREATE OR REPLACE FUNCTION check_and_queue_stale_batch(
  p_symbol TEXT,
  p_data_types TEXT[],
  p_priority INTEGER
)
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  is_stale BOOLEAN;
  sql_text TEXT;
BEGIN
  -- Loop through the *input array* (max 5-10 items, very fast)
  FOR reg_row IN
    SELECT * FROM data_type_registry
    WHERE data_type = ANY(p_data_types)
  LOOP
    -- SECURITY: Validate identifiers before use (defense in depth)
    IF NOT is_valid_identifier(reg_row.table_name) OR
       NOT is_valid_identifier(reg_row.symbol_column) OR
       NOT is_valid_identifier(reg_row.timestamp_column) OR
       NOT is_valid_identifier(reg_row.staleness_function)
    THEN
      RAISE EXCEPTION 'Invalid identifier found in data_type_registry: %', reg_row.data_type;
    END IF;

    -- FAULT TOLERANCE: Wrap in exception handler so one bad data type doesn't break the batch
    BEGIN
      -- Dynamically check staleness for this symbol
      sql_text := format(
        'SELECT %I(t.%I, COALESCE(t.cache_ttl_minutes, %L::INTEGER)) FROM %I t WHERE t.%I = %L',
        reg_row.staleness_function,
        reg_row.timestamp_column,
        reg_row.default_ttl_minutes,
        reg_row.table_name,
        reg_row.symbol_column,
        p_symbol
      );

      EXECUTE sql_text INTO is_stale;

      -- Queue if stale (or if data doesn't exist - treat as stale)
      IF COALESCE(is_stale, true) THEN
        PERFORM queue_refresh_if_not_exists(
          p_symbol,
          reg_row.data_type,
          p_priority,
          reg_row.estimated_data_size_bytes
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and continue processing other data types
        -- This prevents one bad registry entry from breaking the entire subscription
        RAISE WARNING 'Staleness check failed for symbol % and type %: %. Assuming stale.',
          p_symbol, reg_row.data_type, SQLERRM;
        -- FAIL-SAFE TO STALE: If we can't check, assume stale and queue refresh
        -- This ensures users get their data even if registry has errors
        is_stale := true;
        -- Queue the refresh (will be handled by the IF block below)
        PERFORM queue_refresh_if_not_exists(
          p_symbol,
          reg_row.data_type,
          p_priority,
          reg_row.estimated_data_size_bytes
        );
        CONTINUE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- CRITICAL: Execute with creator's (admin) permissions
```

**Benefits:**
- ✅ **Immediate response** - User gets fresh data right away
- ✅ **No thundering herd** - Only checks one symbol at a time
- ✅ **Autonomous** - Backend discovers subscriptions automatically
- ✅ **High priority** - User is actively viewing, so prioritize
- ✅ **Idempotent** - Prevents duplicate queue entries (race condition fixed)
- ✅ **Single RPC call** - Eliminates 10-15 database round-trips (was "chatty")
- ✅ **Fault tolerant** - One bad data type doesn't break the entire batch
- ✅ **Fail-safe to stale** - Failed checks assume stale and queue refresh (ensures users get data)
- ✅ **Rate limited** - Protected against DoS attacks
- ✅ **Non-blocking analytics** - Fire-and-forget upsert doesn't delay critical work

#### 4b. Background Staleness Checker (Primary - Only Staleness Check)

**Purpose:** Primary staleness check that runs every minute. Discovers active subscriptions from analytics table and checks for stale data.

**Critical Fixes:**
1. **Uses active_subscriptions_v2 table** (updated by client heartbeats) - prevents "ghost refreshes"
2. **Truly generic** - Loops over `data_type_registry` metadata, uses dynamic SQL (zero hardcoded types)
3. **Type-by-type loop** - Fast because it loops over 10-50 data types (metadata), not 10,000 symbols (data)

**State-of-the-Art Implementation (All in Postgres):**

The entire cron job runs as a single Postgres function using `pg_net` or `http` extension to fetch Presence directly from Realtime API:

**Infrastructure Prerequisite:**

The "All in Postgres" implementation requires:
1. **`pg_net` extension enabled** - Must be explicitly enabled in Supabase dashboard
2. **Schema permissions** - The role running cron jobs must have `GRANT USAGE ON SCHEMA net`
3. **Outbound network access** - Database instance must have outbound network access to Realtime API endpoint
4. **Security consideration** - Outbound HTTP access may have security implications; ensure proper firewall rules

**Alternative:** If `pg_net` is not available, use the Edge Function approach (shown below) which consolidates to a single RPC call.

```sql
-- Truly generic staleness checker (100% metadata-driven, zero hardcoded types)
CREATE OR REPLACE FUNCTION check_and_queue_stale_data_from_presence()
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  sql_text TEXT;
  presence_json JSONB;
  http_response RECORD;
  lock_acquired BOOLEAN;
BEGIN
  -- CRITICAL: Prevent cron job self-contention (multiple instances running simultaneously)
  -- Use advisory lock to ensure only one instance can run at a time
  -- This prevents "cron pile-up" that would overwhelm the database
  SELECT pg_try_advisory_lock(42) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'check_and_queue_stale_data_from_presence is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
  -- CRITICAL: Check quota BEFORE doing any work (prevents quota rebound catastrophe)
  -- Producers must be quota-aware to prevent backlog buildup when quota is exceeded
  IF is_quota_exceeded() THEN
    RAISE NOTICE 'Data quota exceeded. Skipping staleness check to prevent backlog buildup.';
    PERFORM pg_advisory_unlock(42);
    RETURN;
  END IF;

  -- 1. Fetch Presence state directly from Realtime API (using pg_net/http extension)
  -- This eliminates the Edge Function as a point of failure
  -- CRITICAL: Set aggressive timeout to prevent advisory lock griefing
  -- A slow external API should not hold the advisory lock for too long
  -- Better to fail fast (retry in 5 minutes) than succeed slow (block all other work)
  SELECT * INTO http_response
  FROM http_get(
    url := 'https://api.tickered.com/realtime/v1/api/presence',
    headers := jsonb_build_object(
      'apikey', current_setting('app.settings.supabase_anon_key', true),
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    ),
    timeout_milliseconds := 5000 -- CRITICAL: 5-second timeout (prevents lock griefing)
  );

  -- CRITICAL: Check for HTTP failure - must fail loudly, not silently
  IF http_response.status != 200 OR http_response.content IS NULL THEN
    RAISE EXCEPTION 'Failed to fetch Realtime presence. Status: %, Body: %',
      http_response.status, http_response.content;
  END IF;

  -- 2. Parse response and extract active subscriptions
  -- CRITICAL: dataTypes is an ARRAY, must un-nest it
  presence_json := (
    SELECT jsonb_agg(
      jsonb_build_object(
        'symbol', REPLACE((channel->>'topic')::TEXT, 'symbol:', ''),
        'userId', (presence->>'userId')::UUID,
        'dataType', presence_data_type::TEXT
      )
    )
    FROM jsonb_array_elements(http_response.content::jsonb->'channels') AS channel,
         jsonb_array_elements(channel->'presence') AS presence,
         jsonb_array_elements_text(presence->'dataTypes') AS presence_data_type
    WHERE (channel->>'topic')::TEXT LIKE 'symbol:%'
  );

  -- Create temp table from Presence data
  DROP TABLE IF EXISTS temp_active_subscriptions;
  CREATE TEMP TABLE temp_active_subscriptions (
    symbol TEXT NOT NULL,
    user_id UUID NOT NULL,
    data_type TEXT NOT NULL,
    PRIMARY KEY (symbol, user_id, data_type)
  );

  INSERT INTO temp_active_subscriptions (symbol, user_id, data_type)
  SELECT
    (item->>'symbol')::TEXT,
    (item->>'userId')::UUID,
    (item->>'dataType')::TEXT
  FROM jsonb_array_elements(presence_json) AS item;

  -- CRITICAL: Add indexes to temp table for scalable Symbol-by-Symbol queries
  -- At scale (100k users * 3 types = 300k rows), these indexes prevent thundering herd
  -- This inverts the query pattern from "10 giant JOINs" to "10k tiny, fast, indexed SELECTs"
  CREATE INDEX idx_temp_active_symbol ON temp_active_subscriptions(symbol);
  CREATE INDEX idx_temp_active_data_type ON temp_active_subscriptions(data_type);
  CREATE INDEX idx_temp_active_symbol_data_type ON temp_active_subscriptions(symbol, data_type);

  -- CRITICAL: Analytics update moved to separate cron job (Job 5) to prevent "God Function" bloat
  -- The heavy TRUNCATE...INSERT operation (300k rows) takes 1-2 minutes at scale
  -- This would cause Job 1 to exceed its 5-minute window, breaking the staleness check schedule
  -- Job 1 now JOINs against the (slightly-stale) active_subscriptions table, which is acceptable

  -- 3. CRITICAL: Invert query pattern to Symbol-by-Symbol (prevents temp table thundering herd)
  -- At scale (300k rows), Type-by-Type creates 10 giant JOINs that exhaust work_mem
  -- Symbol-by-Symbol creates 10k tiny, fast, indexed queries that scale linearly
  -- CRITICAL: Use active_subscriptions table (updated by Job 5) instead of temp table
  -- This allows Job 1 to be slim and fast, completing in < 5 minutes
  -- The analytics table is slightly stale (updated every 15 minutes), which is acceptable
  -- Outer loop: Iterate over distinct symbols from active_subscriptions (typically 1k-10k, not 300k)
  FOR symbol_row IN
    SELECT DISTINCT symbol FROM active_subscriptions
  LOOP
    -- Inner loop: Get data types for THIS symbol from active_subscriptions (typically 1-5 types per symbol)
    FOR data_type_row IN
      SELECT DISTINCT unnest(data_types) AS data_type FROM active_subscriptions WHERE symbol = symbol_row.symbol
    LOOP
      -- Get registry entry for this data type
      SELECT * INTO reg_row FROM data_type_registry
      WHERE data_type = data_type_row.data_type
        AND refresh_strategy = 'on-demand';

      -- Skip if not found (shouldn't happen, but defensive)
      IF NOT FOUND THEN
        CONTINUE;
      END IF;
    -- SECURITY: Validate identifiers before use (defense in depth)
    IF NOT is_valid_identifier(reg_row.table_name) OR
       NOT is_valid_identifier(reg_row.symbol_column) OR
       NOT is_valid_identifier(reg_row.timestamp_column) OR
       NOT is_valid_identifier(reg_row.staleness_function)
    THEN
      RAISE EXCEPTION 'Invalid identifier found in data_type_registry: %', reg_row.data_type;
    END IF;

      -- FAULT TOLERANCE: Wrap in exception handler so one bad symbol/data_type doesn't break the entire cron job
      BEGIN
        -- 4. Build dynamic SQL for THIS symbol and data type (100% generic, no hardcoding)
        -- CRITICAL: Query is now Symbol-by-Symbol, not Type-by-Type
        -- This creates tiny, fast, indexed queries instead of giant JOINs
        sql_text := format(
        $SQL$
          INSERT INTO api_call_queue (symbol, data_type, priority, estimated_data_size_bytes)
          SELECT
            %L AS symbol,
            %L AS data_type,
            COUNT(DISTINCT asub.user_id)::INTEGER AS priority,
            %L::BIGINT AS estimated_size
          FROM %I t
          JOIN active_subscriptions asub
            ON t.%I = asub.symbol
            AND %L = ANY(asub.data_types)
          WHERE
            t.%I = %L -- CRITICAL: Filter by symbol FIRST (uses index)
            AND asub.symbol = %L -- CRITICAL: Filter analytics table by symbol (uses index)
            -- 5. Call staleness function dynamically (from registry)
            -- Note: t.cache_ttl_minutes is optional per-row override (see documentation below)
            AND %I(t.%I, COALESCE(t.cache_ttl_minutes, %L::INTEGER)) = true
            AND NOT EXISTS (
              SELECT 1 FROM api_call_queue q
              WHERE q.symbol = %L
                AND q.data_type = %L
                AND q.status IN ('pending', 'processing')
            )
          GROUP BY asub.symbol
          HAVING COUNT(DISTINCT asub.user_id) > 0
          ON CONFLICT DO NOTHING;
        $SQL$,
          symbol_row.symbol, -- %L (explicit symbol filter)
          reg_row.data_type, -- %L
          reg_row.estimated_data_size_bytes, -- %L
          reg_row.table_name, -- %I
          reg_row.symbol_column, -- %I
          reg_row.data_type, -- %L
          reg_row.symbol_column, -- %I (symbol filter on data table)
          symbol_row.symbol, -- %L (symbol value)
          symbol_row.symbol, -- %L (symbol filter on temp table)
          reg_row.staleness_function, -- %I
          reg_row.timestamp_column, -- %I
          reg_row.default_ttl_minutes, -- %L
          symbol_row.symbol, -- %L (deduplication check)
          reg_row.data_type -- %L (deduplication check)
        );

        -- 6. Execute the dynamic query (now Symbol-by-Symbol, fast and scalable)
        EXECUTE sql_text;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log the error and continue the loop (fault tolerance)
          RAISE WARNING 'Staleness check failed for symbol % and data type %: %',
            symbol_row.symbol, reg_row.data_type, SQLERRM;
          CONTINUE; -- Continue to the next symbol/data_type combination
      END;
    END LOOP; -- Inner loop: data types for this symbol
  END LOOP; -- Outer loop: symbols

  -- Release the advisory lock on successful completion
  PERFORM pg_advisory_unlock(42);

  EXCEPTION
    WHEN OTHERS THEN
      -- CRITICAL: Always release the lock, even if function fails
      -- This prevents the lock from being held forever if an error occurs
      PERFORM pg_advisory_unlock(42);
      RAISE; -- Re-raise the original error
  END;
END;
$$ LANGUAGE plpgsql;
```

**Alternative: Edge Function Approach (If pg_net/http not available)**

If you can't use `pg_net`/`http` extension, use an Edge Function but consolidate to a single call:

```typescript
// Edge function that runs the cron job (consolidated to single RPC call)
export async function checkAndQueueStaleData() {
  // 1. Get TRUE active subscriptions from Presence (source of truth)
  const { data: channels } = await supabase.realtime.list();

  // 2. Parse Presence data - CRITICAL: dataTypes is an ARRAY, must un-nest it
  const activeSubscriptions = channels
    .filter(ch => ch.topic.startsWith('symbol:'))
    .flatMap(ch => {
      const symbol = ch.topic.replace('symbol:', '');
      const presence = ch.presence || {};
      return Object.values(presence).flatMap((presenceData: any) =>
        // Un-nest the dataTypes array (each presence can have multiple data types)
        (presenceData.dataTypes || []).map((dataType: string) => ({
          symbol,
          userId: presenceData.userId,
          dataType,
        }))
      );
    });

  if (activeSubscriptions.length === 0) return;

  // 3. Single RPC call - pass Presence data directly, function handles everything
  await supabase.rpc('check_and_queue_stale_data_from_presence', {
    presence_subscriptions: JSON.stringify(activeSubscriptions),
  });
}
```

**SQL Function (Accepts Presence as Parameter):**

```sql
-- Truly generic staleness checker (100% metadata-driven)
CREATE OR REPLACE FUNCTION check_and_queue_stale_data_from_presence(
  presence_subscriptions JSONB
)
RETURNS void AS $$
DECLARE
  reg_row RECORD;
  sql_text TEXT;
BEGIN
  -- Create temp table from Presence data
  DROP TABLE IF EXISTS temp_active_subscriptions;
  CREATE TEMP TABLE temp_active_subscriptions (
    symbol TEXT NOT NULL,
    user_id UUID NOT NULL,
    data_type TEXT NOT NULL,
    PRIMARY KEY (symbol, user_id, data_type)
  );

  INSERT INTO temp_active_subscriptions (symbol, user_id, data_type)
  SELECT
    (item->>'symbol')::TEXT,
    (item->>'userId')::UUID,
    (item->>'dataType')::TEXT
  FROM jsonb_array_elements(presence_subscriptions) AS item
  WHERE (item->>'dataType') IS NOT NULL; -- Ensure dataType exists (should always be true if parsed correctly)

  -- Loop through METADATA (fast - only 10-50 data types)
  FOR reg_row IN
    SELECT * FROM data_type_registry
    WHERE refresh_strategy = 'on-demand'
  LOOP
    -- Build dynamic SQL for THIS data type (100% generic)
    sql_text := format(
      $SQL$
        INSERT INTO api_call_queue (symbol, data_type, priority, estimated_data_size_bytes)
        SELECT DISTINCT
          t.%I AS symbol,
          %L AS data_type,
          COUNT(DISTINCT tas.user_id)::INTEGER AS priority,
          %L::BIGINT AS estimated_size
        FROM %I t
        JOIN temp_active_subscriptions tas
          ON t.%I = tas.symbol
          AND tas.data_type = %L
        WHERE
          %I(t.%I, COALESCE(t.cache_ttl_minutes, %L::INTEGER)) = true
          -- Note: t.cache_ttl_minutes is optional per-row override (see documentation below)
          AND NOT EXISTS (
            SELECT 1 FROM api_call_queue q
            WHERE q.symbol = t.%I
              AND q.data_type = %L
              AND q.status IN ('pending', 'processing')
          )
        GROUP BY t.%I
        HAVING COUNT(DISTINCT tas.user_id) > 0
        ON CONFLICT DO NOTHING;
      $SQL$,
      reg_row.symbol_column,
      reg_row.data_type,
      reg_row.estimated_data_size_bytes,
      reg_row.table_name,
      reg_row.symbol_column,
      reg_row.data_type,
      reg_row.staleness_function,
      reg_row.timestamp_column,
      reg_row.default_ttl_minutes,
      reg_row.symbol_column,
      reg_row.data_type,
      reg_row.symbol_column
    );

    EXECUTE sql_text;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Performance Optimization:**
- ✅ **Frequency matches minimum TTL** - Runs every minute to match 1-minute TTL for quotes (prevents stale data windows)
- ✅ **Type-by-type loop** - Fast because it loops over metadata (10-50 types), not data (10,000+ symbols)
- ✅ **Uses Presence** - Source of truth, no ghost refreshes
- ✅ **Single RPC call** - Consolidated to one database call (or all in Postgres with pg_net/http)
- ✅ **100% generic** - Zero hardcoded types, truly metadata-driven
- ✅ **Fails loudly** - HTTP errors raise exceptions (no silent failures)
- ✅ **Identifier validation** - Defense in depth against SQL injection
- ✅ **Fault tolerant** - One bad data type doesn't break the entire cron job
- ✅ **Advisory lock** - Prevents cron job self-contention (multiple instances running simultaneously)

**Benefits:**
- ✅ **Perfectly generic** - Add 50 new data types, function never needs changes
- ✅ **No hardcoded logic** - Zero CASE statements, zero UNION ALL blocks
- ✅ **Automatically scales** - Works for any future data type without code changes
- ✅ **Fully autonomous** - Backend discovers and checks automatically
- ✅ **No ghost refreshes** - Uses active_subscriptions_v2 table (updated by client heartbeats)
- ✅ **High performance** - Type-by-type loop over metadata (fast), not row-by-row over data (slow)

---

### 5. Generic Queue System

**Purpose:** Single queue system that works for all data types.

```sql
-- CRITICAL: Partition by status to prevent "Day 90" table bloat performance catastrophe
-- High UPDATE volume (thousands/minute) creates dead tuples faster than autovacuum can clean
-- Partitioning ensures the "hot" partition (pending) is always small, fast, and dense
-- This is the true "at scale" solution for high-throughput queue tables
CREATE TABLE api_call_queue (
  id UUID NOT NULL,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_data_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, status) -- Composite key required for partitioning
) PARTITION BY LIST (status);

-- Hot partition: Small, fast, dense (most queries target this)
CREATE TABLE api_call_queue_pending PARTITION OF api_call_queue
  FOR VALUES IN ('pending')
  WITH (FILLFACTOR = 70); -- Leave room for HOT updates

-- Processing partition: Temporary state
CREATE TABLE api_call_queue_processing PARTITION OF api_call_queue
  FOR VALUES IN ('processing')
  WITH (FILLFACTOR = 70);

-- Completed partition: Historical data (can be archived/truncated periodically)
CREATE TABLE api_call_queue_completed PARTITION OF api_call_queue
  FOR VALUES IN ('completed')
  WITH (FILLFACTOR = 70);

-- Failed partition: Dead-letter queue (can be archived/truncated periodically)
CREATE TABLE api_call_queue_failed PARTITION OF api_call_queue
  FOR VALUES IN ('failed')
  WITH (FILLFACTOR = 70);

-- Indexes on partitions (optimized for query patterns)
CREATE INDEX idx_queue_pending_priority_created ON api_call_queue_pending(priority DESC, created_at ASC);
CREATE INDEX idx_queue_processing_processed_at ON api_call_queue_processing(processed_at);
CREATE INDEX idx_queue_completed_created_at ON api_call_queue_completed(created_at);
CREATE INDEX idx_queue_failed_created_at ON api_call_queue_failed(created_at);

-- CRITICAL: Partition Maintenance Policy (prevents "poisoned partition" Day 90 bloat)
-- Completed and failed partitions are ephemeral logs, not permanent records
-- They MUST be truncated periodically to prevent infinite bloat (500M+ rows)
-- This is a non-negotiable part of the partitioning lifecycle
CREATE OR REPLACE FUNCTION maintain_queue_partitions()
RETURNS void AS $$
BEGIN
  -- CRITICAL: Set a very short lock timeout to prevent "stop-the-world" deadlock
  -- TRUNCATE requires ACCESS EXCLUSIVE lock, which blocks all other operations
  -- If the table is busy (processors running), we want to fail fast and try again next week
  -- This prevents the maintenance job from blocking all queue operations
  SET lock_timeout = '1s';

  -- Use exception handling to gracefully handle lock timeouts
  BEGIN
    -- Truncate completed partition (historical data, can be safely discarded)
    -- This partition grows fastest (most jobs succeed)
    TRUNCATE TABLE api_call_queue_completed;

    -- Truncate failed partition (dead-letter queue, can be safely discarded after investigation)
    -- This partition grows slower but still needs maintenance
    TRUNCATE TABLE api_call_queue_failed;

    RAISE NOTICE 'Queue partitions maintained successfully: completed and failed partitions truncated';
  EXCEPTION
    WHEN lock_not_available THEN
      -- Table is busy (processors running). This is expected and safe.
      -- We'll try again next week. This prevents "stop-the-world" deadlock.
      RAISE WARNING 'Failed to acquire lock for partition maintenance. Table is busy (processors running). Will retry next week.';
    WHEN OTHERS THEN
      -- Re-raise any other error (unexpected failures should be logged)
      RAISE;
  END;

  -- Reset lock_timeout to default
  SET lock_timeout = '0';
END;
$$ LANGUAGE plpgsql;

-- Data usage tracking table (CRITICAL for quota enforcement)
CREATE TABLE api_data_usage (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  data_size_bytes BIGINT NOT NULL,
  job_id UUID REFERENCES api_call_queue(id)
);

CREATE INDEX idx_data_usage_created_at ON api_data_usage(created_at);

-- Quota check function (CRITICAL - prevents quota exhaustion)
-- Uses 95% buffer to account for estimation errors
CREATE OR REPLACE FUNCTION is_quota_exceeded(
  p_quota_gb NUMERIC DEFAULT 20,
  p_rolling_days INTEGER DEFAULT 30,
  p_safety_buffer NUMERIC DEFAULT 0.95
)
RETURNS BOOLEAN AS $$
DECLARE
  total_usage_bytes BIGINT;
  quota_bytes BIGINT;
  buffered_quota_bytes BIGINT;
BEGIN
  quota_bytes := (p_quota_gb * 1024 * 1024 * 1024)::BIGINT;
  buffered_quota_bytes := (quota_bytes * p_safety_buffer)::BIGINT;

  SELECT COALESCE(SUM(data_size_bytes), 0)
  INTO total_usage_bytes
  FROM api_data_usage
  WHERE created_at >= NOW() - (p_rolling_days || ' days')::INTERVAL;

  RETURN total_usage_bytes >= buffered_quota_bytes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Generic function to get next batch (ATOMIC - prevents race conditions)
CREATE OR REPLACE FUNCTION get_queue_batch(batch_size INTEGER DEFAULT 50)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  batch_ids UUID[];
  potential_batch_estimated_size BIGINT;
  current_usage_bytes BIGINT;
  quota_bytes BIGINT;
  buffered_quota_bytes BIGINT;
BEGIN
  -- CRITICAL: Predictive quota check - accounts for batch about to be served
  -- This prevents overshooting quota due to estimation errors

  -- 1. Get current usage
  SELECT COALESCE(SUM(data_size_bytes), 0)
  INTO current_usage_bytes
  FROM api_data_usage
  WHERE created_at >= NOW() - INTERVAL '30 days';

  quota_bytes := (20 * 1024 * 1024 * 1024)::BIGINT; -- 20 GB
  buffered_quota_bytes := (quota_bytes * 0.95)::BIGINT; -- 95% buffer

  -- 2. Estimate size of potential batch BEFORE selecting it
  SELECT COALESCE(SUM(estimated_data_size_bytes), 0)
  INTO potential_batch_estimated_size
  FROM (
    SELECT estimated_data_size_bytes
    FROM api_call_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT batch_size
  ) potential;

  -- 3. Check if serving this batch would exceed buffered quota
  IF (current_usage_bytes + potential_batch_estimated_size) >= buffered_quota_bytes THEN
    RAISE WARNING 'Data quota would be exceeded by serving batch. Current: % bytes, Batch estimate: % bytes, Buffered quota: % bytes',
      current_usage_bytes, potential_batch_estimated_size, buffered_quota_bytes;
    RETURN '[]'::jsonb;
  END IF;

  -- 4. Select the IDs of the batch to process (with row locks)
  WITH potential_batch AS (
    SELECT id
    FROM api_call_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  -- 5. Atomically update these rows to 'processing' (within same transaction)
  UPDATE api_call_queue
  SET status = 'processing', processed_at = NOW()
  WHERE id IN (SELECT id FROM potential_batch)
  RETURNING id INTO batch_ids;

  -- If no rows were updated, return an empty array
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- 6. Now, select the *full data* for the batch we just claimed
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'symbol', q.symbol,
      'data_type', q.data_type,
      'edge_function', r.edge_function_name,
      'priority', q.priority,
      'estimated_size', q.estimated_data_size_bytes
    )
  ) INTO result
  FROM api_call_queue q
  JOIN data_type_registry r ON q.data_type = r.data_type
  WHERE q.id = ANY(batch_ids);

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
```

**Queue Job Lifecycle (Critical - Prevents Infinite Retry Loops):**

The queue system requires explicit completion/failure handling. Without this, successful jobs remain in `processing` state and are incorrectly treated as stuck by the recovery mechanism.

```sql
-- Complete a successfully processed job
CREATE OR REPLACE FUNCTION complete_queue_job(
  p_job_id UUID,
  p_data_size_bytes BIGINT
)
RETURNS void AS $$
DECLARE
  job_data_type TEXT;
BEGIN
  UPDATE api_call_queue
  SET
    status = 'completed',
    processed_at = NOW(),
    estimated_data_size_bytes = p_data_size_bytes
  WHERE id = p_job_id
    AND status = 'processing'; -- Only update if still in processing state

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  -- CRITICAL: Track data usage for quota enforcement
  -- This enables the rolling 30-day quota check in get_queue_batch
  INSERT INTO api_data_usage (data_size_bytes, job_id)
  VALUES (p_data_size_bytes, p_job_id);

  -- OPTIMIZATION: Auto-correct estimated_data_size_bytes (Day 180 Roadmap)
  -- Use statistical sampling (~1% of jobs) instead of COUNT(*) for O(1) performance
  -- This removes the human from the loop and ensures quota predictions are always accurate
  -- Prevents "stagnant estimate" where manual updates are ignored
  -- CRITICAL: Use random() instead of COUNT(*) to avoid O(N) performance degradation
  -- By Saturday night, completed partition may have millions of rows - COUNT(*) would be slow
  -- Note: This is an optimization, not a critical requirement for Day 1
  SELECT data_type INTO job_data_type
  FROM api_call_queue
  WHERE id = p_job_id;

  -- Statistical sampling: ~1% of jobs (equivalent to every 100th job on average)
  -- This is O(1) constant time, whereas COUNT(*) is O(N) and degrades as partition grows
  IF random() < 0.01 THEN
    UPDATE data_type_registry
    SET estimated_data_size_bytes = CASE
      -- CRITICAL: Handle zero start case - jump straight to actual on first run
      -- Without this, estimate would start at 10% of actual, causing slow ramp-up
      -- This would make predictive quota check wildly inaccurate during ramp-up
      WHEN estimated_data_size_bytes = 0 THEN p_data_size_bytes
      -- Weighted moving average for subsequent updates (90% old, 10% new)
      ELSE (estimated_data_size_bytes * 0.9 + p_data_size_bytes * 0.1)
    END
    WHERE data_type = job_data_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Reset a job immediately (for deadlocks and other transient errors)
-- CRITICAL: This is for fast retry, NOT for incrementing retry_count
-- Used when we catch a deadlock in the processor - we know it's safe to retry immediately
CREATE OR REPLACE FUNCTION reset_job_immediate(p_job_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE api_call_queue
  SET
    status = 'pending',
    processed_at = NULL
  WHERE id = p_job_id
    AND status = 'processing'; -- Only reset if still in processing state

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fail a job (with retry logic)
CREATE OR REPLACE FUNCTION fail_queue_job(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
DECLARE
  current_retries INTEGER;
  max_retries INTEGER := 3;
BEGIN
  SELECT retry_count INTO current_retries
  FROM api_call_queue
  WHERE id = p_job_id
    AND status = 'processing'; -- Only update if still in processing state

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  UPDATE api_call_queue
  SET
    status = CASE
      WHEN current_retries >= max_retries THEN 'failed'
      ELSE 'pending' -- Set to pending to be retried
    END,
    processed_at = NOW(),
    retry_count = current_retries + 1,
    error_message = p_error_message
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;
```

**Edge Function Implementation Requirements (Critical - Prevents Silent Failures):**

Edge Functions must implement three critical validations to prevent silent failures from misconfiguration, invalid API responses, and logically invalid data:

1. **Data Type Validation (Prevents Misconfiguration Silent Failure):**
   - Edge Functions **must** validate that they're being called with the correct `data_type`
   - This prevents silent failures when `data_type_registry` has typos (e.g., `edge_function_name` points to wrong function)
   - Example: `fetch-fmp-profile` must reject jobs where `job.data_type !== 'profile'`

2. **API Response Validation (Prevents "Liar API" Infinite Loop):**
   - Edge Functions **must** validate the *shape* of API responses, not just HTTP status codes
   - A `200 OK` with empty/invalid data should be treated as a failure
   - This prevents infinite refresh loops when APIs return `200 OK` with `[]` or malformed data
   - Example: Check that `profile.symbol` exists before upserting

3. **Data Sanity Checks (Prevents Logically Invalid Data Catastrophe):**
   - Edge Functions **must** validate logical correctness of data values, not just shape
   - Shape validation (e.g., `profile.price` exists) is not enough
   - Logical validation (e.g., `0 < profile.price <= 10000`) prevents bad data from being "locked in" as "fresh"
   - Bad data will be considered "fresh" until TTL expires, causing permanent corruption
   - Example: Validate price is within reasonable bounds before upserting

**Processor Implementation Requirements (Critical Constraints):**

The queue processor must implement the following constraints to prevent external API violations:

1. **Concurrency Limiting:**
   - The processor **must** implement its own concurrency-limiting mechanism (e.g., a pool or queue)
   - **Maximum concurrent requests:** Respect the FMP API limit of 300 calls/minute
   - **Per-symbol serialization:** If FMP has per-symbol limits (e.g., "max 5 concurrent requests for same symbol"), the processor must serialize requests for the same symbol

2. **Rate Limit Awareness:**
   - The processor **must** read and respect FMP's `x-ratelimit-remaining` and `x-ratelimit-reset` headers (if available)
   - The processor **must** dynamically self-throttle when approaching rate limits
   - The processor **must** implement exponential backoff on `429 Too Many Requests` responses

3. **Batch Processing:**
   - The processor **must not** use `Promise.all` to process all jobs in a batch concurrently
   - The processor **must** use a controlled concurrency pattern (e.g., `p-limit`, `p-queue`, or a custom pool)

**Processor Execution Model (CRITICAL - Defines Throughput):**

The queue processor **must** be implemented as a **looping processor**, not a single-batch processor. This is the difference between "50 jobs/minute" and "thousands of jobs/minute" throughput.

**Execution Model:**
- The processor runs in a **loop** until the queue is empty OR the function is approaching timeout
- Each iteration processes one batch (50 jobs)
- The function should exit when `get_queue_batch` returns an empty array OR when approaching the 5-minute timeout (e.g., at 4m 30s)
- This maximizes throughput by continuously processing work during the function's lifetime

**Processor Implementation Pattern (CRITICAL - Monofunction Architecture):**

**CRITICAL:** The processor must be a **"monofunction"** that imports all logic directly, NOT a "conductor-worker" that invokes separate Edge Functions. Invoking 50 separate Edge Functions would exhaust the database connection pool (50 concurrent invocations = 50 connections).

**Architecture:**
1. Create `supabase/functions/lib/` directory
2. Move all `fetch-fmp-*` logic into simple, exportable TypeScript functions
3. Processor imports all logic from `/lib/` and uses a `switch` statement

```typescript
// supabase/functions/lib/fetch-fmp-profile.ts
import { z } from 'zod';
import { supabase } from '../_shared/supabase-client';

export async function fetchProfileLogic(job: QueueJob) {
  // All the logic from fetch-fmp-profile Edge Function
  // (data type validation, Zod parsing, API call, upsert, etc.)
  // ...
  return { actualSizeBytes: contentLength };
}

// supabase/functions/lib/fetch-fmp-quote.ts
export async function fetchQuoteLogic(job: QueueJob) {
  // All the logic from fetch-fmp-quote Edge Function
  // ...
  return { actualSizeBytes: contentLength };
}

// supabase/functions/queue-processor/index.ts
import pLimit from 'p-limit';
import { fetchProfileLogic } from '../lib/fetch-fmp-profile';
import { fetchQuoteLogic } from '../lib/fetch-fmp-quote';
// ... import all other fetch-* logic functions

// CRITICAL: processJob uses switch statement, NOT FaaS invocations
async function processJob(job: QueueJob) {
  switch (job.edge_function_name) {
    case 'fetch-fmp-profile':
      return fetchProfileLogic(job); // Direct local call - no FaaS invocation
    case 'fetch-fmp-quote':
      return fetchQuoteLogic(job); // Direct local call - no FaaS invocation
    // ... other cases
    default:
      throw new Error(`Unknown function key: ${job.edge_function_name}`);
  }
}

// Edge function queue processor (SINGLE BATCH - stateless FaaS pattern)
// CRITICAL: This function processes ONE batch and exits
// The loop is in SQL (invoke_processor_loop), NOT here
// This prevents "abandoned work" from timeout-killed concurrent tasks
// If this function times out, only ONE batch is affected (not 5 batches mid-execution)

// Get ONE batch
const { data: batch, error: batchError } = await supabase.rpc('get_queue_batch', {
  batch_size: 50
});

if (batchError) {
  console.error('Failed to get batch:', batchError);
  throw batchError;
}

// If queue is empty, we're done (this is expected and normal)
if (!batch || batch.length === 0) {
  console.log('Queue is empty. Exiting.');
  return; // Exit gracefully - SQL loop will invoke again next iteration
}

// Process this ONE batch (using controlled concurrency, as defined below)
await processBatch(batch);

// Helper function to process a single batch
async function processBatch(batch: any[]) {
  // CRITICAL: Limit concurrent requests to respect FMP API limits
  // Adjust based on FMP's actual rate limits and your batch size
  const limit = pLimit(10); // Max 10 concurrent requests

  // Group jobs by symbol to handle per-symbol limits
  const jobsBySymbol = new Map<string, typeof batch>();
  for (const job of batch) {
    if (!jobsBySymbol.has(job.symbol)) {
      jobsBySymbol.set(job.symbol, []);
    }
    jobsBySymbol.get(job.symbol)!.push(job);
  }

  // Process jobs with controlled concurrency
  const promises = Array.from(jobsBySymbol.entries()).map(([symbol, jobs]) =>
    limit(async () => {
      // Serialize requests for the same symbol (if FMP requires it)
      for (const job of jobs) {
        try {
          // CRITICAL: Process job using local function calls (NOT FaaS-to-FaaS invocations)
          // The "conductor-worker" model (invoking separate Edge Functions) would exhaust
          // the database connection pool (50 concurrent invocations = 50 connections)
          // Instead, import all logic directly and use switch statement
          const result = await processJob(job); // job must include: id, symbol, data_type, edge_function

          // CRITICAL: Mark job as completed
          await supabase.rpc('complete_queue_job', {
            p_job_id: job.id,
            p_data_size_bytes: result.actualSizeBytes
          });
        } catch (error) {
          // CRITICAL: Deadlock Detection (Prevents Mis-Attributed Failures)
          // PostgreSQL deadlocks (40P01) are transient database-level contention issues
          // They are NOT job failures - the job itself did not fail
          // We must NOT call fail_queue_job for deadlocks (would pollute retry_count and error_message)
          // The correct action is to do nothing and let recover_stuck_jobs handle it
          if (error.code === '40P01' || error.message?.includes('deadlock detected')) {
            // DEADLOCK DETECTED - This is a transient database error
            // CRITICAL: Fail fast - reset immediately instead of waiting 5 minutes for recovery
            // If we catch the deadlock, we know it's safe to retry immediately
            // This turns a 5-minute delay into <1 second delay (picked up by next batch)
            console.warn(`[queue-processor] Deadlock detected for job ${job.id}. Resetting immediately for fast retry.`);
            await supabase.rpc('reset_job_immediate', { p_job_id: job.id });
            continue; // Skip this job, continue with next job in batch
          }

          // Handle rate limiting
          if (error.status === 429) {
            // Exponential backoff and retry
            const retryAfter = error.headers['retry-after'] || 60;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            // Re-queue the job
            await supabase.rpc('fail_queue_job', {
              p_job_id: job.id,
              p_error_message: `Rate limited. Will retry after ${retryAfter}s`
            });
          } else {
            // CRITICAL: Mark job as failed (will retry up to max_retries)
            // This handles all other errors: API failures, validation errors, database errors
            await supabase.rpc('fail_queue_job', {
              p_job_id: job.id,
              p_error_message: error.message
            });
          }
        }
      }
    })
  );

  await Promise.all(promises);
}
```

**Edge Function Implementation Pattern (With Validations):**

```typescript
// Example: fetch-fmp-profile Edge Function
// This pattern must be followed by ALL Edge Functions

import { z } from 'zod'; // CRITICAL: Strict schema validation library

export async function fetchFmpProfile(job: QueueJob) {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  // This is the first line of defense against registry typos
  if (job.data_type !== 'profile') {
    // This is a critical misconfiguration. Fail the job immediately.
    await supabase.rpc('fail_queue_job', {
      p_job_id: job.id,
      p_error_message: `Configuration Error: fetch-fmp-profile was called for job type ${job.data_type}. Expected 'profile'.`
    });
    return; // Stop immediately - do not process
  }

  try {
    // CRITICAL: Aggressive internal timeout (prevents "Slow API" throughput collapse)
    // A slow API response (60s) is a failure, not a "wait" state
    // Without this, the processor will timeout on every invocation during API brownouts
    // This creates a catastrophic thrashing loop where no work is ever completed
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout (far more aggressive than 5-minute function timeout)

    let response: Response;
    try {
      response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${job.symbol}?apikey=${FMP_API_KEY}`,
        { signal: controller.signal }
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('FMP API request timed out after 10 seconds. This indicates API brownout or network issue.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }

    // CRITICAL: Get the ACTUAL data transfer size (what FMP bills for)
    // Do NOT use JSON.stringify().length - that measures the parsed object, not the HTTP payload
    // FMP bills for the total HTTP transfer (headers + payload), which Content-Length represents
    const contentLength = response.headers.get('Content-Length');
    let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;

    // If Content-Length is missing, we must estimate or fail
    // For now, we'll use a conservative estimate, but this should be logged as a warning
    if (actualSizeBytes === 0) {
      console.warn(`[fetch-fmp-profile] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      // Fallback: estimate based on typical profile size (conservative)
      // This is a safety measure, but Content-Length should always be present
      actualSizeBytes = 50000; // 50 KB conservative estimate
      // Note: This should trigger an alert in observability to investigate missing headers
    }

    const data = await response.json();

    // CRITICAL VALIDATION #2: Strict Schema Validation (Prevents "Schema Drift" Data Corruption)
    // Manual "spot-checks" (!profile.symbol, profile.price <= 0) are insufficient
    // APIs can change field names (companyName → company_name) without versioning
    // This causes undefined values to be written as NULL, corrupting the database
    // MUST use strict, holistic schema parsing (e.g., Zod) to validate the ENTIRE response
    // A response that does not perfectly match the schema MUST be treated as a failure

    // Define the STRICT schema - all required fields must be present and correct type
    const ProfileSchema = z.object({
      symbol: z.string().min(1),
      companyName: z.string().min(1), // Will fail if undefined or empty (prevents NULL writes)
      price: z.number().gt(0).lt(10000), // Sanity check is now part of schema validation
      marketCap: z.number().positive().optional(),
      // ... all other required fields
      // CRITICAL: If API changes a field name, this will fail immediately
      // This prevents "schema drift" where undefined values corrupt the database
    });

    // Parse the data - this IS the validation
    // If parsing fails (missing field, wrong type, invalid value), it throws
    // The catch block (Line 1538) correctly handles this by calling fail_queue_job
    const profile = ProfileSchema.parse(data[0]);

    // CRITICAL VALIDATION #4: Source Timestamp Check (Prevents "Liar API (Stale Data)" Catastrophe)
    // The API may return 200 OK with valid shape and sanity, but the data itself may be stale
    // (e.g., API caching bug returns 3-day-old data). We must compare source timestamps.
    // This prevents "data laundering" where stale data is marked as fresh.
    const registry = await supabase
      .from('data_type_registry')
      .select('source_timestamp_column')
      .eq('data_type', 'profile')
      .single();

    if (registry.data?.source_timestamp_column) {
      // Get the source timestamp from the API response (e.g., 'lastUpdated', 'timestamp')
      const sourceTimestampColumn = registry.data.source_timestamp_column;
      const newSourceTimestamp = profile[sourceTimestampColumn];

      if (newSourceTimestamp) {
        // Get the existing source timestamp from the database
        const { data: existingData } = await supabase
          .from('profiles')
          .select(sourceTimestampColumn)
          .eq('symbol', job.symbol)
          .single();

        if (existingData?.[sourceTimestampColumn]) {
          const oldSourceTimestamp = new Date(existingData[sourceTimestampColumn]);
          const newSourceTimestampDate = new Date(newSourceTimestamp);

          // CRITICAL: If new source timestamp is <= old source timestamp, this is stale data
          // The API is returning old data (caching bug, stale cache, etc.)
          // We must reject this to prevent "data laundering"
          if (newSourceTimestampDate <= oldSourceTimestamp) {
            throw new Error(
              `FMP returned 200 OK but data is stale. Source timestamp: ${newSourceTimestamp} (existing: ${existingData[sourceTimestampColumn]}). ` +
              `This indicates an API caching bug or stale cache. Rejecting to prevent data laundering.`
            );
          }
        }
      }
    }

    // Now we know 'profile' is valid (shape + logic + freshness), we can upsert
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        symbol: profile.symbol,
        company_name: profile.companyName,
        // ... other fields
        modified_at: new Date().toISOString(),
      });

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }

    // CRITICAL: Mark job as completed with actual size
    await supabase.rpc('complete_queue_job', {
      p_job_id: job.id,
      p_data_size_bytes: actualSizeBytes
    });

  } catch (error) {
    // All errors (API failures, validation errors, database errors) are caught here
    // This ensures invalid responses trigger fail_queue_job, which respects max_retries
    await supabase.rpc('fail_queue_job', {
      p_job_id: job.id,
      p_error_message: error.message
    });
  }
}
```

**Critical Fix: Atomic Batch Claiming**

The function must atomically `SELECT`, `UPDATE` status to `processing`, and *then* return the data. This prevents multiple processors from grabbing the same batch (race condition).

**Why This Matters:**
- Without atomic update, multiple processors can grab the same 50 jobs
- This causes massive API call duplication and quota exhaustion
- The `FOR UPDATE SKIP LOCKED` alone is not enough - locks are released when the function returns

**Stuck Job Recovery (Critical - Prevents "Poisoned" Batches):**

Jobs that are atomically claimed but then abandoned (processor crash, timeout, OOM) will remain in `processing` state forever. This requires a recovery mechanism.

**Important:** The recovery function only handles jobs that are *truly* stuck (abandoned). Jobs that are successfully processed must be explicitly marked as `completed` using `complete_queue_job()`. Without proper completion handling, successful jobs will be incorrectly treated as stuck and retried indefinitely.

```sql
-- Recovery function for stuck/poisoned jobs
CREATE OR REPLACE FUNCTION recover_stuck_jobs(
  timeout_minutes INTEGER DEFAULT 5,
  max_retries INTEGER DEFAULT 3
)
RETURNS void AS $$
DECLARE
  stuck_job_ids UUID[];
BEGIN
  -- CRITICAL: Use FOR UPDATE SKIP LOCKED to prevent deadlocks with concurrent complete_queue_job calls
  -- This ensures the recovery job doesn't fight with the processor for row locks
  -- If a job is being completed, we'll skip it and get it on the next run
  SELECT id INTO stuck_job_ids
  FROM api_call_queue
  WHERE status = 'processing'
    AND processed_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL
  FOR UPDATE SKIP LOCKED; -- <--- THE CRITICAL FIX: Prevents self-contention deadlock

  -- Update only the jobs we successfully locked (not currently being processed)
  IF array_length(stuck_job_ids, 1) > 0 THEN
    UPDATE api_call_queue
    SET
      status = CASE
        WHEN retry_count >= max_retries THEN 'failed'
        ELSE 'pending'
      END,
      processed_at = NULL,
      retry_count = retry_count + 1,
      error_message = CASE
        WHEN retry_count >= max_retries THEN
          format('Job exceeded max retries (%s). Last processed: %s', max_retries, processed_at)
        ELSE
          format('Job timeout after %s minutes. Retry %s of %s', timeout_minutes, retry_count + 1, max_retries)
      END
    WHERE id = ANY(stuck_job_ids);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**Recovery Architecture (Proactive Self-Healing):**

The `recover_stuck_jobs` function is now called **proactively** by `invoke_processor_if_healthy()` every minute, instead of running as a separate cron job every 5 minutes. This eliminates the "delayed immunity" gap after database restarts and makes recovery more reliable.

**Why This Is Better:**
- Recovery runs every minute (not every 5 minutes)
- No dependency on a separate cron job schedule
- Recovery is tied to processor invocations, making it more reliable
- Eliminates 15-20 minute "no immunity" windows after database restarts

**Note:** Cron Job 3 (`recover-stuck-jobs`) is **no longer needed** and should be removed. Recovery is now handled by the processor invoker.

**Circuit Breaker (Critical - Prevents Thundering Herd of Broken Processors):**

The processor invoker must check processor health before invoking, preventing repeated invocations of a broken processor.

```sql
-- Circuit breaker function (prevents thundering herd of broken processor invocations)
CREATE OR REPLACE FUNCTION invoke_processor_if_healthy()
RETURNS void AS $$
DECLARE
  recent_failures INTEGER;
  failure_threshold INTEGER := 10; -- Threshold for circuit breaker
  failure_window_minutes INTEGER := 10; -- Window to check for failures
  lock_acquired BOOLEAN;
BEGIN
  -- CRITICAL: Prevent cron job self-contention (multiple instances running simultaneously)
  -- Use advisory lock to ensure only one instance can run at a time
  -- This prevents "cron pile-up" that would cause concurrent recovery jobs and thundering herd of processor invocations
  SELECT pg_try_advisory_lock(44) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'invoke_processor_if_healthy is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
  -- CRITICAL: Proactive self-healing - run recovery BEFORE circuit breaker check
  -- This ensures stuck jobs are recovered every minute (not every 5 minutes)
  -- This eliminates the "delayed immunity" gap after database restarts
  -- The recovery runs as part of the processor invoker, making it more reliable than a separate cron job
  PERFORM recover_stuck_jobs(timeout_minutes := 5, max_retries := 3);

  -- CRITICAL: Check for high rate of recent failures (indicates broken processor or external API outage)
  -- Must check retry_count > 0, not status = 'failed', because fail_queue_job sets status = 'pending' on first retry
  -- This correctly trips the circuit breaker on temporary API outages (not just permanent failures)
  SELECT COUNT(*)
  INTO recent_failures
  FROM api_call_queue
  WHERE retry_count > 0 -- CRITICAL: Any retry is a signal of recent failure
    AND processed_at > NOW() - (failure_window_minutes || ' minutes')::INTERVAL;

  -- If too many failures, trip the circuit breaker
  IF recent_failures >= failure_threshold THEN
    RAISE EXCEPTION 'Processor circuit breaker tripped! Recent failures: % (threshold: %)',
      recent_failures, failure_threshold;
    -- This exception will be logged and can trigger alerts
    RETURN;
  END IF;

  -- Processor appears healthy, invoke it
  -- CRITICAL: Wrap invocation in exception handler to prevent silent invoker failure
  -- The invocation itself can fail (extension error, network timeout, broken deployment)
  -- This must not cause the cron job to fail silently
  BEGIN
    -- Note: This assumes supabase.invoke_edge_function() is available
    -- If not, use pg_net/http extension or alternative invocation method
    PERFORM supabase.invoke_edge_function('queue-processor');
  EXCEPTION
    WHEN OTHERS THEN
      -- Invocation itself failed (not a job failure, but an invoker failure)
      -- Log as WARNING (not EXCEPTION) so cron job "succeeds" and runs again next minute
      -- This WARNING will be caught by Observability Sink and trigger alerts
      RAISE WARNING 'Processor invocation failed: %. Circuit breaker will not trip (no failed jobs).',
        SQLERRM;
      -- Do not re-raise - allow cron job to "succeed" so it runs again next minute
      -- The WARNING will alert the team to the invocation failure
  END;

  EXCEPTION
    WHEN OTHERS THEN
      -- Ensure lock is released on error
      PERFORM pg_advisory_unlock(44);
      RAISE; -- Re-raise the original error
  END;

  -- Release lock on successful completion
  PERFORM pg_advisory_unlock(44);
END;
$$ LANGUAGE plpgsql;
```

**Benefits:**
- ✅ **Atomic** - Prevents race conditions and job duplication
- ✅ **Concurrent-safe** - Multiple processors can run simultaneously
- ✅ **Complete lifecycle** - Explicit completion/failure handling prevents infinite retry loops
- ✅ **Quota enforcement** - Predictive quota check with safety buffer (prevents catastrophic quota exhaustion)
- ✅ **Quota-aware producers** - Producers check quota to prevent backlog buildup
- ✅ **Data usage tracking** - Tracks all data usage for rolling 30-day quota calculation
- ✅ **Circuit breaker** - Prevents thundering herd of broken processor invocations
- ✅ **Recovery mechanism** - Automatically un-sticks poisoned jobs (uses SKIP LOCKED to prevent deadlocks)
- ✅ **Dead-letter handling** - Moves permanently failed jobs to `failed` status
- ✅ **High throughput** - Looping processor model (thousands of jobs/minute, not 50)
- ✅ **Misconfiguration detection** - Edge Functions validate data_type to prevent silent failures
- ✅ **API response validation** - Edge Functions validate data shape to prevent infinite loops
- ✅ **Data sanity checks** - Edge Functions validate logical correctness to prevent permanent data corruption
- ✅ **Priority inversion prevention** - Scheduled jobs hardcoded to low priority (-1) to prevent starving user-facing work
- ✅ **Scale performance** - TABLESAMPLE prevents "Day 365" performance failure at scale
- ✅ Generic - works for all data types
- ✅ Priority-based processing
- ✅ Automatic deduplication

---

### 6. Minimal Scheduled Jobs

**Only 5 generic cron jobs total** (not 11+ individual jobs):

```sql
-- Job 1: Background staleness check (runs every minute)
-- PRIMARY staleness check - this is the only staleness check (no event-driven check)
-- CRITICAL: Frequency must match minimum TTL across all data types
-- For data types with 1-minute TTLs (e.g., quotes), running every 5 minutes would allow
-- data to be stale for up to 4 minutes, which is unacceptable
-- CRITICAL: Slimmed down - analytics update moved to Job 4 to prevent "God Function" bloat
-- Uses active_subscriptions table (updated by Job 4) instead of building temp table
SELECT cron.schedule(
  'check-stale-data',
  '* * * * *', -- Every minute (matches minimum TTL of 1 minute for quotes)
  $$ SELECT check_and_queue_stale_data_from_presence(); $$
);

-- Job 2: Handle scheduled refreshes (runs every minute, but throttled)
SELECT cron.schedule(
  'scheduled-refreshes',
  '* * * * *',
  $$ SELECT queue_scheduled_refreshes(); $$
);

-- Job 3: Queue Processor (runs every minute)
-- CRITICAL: This is the "pull" mechanism for the queue
-- The processor function loops until queue is empty or timeout approaching
-- This provides high throughput (thousands of jobs/minute) instead of glacial (50 jobs/minute)
-- CRITICAL: Uses circuit breaker to prevent thundering herd of broken processor invocations
-- CRITICAL: Recovery is now handled proactively by invoke_processor_if_healthy() every minute
-- No separate recovery cron job needed - recovery runs every minute as part of processor invocation
SELECT cron.schedule(
  'process-queue-batch',
  '* * * * *', -- Every minute
  $$ SELECT invoke_processor_if_healthy(); $$
);

-- Job 4: Partition Maintenance (runs weekly)
-- CRITICAL: Prevents "poisoned partition" bloat (completed/failed partitions grow forever)
-- These partitions are ephemeral logs, not permanent records - truncation is required
SELECT cron.schedule(
  'maintain-queue-partitions',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$ SELECT maintain_queue_partitions(); $$
);
```

**Queue Throttling for Scheduled Refreshes:**

To prevent queue bloat from slowing down high-priority inserts, the scheduled refreshes job is throttled:

```sql
CREATE OR REPLACE FUNCTION queue_scheduled_refreshes()
RETURNS void AS $$
DECLARE
  queue_depth INTEGER;
  max_queue_depth INTEGER := 1000; -- Threshold
  num_to_add INTEGER;
  lock_acquired BOOLEAN;
BEGIN
  -- CRITICAL: Prevent cron job self-contention (multiple instances running simultaneously)
  -- Use advisory lock to ensure only one instance can run at a time
  -- This prevents "cron pile-up" that would overwhelm the database and break throttling logic
  SELECT pg_try_advisory_lock(43) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'queue_scheduled_refreshes is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
  -- CRITICAL: Check quota FIRST (prevents quota rebound catastrophe)
  -- Producers must be quota-aware to prevent backlog buildup when quota is exceeded
  IF is_quota_exceeded() THEN
    RAISE NOTICE 'Data quota exceeded. Skipping scheduled refreshes to prevent backlog buildup.';
    PERFORM pg_advisory_unlock(43);
    RETURN;
  END IF;

  -- Check current queue depth
  SELECT COUNT(*) INTO queue_depth
  FROM api_call_queue
  WHERE status = 'pending';

  -- Only queue if below threshold
  IF queue_depth >= max_queue_depth THEN
    RAISE NOTICE 'Queue depth (%%) exceeds threshold (%%), skipping scheduled refreshes', queue_depth, max_queue_depth;
    RETURN;
  END IF;

  num_to_add := max_queue_depth - queue_depth;

  -- CRITICAL: Use TABLESAMPLE to avoid materializing massive CROSS JOIN at scale
  -- At scale (50k symbols * 5 types = 250k rows), full CROSS JOIN is a performance bomb
  -- TABLESAMPLE randomly samples symbols, dramatically reducing query cost
  -- This prevents "Day 365" performance failure as platform grows
  -- CRITICAL: Hardcode priority to -1 to prevent priority inversion
  -- Scheduled work must NEVER have higher priority than on-demand work (P0 = viewerCount >= 1)
  -- This prevents low-value scheduled jobs from starving user-facing requests
  INSERT INTO api_call_queue (symbol, data_type, priority, estimated_data_size_bytes)
  SELECT
    s.symbol,
    reg.data_type,
    -1, -- CRITICAL: Hardcode low priority (prevents priority inversion attack/misconfiguration)
    reg.estimated_data_size_bytes
  FROM supported_symbols TABLESAMPLE SYSTEM (10) s -- Sample 10% of symbols (adjust based on scale)
  CROSS JOIN data_type_registry reg
  WHERE s.is_active = true
    AND reg.refresh_strategy = 'scheduled'
    AND reg.refresh_schedule IS NOT NULL
    -- AND cron_schedule_matches(reg.refresh_schedule) -- (Your cron logic here)
    AND NOT EXISTS (
      SELECT 1 FROM api_call_queue q
      WHERE q.symbol = s.symbol
        AND q.data_type = reg.data_type
        AND q.status IN ('pending', 'processing') -- Same robust deduplication as background checker
    )
  LIMIT num_to_add
  ON CONFLICT DO NOTHING;

  EXCEPTION
    WHEN OTHERS THEN
      -- Ensure lock is released on error
      PERFORM pg_advisory_unlock(43);
      RAISE; -- Re-raise the original error
  END;

  -- Release lock on successful completion
  PERFORM pg_advisory_unlock(43);
END;
$$ LANGUAGE plpgsql;
```

**Benefits:**
- ✅ Only 4 cron jobs (not 11+)
- ✅ Generic - handles all data types
- ✅ Self-organizing
- ✅ **Queue throttling** - Prevents queue bloat from slowing high-priority inserts
- ✅ **Consistent deduplication** - Same robust logic as background checker
- ✅ **Set-based query** - Single query, no loop (avoids multiple full table scans)
- ✅ **Fully autonomous** - Backend discovers and checks automatically
- ✅ **No cleanup job needed** - Realtime Presence handles disconnects automatically

---

## Data Flow

### On-Demand Refresh Flow

1. **User subscribes to symbol:**
   - Frontend calls `upsert_active_subscription_v2` on mount (creates subscription)
   - Frontend sends heartbeat every 1 minute via `upsert_active_subscription_v2` (updates `last_seen_at`)
   - Frontend also tracks Realtime Presence for real-time updates

2. **Analytics cleanup runs (every minute):**
   - `refresh-analytics-from-presence-v2` Edge Function cleans up stale subscriptions
   - **CRITICAL:** Only removes subscriptions with `last_seen_at > 5 minutes`
   - **CRITICAL:** Does NOT update `last_seen_at` - only client heartbeats update it
   - **CRITICAL:** Frequency matches minimum TTL (1 minute for quotes) so staleness checker has accurate data

3. **Background staleness checker runs (every minute):**
   - Gets active subscriptions from `active_subscriptions_v2` table (updated by client heartbeats)
   - Calls `check_and_queue_stale_data_from_presence_v2()` with subscription data
   - Single set-based query (not row-by-row loop) checks all data types at once
   - Only checks symbols that ALREADY have active subscriptions
   - **CRITICAL:** Frequency matches minimum TTL (1 minute for quotes) to prevent stale data windows
   - **PRIMARY staleness check** - this is the only staleness check (no event-driven check)

4. **Queue processor runs:**
   - Edge function calls `get_queue_batch()`
   - Gets work for any data type (generic)
   - Calls edge functions dynamically based on registry
   - Processes items by priority (P0 = highest viewer count)

5. **Data updates:**
   - Edge function fetches from FMP API
   - Updates database
   - Database change triggers Supabase Realtime
   - Frontend receives update automatically

6. **User unsubscribes (normal flow):**
   - Frontend calls DELETE on `active_subscriptions_v2` (removes subscription)
   - Frontend leaves Realtime channel
   - Subscription removed immediately (no delay)

7. **User disconnects (abnormal flow):**
   - Client heartbeat stops (no more `upsert_active_subscription_v2` calls)
   - `last_seen_at` stops updating
   - Backend cleanup removes subscription after 5 minutes (handles abrupt browser closures)

---

## Adding New Data Types

### Example: Adding "Earnings" Card

**Step 1:** Add to `data_type_registry` (zero code changes!)

```sql
INSERT INTO data_type_registry VALUES (
  'earnings',
  'earnings_data',
  'fetched_at',
  'is_data_stale',
  1440, -- 24 hours
  'fetch-fmp-earnings',
  'on-demand',
  NULL,
  0,
  10240,
  'symbol'
);
```

**Step 2:** Create edge function `fetch-fmp-earnings` (if doesn't exist)

**Step 3:** Done! System automatically:
- ✅ Detects stale earnings data
- ✅ Queues refreshes for active subscriptions
- ✅ Processes queue items
- ✅ Updates via realtime

**No code changes needed!**

---

## Key Benefits

### ✅ Truly Scalable
- Add new data type = INSERT one row
- Zero code changes needed
- Works for any future card type

### ✅ Generic & Elegant
- No hardcoded CASE statements
- No hardcoded data type logic
- Metadata-driven architecture

### ✅ Minimal Scheduled Jobs
- Only 5 cron jobs total (not 11+)
- Fully autonomous staleness checking (background checker only)
- Background check runs every minute (matches minimum TTL of 1 minute for quotes)
- Analytics refresh runs every minute (matches minimum TTL so staleness checker has accurate data)
- Queue throttling prevents bloat
- Generic - handles all data types
- Self-organizing

### ✅ Backend-Controlled
- Backend knows all active viewers
- Single refresh per symbol (even with 100 users)
- Automatic refresh when data becomes stale

### ✅ Efficient
- Function-based staleness (always accurate)
- Priority-based queue processing
- Quota-aware (tracks data usage)

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
1. Create `data_type_registry` table
   - **CRITICAL:** Apply strict GRANT/REVOKE permissions (read-only for non-super-admin)
2. Create `is_valid_identifier()` helper function (SQL injection defense)
3. Create `active_subscriptions` table (optional, for analytics only - presence is source of truth)
   - **CRITICAL:** Analytics are batch operations (not hot-path writes) to prevent DoS vector
4. Create `api_call_queue` table
5. Create `is_data_stale()` functions
   - **CRITICAL:** Remove DEFAULT values from TTL parameters (prevents split-brain TTL bugs)
   - **CRITICAL:** Force explicit TTL from registry (ensures metadata-driven principle)
6. Create analytics cleanup Edge Function:
   - `refresh-analytics-from-presence-v2` - Cleans up stale subscriptions from `active_subscriptions_v2`
     - Runs every minute (matches minimum TTL)
     - **CRITICAL:** Only removes subscriptions with `last_seen_at > 5 minutes`
     - **CRITICAL:** Does NOT update `last_seen_at` - only client heartbeats update it
     - Client manages subscriptions directly (adds on mount, removes on unmount)
7. Create `check_and_queue_stale_batch()` function (batch staleness checker)
   - **CRITICAL:** Add fault tolerance (exception handling per data type)
8. Create `queue_refresh_if_not_exists()` function (idempotent queueing)
9. Implement Realtime Presence integration in frontend
10. Create `queue_scheduled_refreshes()` function with throttling, consistent deduplication, set-based query, and quota check

### Phase 2: Generic System (Week 2)
1. **Infrastructure Setup:**
   - Enable `pg_net` extension in Supabase dashboard (if using "All in Postgres" approach)
   - Grant `USAGE ON SCHEMA net` to cron job role
   - Verify outbound network access to Realtime API
2. Create `check_and_queue_stale_data_from_presence()` function (set-based, uses Presence)
   - **CRITICAL:** Add HTTP error checking (fail loudly, not silently)
   - **CRITICAL:** Add identifier validation (defense in depth)
   - **CRITICAL:** Add fault tolerance (exception handling per symbol/data_type)
   - **CRITICAL:** Add quota check as first step (prevents quota rebound catastrophe)
   - **CRITICAL:** Add batch analytics update (moved from hot-path to prevent DoS vector)
   - **CRITICAL:** Use Symbol-by-Symbol query pattern (prevents temp table thundering herd at scale)
   - **CRITICAL:** Add temp table indexes (symbol, data_type, symbol+data_type) for scalable queries
   - **CRITICAL:** Add advisory lock (lock ID 42) to prevent cron pile-ups
4. Create `api_data_usage` table (quota tracking)
5. Create `is_quota_exceeded()` function (quota check with 95% safety buffer)
6. Create `get_queue_batch()` function (atomic batch claiming with predictive quota check)
7. Create `complete_queue_job()` function (job completion handler with usage tracking)
8. Create `fail_queue_job()` function (job failure handler with retry logic)
9. Create `recover_stuck_jobs()` function (poisoned batch recovery)
   - **CRITICAL:** Use `FOR UPDATE SKIP LOCKED` to prevent deadlocks with concurrent `complete_queue_job` calls
10. Create `invoke_processor_loop()` function (looping invoker with circuit breaker)
   - **CRITICAL:** SQL function loops 5 times per minute (NOT Edge Function loop)
   - **CRITICAL:** Edge Function processes ONE batch and exits (stateless, prevents abandoned work)
   - **CRITICAL:** Add exception handling for invocation failures (prevents silent invoker failure)
   - **CRITICAL:** Add advisory lock (lock ID 44) to prevent cron pile-ups
11. Create generic queue processor edge function (single-batch, stateless)
    - **CRITICAL:** Use monofunction architecture (import logic from /lib/, NOT FaaS-to-FaaS invocations)
    - **CRITICAL:** Prevents connection pool exhaustion (50 concurrent invocations = 50 connections)
    - **CRITICAL:** Processes ONE batch and exits (loop is in SQL invoker, NOT here)
12. Create `maintain_queue_partitions()` function (partition maintenance policy)
   - **CRITICAL:** Truncates completed/failed partitions weekly to prevent infinite bloat
13. Create Edge Function templates with:
    - **CRITICAL:** Data type validation (reject jobs with wrong data_type)
    - **CRITICAL:** Aggressive internal timeouts (10-second timeout on API calls using AbortController)
    - **CRITICAL:** API response shape validation (reject 200 OK with invalid data)
14. Populate `data_type_registry` with all existing types
   - **CRITICAL:** Verify registry is read-only for non-super-admin roles
15. Create health-check Edge Function and external monitor:
   - **CRITICAL:** Create `health-check` Edge Function (queries pg_cron job execution)
   - **CRITICAL:** Create `check_cron_job_health()` SQL function (SECURITY DEFINER)
   - **CRITICAL:** Configure external monitor (UptimeRobot/GitHub Actions/AWS Lambda) pinging health-check every 5 minutes
   - **CRITICAL:** Configure P0 alert if health check returns 503 (system is dead)

### Phase 3: Scheduled Jobs (Week 2)
1. Create 5 generic cron jobs:
   - Background staleness checker (every minute) - Frequency matches minimum TTL (1 minute for quotes), uses active_subscriptions_v2 table
   - Scheduled refreshes (every minute, with throttling)
   - **Queue processor invoker (every minute)** - Looping invoker (SQL loop, stateless Edge Function)
   - **Analytics cleanup (every minute)** - CRITICAL: Must match minimum TTL so staleness checker has accurate data. Cleans up stale subscriptions (> 5 minutes old) from active_subscriptions_v2. Does NOT update last_seen_at - only client heartbeats update it.
   - **Partition maintenance (weekly)** - Truncates completed/failed partitions to prevent bloat
2. Remove all individual cron jobs (11+)
3. Test generic system and Realtime Presence integration

### Phase 4: Frontend Integration (Week 3)
1. Update frontend to:
   - Join Realtime channels with Presence when adding symbol
   - Track presence with metadata (symbol, dataTypes, userId)
   - **No Edge Function calls** - fully autonomous backend discovery
   - Leave channel when removing symbol (Presence automatically cleaned up)
2. Remove frontend staleness checking logic
3. Test end-to-end flow including disconnect scenarios
4. Verify Realtime Presence automatically handles disconnects

### Phase 5: Data Usage Tracking (Week 3-4)
1. **Already completed in Phase 2** - `api_data_usage` table and quota functions are part of core queue system
2. Verify quota tracking is working correctly
3. Set up alerts for quota thresholds (75%, 90%)

### Phase 6: Testing & Deployment (Week 4-5)
1. Comprehensive testing
2. Monitor quota usage
3. Deploy to production

---

## Constraints & Limits

### Rate Limits
- **300 calls/minute** - Managed by queue processor
- Queue processor respects rate limits automatically

### Data Quota
- **20 GB rolling monthly** - Tracked in `api_data_usage` table
- **95% safety buffer** - Quota check uses 95% of quota to account for estimation errors
- **Predictive quota check** - `get_queue_batch` accounts for batch size before serving
- **Quota-aware producers** - All producers check quota before adding jobs (prevents backlog buildup)
- Queue processor checks quota before processing
- Pauses non-critical updates when quota low

### Priority Levels

The system uses two priority tiers:

- **On-Demand Priority (P0):** Active subscriptions with stale data
  - Priority value = `viewerCount` from Realtime Presence
  - Implemented in: `check_and_queue_stale_batch()` (Section 4a) and `check_and_queue_stale_data_from_presence()` (Section 4b)
  - Higher viewer count = higher priority (more users waiting)

- **Scheduled Priority (P3):** Scheduled/background refreshes
  - Priority value = static `priority` from `data_type_registry` table
  - Implemented in: `queue_scheduled_refreshes()` (Section 6)
  - Throttled to prevent queue bloat

**Note:** The system does not implement preventive refreshes (P1) or "recently viewed" refreshes (P2). Only actively viewed symbols with stale data are prioritized.

---

## Monitoring & Observability

### Observability Sink (Non-Negotiable Requirement)

**Critical Risk:** The system's fault-tolerance mechanisms (`RAISE WARNING`, `CONTINUE` statements) can perfectly hide chronic, non-fatal errors. A data type can silently stop refreshing forever while the system appears "green."

**Requirement:** All `RAISE WARNING` and `RAISE NOTICE` messages **must** be captured and aggregated in a monitoring system that can trigger alerts. Logs are not monitoring—they are forensics.

**Implementation:**

1. **Log Aggregation:**
   - All PostgreSQL logs (warnings, notices, errors) must be forwarded to an observability platform (e.g., Logflare, Datadog, Grafana, Splunk)
   - Use Supabase's log forwarding or a custom log aggregation solution

2. **Alert Rules (Required):**
   - **Warning Frequency Alert:** "If `RAISE WARNING 'Staleness check failed for data type X'` occurs 5+ times in 1 hour, trigger P2 alert"
   - **Silent Failure Detection:** "If a data type has no queue entries for 24 hours but has active subscriptions, trigger P1 alert"
   - **Advisory Lock Alert:** "If advisory lock 42 is held for > 10 minutes, trigger P0 alert (cron job stuck)"
   - **Queue Health:** "If queue depth > 1000 for > 30 minutes, trigger P1 alert"
   - **Processor Health:** "If no jobs completed in last 10 minutes but queue has pending jobs, trigger P1 alert"

3. **External Heartbeat Monitor (CRITICAL - Prevents pg_cron Single Point of Failure):**

   **Critical Risk:** The entire system's liveness is 100% dependent on `pg_cron`. If `pg_cron` hangs, fails, or is misconfigured, the system is completely dead with no internal alerts (no functions running = no warnings/exceptions).

   **Requirement:** An external, "dumb" watchdog service (e.g., 5-minute GitHub Action, AWS Lambda, or UptimeRobot) **must** monitor `pg_cron` job execution.

   **Implementation:**

   a. **Create Health Check Edge Function:**

   ```typescript
   // supabase/functions/health-check/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     );

     // Query pg_cron job execution history
     const { data: jobRuns, error } = await supabase.rpc('check_cron_job_health', {
       critical_jobs: ['check-stale-data', 'process-queue-batch', 'scheduled-refreshes', 'refresh-analytics-table']
     });

     if (error) {
       return new Response(
         JSON.stringify({ error: 'Failed to check cron job health', details: error.message }),
         { status: 503, headers: { 'Content-Type': 'application/json' } }
       );
     }

     // Check if any critical job is stale (hasn't run in expected interval)
     const staleJobs = jobRuns.filter(job => {
       const expectedInterval = job.jobname === 'process-queue-batch' ? 2 : // 2 minutes (runs every 1 min, allow 1 min buffer)
                                job.jobname === 'check-stale-data' ? 3 : // 3 minutes (runs every 1 min, allow 2 min buffer)
                                job.jobname === 'scheduled-refreshes' ? 5 : // 5 minutes (runs every 1 min, allow 4 min buffer)
                                job.jobname === 'refresh-analytics-table' ? 20 : // 20 minutes (runs every 15 min, allow 5 min buffer)
                                10; // Default 10 minutes
       return job.last_run && (Date.now() - new Date(job.last_run).getTime()) > expectedInterval * 60 * 1000;
     });

     if (staleJobs.length > 0) {
       return new Response(
         JSON.stringify({
           error: 'Cron jobs are stale',
           stale_jobs: staleJobs.map(j => ({ name: j.jobname, last_run: j.last_run }))
         }),
         { status: 503, headers: { 'Content-Type': 'application/json' } }
       );
     }

     return new Response(
       JSON.stringify({ status: 'healthy', jobs: jobRuns }),
       { status: 200, headers: { 'Content-Type': 'application/json' } }
     );
   });
   ```

   b. **Create SQL Function to Query pg_cron:**

   ```sql
   -- Function to check cron job health (called by health-check Edge Function)
   CREATE OR REPLACE FUNCTION check_cron_job_health(p_critical_jobs TEXT[])
   RETURNS TABLE(jobname TEXT, last_run TIMESTAMP WITH TIME ZONE) AS $$
   BEGIN
     RETURN QUERY
     SELECT
       j.jobname::TEXT,
       MAX(jr.end_time) AS last_run
     FROM pg_cron.job j
     LEFT JOIN pg_cron.job_run_details jr ON j.jobid = jr.jobid
     WHERE j.jobname = ANY(p_critical_jobs)
     GROUP BY j.jobname;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

   c. **Configure External Monitor:**

   - **UptimeRobot:** Create HTTP(s) monitor pinging `https://api.tickered.com/functions/v1/health-check` every 5 minutes
   - **GitHub Actions:** Create scheduled workflow (`.github/workflows/cron-health-check.yml`) that runs every 5 minutes
   - **AWS Lambda:** Create CloudWatch Events rule triggering Lambda every 5 minutes

   d. **Alert Configuration:**

   - If health check returns `503`, trigger **P0 alert** (system is dead)
   - Alert must include which cron jobs are stale
   - Alert must be sent to on-call engineer immediately

   **Why This Is Critical:**
   - `pg_cron` is a "black box" with no external monitoring
   - If `pg_cron` fails, no internal alerts fire (no functions running)
   - System can be 100% dead for hours/days before discovery
   - External monitor is the "meta-monitor" that ensures the internal system is still breathing

3. **Metrics Dashboard (Required):**
   - Queue depth over time
   - Jobs by status (pending, processing, completed, failed)
   - Data type refresh frequency
   - Warning/error rate by data type
   - Processor throughput (jobs/minute)
   - API rate limit utilization
   - **Estimate accuracy ratio** (actual_size / estimated_size) - monitor for estimation errors
   - **Quota utilization** (current usage / buffered quota) - track proximity to 95% buffer
   - **Circuit breaker status** - track when circuit breaker trips
   - **Processor cold start latency** - monitor for sharding trigger (Day 180 Roadmap)

### Key Metrics
- Active subscriptions count
- Queue depth
- Staleness detection performance
- Data usage (rolling 30-day)
- Remaining quota
- API call rate
- Warning/error frequency by data type
- Processor throughput
- Advisory lock status

### Alerting
- Rolling monthly usage > 15 GB (75% of quota)
- Rolling monthly usage > 18 GB (90% of quota)
- Queue depth > 1000
- API call rate > 250/minute
- **Warning frequency > 5/hour for any data type (NEW)**
- **Advisory lock held > 10 minutes (NEW)**
- **No jobs completed in 10 minutes with pending queue (NEW)**
- **Data type with active subscriptions but no queue entries for 24 hours (NEW)**
- **Estimate accuracy alert (NEW):** Alert if `actual_data_size_bytes` (from `complete_queue_job`) is > 2x `estimated_data_size_bytes` (from registry) for any job - indicates estimation error
- **Circuit breaker tripped (NEW):** Alert when `invoke_processor_if_healthy` raises exception - indicates broken processor
- **Content-Length header missing (NEW):** Alert if Edge Function logs "Content-Length header missing" - indicates quota tracking inaccuracy risk

---

## Operational Runbook

**Purpose:** This system is complex and requires principal-level knowledge to maintain. This runbook provides step-by-step troubleshooting guides for common failure scenarios.

### Failure: "Failed to fetch Realtime presence. Status: 503"

**Symptoms:**
- Cron job `check_and_queue_stale_data_from_presence` fails with HTTP error
- Queue stops receiving new on-demand refreshes

**Diagnosis Steps:**
1. **Check `pg_net` extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
   - If missing, enable it: `CREATE EXTENSION IF NOT EXISTS pg_net;`

2. **Check schema permissions:**
   ```sql
   SELECT has_schema_privilege('postgres', 'net', 'USAGE');
   ```
   - If false, grant: `GRANT USAGE ON SCHEMA net TO postgres;`

3. **Check network egress:**
   - Verify database instance has outbound network access
   - Check firewall rules allow connections to `*.supabase.co`

4. **Check Realtime API status:**
   - Verify Supabase Realtime service is operational
   - Check Supabase status page

5. **Check `anon_key` configuration:**
   ```sql
   SELECT current_setting('app.settings.supabase_anon_key', true);
   ```
   - Verify key is set and not expired

**Resolution:**
- If `pg_net` missing: Enable extension
- If permissions missing: Grant USAGE
- If network issue: Check firewall/VPC configuration
- If Realtime API down: Wait for service restoration (system will auto-recover)

---

### Failure: "Queue depth > 1000 and not clearing"

**Symptoms:**
- Queue has thousands of pending jobs
- Jobs not being processed
- Queue depth continuously growing

**Diagnosis Steps:**
1. **Check for poisoned jobs:**
   ```sql
   SELECT COUNT(*) FROM api_call_queue
   WHERE status = 'processing'
   AND processed_at < NOW() - INTERVAL '5 minutes';
   ```
   - If > 0, these are stuck jobs that need recovery

2. **Check processor health:**
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     MAX(processed_at) as last_processed
   FROM api_call_queue
   GROUP BY status;
   ```
   - If no `completed` jobs in last 10 minutes, processor may be down

3. **Check for failed jobs:**
   ```sql
   SELECT COUNT(*) FROM api_call_queue WHERE status = 'failed';
   ```
   - High count indicates systemic failure

4. **Check processor logs:**
   - Verify Edge Function is running
   - Check for rate limit errors (429)
   - Check for API key expiration

**Resolution:**
- If poisoned jobs: Run `recover_stuck_jobs()` manually
- If processor down: Restart Edge Function
- If rate limited: Check FMP API status, reduce batch size
- If failed jobs: Investigate error messages, check FMP API key

---

### Failure: "Advisory lock 42 is held"

**Symptoms:**
- Cron job `check_and_queue_stale_data_from_presence` logs "already running"
- No new staleness checks happening

**Diagnosis Steps:**
1. **Find the lock holder:**
   ```sql
   SELECT
     l.pid,
     l.locktype,
     l.objid,
     a.query,
     a.state,
     a.query_start
   FROM pg_locks l
   JOIN pg_stat_activity a ON l.pid = a.pid
   WHERE l.objid = 42
   AND l.locktype = 'advisory';
   ```

2. **Check if process is stuck:**
   - If `state = 'active'` and `query_start` is old (> 10 minutes), process is stuck
   - If `state = 'idle in transaction'`, transaction is stuck

**Resolution:**
- If process is stuck: `SELECT pg_terminate_backend(pid);` (use PID from query above)
- If transaction stuck: Terminate backend, investigate what caused the hang
- Lock will be automatically released when process terminates

---

### Failure: "Data type X never refreshes"

**Symptoms:**
- Specific data type (e.g., "earnings") has active subscriptions but no queue entries
- Data remains stale indefinitely

**Diagnosis Steps:**
1. **Check for warnings in logs:**
   ```sql
   -- Query your log aggregation system
   -- Look for: "Staleness check failed for data type earnings"
   ```

2. **Check registry entry:**
   ```sql
   SELECT * FROM data_type_registry WHERE data_type = 'earnings';
   ```
   - Verify all fields are correct
   - Check for typos in `staleness_function`, `table_name`, etc.

3. **Test staleness function manually:**
   ```sql
   -- Replace with actual values from registry
   SELECT is_data_stale(
     (SELECT fetched_at FROM live_quote_indicators WHERE symbol = 'AAPL'),
     5
   );
   ```

4. **Check for exceptions:**
   - Review logs for `RAISE WARNING` or `RAISE EXCEPTION` messages
   - Check if function name is valid: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'is_earnings_stale';`

**Resolution:**
- If registry typo: Fix registry entry
- If function missing: Create the staleness function
- If table missing: Verify table exists and has correct column names
- **Prevention:** Set up alert for "Warning frequency > 5/hour for any data type"

---

### Failure: "Processor getting 429 Too Many Requests"

**Symptoms:**
- Many jobs failing with rate limit errors
- FMP API blocking requests

**Diagnosis Steps:**
1. **Check current rate:**
   ```sql
   SELECT
     COUNT(*) as jobs_last_minute
   FROM api_call_queue
   WHERE processed_at > NOW() - INTERVAL '1 minute'
   AND status = 'completed';
   ```

2. **Check processor concurrency:**
   - Review Edge Function code
   - Verify concurrency limiting is implemented
   - Check if `Promise.all` is being used incorrectly

3. **Check FMP rate limit headers:**
   - Review processor logs for `x-ratelimit-remaining` values
   - Verify processor is respecting rate limits

**Resolution:**
- Reduce batch size in `get_queue_batch` call
- Implement stricter concurrency limiting in processor
- Add exponential backoff for 429 responses
- Verify processor reads and respects `x-ratelimit-remaining` headers

---

## Future Enhancements

1. **Event-Driven Queue Processing:** Use database triggers to notify queue processor (eliminate polling)
2. **Predictive Prefetching:** Prefetch data for likely-to-be-viewed symbols (if quota allows)
3. **Multi-API Key Rotation:** If multiple FMP API keys available
4. **Data Compression:** If API supports it

---

## Day 180 Roadmap (Scale Optimizations)

**Purpose:** These optimizations address "Scaling Cliff" risks that emerge at high volume (50+ data types, millions of jobs). They are **not blockers for Day 1** but should be planned for Day 180.

### 1. Sharded Monofunctions (Bundle Size Limit)

**Risk:** At scale (50+ data types), the monofunction processor bundle may exceed deployment limits (~10-20MB) or cause excessive cold start latency, degrading user experience and increasing costs.

**Current State:** Single `queue-processor` Edge Function imports all logic for all data types.

**Optimization:**
- **Monitor bundle size:** If approaching 5MB, plan for sharding
- **Monitor cold start latency:** If processor cold start > 1s, implement sharding
  - Cold start latency degrades linearly with bundle size (parsing 50 Zod schemas = 3s boot time)
  - This wastes money (longer function execution) and creates poor user experience (delayed data)
- **Sharding strategy:**
  - `queue-processor-core`: High-volume types (profiles, quotes - 80% of volume)
  - `queue-processor-financials`: Heavy logic types (statements, earnings)
  - `queue-processor-router`: Routes batches to correct shard based on `data_type`
- **Implementation:** `invoke_processor_loop` stays the same, but invokes `queue-processor-router` which selects the appropriate shard

**When to implement:**
- Bundle size approaches 5MB (deployment risk)
- **OR** Processor cold start latency > 1s (performance/cost risk)
- **OR** Deployment fails due to size limits (hard limit)

**Status:** ✅ **Documented in Contract #19** (Day 180 Optimization section)

---

### 2. Immediate Deadlock Reset (Latency Optimization)

**Risk:** Deadlocks currently cause a 5-minute delay (waiting for `recover_stuck_jobs`), creating poor user experience.

**Current State:** Deadlocks are caught but jobs wait 5 minutes for recovery.

**Optimization:**
- **Immediate reset:** When deadlock is caught in processor, call `reset_job_immediate()` immediately
- **Result:** 5-minute delay → <1 second delay (picked up by next batch)
- **Implementation:** Already added to Contract #17 and processor code

**Status:** ✅ **Implemented in v2.3.9** (Contract #17 updated, `reset_job_immediate()` function added)

---

### 3. Auto-Correcting Estimate Registry (Maintenance Friction)

**Risk:** `estimated_data_size_bytes` relies on manual updates. Humans ignore alerts, causing estimates to drift and quota predictions to become inaccurate.

**Current State:** Alert for `actual > 2x estimated` requires manual SQL `UPDATE` to registry.

**Optimization:**
- **Auto-correction:** Statistical sampling (~1% of jobs using `random() < 0.01`), update registry with weighted moving average
- **Formula:** `estimated = (old_estimate * 0.9) + (new_actual * 0.1)`
- **Performance:** Uses `random()` for O(1) constant time, avoiding O(N) `COUNT(*)` performance degradation
- **Result:** Estimates self-correct over time, removing human from the loop
- **Implementation:** Already added to `complete_queue_job()` function

**Status:** ✅ **Implemented in v2.4.0** (`complete_queue_job()` enhanced with statistical sampling auto-correction)

---

**Note:** These optimizations are already implemented in the code examples. They are documented here as "Day 180 Roadmap" to emphasize they are scale optimizations, not Day 1 requirements.

---

## Document Alignment

All architecture documents should reference this master document and align with:
- ✅ Metadata-driven approach (`data_type_registry`)
- ✅ Backend-controlled refresh
- ✅ Function-based staleness (Option A)
- ✅ Generic queue system
- ✅ Minimal scheduled jobs (1-2 generic)
- ✅ Active subscriptions tracking

**Documents to update:**
- `api-calling-strategy.md` - Update to reflect metadata-driven approach
- `implementation-plan-on-demand-api.md` - Update to use generic system
- `architecture-analysis-review.md` - Update to reflect final architecture
- `migration-plan-backend-controlled-refresh.md` - Update to use metadata-driven approach

---

## Database Unit Testing (Enforcing Sacred Contracts)

**Purpose:** The "Sacred Contracts" (Section 9) are the system's greatest defense, but they are currently an unenforceable "honor system." A human will eventually ignore the documentation under pressure and re-introduce a catastrophic bug. This section mandates **automated, executable tests** that enforce the contracts in CI/CD.

**Why This Is Critical:**
- Contracts are documentation - a developer can ignore them
- Manual PR review checklists are fallible
- A "simplification" that removes `SKIP LOCKED` will re-introduce deadlocks
- A "fix" that adds TTL defaults will re-introduce split-brain bugs
- The system's "antifragile" properties are only as good as automated enforcement

**Implementation Requirements:**

### 1. Testing Framework

Use a database testing framework (e.g., `pg_tap`, `pgTAP`) to write tests that execute directly in PostgreSQL.

```sql
-- Example: tests/contracts/test_contract_2_recovery_deadlock.sql
BEGIN;
SELECT plan(1);

-- Contract #2: Recovery job must not deadlock
-- Test: recover_stuck_jobs must use FOR UPDATE SKIP LOCKED
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_proc_proname(p.oid) AS proc_name ON true
    WHERE proc_name = 'recover_stuck_jobs'
      AND pg_get_functiondef(p.oid) LIKE '%FOR UPDATE SKIP LOCKED%'
  ),
  'Contract #2: recover_stuck_jobs must use FOR UPDATE SKIP LOCKED'
);

SELECT * FROM finish();
ROLLBACK;
```

### 2. Required Test Coverage

**Every Sacred Contract must have a corresponding test:**

- **Contract #1 (Atomic Batch Claiming):** Test that `get_queue_batch` atomically updates status within the same transaction
- **Contract #2 (SKIP LOCKED):** Test that `recover_stuck_jobs` query plan contains `SKIP LOCKED`
- **Contract #3 (Advisory Locks):** Test that all cron job functions check `pg_try_advisory_lock` before proceeding
- **Contract #5 (Edge Function Validations):** Test that Edge Functions validate data_type, shape, AND sanity (requires integration tests)
- **Contract #8 (Scheduled Job Priority):** Test that `queue_scheduled_refreshes` always sets `priority = -1`, regardless of registry value
- **Contract #13 (No TTL Defaults):** Test that `is_data_stale` throws an error if `p_ttl_minutes` is not provided
- **Contract #14 (Source Timestamp):** Test that Edge Functions check source timestamps if `source_timestamp_column` is defined (requires integration tests)
- **Contract #15 (Circuit Breaker Sensitivity):** Test that `invoke_processor_if_healthy` checks `retry_count > 0`, not `status = 'failed'`
- **Contract #16 (Polite Partition Maintenance):** Test that `maintain_queue_partitions` sets `lock_timeout = '1s'` before `TRUNCATE`
- **Contract #18 (SECURITY DEFINER):** Test that `check_and_queue_stale_batch` uses `SECURITY DEFINER`
- **Contract #19 (Monofunction Processor):** Test that processor uses switch statement, not FaaS invocations (requires integration tests)
- **Contract #20 (Application Contract Linting):** Test that ESLint rules exist and run in CI/CD (requires CI/CD validation)
- **Contract #21 (Aggressive Internal Timeouts):** Test that Edge Functions use `AbortController` with 10-second timeout on API calls (requires integration tests)
- **Contract #22 (Schema Migration Atomicity):** Test that schema migrations include Zod schema updates and integration tests in same PR (requires CI/CD validation)

### 3. CI/CD Integration

**These tests MUST run in CI/CD before any PR merge:**

```yaml
# .github/workflows/database-contracts.yml
name: Database Contract Tests

on: [pull_request]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run pgTAP tests
        run: |
          psql $DATABASE_URL -f tests/contracts/test_all_contracts.sql
```

### 4. Test Maintenance

**When adding a new Sacred Contract:**
1. Add the contract to Section 9
2. **IMMEDIATELY** write a test that enforces it
3. Add the test to CI/CD
4. Document the test in this section

**When modifying a function:**
1. Run all contract tests
2. If a test fails, **DO NOT** modify the test to pass
3. **FIX** the function to maintain the contract
4. If the contract is obsolete, remove both the contract AND the test

**This moves contracts from "documentation" to "executable code."**

### 5. Application Contract Linting (TypeScript Contracts)

**CRITICAL:** Database unit tests only enforce SQL contracts. The most critical data integrity rules are in **TypeScript** (Zod parsing, Content-Length tracking, source timestamp checking). These must be enforced by ESLint rules.

**Why This Is Critical:**
- Contract #5: Strict Zod parsing is in TypeScript, not SQL
- Contract #6a: Content-Length quota tracking is in TypeScript, not SQL
- Contract #14: Source timestamp checking is in TypeScript, not SQL
- Database unit tests will PASS even if these TypeScript contracts are violated
- This creates an "unenforceable honor system" for application code

**Implementation Requirements:**

### Custom ESLint Rules

Create custom ESLint rules to enforce TypeScript contracts:

```javascript
// eslint-rules/enforce-contract-5-strict-schema.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Contract #5: Strict schema parsing (Zod)',
    },
  },
  create(context) {
    return {
      // Check files in supabase/functions/lib/ that use complete_queue_job or fail_queue_job
      Program(node) {
        const filename = context.getFilename();
        if (!filename.includes('supabase/functions/lib/')) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // Must import zod
        const hasZodImport = text.includes("import") && text.includes("zod");
        // Must have z.object definition
        const hasZodObject = text.includes("z.object");

        // Must use complete_queue_job or fail_queue_job
        const usesQueueFunctions =
          text.includes('complete_queue_job') ||
          text.includes('fail_queue_job');

        if (usesQueueFunctions && (!hasZodImport || !hasZodObject)) {
          context.report({
            node,
            message: 'Contract #5 violation: Functions using queue operations must use strict Zod schema parsing. Missing zod import or z.object definition.',
          });
        }
      },
    };
  },
};

// eslint-rules/enforce-contract-6a-content-length.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Contract #6a: Content-Length quota tracking',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.getFilename();
        if (!filename.includes('supabase/functions/lib/')) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // Must use Content-Length header
        const usesContentLength =
          text.includes("response.headers.get('Content-Length')") ||
          text.includes('response.headers.get("Content-Length")');

        // Must use complete_queue_job (which requires actualSizeBytes)
        const usesCompleteQueueJob = text.includes('complete_queue_job');

        if (usesCompleteQueueJob && !usesContentLength) {
          context.report({
            node,
            message: 'Contract #6a violation: Functions using complete_queue_job must track quota using Content-Length header. Missing response.headers.get("Content-Length").',
          });
        }
      },
    };
  },
};

// eslint-rules/enforce-contract-14-source-timestamp.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Contract #14: Source timestamp checking',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.getFilename();
        if (!filename.includes('supabase/functions/lib/')) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // Must check source timestamp if source_timestamp_column is defined
        // This is harder to enforce statically, but we can check for the pattern
        const hasSourceTimestampCheck =
          text.includes('source_timestamp_column') &&
          (text.includes('newSourceTimestamp') || text.includes('oldSourceTimestamp'));

        // Must use complete_queue_job (which means it's a data-fetching function)
        const usesCompleteQueueJob = text.includes('complete_queue_job');

        // Note: This is a weaker check - we can't statically verify the registry lookup
        // But we can at least verify the pattern exists
        if (usesCompleteQueueJob && !hasSourceTimestampCheck) {
          context.report({
            node,
            message: 'Contract #14 warning: Functions using complete_queue_job should check source timestamps if source_timestamp_column is defined in registry. Consider adding source timestamp validation.',
            severity: 'warn', // Warning, not error, because registry lookup is dynamic
          });
        }
      },
    };
  },
};
```

### ESLint Configuration

```json
// .eslintrc.json
{
  "plugins": ["@tickered/contracts"],
  "rules": {
    "@tickered/contracts/enforce-contract-5-strict-schema": "error",
    "@tickered/contracts/enforce-contract-6a-content-length": "error",
    "@tickered/contracts/enforce-contract-14-source-timestamp": "warn"
  }
}
```

### CI/CD Integration

**These ESLint rules MUST run in CI/CD before any PR merge:**

```yaml
# .github/workflows/application-contracts.yml
name: Application Contract Linting

on: [pull_request]

jobs:
  lint-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run ESLint contract rules
        run: npm run lint:contracts
```

**This enforces TypeScript contracts with the same rigor as SQL contracts.**

---

## Maintainer's Governance & Sacred Contracts

**Purpose:** This system is a set of interacting, carefully-designed contracts. Many components exist to prevent catastrophic, non-obvious failures that would only surface under production load. **Do not "optimize" or "simplify" these components without understanding their purpose.**

**This section MUST be reviewed before any pull request that modifies queue, quota, or staleness checking logic.**

### The Sacred Contracts (Non-Negotiable)

These components are **architecturally critical**. Changing them will introduce subtle, production-breaking bugs that are difficult to diagnose.

#### 1. `get_queue_batch` Atomic Update

**Contract:** Must remain atomic (SELECT → UPDATE → RETURN).

**Why:** Prevents race conditions where multiple processors grab the same batch.

**What NOT to do:**
- ❌ Separate the SELECT and UPDATE into different transactions
- ❌ Remove the `FOR UPDATE SKIP LOCKED` clause
- ❌ Remove the atomic UPDATE that sets status to `processing`

**What to do instead:**
- ✅ If you need to change this function, maintain the atomic pattern
- ✅ Test with multiple concurrent processors to verify no duplicate batches

---

#### 2. `recover_stuck_jobs` `SKIP LOCKED`

**Contract:** Must use `FOR UPDATE SKIP LOCKED` when selecting stuck jobs.

**Why:** Prevents deadlocks with concurrent `complete_queue_job` calls. Without `SKIP LOCKED`, the recovery job will wait for locks held by the processor, causing deadlocks.

**What NOT to do:**
- ❌ Change `FOR UPDATE SKIP LOCKED` to `FOR UPDATE` (re-introduces deadlock)
- ❌ Remove the lock entirely (allows race conditions)

**What to do instead:**
- ✅ If you need to change this function, maintain `SKIP LOCKED`
- ✅ Test with concurrent processor and recovery job to verify no deadlocks

---

#### 3. Cron Advisory Locks

**Contract:** Long-running cron jobs must use `pg_try_advisory_lock` to prevent self-contention.

**Why:** Prevents "cron pile-up" where multiple instances of the same job run simultaneously, overwhelming the database.

**What NOT to do:**
- ❌ Remove the advisory lock check
- ❌ Change `pg_try_advisory_lock` to `pg_advisory_lock` (blocks instead of skipping)

**What to do instead:**
- ✅ If you need to change this function, maintain the advisory lock pattern
- ✅ Ensure lock is released in both success and exception paths

---

#### 4. `check_and_queue` Exception Blocks

**Contract:** Must use `BEGIN...EXCEPTION...END` blocks for fault tolerance.

**Why:** Prevents one bad data type from breaking the entire batch/cron job. Without exception handling, a single registry typo will stop all staleness checks.

**What NOT to do:**
- ❌ Remove exception blocks to "optimize" performance
- ❌ Change `CONTINUE` to `RAISE` (breaks fault tolerance)

**What to do instead:**
- ✅ If you need to change this function, maintain exception handling
- ✅ Ensure errors are logged (RAISE WARNING) for observability

---

#### 5. Edge Function Validations (Strict Schema Parsing)

**Contract:** Edge Functions must validate `data_type`, use strict schema parsing (e.g., Zod), AND logical correctness of data values.

**Why:**
- Data type validation prevents silent failures from registry misconfiguration
- **Strict schema parsing prevents "schema drift" data corruption** - APIs can change field names without versioning, causing `undefined` values to be written as `NULL`
- Manual "spot-checks" (!profile.symbol, profile.price <= 0) are insufficient - they miss missing fields
- Response shape validation prevents infinite loops from "liar APIs" (200 OK with invalid data)
- Data sanity checks prevent logically invalid data (e.g., price = 0.01) from being "locked in" as "fresh" until TTL expires

**What NOT to do:**
- ❌ Remove data type validation to "simplify" code
- ❌ Use manual "spot-checks" instead of strict schema parsing (will miss schema drift)
- ❌ Remove response shape validation to "trust" the API
- ❌ Remove data sanity checks (shape validation is not enough)
- ❌ Treat `200 OK` as success without validating data shape AND logic

**What to do instead:**
- ✅ **MANDATORY:** Use strict schema validation library (e.g., Zod) to parse the ENTIRE expected API response
- ✅ Define schema with all required fields - missing fields will cause parse to fail
- ✅ If parsing fails (missing field, wrong type, invalid value), throw error (catch block handles it)
- ✅ Test with misconfigured registry entries, invalid API responses, logically invalid data, AND schema drift scenarios

---

#### 6. Quota Checks

**Contract:** Must remain predictive, buffered, and producer-aware.

**Why:**
- Predictive check (accounts for batch size) prevents overshooting quota
- 95% buffer accounts for estimation errors
- Producer-aware checks prevent backlog buildup when quota is exceeded

**What NOT to do:**
- ❌ Remove the 95% safety buffer
- ❌ Make quota check reactive (only check past usage, not future)
- ❌ Remove quota checks from producers (causes quota rebound catastrophe)

**What to do instead:**
- ✅ If you need to change quota logic, maintain all three properties
- ✅ Test with quota at 99% to verify predictive check works

---

#### 6a. Quota Tracking (Content-Length)

**Contract:** Edge Functions must use `Content-Length` header for quota tracking, not `JSON.stringify().length`.

**Why:**
- FMP bills for HTTP payload size (headers + body), not parsed object size
- `JSON.stringify().length` measures the parsed object, which is smaller than the HTTP payload
- Using `JSON.stringify().length` causes quota tracking to be inaccurate, leading to silent quota overruns

**What NOT to do:**
- ❌ Use `JSON.stringify(data).length` for quota tracking
- ❌ Ignore missing `Content-Length` headers (must log warning and use conservative fallback)

**What to do instead:**
- ✅ Always use `response.headers.get('Content-Length')` for quota tracking
- ✅ Log warning if `Content-Length` is missing and use conservative fallback estimate
- ✅ Alert on missing `Content-Length` headers to investigate API provider issues

---

#### 7. Analytics Architecture

**Contract:** Analytics (`active_subscriptions`) must be batch operations, not hot-path writes.

**Why:** Prevents DoS vector from "non-critical" analytics writes on the hottest code path.

**What NOT to do:**
- ❌ Add analytics writes to hot-path functions
- ❌ Make analytics "fire-and-forget" in client-side code

**What to do instead:**
- ✅ If you need analytics, use batch operations (cron jobs)
- ✅ Keep hot-path (on-subscribe) free of analytics writes

---

#### 8. Scheduled Job Priority

**Contract:** Scheduled jobs must have hardcoded priority of -1, never use `reg.priority` from registry.

**Why:** Prevents priority inversion where low-value scheduled work (priority 100) starves high-priority user-facing work (priority 1). On-demand work (P0) has `priority = viewerCount >= 1`, so scheduled work must be lower.

**What NOT to do:**
- ❌ Use `reg.priority` from `data_type_registry` for scheduled jobs
- ❌ Allow scheduled jobs to have priority >= 0 (would starve user-facing work)

**What to do instead:**
- ✅ Always hardcode scheduled job priority to -1 in `queue_scheduled_refreshes`
- ✅ Ensure `get_queue_batch` orders by `priority DESC` (on-demand work processed first)

---

#### 9. Scheduled Job Performance (TABLESAMPLE)

**Contract:** `queue_scheduled_refreshes` must use `TABLESAMPLE` to avoid materializing massive CROSS JOINs at scale.

**Why:** At scale (50k symbols * 5 types = 250k rows), full CROSS JOIN is a performance bomb. TABLESAMPLE randomly samples symbols, dramatically reducing query cost and preventing "Day 365" performance failure.

**What NOT to do:**
- ❌ Remove `TABLESAMPLE` to "process all symbols"
- ❌ Use full `CROSS JOIN` without sampling (will fail at scale)

**What to do instead:**
- ✅ Always use `TABLESAMPLE SYSTEM (10)` or similar percentage
- ✅ Adjust sample percentage based on platform scale (10% is a starting point)
- ✅ Consider stateful iteration (WHERE symbol > last_processed) for true "at scale" solution

---

#### 10. Primary-Only Execution (Read-Replica Safety)

**Contract:** All staleness checks, queue-modification functions, and staleness cron jobs **must** be executed on the primary database, never on read-replicas.

**Why:**
- Staleness checks use `NOW()` which will be wrong on replicas with replication lag (e.g., 60 seconds behind)
- This causes non-deterministic staleness checks (false positives/negatives), breaking the core premise
- Queue modifications must be on primary to ensure consistency

**What NOT to do:**
- ❌ Run `is_data_stale()`, `get_queue_batch()`, `complete_queue_job()`, or staleness cron jobs on read-replicas
- ❌ Use default Supabase client (which may route to replicas) for these operations

**What to do instead:**
- ✅ Use `service_role` client (always hits primary) for all queue/staleness operations
- ✅ Or use a dedicated "primary-only" database connection
- ✅ Document in deployment guide that these functions are primary-only

---

#### 11. Table Partitioning (Day 90 Performance)

**Contract:** `api_call_queue` must be partitioned by `status` to prevent table bloat performance catastrophe.

**Why:**
- High UPDATE volume (thousands/minute) creates dead tuples faster than autovacuum can clean
- This leads to massive table and index bloat (1 GB → 100 GB on disk with same row count)
- `get_queue_batch` queries become progressively slower (10ms → 10 seconds) until system grinds to halt
- Partitioning ensures the "hot" partition (pending) is always small, fast, and dense

**What NOT to do:**
- ❌ Use unpartitioned table for high-throughput queue (will bloat and fail at scale)
- ❌ Remove partitioning to "simplify" schema

**What to do instead:**
- ✅ Always partition `api_call_queue` by `status` (pending, processing, completed, failed)
- ✅ Set `FILLFACTOR = 70` on partitions to leave room for HOT updates
- ✅ **MANDATORY:** Run `maintain_queue_partitions()` weekly (or daily) to truncate completed/failed partitions
- ✅ These partitions are ephemeral logs, not permanent records - truncation is required

---

#### 12. Symbol-by-Symbol Query Pattern (Temp Table Thundering Herd)

**Contract:** `check_and_queue_stale_data_from_presence` must use Symbol-by-Symbol query pattern, not Type-by-Type.

**Why:**
- At scale (100k users * 3 types = 300k rows), Type-by-Type creates 10 giant JOINs that exhaust `work_mem`
- This causes database-wide slowdowns, disk I/O thrashing, and potential crashes
- Symbol-by-Symbol creates 10k tiny, fast, indexed queries that scale linearly
- Temp table indexes are critical for this pattern to work efficiently

**What NOT to do:**
- ❌ Use Type-by-Type loop (outer loop over data types, inner JOIN with 300k-row temp table)
- ❌ Remove temp table indexes (queries will be slow without them)

**What to do instead:**
- ✅ Always use Symbol-by-Symbol pattern (outer loop over symbols, inner loop over data types for that symbol)
- ✅ Add indexes to temp table: `(symbol)`, `(data_type)`, `(symbol, data_type)`
- ✅ Filter by symbol FIRST in WHERE clause (uses index efficiently)

---

#### 13. Metadata-Driven TTL (No Defaults)

**Contract:** `is_data_stale` and all staleness functions must NOT have default TTL values.

**Why:**
- The `data_type_registry` is the single source of truth for TTL values
- Default values (e.g., `DEFAULT 5`) create a "split-brain" where developers accidentally use wrong TTL
- This violates the metadata-driven principle and causes non-deterministic staleness checks

**What NOT to do:**
- ❌ Add `DEFAULT` values to `is_data_stale` or wrapper functions
- ❌ Allow TTL to be omitted in function calls

**What to do instead:**
- ✅ Always require explicit `p_ttl_minutes` parameter (no defaults)
- ✅ Force all callers to provide TTL from `data_type_registry`
- ✅ This ensures registry is the only source of truth

---

#### 14. Source Timestamp Awareness (Liar API Stale Data)

**Contract:** Edge Functions must validate source timestamps (if available) to prevent "data laundering" of stale-but-valid data.

**Why:**
- APIs may return `200 OK` with valid shape and sanity, but the data itself may be stale (e.g., 3-day-old data from a caching bug)
- Without source timestamp validation, stale data is "laundered" and marked as fresh (fetched_at = NOW())
- This causes permanent data corruption until TTL expires (data is "locked in" as fresh)

**What NOT to do:**
- ❌ Trust API responses that pass shape and sanity checks without checking source timestamps
- ❌ Ignore `source_timestamp_column` in `data_type_registry` if it's defined

**What to do instead:**
- ✅ If `source_timestamp_column` is defined in registry, compare new source timestamp with existing one
- ✅ If `new_source_timestamp <= old_source_timestamp`, reject the data and `fail_queue_job`
- ✅ This prevents "data laundering" and correctly triggers retry/dead-letter-queue logic

---

#### 15. Circuit Breaker Sensitivity (Retry Count Monitoring)

**Contract:** Circuit breaker must monitor `retry_count > 0`, not `status = 'failed'`, to correctly trip on temporary API outages.

**Why:**
- `fail_queue_job` sets `status = 'pending'` on first retry (not `failed`)
- Circuit breaker checking only `status = 'failed'` will never trip during temporary outages
- This causes "retry thundering herd" where the system continuously retries all jobs, slamming a known-down API

**What NOT to do:**
- ❌ Check only `status = 'failed'` in circuit breaker (misses temporary failures)
- ❌ Wait for jobs to reach `max_retries` before tripping circuit breaker

**What to do instead:**
- ✅ Check `retry_count > 0` in circuit breaker (any retry is a signal of recent failure)
- ✅ This correctly trips the circuit breaker on the second run (after first batch fails)
- ✅ Stops the thundering herd immediately, not after 3 retries

---

#### 16. Polite Partition Maintenance (Lock Timeout)

**Contract:** Partition maintenance (`maintain_queue_partitions`) must use `lock_timeout` and gracefully handle lock failures.

**Why:**
- `TRUNCATE` requires `ACCESS EXCLUSIVE` lock, which blocks all other operations (SELECT, INSERT, UPDATE, DELETE)
- Without lock timeout, maintenance job can create "stop-the-world" deadlock with processors
- This brings the entire queueing system to a halt

**What NOT to do:**
- ❌ Use `TRUNCATE` without `lock_timeout` (blocks all operations indefinitely)
- ❌ Allow maintenance job to wait for locks (causes system-wide deadlock)

**What to do instead:**
- ✅ Set `lock_timeout = '1s'` before `TRUNCATE` operations
- ✅ Use exception handling to gracefully catch `lock_not_available` errors
- ✅ If lock cannot be acquired, log warning and try again next week (prevents deadlock)
- ✅ Reset `lock_timeout` to default after operation

---

#### 17. Deadlock-Aware Error Handling (Processor)

**Contract:** The queue processor must explicitly handle PostgreSQL deadlock errors (`40P01`) and NOT mis-attribute them as job failures. Deadlocks must be reset immediately for fast retry, not wait for recovery.

**Why:**
- Deadlocks are transient database-level contention issues, NOT job failures
- Mis-attributing deadlocks as job failures pollutes `retry_count` and `error_message`
- This can send jobs to dead-letter queue for transient database issues
- **Day 180 Optimization:** If we catch the deadlock, we know it's safe to retry immediately
- Waiting 5 minutes for `recover_stuck_jobs` imposes unnecessary latency on users

**What NOT to do:**
- ❌ Treat `40P01` (deadlock detected) as a generic error and call `fail_queue_job`
- ❌ Increment `retry_count` for deadlocks (they are not job failures)
- ❌ Send deadlock-affected jobs to dead-letter queue
- ❌ Wait 5 minutes for `recover_stuck_jobs` to handle deadlocks (unnecessary delay)

**What to do instead:**
- ✅ Check for `error.code === '40P01'` or `error.message?.includes('deadlock detected')`
- ✅ If deadlock detected, call `reset_job_immediate()` to reset to `pending` immediately
- ✅ This turns a 5-minute delay into <1 second delay (picked up by next batch)
- ✅ `recover_stuck_jobs` remains as fallback for truly stuck jobs (processor crashes, etc.)
- ✅ This correctly identifies deadlocks as transient, non-job-related failures with fast recovery

---

#### 18. SECURITY DEFINER on On-Subscribe RPC (RLS Permissions)

**Contract:** The `check_and_queue_stale_batch` function must use `SECURITY DEFINER` to execute with admin permissions.

**Why:**
- Function is called by cron jobs (via `check_and_queue_stale_data_from_presence_v2`)
- Function needs to SELECT from data tables (e.g., `profiles`) and INSERT into `api_call_queue`
- Cron job role needs these permissions (RLS policies restrict access)
- Without `SECURITY DEFINER`, function will fail with `42501` (permission denied)
- This breaks the background staleness checker (primary staleness check)

**What NOT to do:**
- ❌ Create function without `SECURITY DEFINER` (will fail with permission denied)
- ❌ Grant users direct permissions to data tables (violates RLS security model)

**What to do instead:**
- ✅ Always use `SECURITY DEFINER` on `check_and_queue_stale_batch`
- ✅ Function executes with creator's (admin) permissions, enabling safe access to data tables
- ✅ Function logic itself provides security (identifier validation, etc.)

---

#### 19. Monofunction Processor Architecture (Connection Pool)

**Contract:** The queue processor must be a "monofunction" that imports logic directly, NOT a "conductor-worker" that invokes separate Edge Functions.

**Why:**
- "Conductor-worker" model (invoking 50 separate Edge Functions) exhausts database connection pool
- Each Edge Function invocation needs a database connection
- 50 concurrent invocations = 50 connections (out of 60 total), leaving 10 for entire application
- This brings the site to a halt and creates massive network overhead, cost, and cold-start latency

**What NOT to do:**
- ❌ Use `supabase.invokeEdgeFunction()` to invoke separate Edge Functions for each job
- ❌ Create a "conductor-worker" architecture with FaaS-to-FaaS invocations

**What to do instead:**
- ✅ Create `supabase/functions/lib/` directory with exportable TypeScript functions
- ✅ Move all `fetch-fmp-*` logic into simple, exportable functions
- ✅ Processor imports all logic from `/lib/` and uses `switch` statement
- ✅ This uses ONE connection pool, ZERO cold starts, ZERO FaaS-to-FaaS overhead

**Day 180 Optimization - Sharded Monofunctions:**
- **Risk:** At scale (50+ data types), bundle size may exceed deployment limits (~10-20MB) OR cause excessive cold start latency (>1s)
- **Solution:** If bundle size approaches 5MB OR cold start latency > 1s, implement "Sharded Monofunctions":
  - `queue-processor-core`: Handles high-volume types (profiles, quotes - 80% of volume)
  - `queue-processor-financials`: Handles heavy logic types (statements, earnings)
  - `queue-processor-router`: Routes batches to correct shard based on `data_type`
  - **Note:** For Day 1, monolith is fine. Monitor bundle size AND cold start latency, plan sharding if either threshold is exceeded

---

#### 20. Application Contract Linting (TypeScript Enforcement)

**Contract:** TypeScript contracts (Zod parsing, Content-Length tracking, source timestamp checking) must be enforced by ESLint rules in CI/CD.

**Why:**
- Database unit tests only enforce SQL contracts
- Critical data integrity rules are in TypeScript, not SQL
- Database tests will PASS even if TypeScript contracts are violated
- This creates an "unenforceable honor system" for application code

**What NOT to do:**
- ❌ Rely only on database unit tests (they don't test TypeScript)
- ❌ Use manual PR review to enforce TypeScript contracts (fallible)

**What to do instead:**
- ✅ Create custom ESLint rules for each TypeScript contract
- ✅ Rules check for required patterns (Zod imports, Content-Length usage, source timestamp checks)
- ✅ Run ESLint rules in CI/CD before PR merge
- ✅ This enforces TypeScript contracts with the same rigor as SQL contracts

---

#### 21. Aggressive Internal Timeouts (Slow API Protection)

**Contract:** All external API calls (e.g., `fetch`) inside worker functions **must** implement an aggressive internal timeout (e.g., 10 seconds) using `AbortController` or `Promise.race()`. A slow API response is a **failure**, not a "wait" state.

**Why:**
- API brownouts (slow responses, not failures) cause processor to timeout on every invocation
- Without internal timeouts, 50 jobs taking 60s each = 300s = function timeout = abandoned work
- This creates a catastrophic thrashing loop where no work is ever completed
- Circuit breaker won't trip (monitors failures, not timeouts)
- System enters infinite loop: processor times out → jobs reset → processor times out again

**What NOT to do:**
- ❌ Rely on function runtime timeout (5 minutes) to handle slow APIs
- ❌ Treat slow API responses as "wait" states (they are failures)
- ❌ Allow API calls to block for minutes without timeout

**What to do instead:**
- ✅ Implement aggressive internal timeout (10 seconds) using `AbortController`
- ✅ Timeout must be far more aggressive than function runtime timeout (10s vs 5min)
- ✅ Slow API response must `throw` an error to be handled by `fail_queue_job`
- ✅ This ensures slow jobs fail fast, get `retry_count = 1`, and trip circuit breaker
- ✅ Prevents throughput-starvation loop during API brownouts

---

#### 22. Schema Migration Atomicity (Integration Testing)

**Contract:** Any schema migration (DDL) on a data table (e.g., `profiles`) **must** be accompanied by an update to the corresponding Zod schema (Contract #5) and the `upsert` logic (Contract #19) *in the same atomic pull request*. This PR **must** also include a new/updated **integration test** that proves the end-to-end flow (API → Zod → `upsert`) functions correctly with the new schema.

**Why:**
- Schema migrations can silently break application code (NOT NULL columns without defaults)
- CI/CD tests logic in isolation (SQL tests, TypeScript lints), not integration
- A schema change can pass all tests but break production upserts
- This causes complete system failure (circuit breaker trips, all ingestion halts)
- Error is buried in `error_message` of failed jobs, making diagnosis difficult

**What NOT to do:**
- ❌ Add schema migration in one PR, update Zod schema "later" (becomes tech debt)
- ❌ Rely on isolated tests (SQL tests pass, TypeScript lints pass, but integration fails)
- ❌ Assume schema changes are "safe" if they don't break SQL functions

**What to do instead:**
- ✅ Schema migration + Zod schema update + upsert logic update = single atomic PR
- ✅ PR must include integration test (API → Zod → upsert) with new schema
- ✅ Integration test must fail if schema and application code are out of sync
- ✅ This makes "schema" and "application" a single, co-dependent unit of work
- ✅ Prevents silent breakage from schema drift

---

### Review Checklist for Pull Requests

Before merging any PR that touches queue, quota, or staleness logic:

- [ ] Does this change maintain atomic batch claiming?
- [ ] Does this change maintain `SKIP LOCKED` in recovery jobs?
- [ ] Does this change maintain advisory locks on ALL cron jobs (prevents cron pile-ups)?
- [ ] Does this change maintain exception handling for fault tolerance?
- [ ] Does this change maintain Edge Function validations (data_type, shape, AND sanity checks)?
- [ ] Does this change maintain predictive, buffered, producer-aware quota checks?
- [ ] Does this change maintain Content-Length header usage for quota tracking?
- [ ] Does this change maintain batch analytics (not hot-path writes)?
- [ ] Does this change maintain scheduled job priority as -1 (prevents priority inversion)?
- [ ] Does this change maintain TABLESAMPLE in queue_scheduled_refreshes (prevents scale performance failure)?
- [ ] Does this change maintain advisory locks on ALL cron jobs (prevents cron pile-ups)?
- [ ] Does this change maintain table partitioning by status (prevents Day 90 performance failure)?
- [ ] Does this change maintain partition maintenance policy (weekly truncation of completed/failed partitions)?
- [ ] Does this change maintain primary-only execution for staleness/queue functions (prevents read-replica issues)?
- [ ] Does this change maintain Symbol-by-Symbol query pattern in check_and_queue_stale_data_from_presence (prevents temp table thundering herd)?
- [ ] Does this change maintain no-default TTL in is_data_stale (prevents split-brain TTL bugs)?
- [ ] Does this change maintain source timestamp awareness in Edge Functions (prevents liar API stale data laundering)?
- [ ] Does this change maintain circuit breaker sensitivity (retry_count > 0, not status = 'failed')?
- [ ] Does this change maintain polite partition maintenance (lock_timeout, graceful lock failure handling)?
- [ ] Does this change maintain strict schema parsing in Edge Functions (prevents schema drift data corruption)?
- [ ] Does this change maintain deadlock-aware error handling in processor (prevents mis-attributed failures)?
- [ ] Does this change have corresponding database unit tests that enforce the contracts?
- [ ] Does this change maintain SECURITY DEFINER on check_and_queue_stale_batch (prevents RLS permission failures)?
- [ ] Does this change maintain monofunction processor architecture (prevents connection pool exhaustion)?
- [ ] Does this change have corresponding ESLint rules that enforce TypeScript contracts?
- [ ] Does this change maintain aggressive internal timeouts on API calls (prevents slow API throughput collapse)?
- [ ] Does this schema migration include Zod schema update and integration test in the same PR (prevents silent breakage)?

**If any checkbox is unchecked, the PR must be rejected or modified to maintain the contract.**

---

**This is the canonical architecture. All other documents should align with this plan.**

