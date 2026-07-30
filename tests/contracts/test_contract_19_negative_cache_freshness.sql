-- Contract #19: Successful Empty Fetch Freshness
-- Valid empty upstream responses must remain fresh for the registry TTL without
-- inserting sentinel business data. Failed writes must not advance freshness.

BEGIN;
SELECT plan(14);

DELETE FROM public.api_call_queue_v2
WHERE symbol = 'NEGATIVE_CACHE_TEST'
  AND data_type = 'insider-transactions';

DELETE FROM public.data_fetch_freshness_v2
WHERE symbol = 'NEGATIVE_CACHE_TEST'
  AND data_type = 'insider-transactions';

SELECT has_table(
  'public',
  'data_fetch_freshness_v2',
  'Contract #19: explicit fetch freshness table exists'
);

SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.data_fetch_freshness_v2'::regclass
  ),
  'Contract #19: freshness table has RLS enabled'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc procedure
    JOIN pg_namespace namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'record_data_fetch_freshness_v2'
      AND procedure.prosecdef
  ),
  'Contract #19: freshness recorder is SECURITY DEFINER'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.record_data_fetch_freshness_v2(text,text,boolean,bigint)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.record_data_fetch_freshness_v2(text,text,boolean,bigint)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'service_role',
    'public.record_data_fetch_freshness_v2(text,text,boolean,bigint)',
    'EXECUTE'
  ),
  'Contract #19: only the service role can call the freshness recorder'
);

SELECT ok(
  has_table_privilege(
    'service_role',
    'public.data_fetch_freshness_v2',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'service_role',
    'public.data_fetch_freshness_v2',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'service_role',
    'public.data_fetch_freshness_v2',
    'UPDATE'
  ),
  'Contract #19: service code reads the ledger but writes only through the validated recorder'
);

SELECT lives_ok(
  $$
    SELECT public.record_data_fetch_freshness_v2(
      'negative_cache_test',
      'insider-transactions',
      FALSE,
      1234
    )
  $$,
  'Contract #19: a successful empty response can be recorded'
);

SELECT is(
  (
    SELECT result_kind
    FROM public.data_fetch_freshness_v2
    WHERE symbol = 'NEGATIVE_CACHE_TEST'
      AND data_type = 'insider-transactions'
  ),
  'empty',
  'Contract #19: empty responses are distinguished from data responses'
);

SELECT is(
  public.effective_data_fetch_timestamp_v2(
    'NEGATIVE_CACHE_TEST',
    'insider-transactions',
    NULL
  ),
  (
    SELECT last_success_at
    FROM public.data_fetch_freshness_v2
    WHERE symbol = 'NEGATIVE_CACHE_TEST'
      AND data_type = 'insider-transactions'
  ),
  'Contract #19: explicit success supplies freshness when no data row exists'
);

SELECT lives_ok(
  $$
    SELECT public.check_and_queue_stale_batch_v2(
      'NEGATIVE_CACHE_TEST',
      ARRAY['insider-transactions'],
      1
    )
  $$,
  'Contract #19: staleness checks accept successful empty freshness'
);

SELECT is(
  (
    SELECT COUNT(*)::INTEGER
    FROM public.api_call_queue_v2
    WHERE symbol = 'NEGATIVE_CACHE_TEST'
      AND data_type = 'insider-transactions'
      AND status IN ('pending', 'processing')
  ),
  0,
  'Contract #19: a fresh empty response is not immediately requeued'
);

CREATE TEMP TABLE negative_cache_timestamp_before_failure AS
SELECT last_success_at
FROM public.data_fetch_freshness_v2
WHERE symbol = 'NEGATIVE_CACHE_TEST'
  AND data_type = 'insider-transactions';

DO $$
BEGIN
  BEGIN
    PERFORM public.record_data_fetch_freshness_v2(
      'NEGATIVE_CACHE_TEST',
      'insider-transactions',
      FALSE,
      -1
    );
    RAISE EXCEPTION 'negative response size should have failed';
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
END;
$$;

SELECT is(
  (
    SELECT last_success_at
    FROM public.data_fetch_freshness_v2
    WHERE symbol = 'NEGATIVE_CACHE_TEST'
      AND data_type = 'insider-transactions'
  ),
  (
    SELECT last_success_at
    FROM negative_cache_timestamp_before_failure
  ),
  'Contract #19: a failed record attempt does not advance freshness'
);

UPDATE public.data_fetch_freshness_v2
SET last_success_at = NOW() - INTERVAL '3 days'
WHERE symbol = 'NEGATIVE_CACHE_TEST'
  AND data_type = 'insider-transactions';

SELECT lives_ok(
  $$
    SELECT public.check_and_queue_stale_batch_v2(
      'NEGATIVE_CACHE_TEST',
      ARRAY['insider-transactions'],
      1
    )
  $$,
  'Contract #19: an expired empty response can be checked normally'
);

SELECT is(
  (
    SELECT COUNT(*)::INTEGER
    FROM public.api_call_queue_v2
    WHERE symbol = 'NEGATIVE_CACHE_TEST'
      AND data_type = 'insider-transactions'
      AND status = 'pending'
  ),
  1,
  'Contract #19: an expired empty response becomes refreshable again'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc procedure
    JOIN pg_namespace namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'check_and_queue_stale_data_from_presence_v2'
      AND pg_get_functiondef(procedure.oid)
        ~* 'effective_data_fetch_timestamp_v2'
  ),
  'Contract #19: presence-driven refreshes consume explicit successful-fetch freshness'
);

SELECT * FROM finish();
ROLLBACK;
