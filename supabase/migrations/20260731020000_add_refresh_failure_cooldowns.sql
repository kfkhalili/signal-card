-- Prevent terminal failures from being recreated on every scheduled
-- round-robin pass. Failure cooldown is deliberately independent from
-- successful fetch freshness: errors never make stale data look fresh.

CREATE TABLE public.refresh_failure_cooldowns_v2 (
  symbol text NOT NULL,
  data_type text NOT NULL
    REFERENCES public.data_type_registry_v2(data_type)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  consecutive_failures integer NOT NULL DEFAULT 1
    CHECK (consecutive_failures > 0),
  last_failure_at timestamptz NOT NULL,
  retry_after timestamptz NOT NULL,
  last_job_id uuid NOT NULL,
  last_error_message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, data_type),
  CHECK (symbol = upper(btrim(symbol)) AND symbol <> ''),
  CHECK (retry_after > last_failure_at)
);

COMMENT ON TABLE public.refresh_failure_cooldowns_v2 IS
  'Terminal refresh failures that temporarily suppress scheduled requeueing. This table is not successful freshness; demand-driven work may bypass it and successful completion clears it.';

COMMENT ON COLUMN public.refresh_failure_cooldowns_v2.retry_after IS
  'Earliest time another scheduled priority refresh may be queued. Demand-driven priorities are not blocked.';

CREATE INDEX refresh_failure_cooldowns_v2_retry_after_idx
  ON public.refresh_failure_cooldowns_v2(retry_after);

ALTER TABLE public.refresh_failure_cooldowns_v2 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.refresh_failure_cooldowns_v2
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.refresh_failure_cooldowns_v2 TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_failure_retry_interval_v2(
  p_error_message text,
  p_consecutive_failures integer
)
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_error_message ILIKE '%stale%'
         AND p_error_message ILIKE '%timestamp%'
      THEN interval '24 hours'
    ELSE pg_catalog.make_interval(
      hours => LEAST(
        24,
        pg_catalog.power(
          2,
          LEAST(GREATEST(p_consecutive_failures, 1) - 1, 5)
        )::integer
      )
    )
  END;
$$;

ALTER FUNCTION public.refresh_failure_retry_interval_v2(text, integer)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.refresh_failure_retry_interval_v2(text, integer)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_refresh_failure_cooldown_active_v2(
  p_symbol text,
  p_data_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.refresh_failure_cooldowns_v2 AS cooldown
    WHERE cooldown.symbol = pg_catalog.upper(pg_catalog.btrim(p_symbol))
      AND cooldown.data_type = p_data_type
      AND cooldown.retry_after > pg_catalog.now()
  );
$$;

ALTER FUNCTION public.is_refresh_failure_cooldown_active_v2(text, text)
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.is_refresh_failure_cooldown_active_v2(text, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.is_refresh_failure_cooldown_active_v2(text, text)
TO service_role;

-- Backfill only recent scheduled terminal failures. This protects the current
-- rollout anomalies on first resume without reviving years of queue history.
WITH latest_success AS (
  SELECT
    pg_catalog.upper(pg_catalog.btrim(queue.symbol)) AS symbol,
    queue.data_type,
    max(queue.processed_at) AS last_success_at
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.status = 'completed'
  GROUP BY
    pg_catalog.upper(pg_catalog.btrim(queue.symbol)),
    queue.data_type
),
grouped AS (
  SELECT
    pg_catalog.upper(pg_catalog.btrim(queue.symbol)) AS symbol,
    queue.data_type,
    count(*)::integer AS consecutive_failures,
    max(queue.processed_at) AS last_failure_at,
    (array_agg(
      queue.id
      ORDER BY queue.processed_at DESC, queue.created_at DESC
    ))[1] AS last_job_id,
    (array_agg(
      queue.error_message
      ORDER BY queue.processed_at DESC, queue.created_at DESC
    ))[1] AS last_error_message
  FROM public.api_call_queue_v2 AS queue
  JOIN public.data_type_registry_v2 AS registry
    ON registry.data_type = queue.data_type
  LEFT JOIN latest_success
    ON latest_success.symbol =
      pg_catalog.upper(pg_catalog.btrim(queue.symbol))
    AND latest_success.data_type = queue.data_type
  WHERE queue.status = 'failed'
    AND queue.priority < 0
    AND queue.processed_at >= now() - interval '7 days'
    AND queue.processed_at > COALESCE(
      latest_success.last_success_at,
      '-infinity'::timestamptz
    )
    AND pg_catalog.btrim(queue.symbol) <> ''
    AND queue.error_message IS NOT NULL
  GROUP BY
    pg_catalog.upper(pg_catalog.btrim(queue.symbol)),
    queue.data_type
),
eligible AS (
  SELECT
    grouped.*,
    grouped.last_failure_at
      + public.refresh_failure_retry_interval_v2(
          grouped.last_error_message,
          grouped.consecutive_failures
        ) AS retry_after
  FROM grouped
)
INSERT INTO public.refresh_failure_cooldowns_v2 (
  symbol,
  data_type,
  consecutive_failures,
  last_failure_at,
  retry_after,
  last_job_id,
  last_error_message,
  created_at,
  updated_at
)
SELECT
  eligible.symbol,
  eligible.data_type,
  eligible.consecutive_failures,
  eligible.last_failure_at,
  eligible.retry_after,
  eligible.last_job_id,
  eligible.last_error_message,
  now(),
  now()
FROM eligible
WHERE eligible.retry_after > now()
ON CONFLICT (symbol, data_type) DO NOTHING;

-- Status changes move queue rows between partitions as DELETE + INSERT. An
-- AFTER INSERT trigger on the partitioned parent therefore observes terminal
-- failures and successful completions without duplicating queue RPC logic.
CREATE OR REPLACE FUNCTION public.maintain_refresh_failure_cooldown_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  BEGIN
    IF NEW.status = 'failed'
       AND NEW.error_message IS NOT NULL
       AND pg_catalog.btrim(NEW.error_message) <> ''
    THEN
      INSERT INTO public.refresh_failure_cooldowns_v2 AS cooldown (
        symbol,
        data_type,
        consecutive_failures,
        last_failure_at,
        retry_after,
        last_job_id,
        last_error_message,
        updated_at
      )
      VALUES (
        pg_catalog.upper(pg_catalog.btrim(NEW.symbol)),
        NEW.data_type,
        1,
        v_now,
        v_now + public.refresh_failure_retry_interval_v2(
          NEW.error_message,
          1
        ),
        NEW.id,
        NEW.error_message,
        v_now
      )
      ON CONFLICT (symbol, data_type) DO UPDATE
      SET
        consecutive_failures = cooldown.consecutive_failures + 1,
        last_failure_at = v_now,
        retry_after = v_now + public.refresh_failure_retry_interval_v2(
          NEW.error_message,
          cooldown.consecutive_failures + 1
        ),
        last_job_id = NEW.id,
        last_error_message = NEW.error_message,
        updated_at = v_now;
    ELSIF NEW.status = 'completed' THEN
      DELETE FROM public.refresh_failure_cooldowns_v2 AS cooldown
      WHERE cooldown.symbol =
        pg_catalog.upper(pg_catalog.btrim(NEW.symbol))
        AND cooldown.data_type = NEW.data_type;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Cooldown bookkeeping must never prevent a queue state transition.
      RAISE WARNING
        'Unable to maintain refresh failure cooldown for %/%: %',
        NEW.symbol,
        NEW.data_type,
        SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.maintain_refresh_failure_cooldown_v2()
OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.maintain_refresh_failure_cooldown_v2()
FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS maintain_refresh_failure_cooldown_v2
ON public.api_call_queue_v2;

CREATE TRIGGER maintain_refresh_failure_cooldown_v2
AFTER INSERT ON public.api_call_queue_v2
FOR EACH ROW
EXECUTE FUNCTION public.maintain_refresh_failure_cooldown_v2();

COMMENT ON FUNCTION public.maintain_refresh_failure_cooldown_v2() IS
  'Tracks terminal failures separately from successful freshness and clears the failure state after any successful completion. Bookkeeping errors are warnings and never block queue transitions.';

-- Scheduled priority is negative. Demand-driven work remains able to bypass
-- cooldown, and its success will clear the failure state.
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

  IF final_priority < 0
     AND public.is_refresh_failure_cooldown_active_v2(
       p_symbol,
       p_data_type
     )
  THEN
    RETURN NULL;
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

COMMENT ON FUNCTION public.queue_refresh_if_not_exists_v2(
  text, text, integer, bigint
) IS
  'Idempotently queues refresh work under a symbol/type lock. Negative scheduled priority respects terminal-failure cooldown; demand priorities bypass cooldown and can recover it.';
