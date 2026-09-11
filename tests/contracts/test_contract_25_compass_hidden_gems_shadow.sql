-- Contract #25: Hidden Gems is a read-only, service-only discovery screen.

BEGIN;
SELECT plan(9);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'get_compass_hidden_gems_shadow_v1'
      AND procedure.provolatile = 's'
      AND NOT procedure.prosecdef
  ),
  'Contract #25: Hidden Gems exists, is stable, and uses caller permissions'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])',
    'EXECUTE'
  ),
  'Contract #25: only service code can execute Hidden Gems'
);

SELECT ok(
  position(
    'api_call_queue_v2'
    IN pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'::regprocedure
    )
  ) = 0
  AND position(
    'http_'
    IN pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #25: Hidden Gems neither queues work nor invokes HTTP'
);

SELECT ok(
  position(
    'compass_pillar_scores'
    IN pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'::regprocedure
    )
  ) > 0
  AND position(
    'financial_statements'
    IN pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #25: Hidden Gems reuses precomputed Growth v2 scores'
);

SELECT ok(
  position(
    'exchange_variants'
    IN pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'::regprocedure
    )
  ) = 0,
  'Contract #25: Hidden Gems does not infer tradability from exchange variants'
);

INSERT INTO public.profiles (
  symbol,
  company_name,
  price,
  market_cap,
  average_volume,
  exchange,
  sector,
  industry,
  is_etf,
  is_fund,
  is_adr,
  modified_at
)
VALUES
  (
    'VFY_GEM_EARLY', 'Verification Early Discovery', 10, 100000000,
    100000, 'NASDAQ', 'Technology', 'VFY Hidden Gem',
    false, false, false, pg_catalog.now()
  ),
  (
    'VFY_GEM_REPRICED', 'Verification Already Repriced', 30, 5000000000,
    100000, 'NASDAQ', 'Technology', 'VFY Hidden Gem',
    false, false, false, pg_catalog.now()
  ),
  (
    'VFY_GEM_BAD_DATA', 'Verification Critical Data Issue', 10, 75000000,
    100000, 'NASDAQ', 'Technology', 'VFY Hidden Gem',
    false, false, false, pg_catalog.now()
  ),
  (
    'VFY_GEM_QUALITY_DIP', 'Verification Quality Dislocation', 80, 100000000000,
    100000, 'NASDAQ', 'Technology', 'VFY Hidden Gem',
    false, false, false, pg_catalog.now()
  );

INSERT INTO public.listed_symbols (
  symbol,
  is_active,
  fmp_is_actively_trading
)
VALUES
  ('VFY_GEM_EARLY', true, true),
  ('VFY_GEM_REPRICED', true, true),
  ('VFY_GEM_BAD_DATA', true, true),
  ('VFY_GEM_QUALITY_DIP', true, true);

INSERT INTO public.compass_pillar_scores (
  symbol,
  industry,
  market_cap,
  norm_health,
  norm_growth_v2,
  growth_v2_metrics,
  growth_v2_updated_at,
  updated_at
)
VALUES
  (
    'VFY_GEM_EARLY', 'VFY Hidden Gem', 100000000, 90, 90,
    '{"growth_consistency":0.90,"risk_flags":[]}'::jsonb,
    pg_catalog.now(), pg_catalog.now()
  ),
  (
    'VFY_GEM_REPRICED', 'VFY Hidden Gem', 5000000000, 98, 98,
    '{"growth_consistency":0.98,"risk_flags":[]}'::jsonb,
    pg_catalog.now(), pg_catalog.now()
  ),
  (
    'VFY_GEM_BAD_DATA', 'VFY Hidden Gem', 75000000, 99, 99,
    '{"growth_consistency":0.99,"risk_flags":[]}'::jsonb,
    pg_catalog.now(), pg_catalog.now()
  ),
  (
    'VFY_GEM_QUALITY_DIP', 'VFY Hidden Gem', 100000000000, 95, 95,
    '{"growth_consistency":0.95,"risk_flags":[]}'::jsonb,
    pg_catalog.now(), pg_catalog.now()
  );

INSERT INTO public.ratios_ttm (
  symbol,
  enterprise_value_multiple_ttm,
  price_to_free_cash_flow_ratio_ttm,
  fetched_at,
  updated_at
)
VALUES
  ('VFY_GEM_EARLY', 4, 5, pg_catalog.now(), pg_catalog.now()),
  ('VFY_GEM_REPRICED', 5, 6, pg_catalog.now(), pg_catalog.now()),
  ('VFY_GEM_BAD_DATA', 2, 3, pg_catalog.now(), pg_catalog.now()),
  ('VFY_GEM_QUALITY_DIP', 10, 15, pg_catalog.now(), pg_catalog.now());

INSERT INTO public.live_quote_indicators (
  symbol,
  current_price,
  api_timestamp,
  sma_200d,
  year_high,
  year_low,
  fetched_at
)
VALUES
  (
    'VFY_GEM_EARLY', 10,
    EXTRACT(EPOCH FROM pg_catalog.now())::bigint,
    9.8, 15, 8, pg_catalog.now()
  ),
  (
    'VFY_GEM_REPRICED', 30,
    EXTRACT(EPOCH FROM pg_catalog.now())::bigint,
    10, 30, 5, pg_catalog.now()
  ),
  (
    'VFY_GEM_BAD_DATA', 10,
    EXTRACT(EPOCH FROM pg_catalog.now())::bigint,
    10, 15, 8, pg_catalog.now()
  ),
  (
    'VFY_GEM_QUALITY_DIP', 80,
    EXTRACT(EPOCH FROM pg_catalog.now())::bigint,
    100, 150, 75, pg_catalog.now()
  );

INSERT INTO public.grades_historical (
  symbol,
  date,
  analyst_ratings_strong_buy,
  analyst_ratings_buy,
  analyst_ratings_hold,
  analyst_ratings_sell,
  analyst_ratings_strong_sell
)
VALUES
  ('VFY_GEM_EARLY', CURRENT_DATE, 1, 0, 0, 0, 0),
  ('VFY_GEM_REPRICED', CURRENT_DATE, 5, 5, 10, 0, 0),
  ('VFY_GEM_QUALITY_DIP', CURRENT_DATE, 10, 10, 10, 0, 0);

INSERT INTO public.insider_transactions (
  symbol,
  filing_date,
  transaction_date,
  reporting_cik,
  transaction_type,
  acquisition_or_disposition,
  securities_transacted,
  price
)
VALUES
  (
    'VFY_GEM_EARLY', CURRENT_DATE, CURRENT_DATE,
    'VFY-GEM-BUYER-1', 'P-Purchase', 'A', 5000, 10
  ),
  (
    'VFY_GEM_EARLY', CURRENT_DATE - 1, CURRENT_DATE - 1,
    'VFY-GEM-BUYER-2', 'P-Purchase', 'A', 5000, 10
  );

INSERT INTO public.data_quality_issues (
  fingerprint,
  symbol,
  provider,
  endpoint,
  check_code,
  severity,
  status,
  message
)
VALUES (
  'vfy-hidden-gem-critical-data',
  'VFY_GEM_BAD_DATA',
  'fmp',
  '/stable/income-statement',
  'reporting_period_integrity',
  'critical',
  'open',
  'Verification critical data issue'
);

SELECT is(
  (
    SELECT result.symbol
    FROM public.get_compass_hidden_gems_shadow_v1(
      10,
      ARRAY['VFY Hidden Gem'],
      NULL
    ) AS result
    ORDER BY result.rank
    LIMIT 1
  ),
  'VFY_GEM_EARLY',
  'Contract #25: improvement plus value, low attention, and insider buying outrank rerating'
);

SELECT ok(
  (
    SELECT result.repricing_penalty
    FROM public.get_compass_hidden_gems_shadow_v1(
      10,
      ARRAY['VFY Hidden Gem'],
      NULL
    ) AS result
    WHERE result.symbol = 'VFY_GEM_REPRICED'
  ) > (
    SELECT result.repricing_penalty
    FROM public.get_compass_hidden_gems_shadow_v1(
      10,
      ARRAY['VFY Hidden Gem'],
      NULL
    ) AS result
    WHERE result.symbol = 'VFY_GEM_EARLY'
  ),
  'Contract #25: an extreme price rerating receives a larger penalty'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.get_compass_hidden_gems_shadow_v1(
      10,
      ARRAY['VFY Hidden Gem'],
      NULL
    ) AS result
    WHERE result.symbol = 'VFY_GEM_BAD_DATA'
  ),
  'Contract #25: open critical financial-data issues are excluded'
);

SELECT ok(
  (
    SELECT result.opportunity_type = 'quality_dislocation'
      AND result.dislocation_score >= 60
    FROM public.get_compass_hidden_gems_shadow_v1(
      10,
      ARRAY['VFY Hidden Gem'],
      NULL
    ) AS result
    WHERE result.symbol = 'VFY_GEM_QUALITY_DIP'
  ),
  'Contract #25: a strong company below its price trend enters the quality-dislocation lane'
);

SELECT * FROM finish();
ROLLBACK;
