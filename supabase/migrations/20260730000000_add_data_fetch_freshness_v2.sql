-- Record successful fetches independently from data rows so an empty API
-- response can be cached without inventing sentinel business data.

CREATE TABLE public.data_fetch_freshness_v2 (
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL
    REFERENCES public.data_type_registry_v2(data_type)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  last_success_at TIMESTAMPTZ NOT NULL,
  result_kind TEXT NOT NULL
    CHECK (result_kind IN ('data', 'empty')),
  response_size_bytes BIGINT NOT NULL DEFAULT 0
    CHECK (response_size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, data_type),
  CHECK (symbol = UPPER(BTRIM(symbol)) AND symbol <> '')
);

COMMENT ON TABLE public.data_fetch_freshness_v2 IS
  'Last successful upstream fetch by symbol and data type, including valid empty responses. Failed fetches must never write this table.';
COMMENT ON COLUMN public.data_fetch_freshness_v2.result_kind IS
  'data when the successful response produced persisted records; empty when the upstream response was valid but contained no records.';

CREATE INDEX idx_data_fetch_freshness_v2_data_type_success
  ON public.data_fetch_freshness_v2(data_type, last_success_at);

ALTER TABLE public.data_fetch_freshness_v2 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.data_fetch_freshness_v2 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.data_fetch_freshness_v2 FROM service_role;
GRANT SELECT ON public.data_fetch_freshness_v2 TO service_role;

CREATE OR REPLACE FUNCTION public.record_data_fetch_freshness_v2(
  p_symbol TEXT,
  p_data_type TEXT,
  p_has_data BOOLEAN,
  p_response_size_bytes BIGINT DEFAULT 0
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_symbol TEXT := UPPER(BTRIM(p_symbol));
  v_recorded_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF v_symbol IS NULL OR v_symbol = '' THEN
    RAISE EXCEPTION 'symbol must not be empty';
  END IF;

  IF p_data_type IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.data_type_registry_v2 registry
    WHERE registry.data_type = p_data_type
  ) THEN
    RAISE EXCEPTION 'unknown data type: %', p_data_type;
  END IF;

  IF p_has_data IS NULL THEN
    RAISE EXCEPTION 'p_has_data must not be null';
  END IF;

  IF p_response_size_bytes IS NULL OR p_response_size_bytes < 0 THEN
    RAISE EXCEPTION 'response size must be non-negative';
  END IF;

  INSERT INTO public.data_fetch_freshness_v2 (
    symbol,
    data_type,
    last_success_at,
    result_kind,
    response_size_bytes,
    updated_at
  )
  VALUES (
    v_symbol,
    p_data_type,
    v_recorded_at,
    CASE WHEN p_has_data THEN 'data' ELSE 'empty' END,
    p_response_size_bytes,
    v_recorded_at
  )
  ON CONFLICT (symbol, data_type) DO UPDATE
  SET
    last_success_at = EXCLUDED.last_success_at,
    result_kind = EXCLUDED.result_kind,
    response_size_bytes = EXCLUDED.response_size_bytes,
    updated_at = EXCLUDED.updated_at;

  RETURN v_recorded_at;
END;
$$;

REVOKE ALL ON FUNCTION public.record_data_fetch_freshness_v2(TEXT, TEXT, BOOLEAN, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_data_fetch_freshness_v2(TEXT, TEXT, BOOLEAN, BIGINT)
  TO service_role;

COMMENT ON FUNCTION public.record_data_fetch_freshness_v2(TEXT, TEXT, BOOLEAN, BIGINT) IS
  'Records a successful upstream fetch. Call only after a response is validated and any returned data is persisted; never call for transport, validation, or database failures.';

CREATE OR REPLACE FUNCTION public.effective_data_fetch_timestamp_v2(
  p_symbol TEXT,
  p_data_type TEXT,
  p_data_fetched_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT CASE
    WHEN p_data_fetched_at IS NULL THEN freshness.last_success_at
    WHEN freshness.last_success_at IS NULL THEN p_data_fetched_at
    ELSE GREATEST(p_data_fetched_at, freshness.last_success_at)
  END
  FROM (
    SELECT (
      SELECT stored.last_success_at
      FROM public.data_fetch_freshness_v2 stored
      WHERE stored.symbol = UPPER(BTRIM(p_symbol))
        AND stored.data_type = p_data_type
    ) AS last_success_at
  ) freshness;
$$;

REVOKE ALL ON FUNCTION public.effective_data_fetch_timestamp_v2(TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_data_fetch_timestamp_v2(TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.effective_data_fetch_timestamp_v2(TEXT, TEXT, TIMESTAMPTZ) IS
  'Returns the newest successful fetch timestamp from either persisted data or the explicit freshness record.';

-- Event-driven and scheduled checks both pass through this function. Use one
-- aggregate timestamp for every data type so multi-row tables do not become
-- stale merely because they contain older historical rows.
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
  is_super_stale BOOLEAN;
  sql_text TEXT;
  exchange_is_open BOOLEAN;
  data_exists BOOLEAN;
  source_fetched_at TIMESTAMPTZ;
  effective_fetched_at TIMESTAMPTZ;
BEGIN
  FOR reg_row IN
    SELECT *
    FROM public.data_type_registry_v2
    WHERE data_type = ANY(p_data_types)
  LOOP
    IF NOT public.is_valid_identifier(reg_row.table_name)
       OR NOT public.is_valid_identifier(reg_row.symbol_column)
       OR NOT public.is_valid_identifier(reg_row.timestamp_column)
       OR NOT public.is_valid_identifier(reg_row.staleness_function)
    THEN
      RAISE EXCEPTION 'Invalid identifier found in data_type_registry_v2: %',
        reg_row.data_type;
    END IF;

    BEGIN
      sql_text := format(
        'SELECT COUNT(*) > 0, MAX(t.%I) FROM %I t WHERE t.%I = %L',
        reg_row.timestamp_column,
        reg_row.table_name,
        reg_row.symbol_column,
        p_symbol
      );
      EXECUTE sql_text INTO data_exists, source_fetched_at;

      IF reg_row.data_type = 'quote' AND data_exists THEN
        SELECT public.is_exchange_open_for_symbol_v2(p_symbol, 'quote')
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
          p_symbol,
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
        PERFORM public.queue_refresh_if_not_exists_v2(
          p_symbol,
          reg_row.data_type,
          p_priority,
          reg_row.estimated_data_size_bytes
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING
          'Staleness check failed for symbol % and type %: %. Assuming stale.',
          p_symbol,
          reg_row.data_type,
          SQLERRM;
        PERFORM public.queue_refresh_if_not_exists_v2(
          p_symbol,
          reg_row.data_type,
          p_priority,
          reg_row.estimated_data_size_bytes
        );
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.check_and_queue_stale_batch_v2(TEXT, TEXT[], INTEGER) IS
  'Queues stale data using the newest persisted or explicitly recorded successful fetch. Valid empty responses remain fresh for the registry TTL. Failed checks fail safe to stale. Quote refreshes retain the closed-market 24-hour super-stale bypass.';

-- Presence-driven refreshes must consult the same effective timestamp. Keeping
-- this decision in PL/pgSQL also avoids a multi-row LEFT JOIN where one old
-- historical insider row could make an otherwise fresh symbol look stale.
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
        WHERE registry.refresh_strategy = 'on-demand'
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
  'Presence-driven staleness checker. Uses explicit successful-fetch freshness for valid empty responses, aggregates multi-row data timestamps, preserves quota/lock/timeout controls, and retains the quote closed-market super-stale bypass.';
