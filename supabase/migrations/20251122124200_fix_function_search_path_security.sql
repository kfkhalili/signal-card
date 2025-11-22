-- Fix Function Search Path Security Issue
-- Adds SET search_path = public, extensions to all functions to prevent search path injection attacks
-- Addresses 28 functions flagged by Supabase Advisor

-- ============================================================================
-- Staleness Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_data_stale_v2(
  p_fetched_at TIMESTAMPTZ,
  p_ttl_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Got: %', p_ttl_minutes;
  END IF;

  -- Check if data is stale
  RETURN p_fetched_at IS NULL OR p_fetched_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_profile_stale_v2(
  p_modified_at TIMESTAMPTZ,
  p_ttl_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  -- CRITICAL: Validate TTL is positive
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 THEN
    RAISE EXCEPTION 'TTL must be positive. Got: %', p_ttl_minutes;
  END IF;

  -- Check if profile is stale
  RETURN p_modified_at IS NULL OR p_modified_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_quote_stale_v2(
  p_symbol TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_fetched_at TIMESTAMPTZ;
  v_ttl_minutes INTEGER;
BEGIN
  -- Get TTL from registry
  SELECT ttl_minutes INTO v_ttl_minutes
  FROM public.data_type_registry_v2
  WHERE data_type = 'quote';

  IF v_ttl_minutes IS NULL THEN
    RAISE EXCEPTION 'TTL not found for data_type: quote';
  END IF;

  -- Get fetched_at from live_quote_indicators
  SELECT fetched_at INTO v_fetched_at
  FROM public.live_quote_indicators
  WHERE symbol = p_symbol;

  -- Use generic staleness check
  RETURN public.is_data_stale_v2(v_fetched_at, v_ttl_minutes);
END;
$$;

-- ============================================================================
-- Queue Management Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_queue_batch_v2(
  p_batch_size INTEGER DEFAULT 50,
  p_max_priority INTEGER DEFAULT 1000
)
RETURNS TABLE(
  id UUID,
  symbol TEXT,
  data_type TEXT,
  status TEXT,
  priority INTEGER,
  retry_count INTEGER,
  max_retries INTEGER,
  created_at TIMESTAMPTZ,
  estimated_data_size_bytes BIGINT,
  job_metadata JSONB
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_batch_ids UUID[];
  quota_limit_bytes BIGINT;
  current_usage_bytes BIGINT;
  buffered_quota_bytes BIGINT;
  estimated_batch_size_bytes BIGINT;
BEGIN
  -- CRITICAL: Check quota BEFORE selecting batch
  -- Get quota limit
  quota_limit_bytes := (current_setting('app.settings.quota_limit_bytes', true))::BIGINT;

  -- Get current usage (rolling 30-day window)
  SELECT COALESCE(SUM(data_size_bytes), 0) INTO current_usage_bytes
  FROM public.api_data_usage_v2
  WHERE recorded_at >= NOW() - INTERVAL '30 days';

  -- Calculate buffered quota (95% safety buffer)
  buffered_quota_bytes := (quota_limit_bytes * 0.95)::BIGINT;

  -- CRITICAL: Predictive quota check - estimate batch size BEFORE selecting
  -- This prevents selecting a batch that would exceed quota
  SELECT COALESCE(SUM(batch_estimate.estimated_data_size_bytes), 0) INTO estimated_batch_size_bytes
  FROM (
    SELECT q.estimated_data_size_bytes
    FROM public.api_call_queue_v2 q
    WHERE q.status = 'pending'
      AND q.priority <= p_max_priority
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT p_batch_size
  ) batch_estimate;

  -- If estimated batch would exceed quota, return empty
  IF current_usage_bytes + estimated_batch_size_bytes >= buffered_quota_bytes THEN
    RAISE NOTICE 'Quota would be exceeded by batch. Current: %, Batch: %, Limit: %',
      current_usage_bytes, estimated_batch_size_bytes, buffered_quota_bytes;
    RETURN;
  END IF;

  -- CRITICAL: Atomic batch claiming
  -- 1. SELECT jobs with FOR UPDATE SKIP LOCKED (prevents race conditions)
  -- 2. UPDATE status to 'processing' in same transaction
  -- 3. RETURN the full job data
  WITH selected_jobs AS (
    SELECT id
    FROM public.api_call_queue_v2
    WHERE status = 'pending'
      AND priority <= p_max_priority
    ORDER BY priority DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  updated_jobs AS (
    UPDATE public.api_call_queue_v2
    SET status = 'processing',
        processed_at = NOW()
    FROM selected_jobs
    WHERE api_call_queue_v2.id = selected_jobs.id
    RETURNING api_call_queue_v2.id
  )
  SELECT array_agg(updated_jobs.id) INTO v_batch_ids
  FROM updated_jobs;

  -- Return full job data for selected jobs
  RETURN QUERY
  SELECT
    q.id,
    q.symbol,
    q.data_type,
    q.status,
    q.priority,
    q.retry_count,
    q.max_retries,
    q.created_at,
    q.estimated_data_size_bytes,
    q.job_metadata
  FROM public.api_call_queue_v2 q
  WHERE q.id = ANY(COALESCE(v_batch_ids, ARRAY[]::UUID[]))
  ORDER BY q.priority DESC, q.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_queue_job_v2(
  p_job_id UUID,
  p_data_size_bytes BIGINT,
  p_api_calls_made INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  job_data_type TEXT;
  expected_api_calls INTEGER;
BEGIN
  -- Get job data type
  SELECT data_type INTO job_data_type
  FROM public.api_call_queue_v2
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found', p_job_id;
    RETURN;
  END IF;

  -- Get expected API calls from registry (for validation/logging)
  SELECT api_calls_per_job INTO expected_api_calls
  FROM public.data_type_registry_v2
  WHERE data_type = job_data_type;

  -- Update job status
  UPDATE public.api_call_queue_v2
  SET
    status = 'completed',
    processed_at = NOW(),
    actual_data_size_bytes = p_data_size_bytes
  WHERE id = p_job_id
    AND status = 'processing'; -- Only update if still in processing state

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  -- CRITICAL: Track data usage for quota enforcement
  INSERT INTO public.api_data_usage_v2 (data_size_bytes, job_id)
  VALUES (p_data_size_bytes, p_job_id);

  -- CRITICAL: API calls were already reserved and counted in reserve_api_calls
  -- No need to increment again here - the counter is already correct
  -- The p_api_calls_made parameter is for logging/validation only

  -- OPTIMIZATION: Auto-correct estimated_data_size_bytes (statistical sampling)
  -- Use random() < 0.01 instead of COUNT(*) for O(1) performance
  -- Statistical sampling: ~1% of jobs (equivalent to every 100th job on average)
  IF random() < 0.01 THEN
    UPDATE public.data_type_registry_v2
    SET estimated_data_size_bytes = CASE
      -- CRITICAL: Handle zero start case - jump straight to actual on first run
      WHEN estimated_data_size_bytes = 0 THEN p_data_size_bytes
      -- Weighted moving average for subsequent updates (90% old, 10% new)
      ELSE (estimated_data_size_bytes * 0.9 + p_data_size_bytes * 0.1)::BIGINT
    END
    WHERE data_type = job_data_type;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_queue_job_v2(
  p_job_id UUID,
  p_error_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  current_retry_count INTEGER;
  current_max_retries INTEGER;
  job_priority INTEGER;
BEGIN
  SELECT retry_count, max_retries, priority
  INTO current_retry_count, current_max_retries, job_priority
  FROM public.api_call_queue_v2
  WHERE id = p_job_id
    AND status = 'processing';

  IF NOT FOUND THEN
    RAISE WARNING 'Job % not found or not in processing state', p_job_id;
    RETURN;
  END IF;

  -- CRITICAL: Special handling for FMP rate limit errors (429)
  -- These jobs should keep retrying indefinitely, not fail after max_retries
  IF p_error_message ILIKE '%Limit Reach%' THEN
    UPDATE public.api_call_queue_v2
    SET
      status = 'pending', -- Always reset to pending for rate limit errors
      retry_count = current_retry_count + 1,
      processed_at = NULL,
      error_message = p_error_message
    WHERE id = p_job_id;
  -- CRITICAL: Fail stale data errors immediately (no retries)
  -- When FMP returns data with the same timestamp as existing data,
  -- retrying is wasteful - FMP will keep returning the same stale data.
  -- This saves API calls and improves queue performance.
  ELSIF p_error_message ILIKE '%stale%' AND p_error_message ILIKE '%timestamp%' THEN
    UPDATE public.api_call_queue_v2
    SET
      status = 'failed',
      processed_at = NOW(),
      error_message = p_error_message || ' (Failed immediately - no retries for stale data)'
    WHERE id = p_job_id;
  ELSIF current_retry_count >= current_max_retries THEN
    -- If retries exhausted for other errors, mark as failed
    UPDATE public.api_call_queue_v2
    SET
      status = 'failed',
      processed_at = NOW(),
      error_message = p_error_message
    WHERE id = p_job_id;
  ELSE
    -- Otherwise, reset to pending for retry
    UPDATE public.api_call_queue_v2
    SET
      status = 'pending',
      retry_count = current_retry_count + 1,
      processed_at = NULL,
      error_message = p_error_message
    WHERE id = p_job_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_stuck_jobs_v2()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  stuck_count INTEGER;
  recovered_count INTEGER := 0;
  stuck_job RECORD;
BEGIN
  -- Find stuck jobs (processing for more than 10 minutes)
  -- CRITICAL: Uses FOR UPDATE SKIP LOCKED to prevent deadlocks with concurrent complete_queue_job calls
  FOR stuck_job IN
    SELECT id
    FROM public.api_call_queue_v2
    WHERE status = 'processing'
      AND processed_at < NOW() - INTERVAL '10 minutes'
    FOR UPDATE SKIP LOCKED
    LIMIT 100
  LOOP
    -- Reset to pending
    UPDATE public.api_call_queue_v2
    SET
      status = 'pending',
      processed_at = NULL
    WHERE id = stuck_job.id;

    recovered_count := recovered_count + 1;
  END LOOP;

  IF recovered_count > 0 THEN
    RAISE NOTICE 'Recovered % stuck jobs', recovered_count;
  END IF;

  RETURN recovered_count;
END;
$$;

-- ============================================================================
-- Processor Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invoke_processor_if_healthy_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  recent_failures INTEGER;
  lock_acquired BOOLEAN;
  invocation_result TEXT;
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(44) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'invoke_processor_if_healthy_v2 is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
    -- CRITICAL: Proactive self-healing - recover stuck jobs FIRST
    -- This runs every minute (as part of processor invoker) instead of every 5 minutes
    PERFORM recover_stuck_jobs_v2();

    -- CRITICAL: Circuit breaker - check for recent failures
    -- Monitor retry_count > 0 (not just status = 'failed')
    -- This correctly trips on temporary API outages
    SELECT COUNT(*) INTO recent_failures
    FROM public.api_call_queue_v2
    WHERE retry_count > 0
      AND created_at >= NOW() - INTERVAL '10 minutes';

    -- If too many recent failures, trip circuit breaker
    IF recent_failures > 50 THEN
      RAISE EXCEPTION 'Circuit breaker tripped: % recent failures in last 10 minutes', recent_failures;
    END IF;

    -- Invoke processor Edge Function
    -- CRITICAL: Wrap in exception handler to prevent silent invoker failure
    -- Uses invoke_edge_function_v2 helper (which uses pg_net extension)
    BEGIN
      -- Use the invoker function to call the Edge Function
      -- This will be available after invoke_edge_function_v2 migration runs
      -- Note: Migration order ensures invoke_edge_function_v2 exists before this is called
      SELECT invoke_edge_function_v2(
        'queue-processor-v2',
        '{}'::jsonb,
        300000 -- 5 minute timeout
      ) INTO invocation_result;

      RAISE NOTICE 'Processor invoked successfully';
    EXCEPTION
      WHEN OTHERS THEN
        -- CRITICAL: Raise WARNING (not EXCEPTION) to alert via observability
        -- This prevents the cron job from failing silently
        RAISE WARNING 'Failed to invoke processor: %', SQLERRM;
    END;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'invoke_processor_if_healthy_v2 failed: %', SQLERRM;
  END;

  -- Always release lock
  PERFORM pg_advisory_unlock(44);
END;
$$;

CREATE OR REPLACE FUNCTION public.invoke_processor_loop_v2(
  p_max_iterations INTEGER DEFAULT 5,
  p_iteration_delay_seconds INTEGER DEFAULT 12
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  iteration_count INTEGER := 0;
  jobs_processed INTEGER := 0;
BEGIN
  -- Loop up to max_iterations times
  WHILE iteration_count < p_max_iterations LOOP
    -- Invoke processor (which processes one batch and exits)
    PERFORM invoke_processor_if_healthy_v2();

    iteration_count := iteration_count + 1;

    -- Wait between iterations (allows other work to proceed)
    IF iteration_count < p_max_iterations THEN
      PERFORM pg_sleep(p_iteration_delay_seconds);
    END IF;
  END LOOP;

  RETURN iteration_count;
END;
$$;

-- ============================================================================
-- Quota Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_quota_exceeded_v2(
  p_safety_buffer NUMERIC DEFAULT 0.95
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  quota_limit_bytes BIGINT;
  current_usage_bytes BIGINT;
  buffered_quota_bytes BIGINT;
BEGIN
  -- Get quota limit from config (20 GB)
  quota_limit_bytes := (current_setting('app.settings.quota_limit_bytes', true))::BIGINT;

  -- Calculate current usage (rolling 30-day window)
  SELECT COALESCE(SUM(data_size_bytes), 0) INTO current_usage_bytes
  FROM public.api_data_usage_v2
  WHERE recorded_at >= NOW() - INTERVAL '30 days';

  -- Calculate buffered quota (safety buffer to prevent overshoot)
  buffered_quota_bytes := (quota_limit_bytes * p_safety_buffer)::BIGINT;

  -- Return true if usage exceeds buffered quota
  RETURN current_usage_bytes >= buffered_quota_bytes;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_api_calls(
  p_calls INTEGER
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.api_call_counter (date, calls_made)
  VALUES (CURRENT_DATE, p_calls)
  ON CONFLICT (date) DO UPDATE
  SET calls_made = api_call_counter.calls_made + p_calls;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_api_calls(
  p_calls INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  current_calls INTEGER;
  max_calls INTEGER := 300; -- 300 calls per minute limit
BEGIN
  -- Get current calls for today
  SELECT COALESCE(calls_made, 0) INTO current_calls
  FROM public.api_call_counter
  WHERE date = CURRENT_DATE;

  -- Check if we can reserve the calls
  IF current_calls + p_calls > max_calls THEN
    RETURN FALSE;
  END IF;

  -- Reserve the calls
  INSERT INTO public.api_call_counter (date, calls_made)
  VALUES (CURRENT_DATE, current_calls + p_calls)
  ON CONFLICT (date) DO UPDATE
  SET calls_made = api_call_counter.calls_made + p_calls;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_api_calls_reservation(
  p_calls INTEGER
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  -- Release reserved calls (subtract from counter)
  UPDATE public.api_call_counter
  SET calls_made = GREATEST(0, calls_made - p_calls)
  WHERE date = CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.should_stop_processing_api_calls()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  current_calls INTEGER;
  max_calls INTEGER := 300; -- 300 calls per minute limit
BEGIN
  -- Get current calls for today
  SELECT COALESCE(calls_made, 0) INTO current_calls
  FROM public.api_call_counter
  WHERE date = CURRENT_DATE;

  -- Stop if we're at or near the limit
  RETURN current_calls >= max_calls;
END;
$$;

-- ============================================================================
-- Staleness Checker Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_queue_stale_batch_v2(
  p_symbol TEXT,
  p_data_types TEXT[],
  p_priority INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  reg_row RECORD;
  is_stale BOOLEAN;
  sql_text TEXT;
  exchange_is_open BOOLEAN;
  data_exists BOOLEAN;
BEGIN
  -- Loop through the input array (max 5-10 items, very fast)
  FOR reg_row IN
    SELECT * FROM public.data_type_registry_v2
    WHERE data_type = ANY(p_data_types)
      AND refresh_strategy = 'on-demand'
  LOOP
    -- SECURITY: Validate identifiers before use (defense in depth)
    IF NOT is_valid_identifier(reg_row.table_name) OR
       NOT is_valid_identifier(reg_row.symbol_column) OR
       NOT is_valid_identifier(reg_row.timestamp_column) OR
       NOT is_valid_identifier(reg_row.staleness_function)
    THEN
      RAISE EXCEPTION 'Invalid identifier found in data_type_registry_v2: %', reg_row.data_type;
    END IF;

    -- CRITICAL: For quote data type, check if data exists first
    -- If data doesn't exist, always create a job (even if exchange is closed)
    -- If data exists, check exchange status before creating a job
    IF reg_row.data_type = 'quote' THEN
      -- Check if quote data exists
      SELECT EXISTS(
        SELECT 1 FROM public.live_quote_indicators WHERE symbol = p_symbol
      ) INTO data_exists;

      -- If data doesn't exist, always queue (even if exchange is closed)
      IF NOT data_exists THEN
        PERFORM queue_refresh_if_not_exists_v2(
          p_symbol := p_symbol,
          p_data_type := reg_row.data_type,
          p_priority := p_priority
        );
        CONTINUE; -- Skip to next data type
      END IF;

      -- If data exists, check exchange status
      SELECT is_exchange_open_for_symbol_v2(p_symbol) INTO exchange_is_open;

      -- Only queue if exchange is open
      IF NOT exchange_is_open THEN
        CONTINUE; -- Skip to next data type
      END IF;
    END IF;

    -- Build dynamic SQL for staleness check
    sql_text := format(
      'SELECT %I(%I, %L)',
      reg_row.staleness_function,
      reg_row.timestamp_column,
      reg_row.ttl_minutes
    );

    -- Execute staleness check
    EXECUTE format(
      'SELECT %I(%I.%I, %L)',
      reg_row.staleness_function,
      reg_row.table_name,
      reg_row.timestamp_column,
      reg_row.ttl_minutes
    ) INTO is_stale
    USING p_symbol;

    -- If stale, queue refresh
    IF is_stale THEN
      PERFORM queue_refresh_if_not_exists_v2(
        p_symbol := p_symbol,
        p_data_type := reg_row.data_type,
        p_priority := p_priority
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_queue_stale_data_from_presence_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  lock_acquired BOOLEAN;
  subscription RECORD;
  symbol TEXT;
  data_types TEXT[];
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(42) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'check_and_queue_stale_data_from_presence_v2 is already running. Exiting.';
    RETURN;
  END IF;

  BEGIN
    -- Get active subscriptions from realtime.subscription
    FOR subscription IN
      SELECT * FROM get_active_subscriptions_from_realtime()
    LOOP
      -- Extract symbol and data types from subscription
      symbol := subscription.symbol;
      data_types := subscription.data_types;

      -- Check staleness and queue jobs
      PERFORM check_and_queue_stale_batch_v2(
        p_symbol := symbol,
        p_data_types := data_types,
        p_priority := 1 -- High priority for active subscriptions
      );
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'check_and_queue_stale_data_from_presence_v2 failed: %', SQLERRM;
  END;

  -- Always release lock
  PERFORM pg_advisory_unlock(42);
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_refresh_if_not_exists_v2(
  p_symbol TEXT,
  p_data_type TEXT,
  p_priority INTEGER
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  registry_row RECORD;
BEGIN
  -- Get registry entry
  SELECT * INTO registry_row
  FROM public.data_type_registry_v2
  WHERE data_type = p_data_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data type not found in registry: %', p_data_type;
  END IF;

  -- Only insert if job doesn't already exist
  INSERT INTO public.api_call_queue_v2 (
    symbol,
    data_type,
    status,
    priority,
    estimated_data_size_bytes,
    max_retries
  )
  SELECT
    p_symbol,
    p_data_type,
    'pending',
    p_priority,
    registry_row.estimated_data_size_bytes,
    registry_row.max_retries
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.api_call_queue_v2
    WHERE symbol = p_symbol
      AND data_type = p_data_type
      AND status IN ('pending', 'processing')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_scheduled_refreshes_v2()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  lock_acquired BOOLEAN;
  jobs_created INTEGER := 0;
  reg_row RECORD;
  symbol_row RECORD;
BEGIN
  -- CRITICAL: Prevent cron job self-contention
  SELECT pg_try_advisory_lock(43) INTO lock_acquired;

  IF NOT lock_acquired THEN
    RAISE NOTICE 'queue_scheduled_refreshes_v2 is already running. Exiting.';
    RETURN 0;
  END IF;

  BEGIN
    -- Get all data types with scheduled refresh strategy
    FOR reg_row IN
      SELECT * FROM public.data_type_registry_v2
      WHERE refresh_strategy = 'scheduled'
    LOOP
      -- Sample 10% of symbols for scheduled refresh
      FOR symbol_row IN
        SELECT symbol FROM public.listed_symbols
        TABLESAMPLE SYSTEM (10)
        LIMIT 100
      LOOP
        -- CRITICAL: Hardcode priority to -1 (not from registry)
        -- This ensures scheduled refreshes never interfere with on-demand refreshes
        INSERT INTO public.api_call_queue_v2 (
          symbol,
          data_type,
          status,
          priority,
          estimated_data_size_bytes,
          max_retries
        )
        VALUES (
          symbol_row.symbol,
          reg_row.data_type,
          'pending',
          -1, -- CRITICAL: Hardcoded priority, not from registry
          reg_row.estimated_data_size_bytes,
          reg_row.max_retries
        )
        ON CONFLICT DO NOTHING;

        jobs_created := jobs_created + 1;
      END LOOP;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'queue_scheduled_refreshes_v2 failed: %', SQLERRM;
  END;

  -- Always release lock
  PERFORM pg_advisory_unlock(43);

  RETURN jobs_created;
END;
$$;

-- ============================================================================
-- Realtime Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_realtime_subscription_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_symbol TEXT;
  v_data_type TEXT;
  v_priority INTEGER := 1; -- High priority for user-facing subscriptions
  v_data_types TEXT[];
BEGIN
  -- Extract symbol from filters using the same logic as get_active_subscriptions_from_realtime
  -- Format: filters::text contains 'symbol,eq,AAPL' or similar
  v_symbol := SUBSTRING(NEW.filters::text FROM 'symbol,eq,([^)]+)');

  -- If we couldn't extract a symbol, skip (might be a global subscription)
  IF v_symbol IS NULL OR v_symbol = '' THEN
    RETURN NEW;
  END IF;

  -- Only process if filters contain symbol filter (same check as get_active_subscriptions_from_realtime)
  IF NEW.filters::text NOT LIKE '%symbol,eq,%' THEN
    RETURN NEW;
  END IF;

  -- Map entity (table name) to data_type (same mapping as get_active_subscriptions_from_realtime)
  CASE NEW.entity::text
    WHEN 'profiles' THEN v_data_type := 'profile';
    WHEN 'live_quote_indicators' THEN v_data_type := 'quote';
    WHEN 'financial_statements' THEN v_data_type := 'financial-statements';
    WHEN 'ratios_ttm' THEN v_data_type := 'ratios-ttm';
    WHEN 'dividend_history' THEN v_data_type := 'dividend-history';
    WHEN 'revenue_product_segmentation' THEN v_data_type := 'revenue-product-segmentation';
    WHEN 'grades_historical' THEN v_data_type := 'grades-historical';
    WHEN 'exchange_variants' THEN v_data_type := 'exchange-variants';
    ELSE
      -- Not a tracked entity, skip
      RETURN NEW;
  END CASE;

  -- Build data_types array (single element for now)
  v_data_types := ARRAY[v_data_type];

  -- Call staleness checker (wrapped in exception handler to prevent trigger failure)
  BEGIN
    PERFORM public.check_and_queue_stale_batch_v2(
      p_symbol := v_symbol,
      p_data_types := v_data_types,
      p_priority := v_priority
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the trigger (subscription should still be created)
      RAISE WARNING 'Failed to check staleness for subscription % (symbol: %, data_type: %): %',
        NEW.id, v_symbol, v_data_type, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Drop old version first if it exists (different return type)
DROP FUNCTION IF EXISTS public.get_active_subscriptions_from_realtime();

CREATE OR REPLACE FUNCTION public.get_active_subscriptions_from_realtime()
RETURNS TABLE(
  symbol TEXT,
  data_types TEXT[]
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  subscription RECORD;
  result_symbol TEXT;
  result_data_types TEXT[];
  mapped_data_type TEXT;
BEGIN
  -- Query realtime.subscription table
  FOR subscription IN
    SELECT entity, filters
    FROM realtime.subscription
    WHERE filters::text LIKE '%symbol,eq,%'
  LOOP
    -- Extract symbol from filters
    result_symbol := SUBSTRING(subscription.filters::text FROM 'symbol,eq,([^)]+)');

    -- Map entity to data_type
    CASE subscription.entity::text
      WHEN 'profiles' THEN mapped_data_type := 'profile';
      WHEN 'live_quote_indicators' THEN mapped_data_type := 'quote';
      WHEN 'financial_statements' THEN mapped_data_type := 'financial-statements';
      WHEN 'ratios_ttm' THEN mapped_data_type := 'ratios-ttm';
      WHEN 'dividend_history' THEN mapped_data_type := 'dividend-history';
      WHEN 'revenue_product_segmentation' THEN mapped_data_type := 'revenue-product-segmentation';
      WHEN 'grades_historical' THEN mapped_data_type := 'grades-historical';
      WHEN 'exchange_variants' THEN mapped_data_type := 'exchange-variants';
      ELSE
        mapped_data_type := NULL;
    END CASE;

    -- Only return if we have a valid data type
    IF mapped_data_type IS NOT NULL THEN
      result_data_types := ARRAY[mapped_data_type];
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- ============================================================================
-- Utility Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_identifier(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
BEGIN
  -- Check if identifier matches PostgreSQL identifier pattern
  -- Must start with letter or underscore, followed by letters, digits, or underscores
  RETURN p_identifier ~ '^[a-zA-Z_][a-zA-Z0-9_]*$';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_exchange_open_for_symbol_v2(p_symbol TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_exchange TEXT;
  v_is_open BOOLEAN;
BEGIN
  -- Get exchange from profiles table
  SELECT exchange INTO v_exchange
  FROM public.profiles
  WHERE symbol = p_symbol;

  IF v_exchange IS NULL THEN
    -- If exchange not found, assume open (fail-safe)
    RETURN TRUE;
  END IF;

  -- Check if exchange is open
  SELECT is_open INTO v_is_open
  FROM public.exchange_market_status
  WHERE exchange = v_exchange
    AND date = CURRENT_DATE;

  -- If status not found, assume open (fail-safe)
  RETURN COALESCE(v_is_open, TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.maintain_queue_partitions_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  partition_date DATE;
BEGIN
  -- CRITICAL: Set lock_timeout to prevent stop-the-world deadlocks
  SET lock_timeout = '1s';

  BEGIN
    -- Get oldest partition date
    SELECT MIN(created_at::DATE) INTO partition_date
    FROM public.api_call_queue_v2_completed
    WHERE created_at < NOW() - INTERVAL '30 days';

    -- If partition exists and is old enough, truncate it
    IF partition_date IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.api_call_queue_v2_%s', to_char(partition_date, 'YYYY_MM_DD'));
    END IF;
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE NOTICE 'Could not acquire lock for partition maintenance. Skipping.';
    WHEN OTHERS THEN
      RAISE WARNING 'Partition maintenance failed: %', SQLERRM;
  END;

  -- Reset lock_timeout
  SET lock_timeout = DEFAULT;
END;
$$;

-- ============================================================================
-- Profile Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_profile(profile_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (
    symbol,
    price,
    beta,
    average_volume,
    market_cap,
    last_dividend,
    range,
    change,
    change_percentage,
    company_name,
    display_company_name, -- Set on initial insert
    currency,
    cik,
    isin,
    cusip,
    exchange,
    exchange_full_name,
    industry,
    website,
    description,
    ceo,
    sector,
    country,
    full_time_employees,
    phone,
    address,
    city,
    state,
    zip,
    image,
    ipo_date,
    default_image,
    is_etf,
    is_actively_trading,
    is_adr,
    is_fund,
    volume
  )
  VALUES (
    profile_data->>'symbol',
    (profile_data->>'price')::double precision,
    (profile_data->>'beta')::double precision,
    (profile_data->>'average_volume')::bigint,
    (profile_data->>'market_cap')::bigint,
    (profile_data->>'last_dividend')::double precision,
    profile_data->>'range',
    (profile_data->>'change')::double precision,
    (profile_data->>'change_percentage')::double precision,
    profile_data->>'company_name',
    profile_data->>'company_name', -- Default display_company_name to company_name
    profile_data->>'currency',
    profile_data->>'cik',
    profile_data->>'isin',
    profile_data->>'cusip',
    profile_data->>'exchange',
    profile_data->>'exchange_full_name',
    profile_data->>'industry',
    profile_data->>'website',
    profile_data->>'description',
    profile_data->>'ceo',
    profile_data->>'sector',
    profile_data->>'country',
    (profile_data->>'full_time_employees')::bigint,
    profile_data->>'phone',
    profile_data->>'address',
    profile_data->>'city',
    profile_data->>'state',
    profile_data->>'zip',
    profile_data->>'image',
    (profile_data->>'ipo_date')::date,
    (profile_data->>'default_image')::boolean,
    (profile_data->>'is_etf')::boolean,
    (profile_data->>'is_actively_trading')::boolean,
    (profile_data->>'is_adr')::boolean,
    (profile_data->>'is_fund')::boolean,
    (profile_data->>'volume')::bigint
  )
  ON CONFLICT (symbol) DO UPDATE
  SET
    price = EXCLUDED.price,
    beta = EXCLUDED.beta,
    average_volume = EXCLUDED.average_volume,
    market_cap = EXCLUDED.market_cap,
    last_dividend = EXCLUDED.last_dividend,
    range = EXCLUDED.range,
    change = EXCLUDED.change,
    change_percentage = EXCLUDED.change_percentage,
    company_name = EXCLUDED.company_name,
    -- NOTE: display_company_name is intentionally omitted from the UPDATE
    currency = EXCLUDED.currency,
    cik = EXCLUDED.cik,
    isin = EXCLUDED.isin,
    cusip = EXCLUDED.cusip,
    exchange = EXCLUDED.exchange,
    exchange_full_name = EXCLUDED.exchange_full_name,
    industry = EXCLUDED.industry,
    website = EXCLUDED.website,
    description = EXCLUDED.description,
    ceo = EXCLUDED.ceo,
    sector = EXCLUDED.sector,
    country = EXCLUDED.country,
    full_time_employees = EXCLUDED.full_time_employees,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip = EXCLUDED.zip,
    image = EXCLUDED.image,
    ipo_date = EXCLUDED.ipo_date,
    default_image = EXCLUDED.default_image,
    is_etf = EXCLUDED.is_etf,
    is_actively_trading = EXCLUDED.is_actively_trading,
    is_adr = EXCLUDED.is_adr,
    is_fund = EXCLUDED.is_fund,
    volume = EXCLUDED.volume,
    modified_at = NOW();
END;
$$;

-- ============================================================================
-- Feature Flag Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_flag_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  flag_value BOOLEAN;
BEGIN
  SELECT enabled INTO flag_value
  FROM public.feature_flags
  WHERE flag_name = p_flag_name;

  RETURN COALESCE(flag_value, FALSE);
END;
$$;

-- ============================================================================
-- Trigger Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ui_job_max_retries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  -- If priority is 1000 (UI job), set max_retries to 5
  IF NEW.priority = 1000 AND NEW.max_retries < 5 THEN
    NEW.max_retries := 5;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Monitoring Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_queue_success_rate_alert()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  success_rate NUMERIC;
  total_jobs BIGINT;
  failed_jobs BIGINT;
BEGIN
  -- Calculate success rate for last 24 hours
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0) AS rate,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed
  INTO success_rate, total_jobs, failed_jobs
  FROM public.api_call_queue_v2
  WHERE created_at >= NOW() - INTERVAL '24 hours';

  RETURN jsonb_build_object(
    'success_rate', COALESCE(success_rate, 100),
    'total_jobs', total_jobs,
    'failed_jobs', failed_jobs,
    'alert', CASE WHEN success_rate < 90 THEN true ELSE false END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_quota_usage_alert()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  usage_percentage NUMERIC;
  quota_limit_bytes BIGINT;
  current_usage_bytes BIGINT;
BEGIN
  -- Get quota usage
  SELECT
    quota_limit_bytes,
    current_usage_bytes,
    ROUND((current_usage_bytes::NUMERIC / quota_limit_bytes::NUMERIC * 100), 2) AS usage_pct
  INTO quota_limit_bytes, current_usage_bytes, usage_percentage
  FROM public.get_quota_usage_v2();

  RETURN jsonb_build_object(
    'quota_limit_bytes', quota_limit_bytes,
    'current_usage_bytes', current_usage_bytes,
    'usage_percentage', COALESCE(usage_percentage, 0),
    'alert', CASE WHEN usage_percentage > 80 THEN true ELSE false END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_stuck_jobs_alert()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  stuck_count BIGINT;
BEGIN
  -- Count stuck jobs (processing for more than 10 minutes)
  SELECT COUNT(*) INTO stuck_count
  FROM public.api_call_queue_v2
  WHERE status = 'processing'
    AND processed_at < NOW() - INTERVAL '10 minutes';

  RETURN jsonb_build_object(
    'stuck_jobs', stuck_count,
    'alert', CASE WHEN stuck_count > 10 THEN true ELSE false END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_cron_job_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  health_status JSONB;
BEGIN
  -- Check if cron jobs are running
  SELECT jsonb_build_object(
    'staleness_checker', EXISTS(
      SELECT 1 FROM cron.job WHERE jobname = 'check_and_queue_stale_data_from_presence_v2'
    ),
    'scheduled_refreshes', EXISTS(
      SELECT 1 FROM cron.job WHERE jobname = 'queue_scheduled_refreshes_v2'
    ),
    'processor', EXISTS(
      SELECT 1 FROM cron.job WHERE jobname = 'invoke_processor_if_healthy_v2'
    )
  ) INTO health_status;

  RETURN health_status;
END;
$$;

-- ============================================================================
-- Baseline Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_baseline_metric(
  metric_name TEXT,
  metric_value NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.migration_baseline (metric_name, metric_value, recorded_at)
  VALUES (metric_name, metric_value, NOW())
  ON CONFLICT (metric_name) DO UPDATE
  SET metric_value = EXCLUDED.metric_value,
      recorded_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_system_baseline()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  -- Capture various system metrics
  PERFORM record_baseline_metric('queue_size', (SELECT COUNT(*) FROM public.api_call_queue_v2 WHERE status = 'pending'));
  PERFORM record_baseline_metric('quota_usage', (SELECT usage_percentage FROM public.get_quota_usage_v2()));
  -- Add more metrics as needed
END;
$$;

-- ============================================================================
-- Edge Function Invoker
-- ============================================================================

CREATE OR REPLACE FUNCTION invoke_edge_function_v2(
  p_function_name TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_timeout_milliseconds INTEGER DEFAULT 300000 -- 5 minutes default
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  http_response RECORD;
  response_body JSONB;
BEGIN
  -- Get Supabase URL and service role key from vault (matches existing cron job pattern)
  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key';

  IF supabase_url IS NULL THEN
    RAISE EXCEPTION 'Supabase URL not found in vault. Ensure vault.decrypted_secrets contains a secret named ''project_url''';
  END IF;

  IF service_role_key IS NULL THEN
    RAISE EXCEPTION 'Service role key not found in vault. Ensure vault.decrypted_secrets contains a secret named ''supabase_service_role_key''';
  END IF;

  -- Invoke Edge Function via HTTP POST
  -- CRITICAL: Use pg_net extension (must be enabled)
  SELECT * INTO http_response
  FROM net.http_post(
    url := supabase_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    )::jsonb,
    body := p_payload::jsonb,
    timeout_milliseconds := p_timeout_milliseconds
  );

  -- Parse response body
  IF http_response.status_code = 200 THEN
    response_body := http_response.content::jsonb;
  ELSE
    RAISE EXCEPTION 'Edge function % returned status %: %', p_function_name, http_response.status_code, http_response.content;
  END IF;

  RETURN response_body;
END;
$$;

-- ============================================================================
-- Leaderboard Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard()
RETURNS TABLE(
  username TEXT,
  total_score NUMERIC,
  rank INTEGER
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.username,
    COALESCE(SUM(ws.score), 0) AS total_score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ws.score), 0) DESC) AS rank
  FROM public.user_profiles up
  LEFT JOIN public.workspace_scores ws ON up.id = ws.user_id
  GROUP BY up.id, up.username
  ORDER BY total_score DESC
  LIMIT 100;
END;
$$;

COMMENT ON FUNCTION public.get_weighted_leaderboard IS 'Returns weighted leaderboard of users by workspace scores.';

