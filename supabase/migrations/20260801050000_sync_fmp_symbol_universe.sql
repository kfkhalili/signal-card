-- Keep FMP's trading-status feed separate from Signal Card's curated
-- eligibility flag. A complete daily snapshot may suppress a currently
-- inactive symbol, but it may not turn an otherwise ineligible instrument
-- into a Compass candidate.

BEGIN;

ALTER TABLE public.listed_symbols
  ADD COLUMN IF NOT EXISTS fmp_is_actively_trading boolean,
  ADD COLUMN IF NOT EXISTS fmp_status_checked_at timestamptz;

COMMENT ON COLUMN public.listed_symbols.fmp_is_actively_trading IS
  'Latest confirmed FMP universe status for exchanges covered by the observed active feed. NULL is unknown; false requires either two complete-snapshot absences or an old-to-new symbol change whose replacement is active.';

COMMENT ON COLUMN public.listed_symbols.fmp_status_checked_at IS
  'Capture time of the accepted FMP symbol-universe snapshot that last evaluated this symbol.';

CREATE TABLE public.fmp_symbol_universe_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  captured_at timestamptz NOT NULL UNIQUE,
  active_symbol_count integer NOT NULL CHECK (active_symbol_count > 0),
  stock_symbol_count integer NOT NULL CHECK (stock_symbol_count > 0),
  symbol_change_count integer NOT NULL CHECK (symbol_change_count >= 0),
  delisted_company_count integer NOT NULL CHECK (delisted_company_count >= 0),
  delisted_active_conflict_count integer NOT NULL DEFAULT 0
    CHECK (delisted_active_conflict_count >= 0),
  response_bytes jsonb NOT NULL CHECK (jsonb_typeof(response_bytes) = 'object'),
  response_sha256 jsonb NOT NULL CHECK (jsonb_typeof(response_sha256) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fmp_symbol_universe_runs IS
  'Accepted, validated FMP directory snapshots. Rejected or partial payloads never create a run.';

CREATE INDEX fmp_symbol_universe_runs_captured_at
  ON public.fmp_symbol_universe_runs (captured_at DESC);

CREATE TABLE public.fmp_symbol_status (
  symbol text PRIMARY KEY,
  company_name text,
  in_stock_list boolean NOT NULL DEFAULT false,
  is_actively_trading boolean,
  consecutive_active_absences integer NOT NULL DEFAULT 0
    CHECK (consecutive_active_absences >= 0),
  first_seen_at timestamptz NOT NULL,
  last_seen_stock_at timestamptz,
  last_seen_active_at timestamptz,
  last_checked_at timestamptz NOT NULL,
  last_run_id bigint NOT NULL
    REFERENCES public.fmp_symbol_universe_runs(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fmp_symbol_status IS
  'Reconciled FMP symbol-directory status. This is provider status, not Compass eligibility.';

CREATE INDEX fmp_symbol_status_active
  ON public.fmp_symbol_status (is_actively_trading, symbol);

CREATE INDEX fmp_symbol_status_last_seen_active
  ON public.fmp_symbol_status (last_seen_active_at DESC);

CREATE TABLE public.fmp_symbol_changes (
  old_symbol text NOT NULL,
  new_symbol text NOT NULL,
  effective_date date NOT NULL,
  company_name text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  last_run_id bigint NOT NULL
    REFERENCES public.fmp_symbol_universe_runs(id) ON DELETE RESTRICT,
  PRIMARY KEY (old_symbol, new_symbol, effective_date)
);

COMMENT ON TABLE public.fmp_symbol_changes IS
  'Symbol changes observed from FMP, retained as evidence rather than destructive ticker renames.';

CREATE TABLE public.fmp_delisted_companies (
  symbol text NOT NULL,
  exchange text NOT NULL,
  delisted_date date NOT NULL,
  company_name text NOT NULL,
  ipo_date date,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  last_run_id bigint NOT NULL
    REFERENCES public.fmp_symbol_universe_runs(id) ON DELETE RESTRICT,
  PRIMARY KEY (symbol, exchange, delisted_date)
);

COMMENT ON TABLE public.fmp_delisted_companies IS
  'Exchange-specific FMP delisting observations. They do not establish global symbol inactivity because a security may move or relist.';

ALTER TABLE public.fmp_symbol_universe_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmp_symbol_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmp_symbol_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fmp_delisted_companies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.fmp_symbol_universe_runs,
  public.fmp_symbol_status,
  public.fmp_symbol_changes,
  public.fmp_delisted_companies
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.fmp_symbol_universe_runs,
  public.fmp_symbol_status,
  public.fmp_symbol_changes,
  public.fmp_delisted_companies
TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.fmp_symbol_universe_runs_id_seq
TO service_role;

CREATE OR REPLACE FUNCTION public.apply_fmp_symbol_universe_snapshot_v2(
  p_active_symbols jsonb,
  p_stock_symbols jsonb,
  p_symbol_changes jsonb,
  p_delisted_companies jsonb,
  p_captured_at timestamptz,
  p_response_bytes jsonb,
  p_response_sha256 jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_active_count integer;
  v_stock_count integer;
  v_change_count integer;
  v_delisted_count integer;
  v_previous_active_count integer;
  v_previous_stock_count integer;
  v_run_id bigint;
  v_delisted_active_conflicts integer;
  v_listed_evaluated integer;
  v_listed_confirmed_inactive integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fmp-symbol-universe-snapshot-v2', 0)
  );

  IF p_captured_at IS NULL
     OR p_captured_at > pg_catalog.now() + interval '5 minutes'
  THEN
    RAISE EXCEPTION 'invalid snapshot capture time';
  END IF;

  IF p_active_symbols IS NULL
     OR pg_catalog.jsonb_typeof(p_active_symbols) <> 'array'
     OR p_stock_symbols IS NULL
     OR pg_catalog.jsonb_typeof(p_stock_symbols) <> 'array'
     OR p_symbol_changes IS NULL
     OR pg_catalog.jsonb_typeof(p_symbol_changes) <> 'array'
     OR p_delisted_companies IS NULL
     OR pg_catalog.jsonb_typeof(p_delisted_companies) <> 'array'
  THEN
    RAISE EXCEPTION 'all FMP snapshot payloads must be JSON arrays';
  END IF;

  IF p_response_bytes IS NULL
     OR pg_catalog.jsonb_typeof(p_response_bytes) <> 'object'
     OR p_response_sha256 IS NULL
     OR pg_catalog.jsonb_typeof(p_response_sha256) <> 'object'
  THEN
    RAISE EXCEPTION 'response accounting must be JSON objects';
  END IF;

  v_active_count := pg_catalog.jsonb_array_length(p_active_symbols);
  v_stock_count := pg_catalog.jsonb_array_length(p_stock_symbols);
  v_change_count := pg_catalog.jsonb_array_length(p_symbol_changes);
  v_delisted_count := pg_catalog.jsonb_array_length(p_delisted_companies);

  IF v_active_count < 10000 OR v_stock_count < 10000 THEN
    RAISE EXCEPTION
      'implausibly small FMP universe: active %, stock %',
      v_active_count,
      v_stock_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_active_symbols) AS item
    WHERE pg_catalog.jsonb_typeof(item) <> 'object'
       OR NULLIF(pg_catalog.btrim(item->>'symbol'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item->>'name'), '') IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_stock_symbols) AS item
    WHERE pg_catalog.jsonb_typeof(item) <> 'object'
       OR NULLIF(pg_catalog.btrim(item->>'symbol'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item->>'companyName'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'FMP universe contains malformed symbol rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_symbol_changes) AS item
    WHERE pg_catalog.jsonb_typeof(item) <> 'object'
       OR NULLIF(pg_catalog.btrim(item->>'oldSymbol'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item->>'newSymbol'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item->>'companyName'), '') IS NULL
       OR COALESCE(item->>'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_delisted_companies) AS item
    WHERE pg_catalog.jsonb_typeof(item) <> 'object'
       OR NULLIF(pg_catalog.btrim(item->>'symbol'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item->>'exchange'), '') IS NULL
       OR NULLIF(pg_catalog.btrim(item->>'companyName'), '') IS NULL
       OR COALESCE(item->>'delistedDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       OR (
         NULLIF(item->>'ipoDate', '') IS NOT NULL
         AND item->>'ipoDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       )
  ) THEN
    RAISE EXCEPTION 'FMP change or delisting feed contains malformed rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_active_symbols) AS item
    GROUP BY pg_catalog.upper(pg_catalog.btrim(item->>'symbol'))
    HAVING pg_catalog.count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_stock_symbols) AS item
    GROUP BY pg_catalog.upper(pg_catalog.btrim(item->>'symbol'))
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'FMP universe contains duplicate symbols';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_symbol_changes) AS item
    GROUP BY
      pg_catalog.upper(pg_catalog.btrim(item->>'oldSymbol')),
      pg_catalog.upper(pg_catalog.btrim(item->>'newSymbol')),
      item->>'date'
    HAVING pg_catalog.count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_delisted_companies) AS item
    GROUP BY
      pg_catalog.upper(pg_catalog.btrim(item->>'symbol')),
      pg_catalog.upper(pg_catalog.btrim(item->>'exchange')),
      item->>'delistedDate'
    HAVING pg_catalog.count(*) > 1
  ) THEN
    RAISE EXCEPTION 'FMP change or delisting feed contains duplicate rows';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_active_symbols) AS active_item
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(p_stock_symbols) AS stock_item
      WHERE pg_catalog.upper(pg_catalog.btrim(stock_item->>'symbol')) =
            pg_catalog.upper(pg_catalog.btrim(active_item->>'symbol'))
    )
  ) THEN
    RAISE EXCEPTION 'actively-trading-list is not a subset of stock-list';
  END IF;

  SELECT run.active_symbol_count, run.stock_symbol_count
  INTO v_previous_active_count, v_previous_stock_count
  FROM public.fmp_symbol_universe_runs AS run
  ORDER BY run.captured_at DESC
  LIMIT 1;

  IF FOUND AND (
    v_active_count < v_previous_active_count * 0.80
    OR v_active_count > v_previous_active_count * 1.20
    OR v_stock_count < v_previous_stock_count * 0.80
    OR v_stock_count > v_previous_stock_count * 1.20
  ) THEN
    RAISE EXCEPTION
      'FMP universe row-count drift exceeds 20 percent: active % -> %, stock % -> %',
      v_previous_active_count,
      v_active_count,
      v_previous_stock_count,
      v_stock_count;
  END IF;

  SELECT pg_catalog.count(*)::integer
  INTO v_delisted_active_conflicts
  FROM pg_catalog.jsonb_array_elements(p_delisted_companies) AS delisted_item
  WHERE EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_active_symbols) AS active_item
    WHERE pg_catalog.upper(pg_catalog.btrim(active_item->>'symbol')) =
          pg_catalog.upper(pg_catalog.btrim(delisted_item->>'symbol'))
  );

  INSERT INTO public.fmp_symbol_universe_runs (
    captured_at,
    active_symbol_count,
    stock_symbol_count,
    symbol_change_count,
    delisted_company_count,
    delisted_active_conflict_count,
    response_bytes,
    response_sha256
  )
  VALUES (
    p_captured_at,
    v_active_count,
    v_stock_count,
    v_change_count,
    v_delisted_count,
    v_delisted_active_conflicts,
    p_response_bytes,
    p_response_sha256
  )
  RETURNING id INTO v_run_id;

  INSERT INTO public.fmp_symbol_changes (
    old_symbol,
    new_symbol,
    effective_date,
    company_name,
    first_seen_at,
    last_seen_at,
    last_run_id
  )
  SELECT
    pg_catalog.upper(pg_catalog.btrim(item->>'oldSymbol')),
    pg_catalog.upper(pg_catalog.btrim(item->>'newSymbol')),
    (item->>'date')::date,
    pg_catalog.btrim(item->>'companyName'),
    p_captured_at,
    p_captured_at,
    v_run_id
  FROM pg_catalog.jsonb_array_elements(p_symbol_changes) AS item
  ON CONFLICT (old_symbol, new_symbol, effective_date) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      last_seen_at = EXCLUDED.last_seen_at,
      last_run_id = EXCLUDED.last_run_id;

  INSERT INTO public.fmp_delisted_companies (
    symbol,
    exchange,
    delisted_date,
    company_name,
    ipo_date,
    first_seen_at,
    last_seen_at,
    last_run_id
  )
  SELECT
    pg_catalog.upper(pg_catalog.btrim(item->>'symbol')),
    pg_catalog.upper(pg_catalog.btrim(item->>'exchange')),
    (item->>'delistedDate')::date,
    pg_catalog.btrim(item->>'companyName'),
    NULLIF(item->>'ipoDate', '')::date,
    p_captured_at,
    p_captured_at,
    v_run_id
  FROM pg_catalog.jsonb_array_elements(p_delisted_companies) AS item
  ON CONFLICT (symbol, exchange, delisted_date) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      ipo_date = EXCLUDED.ipo_date,
      last_seen_at = EXCLUDED.last_seen_at,
      last_run_id = EXCLUDED.last_run_id;

  INSERT INTO public.fmp_symbol_status (
    symbol,
    company_name,
    in_stock_list,
    is_actively_trading,
    consecutive_active_absences,
    first_seen_at,
    last_seen_stock_at,
    last_seen_active_at,
    last_checked_at,
    last_run_id
  )
  SELECT
    pg_catalog.upper(pg_catalog.btrim(item->>'symbol')),
    pg_catalog.btrim(item->>'companyName'),
    true,
    NULL,
    0,
    p_captured_at,
    p_captured_at,
    NULL,
    p_captured_at,
    v_run_id
  FROM pg_catalog.jsonb_array_elements(p_stock_symbols) AS item
  ON CONFLICT (symbol) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      in_stock_list = true,
      last_seen_stock_at = EXCLUDED.last_seen_stock_at,
      last_checked_at = EXCLUDED.last_checked_at,
      last_run_id = EXCLUDED.last_run_id,
      updated_at = pg_catalog.now();

  INSERT INTO public.fmp_symbol_status (
    symbol,
    company_name,
    in_stock_list,
    is_actively_trading,
    consecutive_active_absences,
    first_seen_at,
    last_seen_stock_at,
    last_seen_active_at,
    last_checked_at,
    last_run_id
  )
  SELECT
    pg_catalog.upper(pg_catalog.btrim(item->>'symbol')),
    pg_catalog.btrim(item->>'name'),
    true,
    true,
    0,
    p_captured_at,
    p_captured_at,
    p_captured_at,
    p_captured_at,
    v_run_id
  FROM pg_catalog.jsonb_array_elements(p_active_symbols) AS item
  ON CONFLICT (symbol) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      in_stock_list = true,
      is_actively_trading = true,
      consecutive_active_absences = 0,
      last_seen_active_at = EXCLUDED.last_seen_active_at,
      last_checked_at = EXCLUDED.last_checked_at,
      last_run_id = EXCLUDED.last_run_id,
      updated_at = pg_catalog.now();

  -- Existing curated symbols may no longer occur in either FMP directory.
  -- Add them as unknown before counting complete-snapshot absences.
  INSERT INTO public.fmp_symbol_status (
    symbol,
    in_stock_list,
    is_actively_trading,
    consecutive_active_absences,
    first_seen_at,
    last_checked_at,
    last_run_id
  )
  SELECT
    listed.symbol,
    false,
    NULL,
    0,
    p_captured_at,
    p_captured_at,
    v_run_id
  FROM public.listed_symbols AS listed
  ON CONFLICT (symbol) DO NOTHING;

  UPDATE public.fmp_symbol_status AS status
  SET in_stock_list = false,
      updated_at = pg_catalog.now()
  WHERE status.last_seen_stock_at IS DISTINCT FROM p_captured_at;

  -- Active-list presence wins over every other feed. A delisting is scoped to
  -- one exchange and cannot establish global inactivity. Only a confirmed
  -- old->new ticker change or two complete active-list absences can do that.
  UPDATE public.fmp_symbol_status AS status
  SET consecutive_active_absences =
        status.consecutive_active_absences + 1,
      is_actively_trading = CASE
        WHEN EXISTS (
          SELECT 1
          FROM pg_catalog.jsonb_array_elements(p_symbol_changes) AS change_item
          WHERE pg_catalog.upper(pg_catalog.btrim(change_item->>'oldSymbol')) =
                status.symbol
            AND EXISTS (
              SELECT 1
              FROM pg_catalog.jsonb_array_elements(p_active_symbols) AS active_item
              WHERE pg_catalog.upper(pg_catalog.btrim(active_item->>'symbol')) =
                    pg_catalog.upper(pg_catalog.btrim(change_item->>'newSymbol'))
            )
        ) THEN false
        WHEN status.consecutive_active_absences + 1 >= 2 THEN false
        ELSE status.is_actively_trading
      END,
      last_checked_at = p_captured_at,
      last_run_id = v_run_id,
      updated_at = pg_catalog.now()
  WHERE status.last_seen_active_at IS DISTINCT FROM p_captured_at;

  UPDATE public.listed_symbols AS listed
  SET fmp_is_actively_trading = CASE
        WHEN status.is_actively_trading = true THEN true
        WHEN status.is_actively_trading = false
             AND EXISTS (
               SELECT 1
               FROM public.profiles AS profile
               WHERE profile.symbol = listed.symbol
                 AND pg_catalog.upper(profile.exchange) IN (
                   'NASDAQ',
                   'NYSE',
                   'AMEX',
                   'CBOE',
                   'OTC',
                   'PNK',
                   'NYSEARCA',
                   'ARCA'
                 )
             )
          THEN false
        ELSE NULL
      END,
      fmp_status_checked_at = p_captured_at
  FROM public.fmp_symbol_status AS status
  WHERE status.symbol = listed.symbol;

  GET DIAGNOSTICS v_listed_evaluated = ROW_COUNT;

  SELECT pg_catalog.count(*)::integer
  INTO v_listed_confirmed_inactive
  FROM public.listed_symbols AS listed
  WHERE listed.fmp_is_actively_trading = false;

  RETURN pg_catalog.jsonb_build_object(
    'run_id', v_run_id,
    'captured_at', p_captured_at,
    'active_symbols', v_active_count,
    'stock_symbols', v_stock_count,
    'symbol_changes', v_change_count,
    'delisted_companies', v_delisted_count,
    'delisted_active_conflicts', v_delisted_active_conflicts,
    'listed_symbols_evaluated', v_listed_evaluated,
    'listed_symbols_confirmed_inactive', v_listed_confirmed_inactive
  );
END;
$$;

ALTER FUNCTION public.apply_fmp_symbol_universe_snapshot_v2(
  jsonb, jsonb, jsonb, jsonb, timestamptz, jsonb, jsonb
) OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.apply_fmp_symbol_universe_snapshot_v2(
  jsonb, jsonb, jsonb, jsonb, timestamptz, jsonb, jsonb
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.apply_fmp_symbol_universe_snapshot_v2(
  jsonb, jsonb, jsonb, jsonb, timestamptz, jsonb, jsonb
)
TO service_role;

-- Public clients still see only curated, currently trading symbols.
DROP POLICY IF EXISTS "Allow authenticated read access to active listed_symbols"
ON public.listed_symbols;
CREATE POLICY "Allow authenticated read access to active listed_symbols"
ON public.listed_symbols FOR SELECT TO authenticated
USING (
  is_active = true
  AND fmp_is_actively_trading IS DISTINCT FROM false
);

DROP POLICY IF EXISTS "Allow anon read access to active listed_symbols"
ON public.listed_symbols;
CREATE POLICY "Allow anon read access to active listed_symbols"
ON public.listed_symbols FOR SELECT TO anon
USING (
  is_active = true
  AND fmp_is_actively_trading IS DISTINCT FROM false
);

CREATE INDEX idx_listed_symbols_effectively_active_last_processed
  ON public.listed_symbols(last_processed_at ASC NULLS FIRST, symbol)
  WHERE is_active = true
    AND fmp_is_actively_trading IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(
  weights jsonb,
  p_industries text[] DEFAULT NULL,
  p_exchanges text[] DEFAULT NULL
)
RETURNS TABLE(
  rank bigint,
  symbol text,
  composite_score numeric,
  market_cap bigint,
  revenue numeric,
  ps_rank bigint,
  evm_rank bigint,
  sentiment_rank bigint,
  profitability_rank bigint,
  buyback_rank bigint,
  peg_rank bigint,
  div_yield_rank bigint,
  health_rank bigint,
  industry text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $function$
DECLARE
  w_rev numeric := COALESCE((weights->>'revenue')::numeric, 0.15);
  w_val numeric := COALESCE((weights->>'value')::numeric, 0.0);
  w_sent numeric := COALESCE((weights->>'sentiment')::numeric, 0.15);
  w_gro numeric := COALESCE((weights->>'growth')::numeric, 0.0);
  w_prof numeric := COALESCE((weights->>'profitability')::numeric, 0.2);
  w_buy numeric := COALESCE((weights->>'buyback')::numeric, 0.15);
  w_inc numeric := COALESCE((weights->>'income')::numeric, 0.0);
  w_health numeric := COALESCE((weights->>'health')::numeric, 0.35);
BEGIN
  RETURN QUERY
  WITH calculated_scores AS (
    SELECT
      scores.symbol,
      (
        scores.norm_ps * w_rev +
        scores.norm_evm * w_val +
        scores.norm_sentiment * w_sent +
        scores.norm_peg * w_gro +
        scores.norm_profitability_yield * w_prof +
        scores.norm_buyback_yield * w_buy +
        scores.norm_div_yield * w_inc +
        scores.norm_health * w_health
      )::numeric(10, 2) AS composite_score,
      scores.market_cap,
      scores.revenue_ttm AS revenue,
      scores.ps_rank,
      scores.evm_rank,
      scores.sentiment_rank,
      scores.profitability_rank,
      scores.buyback_rank,
      scores.peg_rank,
      scores.div_yield_rank,
      scores.health_rank,
      scores.industry
    FROM public.compass_pillar_scores AS scores
    INNER JOIN public.listed_symbols AS listed
      ON listed.symbol = scores.symbol
     AND listed.is_active = true
     AND listed.fmp_is_actively_trading IS DISTINCT FROM false
    WHERE
      (
        p_industries IS NULL
        OR pg_catalog.array_length(p_industries, 1) IS NULL
        OR scores.industry = ANY(p_industries)
      )
      AND (
        p_exchanges IS NULL
        OR pg_catalog.array_length(p_exchanges, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.exchange_variants AS variants
          WHERE variants.symbol = scores.symbol
            AND EXISTS (
              SELECT 1
              FROM pg_catalog.unnest(p_exchanges) AS requested(exchange_name)
              WHERE pg_catalog.upper(requested.exchange_name) =
                    pg_catalog.upper(variants.exchange_short_name)
            )
        )
      )
    ORDER BY composite_score DESC NULLS LAST, scores.symbol ASC
    LIMIT 50
  )
  SELECT
    pg_catalog.row_number() OVER (
      ORDER BY calculated.composite_score DESC NULLS LAST,
               calculated.symbol ASC
    )::bigint AS rank,
    calculated.symbol,
    calculated.composite_score,
    calculated.market_cap,
    calculated.revenue,
    calculated.ps_rank,
    calculated.evm_rank,
    calculated.sentiment_rank,
    calculated.profitability_rank,
    calculated.buyback_rank,
    calculated.peg_rank,
    calculated.div_yield_rank,
    calculated.health_rank,
    calculated.industry
  FROM calculated_scores AS calculated
  ORDER BY calculated.composite_score DESC NULLS LAST,
           calculated.symbol ASC;
END;
$function$;

GRANT EXECUTE
ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[])
TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[]) IS
  'Returns the top 50 curated Compass symbols that are not confirmed inactive by the validated FMP universe snapshot.';

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
  SELECT pg_catalog.pg_try_advisory_lock(43) INTO lock_acquired;
  IF NOT lock_acquired THEN
    RETURN 0;
  END IF;

  BEGIN
    IF public.is_quota_exceeded_v2() THEN
      PERFORM pg_catalog.pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    SELECT COALESCE(effective.max_batch_jobs, 25)
    INTO batch_capacity
    FROM public.get_effective_quota_usage_v2() AS effective;

    batch_capacity := LEAST(
      GREATEST(batch_capacity, 1),
      125
    );
    target_queue_depth := GREATEST(batch_capacity * 2, 50);

    SELECT pg_catalog.count(*)::integer
    INTO queue_depth
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.status = 'pending';

    initial_queue_depth := queue_depth;

    IF queue_depth >= target_queue_depth THEN
      PERFORM pg_catalog.pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    SELECT pg_catalog.array_agg(
      registry.data_type ORDER BY registry.data_type
    )
    INTO v_scheduled_types
    FROM public.data_type_registry_v2 AS registry
    WHERE registry.refresh_strategy IN ('scheduled', 'hybrid')
      AND registry.symbol_column IS NOT NULL;

    IF COALESCE(pg_catalog.array_length(v_scheduled_types, 1), 0) = 0 THEN
      PERFORM pg_catalog.pg_advisory_unlock(43);
      RETURN 0;
    END IF;

    FOR v_symbol IN
      SELECT listed.symbol
      FROM public.listed_symbols AS listed
      WHERE listed.is_active = true
        AND listed.fmp_is_actively_trading IS DISTINCT FROM false
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

      IF v_profile_exists THEN
        v_types_for_symbol := v_scheduled_types;
      ELSIF 'profile' = ANY(v_scheduled_types) THEN
        v_types_for_symbol := ARRAY['profile']::text[];
      ELSE
        v_types_for_symbol := ARRAY[]::text[];
      END IF;

      IF COALESCE(pg_catalog.array_length(v_types_for_symbol, 1), 0) > 0 THEN
        PERFORM public.check_and_queue_stale_batch_v2(
          p_symbol := v_symbol,
          p_data_types := v_types_for_symbol,
          p_priority := -1
        );
      END IF;

      UPDATE public.listed_symbols AS listed
      SET last_processed_at = pg_catalog.clock_timestamp()
      WHERE listed.symbol = v_symbol;

      symbols_checked := symbols_checked + 1;

      SELECT pg_catalog.count(*)::integer
      INTO queue_depth
      FROM public.api_call_queue_v2 AS queue
      WHERE queue.status = 'pending';
    END LOOP;

    queued_count := GREATEST(
      queue_depth - initial_queue_depth,
      0
    );

    INSERT INTO public.cron_health_logs (jobname, last_run)
    VALUES ('queue-scheduled-refreshes-v2', pg_catalog.now())
    ON CONFLICT (jobname) DO UPDATE
    SET last_run = EXCLUDED.last_run;

    PERFORM pg_catalog.pg_advisory_unlock(43);
    RETURN queued_count;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_catalog.pg_advisory_unlock(43);
      RAISE;
  END;
END;
$$;

COMMENT ON FUNCTION public.queue_scheduled_refreshes_v2() IS
  'Queues bounded TTL refreshes only for curated symbols that are not confirmed inactive by the validated FMP universe snapshot.';

CREATE OR REPLACE FUNCTION public.invoke_edge_function_v2(
  p_function_name text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_timeout_milliseconds integer DEFAULT 300000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  supabase_url text;
  internal_api_key text;
  request_id bigint;
BEGIN
  IF p_function_name NOT IN (
    'queue-processor-v2',
    'sync-fmp-symbol-universe'
  ) THEN
    RAISE EXCEPTION 'Edge Function is not allowed by invoke_edge_function_v2';
  END IF;

  SELECT secret.decrypted_secret
  INTO supabase_url
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'project_url';

  SELECT secret.decrypted_secret
  INTO internal_api_key
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'edge_functions_internal';

  IF supabase_url IS NULL THEN
    RAISE EXCEPTION 'Supabase URL not found in Vault';
  END IF;
  IF internal_api_key IS NULL THEN
    RAISE EXCEPTION 'Internal Edge Function API key not found in Vault';
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/' || p_function_name,
    headers := pg_catalog.jsonb_build_object(
      'apikey', internal_api_key,
      'Content-Type', 'application/json'
    ),
    body := p_payload,
    timeout_milliseconds := p_timeout_milliseconds
  )
  INTO request_id;

  RETURN pg_catalog.jsonb_build_object('request_id', request_id);
END;
$$;

COMMENT ON FUNCTION public.invoke_edge_function_v2(text, jsonb, integer) IS
  'Queues one allowlisted internal Edge Function invocation through pg_net using the edge_functions_internal secret key.';

REVOKE ALL
ON FUNCTION public.invoke_edge_function_v2(text, jsonb, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.invoke_edge_function_v2(text, jsonb, integer)
TO service_role;

SELECT cron.schedule(
  'sync-fmp-symbol-universe-v2',
  '15 3 * * *',
  $cron$
    SELECT public.invoke_edge_function_v2(
      'sync-fmp-symbol-universe',
      '{}'::jsonb
    );
  $cron$
);

COMMIT;
