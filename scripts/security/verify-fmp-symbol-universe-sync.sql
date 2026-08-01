BEGIN;

INSERT INTO public.listed_symbols (symbol, is_active)
VALUES
  ('QSU_KEEP', true),
  ('QSU_VANISHED', true),
  ('QSU_RENAMED', true),
  ('QSU_DELISTED', true),
  ('QSU_CONFLICT', true),
  ('QSU_FOREIGN', true),
  ('QSU_CURATED_OFF', false)
ON CONFLICT (symbol) DO UPDATE
SET is_active = EXCLUDED.is_active;

INSERT INTO public.profiles (symbol, exchange, is_actively_trading)
VALUES
  ('QSU_KEEP', 'NASDAQ', true),
  ('QSU_VANISHED', 'NASDAQ', true),
  ('QSU_RENAMED', 'NASDAQ', true),
  ('QSU_DELISTED', 'NASDAQ', true),
  ('QSU_CONFLICT', 'NASDAQ', true),
  ('QSU_FOREIGN', 'EURONEXT', true),
  ('QSU_CURATED_OFF', 'NASDAQ', true)
ON CONFLICT (symbol) DO UPDATE
SET exchange = EXCLUDED.exchange;

DO $$
DECLARE
  v_active jsonb;
  v_stock jsonb;
  v_result jsonb;
  v_capture_one timestamptz := now() - interval '2 days';
  v_capture_two timestamptz := now() - interval '1 day';
  v_capture_three timestamptz := now();
BEGIN
  SELECT jsonb_agg(row_data ORDER BY symbol)
  INTO v_active
  FROM (
    SELECT
      symbol,
      jsonb_build_object('symbol', symbol, 'name', symbol) AS row_data
    FROM (
      VALUES ('QSU_KEEP'), ('QSU_NEW'), ('QSU_CONFLICT')
    ) AS named(symbol)
    UNION ALL
    SELECT
      'QSU' || lpad(series::text, 5, '0'),
      jsonb_build_object(
        'symbol', 'QSU' || lpad(series::text, 5, '0'),
        'name', format('QA Symbol %s', series)
      )
    FROM generate_series(1, 9997) AS series
  ) AS active_rows;

  -- Active rows use "name" while stock rows use "companyName".
  SELECT jsonb_agg(
    jsonb_build_object(
      'symbol', item->>'symbol',
      'companyName', item->>'name'
    )
  )
  INTO v_stock
  FROM jsonb_array_elements(v_active) AS item;

  v_stock := v_stock || jsonb_build_array(
    jsonb_build_object('symbol', 'QSU_VANISHED', 'companyName', 'QSU Vanished'),
    jsonb_build_object('symbol', 'QSU_RENAMED', 'companyName', 'QSU Renamed'),
    jsonb_build_object('symbol', 'QSU_DELISTED', 'companyName', 'QSU Delisted'),
    jsonb_build_object('symbol', 'QSU_CURATED_OFF', 'companyName', 'QSU Curated Off'),
    jsonb_build_object('symbol', 'QSU_FOREIGN', 'companyName', 'QSU Foreign')
  );

  SELECT public.apply_fmp_symbol_universe_snapshot_v2(
    v_active,
    v_stock,
    '[{
      "date": "2026-07-28",
      "companyName": "QSU Renamed",
      "oldSymbol": "QSU_RENAMED",
      "newSymbol": "QSU_NEW"
    }]'::jsonb,
    '[
      {
        "symbol": "QSU_DELISTED",
        "companyName": "QSU Delisted",
        "exchange": "NASDAQ",
        "ipoDate": null,
        "delistedDate": "2026-07-30"
      },
      {
        "symbol": "QSU_CONFLICT",
        "companyName": "QSU Conflict",
        "exchange": "NASDAQ",
        "ipoDate": "2020-01-01",
        "delistedDate": "2026-07-30"
      }
    ]'::jsonb,
    v_capture_one,
    '{"actively_trading_list": 1, "stock_list": 1}'::jsonb,
    '{"actively_trading_list": "test", "stock_list": "test"}'::jsonb
  )
  INTO v_result;

  IF (v_result->>'active_symbols')::integer <> 10000
     OR (v_result->>'delisted_active_conflicts')::integer <> 1
  THEN
    RAISE EXCEPTION 'unexpected first snapshot summary: %', v_result;
  END IF;

  IF (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_KEEP') IS DISTINCT FROM true
     OR (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_RENAMED') IS DISTINCT FROM false
     OR (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_DELISTED') IS NOT NULL
     OR (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_CONFLICT') IS DISTINCT FROM true
     OR (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_VANISHED') IS NOT NULL
  THEN
    RAISE EXCEPTION 'first snapshot reconciliation did not fail closed';
  END IF;

  -- A second complete absence confirms a previously unknown inactive symbol.
  PERFORM public.apply_fmp_symbol_universe_snapshot_v2(
    v_active,
    v_stock,
    '[]'::jsonb,
    '[]'::jsonb,
    v_capture_two,
    '{}'::jsonb,
    '{}'::jsonb
  );

  IF (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_VANISHED') IS DISTINCT FROM false
     OR (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_DELISTED') IS DISTINCT FROM false
     OR (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_FOREIGN') IS NOT NULL
  THEN
    RAISE EXCEPTION 'absence confirmation or exchange scope was incorrect';
  END IF;

  -- Presence is authoritative and reverses the source status without changing
  -- Signal Card's independent curation flag.
  SELECT jsonb_agg(
    CASE
      WHEN item->>'symbol' = 'QSU00001'
        THEN jsonb_build_object('symbol', 'QSU_VANISHED', 'name', 'QSU Vanished')
      ELSE item
    END
  )
  INTO v_active
  FROM jsonb_array_elements(v_active) AS item;

  SELECT jsonb_agg(
    jsonb_build_object(
      'symbol', item->>'symbol',
      'companyName', item->>'name'
    )
  )
  INTO v_stock
  FROM jsonb_array_elements(v_active) AS item;

  v_stock := v_stock || jsonb_build_array(
    jsonb_build_object('symbol', 'QSU_RENAMED', 'companyName', 'QSU Renamed'),
    jsonb_build_object('symbol', 'QSU_DELISTED', 'companyName', 'QSU Delisted'),
    jsonb_build_object('symbol', 'QSU_CURATED_OFF', 'companyName', 'QSU Curated Off'),
    jsonb_build_object('symbol', 'QSU_FOREIGN', 'companyName', 'QSU Foreign')
  );

  PERFORM public.apply_fmp_symbol_universe_snapshot_v2(
    v_active,
    v_stock,
    '[]'::jsonb,
    '[]'::jsonb,
    v_capture_three,
    '{}'::jsonb,
    '{}'::jsonb
  );

  IF (SELECT fmp_is_actively_trading FROM public.listed_symbols WHERE symbol = 'QSU_VANISHED') IS DISTINCT FROM true
     OR (SELECT is_active FROM public.listed_symbols WHERE symbol = 'QSU_CURATED_OFF') IS DISTINCT FROM false
  THEN
    RAISE EXCEPTION 'presence or curation separation was not preserved';
  END IF;

  BEGIN
    PERFORM public.apply_fmp_symbol_universe_snapshot_v2(
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      v_capture_three + interval '1 minute',
      '{}'::jsonb,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'partial snapshot unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'partial snapshot unexpectedly succeeded' THEN
        RAISE;
      END IF;
  END;

  IF (
    SELECT count(*)
    FROM public.fmp_symbol_universe_runs
    WHERE captured_at IN (
      v_capture_one,
      v_capture_two,
      v_capture_three
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'rejected snapshot created a run';
  END IF;
END;
$$;

DO $$
BEGIN
  IF pg_get_functiondef(
    'public.queue_scheduled_refreshes_v2()'::regprocedure
  ) NOT ILIKE '%fmp_is_actively_trading IS DISTINCT FROM false%'
  THEN
    RAISE EXCEPTION 'scheduled refreshes ignore confirmed FMP inactivity';
  END IF;

  IF pg_get_functiondef(
    'public.get_weighted_leaderboard(jsonb,text[],text[])'::regprocedure
  ) NOT ILIKE '%fmp_is_actively_trading IS DISTINCT FROM false%'
  THEN
    RAISE EXCEPTION 'Compass leaderboard ignores confirmed FMP inactivity';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.apply_fmp_symbol_universe_snapshot_v2(jsonb,jsonb,jsonb,jsonb,timestamptz,jsonb,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'anon must not apply FMP symbol snapshots';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'public.apply_fmp_symbol_universe_snapshot_v2(jsonb,jsonb,jsonb,jsonb,timestamptz,jsonb,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role must apply FMP symbol snapshots';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'fmp_symbol_universe_runs',
        'fmp_symbol_status',
        'fmp_symbol_changes',
        'fmp_delisted_companies'
      )
      AND NOT relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'an internal FMP symbol table has RLS disabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM cron.job AS job
    WHERE job.jobname = 'sync-fmp-symbol-universe-v2'
      AND job.schedule = '15 3 * * *'
      AND job.active
  ) THEN
    RAISE EXCEPTION 'daily FMP symbol-universe cron is missing or inactive';
  END IF;

  IF pg_get_functiondef(
    'public.invoke_edge_function_v2(text,jsonb,integer)'::regprocedure
  ) NOT ILIKE '%sync-fmp-symbol-universe%'
  THEN
    RAISE EXCEPTION 'internal invoker does not allow the symbol sync';
  END IF;
END;
$$;

ROLLBACK;
