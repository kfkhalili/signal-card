-- Restore scheduled refreshes as the baseline for durable Compass inputs.
--
-- The quota incident required temporarily disabling the scheduler. It did not
-- change the desired steady state: every active listed symbol should receive
-- TTL-driven background refreshes, while presence remains a priority overlay.
-- Quotes stay on demand because a one-minute full-universe quote sweep would
-- waste bandwidth without improving the durable recommendation inputs.

BEGIN;

-- A durable data type may need both scheduled coverage and an on-demand
-- priority boost. Model that explicitly instead of making the two mechanisms
-- mutually exclusive.
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  FOR v_constraint_name IN
    SELECT constraint_row.conname
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid =
          'public.data_type_registry_v2'::regclass
      AND constraint_row.contype = 'c'
      AND pg_get_constraintdef(constraint_row.oid)
          ILIKE '%refresh_strategy%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.data_type_registry_v2 DROP CONSTRAINT %I',
      v_constraint_name
    );
  END LOOP;
END;
$$;

ALTER TABLE public.data_type_registry_v2
  ADD CONSTRAINT data_type_registry_v2_refresh_strategy_v2_check
  CHECK (refresh_strategy IN ('on-demand', 'scheduled', 'hybrid'));

COMMENT ON COLUMN public.data_type_registry_v2.refresh_strategy IS
  'Refresh mode: on-demand, scheduled, or hybrid. Hybrid uses scheduled TTL coverage with presence-driven priority boosts.';

CREATE INDEX IF NOT EXISTS
  idx_data_type_registry_v2_refresh_strategy_hybrid
  ON public.data_type_registry_v2(refresh_strategy)
  WHERE refresh_strategy = 'hybrid';

-- These are the durable inputs used directly by Compass ranking, plus the
-- low-bandwidth insider statistics companion. Profile data also supplies the
-- exchange/industry filters. Financial statements move from 30 days to one
-- week so the weekly recommendation cannot be based on a month-old fetch.
UPDATE public.data_type_registry_v2
SET
  refresh_strategy = 'hybrid',
  default_ttl_minutes = CASE data_type
    WHEN 'financial-statements' THEN 10080
    ELSE default_ttl_minutes
  END,
  updated_at = now()
WHERE data_type IN (
  'profile',
  'financial-statements',
  'ratios-ttm',
  'insider-transactions',
  'insider-trading-statistics'
);

-- SEC outstanding-share jobs are already queued by the profile upsert trigger.
-- Scheduling the same type across the full universe would consume processor
-- capacity twice without spending or saving any FMP quota.
UPDATE public.data_type_registry_v2
SET
  refresh_strategy = 'on-demand',
  updated_at = now()
WHERE data_type = 'sec-outstanding-shares';

-- Scheduled work must stay below every demand-driven priority, including the
-- special financial-statements boost.
CREATE OR REPLACE FUNCTION public.queue_refresh_if_not_exists_v2(
  p_symbol text,
  p_data_type text,
  p_priority integer,
  p_estimated_size_bytes bigint DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  job_id uuid;
  existing_job_id uuid;
  final_priority integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_symbol || chr(31) || p_data_type, 0)
  );

  IF p_data_type = 'financial-statements'
     AND p_priority >= 0
     AND p_priority < 1000
  THEN
    final_priority := 500;
  ELSE
    final_priority := p_priority;
  END IF;

  SELECT queue.id
  INTO existing_job_id
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.symbol = p_symbol
    AND queue.data_type = p_data_type
    AND queue.status IN ('pending', 'processing')
  ORDER BY queue.created_at
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    UPDATE public.api_call_queue_v2 AS queue
    SET priority = GREATEST(queue.priority, final_priority)
    WHERE queue.id = existing_job_id
      AND queue.status IN ('pending', 'processing');
    job_id := existing_job_id;
  ELSE
    INSERT INTO public.api_call_queue_v2 (
      symbol,
      data_type,
      status,
      priority,
      estimated_data_size_bytes
    )
    VALUES (
      p_symbol,
      p_data_type,
      'pending',
      final_priority,
      p_estimated_size_bytes
    )
    RETURNING api_call_queue_v2.id INTO job_id;
  END IF;

  RETURN job_id;
END;
$$;

-- Presence is an accelerator for both on-demand and hybrid types. It is not
-- the source of scheduled coverage.
CREATE OR REPLACE FUNCTION public.check_and_queue_stale_data_from_presence_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  reg_row RECORD;
  symbol_row RECORD;
  sql_text TEXT;
  lock_acquired BOOLEAN;
  start_time TIMESTAMPTZ := clock_timestamp();
  max_duration_seconds INTEGER := 50;
  symbols_processed INTEGER := 0;
  max_symbols_per_run INTEGER := 1000;
  exchange_is_open BOOLEAN;
  data_exists BOOLEAN;
  source_fetched_at TIMESTAMPTZ;
  effective_fetched_at TIMESTAMPTZ;
  is_stale BOOLEAN;
  is_super_stale BOOLEAN;
  user_count INTEGER;
  queue_priority INTEGER;
BEGIN
  SELECT pg_try_advisory_lock(42) INTO lock_acquired;
  IF NOT lock_acquired THEN
    RETURN;
  END IF;

  BEGIN
    IF public.is_quota_exceeded_v2() THEN
      PERFORM pg_advisory_unlock(42);
      RETURN;
    END IF;

    FOR symbol_row IN
      SELECT DISTINCT symbol
      FROM public.get_active_subscriptions_from_realtime()
      WHERE symbol IS NOT NULL
      LIMIT max_symbols_per_run
    LOOP
      IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time))
         > max_duration_seconds
      THEN
        PERFORM pg_advisory_unlock(42);
        RETURN;
      END IF;

      symbols_processed := symbols_processed + 1;

      FOR reg_row IN
        SELECT DISTINCT registry.*
        FROM public.data_type_registry_v2 registry
        INNER JOIN public.get_active_subscriptions_from_realtime() subscription
          ON subscription.symbol = symbol_row.symbol
         AND subscription.data_type = registry.data_type
        WHERE registry.refresh_strategy IN ('on-demand', 'hybrid')
      LOOP
        IF EXTRACT(EPOCH FROM (clock_timestamp() - start_time))
           > max_duration_seconds
        THEN
          PERFORM pg_advisory_unlock(42);
          RETURN;
        END IF;

        IF NOT public.is_valid_identifier(reg_row.table_name)
           OR NOT public.is_valid_identifier(reg_row.symbol_column)
           OR NOT public.is_valid_identifier(reg_row.timestamp_column)
           OR NOT public.is_valid_identifier(reg_row.staleness_function)
        THEN
          CONTINUE;
        END IF;

        BEGIN
          sql_text := format(
            'SELECT COUNT(*) > 0, MAX(t.%I) FROM %I t WHERE t.%I = %L',
            reg_row.timestamp_column,
            reg_row.table_name,
            reg_row.symbol_column,
            symbol_row.symbol
          );
          EXECUTE sql_text INTO data_exists, source_fetched_at;

          IF reg_row.data_type = 'quote' AND data_exists THEN
            SELECT public.is_exchange_open_for_symbol_v2(
              symbol_row.symbol,
              'quote'
            )
            INTO exchange_is_open;

            IF NOT exchange_is_open THEN
              sql_text := format(
                'SELECT %I($1, 1440)',
                reg_row.staleness_function
              );
              EXECUTE sql_text USING source_fetched_at INTO is_super_stale;

              IF NOT COALESCE(is_super_stale, TRUE) THEN
                CONTINUE;
              END IF;
            END IF;
          END IF;

          effective_fetched_at :=
            public.effective_data_fetch_timestamp_v2(
              symbol_row.symbol,
              reg_row.data_type,
              source_fetched_at
            );

          sql_text := format(
            'SELECT %I($1, $2)',
            reg_row.staleness_function
          );
          EXECUTE sql_text
            USING effective_fetched_at, reg_row.default_ttl_minutes
            INTO is_stale;

          IF COALESCE(is_stale, TRUE) THEN
            SELECT COUNT(DISTINCT subscription.user_id)::INTEGER
            INTO user_count
            FROM public.get_active_subscriptions_from_realtime() subscription
            WHERE subscription.symbol = symbol_row.symbol
              AND subscription.data_type = reg_row.data_type;

            queue_priority := CASE
              WHEN reg_row.data_type = 'financial-statements'
                   AND user_count < 1000
                THEN 500
              ELSE GREATEST(user_count, 1)
            END;

            PERFORM public.queue_refresh_if_not_exists_v2(
              symbol_row.symbol,
              reg_row.data_type,
              queue_priority,
              reg_row.estimated_data_size_bytes
            );
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING
              'Presence staleness check failed for symbol % and type %: %',
              symbol_row.symbol,
              reg_row.data_type,
              SQLERRM;
            CONTINUE;
        END;
      END LOOP;
    END LOOP;

    INSERT INTO public.cron_health_logs (jobname, last_run)
    VALUES ('check-stale-data-v2', NOW())
    ON CONFLICT (jobname) DO UPDATE
    SET last_run = EXCLUDED.last_run;

    PERFORM pg_advisory_unlock(42);
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(42);
      RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION public.check_and_queue_stale_data_from_presence_v2() IS
  'Presence-driven priority overlay for on-demand and hybrid data. Scheduled coverage is handled independently by queue_scheduled_refreshes_v2.';

-- Efficient oldest-first scans need the ordering column in the active-symbol
-- index. This avoids sorting the full universe every minute.
CREATE INDEX IF NOT EXISTS idx_listed_symbols_active_last_processed
  ON public.listed_symbols(last_processed_at ASC NULLS FIRST, symbol)
  WHERE is_active = true;

-- Fill at most a two-batch pending buffer. The batch limit is taken from the
-- active quota calibration, so the temporary 25-job recovery policy remains
-- authoritative until a new dashboard snapshot is recorded.
CREATE OR REPLACE FUNCTION public.queue_scheduled_refreshes_v2()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  lock_acquired boolean;
  queue_depth integer;
  initial_queue_depth integer;
  target_queue_depth integer;
  batch_capacity integer := 25;
  max_symbols_per_run integer := 100;
  symbols_checked integer := 0;
  queued_count integer := 0;
  v_symbol text;
  v_scheduled_types text[];
  v_types_for_symbol text[];
  v_profile_exists boolean;
BEGIN
  SELECT pg_try_advisory_lock(43) INTO lock_acquired;
  IF NOT lock_acquired THEN
    RETURN 0;
  END IF;

  BEGIN
    IF public.is_quota_exceeded_v2() THEN
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    SELECT COALESCE(effective.max_batch_jobs, 25)
    INTO batch_capacity
    FROM public.get_effective_quota_usage_v2() AS effective;

    batch_capacity := LEAST(GREATEST(batch_capacity, 1), 125);
    target_queue_depth := GREATEST(batch_capacity * 2, 50);

    SELECT count(*)::integer
    INTO queue_depth
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'pending';

    initial_queue_depth := queue_depth;

    IF queue_depth >= target_queue_depth THEN
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    SELECT array_agg(registry.data_type ORDER BY registry.data_type)
    INTO v_scheduled_types
    FROM public.data_type_registry_v2 AS registry
    WHERE registry.refresh_strategy IN ('scheduled', 'hybrid')
      AND registry.symbol_column IS NOT NULL;

    IF COALESCE(array_length(v_scheduled_types, 1), 0) = 0 THEN
      PERFORM pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    FOR v_symbol IN
      SELECT listed.symbol
      FROM public.listed_symbols AS listed
      WHERE listed.is_active = true
      ORDER BY listed.last_processed_at ASC NULLS FIRST, listed.symbol
      LIMIT max_symbols_per_run
      FOR UPDATE SKIP LOCKED
    LOOP
      EXIT WHEN queue_depth >= target_queue_depth;

      SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.symbol = v_symbol
      )
      INTO v_profile_exists;

      -- Dependent tables reference profiles(symbol). Bootstrap the profile in
      -- one pass, then consider the other types on the next round-robin pass.
      IF v_profile_exists THEN
        v_types_for_symbol := v_scheduled_types;
      ELSIF 'profile' = ANY(v_scheduled_types) THEN
        v_types_for_symbol := ARRAY['profile']::text[];
      ELSE
        v_types_for_symbol := ARRAY[]::text[];
      END IF;

      IF COALESCE(array_length(v_types_for_symbol, 1), 0) > 0 THEN
        PERFORM public.check_and_queue_stale_batch_v2(
          p_symbol := v_symbol,
          p_data_types := v_types_for_symbol,
          p_priority := -1
        );
      END IF;

      UPDATE public.listed_symbols AS listed
      SET last_processed_at = clock_timestamp()
      WHERE listed.symbol = v_symbol;

      symbols_checked := symbols_checked + 1;

      SELECT count(*)::integer
      INTO queue_depth
      FROM public.api_call_queue_v2 AS queue
      WHERE queue.status = 'pending';
    END LOOP;

    queued_count := GREATEST(queue_depth - initial_queue_depth, 0);

    INSERT INTO public.cron_health_logs (jobname, last_run)
    VALUES ('queue-scheduled-refreshes-v2', now())
    ON CONFLICT (jobname) DO UPDATE
    SET last_run = EXCLUDED.last_run;

    PERFORM pg_advisory_unlock(43);
    RETURN queued_count;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(43);
      RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION public.queue_scheduled_refreshes_v2() IS
  'Queues TTL-stale scheduled/hybrid data across active listed symbols using bounded oldest-first round robin. It fills at most two calibrated processor batches, bootstraps profiles before FK-dependent data, checks quota first, and assigns priority -1.';

-- Supabase's migration role cannot read cron.job directly. Expose only the
-- FMP pipeline jobs needed by operational verification through a narrow
-- security-definer surface owned by postgres.
CREATE OR REPLACE FUNCTION public.get_fmp_pipeline_cron_state_v2()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    job.jobid,
    job.jobname::text,
    job.schedule::text,
    job.command::text,
    job.active
  FROM cron.job AS job
  WHERE job.jobname IN (
    'queue-scheduled-refreshes-v2',
    'invoke-processor-v2'
  )
     OR job.jobname LIKE 'controlled-fmp-live-processing-%'
  ORDER BY job.jobid;
$$;

ALTER FUNCTION public.get_fmp_pipeline_cron_state_v2() OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.get_fmp_pipeline_cron_state_v2()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.get_fmp_pipeline_cron_state_v2()
TO service_role;

COMMENT ON FUNCTION public.get_fmp_pipeline_cron_state_v2() IS
  'Read-only, filtered pg_cron state for the FMP scheduler and processor paths.';

-- Fail closed even when an older environment still has the original cron
-- active. Production must first deploy the updated queue processor, record the
-- current FMP dashboard calibration, and then activate this job explicitly.
SELECT cron.unschedule('queue-scheduled-refreshes-v2');

COMMIT;
