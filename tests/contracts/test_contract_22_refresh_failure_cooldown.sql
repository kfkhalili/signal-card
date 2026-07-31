-- Contract #22: Cross-cycle Refresh Failure Cooldown
-- Terminal failures must not be recreated on every scheduled sweep. Cooldown
-- never counts as successful freshness, demand work may bypass it, and a
-- subsequent success clears it.

BEGIN;
SELECT plan(19);

SELECT has_table(
  'public',
  'refresh_failure_cooldowns_v2',
  'Contract #22: terminal failure cooldown state exists'
);

SELECT ok(
  (
    SELECT table_name.relrowsecurity
    FROM pg_class AS table_name
    JOIN pg_namespace AS namespace
      ON namespace.oid = table_name.relnamespace
    WHERE namespace.nspname = 'public'
      AND table_name.relname = 'refresh_failure_cooldowns_v2'
  ),
  'Contract #22: cooldown state has RLS enabled'
);

SELECT ok(
  has_table_privilege(
    'service_role',
    'public.refresh_failure_cooldowns_v2',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'anon',
    'public.refresh_failure_cooldowns_v2',
    'SELECT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.refresh_failure_cooldowns_v2',
    'SELECT'
  ),
  'Contract #22: cooldown diagnostics are operations-only'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'is_refresh_failure_cooldown_active_v2'
      AND procedure.prosecdef
  ),
  'Contract #22: cooldown check is SECURITY DEFINER'
);

SELECT trigger_is(
  'public',
  'api_call_queue_v2',
  'maintain_refresh_failure_cooldown_v2',
  'public',
  'maintain_refresh_failure_cooldown_v2',
  'Contract #22: queue outcomes maintain cooldown through one trigger'
);

SELECT is(
  public.refresh_failure_retry_interval_v2(
    'Profile validation failed',
    1
  ),
  interval '1 hour',
  'Contract #22: first generic terminal failure waits one hour'
);

SELECT is(
  public.refresh_failure_retry_interval_v2(
    'Profile validation failed',
    6
  ),
  interval '24 hours',
  'Contract #22: generic exponential cooldown caps at 24 hours'
);

SELECT is(
  public.refresh_failure_retry_interval_v2(
    'Stale source timestamp: provider returned older data',
    1
  ),
  interval '24 hours',
  'Contract #22: deterministic timestamp regression waits 24 hours immediately'
);

DELETE FROM public.api_call_queue_v2
WHERE symbol IN (
  'COOLDOWN_TEST',
  'COOLDOWN_STALE',
  'COOLDOWN_TRANSIENT'
);

DELETE FROM public.data_fetch_freshness_v2
WHERE symbol IN ('COOLDOWN_TEST', 'COOLDOWN_STALE');

DELETE FROM public.refresh_failure_cooldowns_v2
WHERE symbol IN (
  'COOLDOWN_TEST',
  'COOLDOWN_STALE',
  'COOLDOWN_TRANSIENT'
);

INSERT INTO public.api_call_queue_v2 (
  symbol,
  data_type,
  status,
  priority,
  retry_count,
  max_retries,
  estimated_data_size_bytes,
  processed_at
)
VALUES (
  'COOLDOWN_TRANSIENT',
  'profile',
  'processing',
  -1,
  0,
  3,
  50000,
  now()
);

SELECT public.fail_queue_job_v2(
  (
    SELECT id
    FROM public.api_call_queue_v2
    WHERE symbol = 'COOLDOWN_TRANSIENT'
      AND data_type = 'profile'
      AND status = 'processing'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  'Temporary provider failure',
  1000
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.api_call_queue_v2
    WHERE symbol = 'COOLDOWN_TRANSIENT'
      AND data_type = 'profile'
      AND status = 'pending'
      AND retry_count = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.refresh_failure_cooldowns_v2
    WHERE symbol = 'COOLDOWN_TRANSIENT'
      AND data_type = 'profile'
  ),
  'Contract #22: in-cycle retry does not create cross-cycle cooldown'
);

SELECT public.record_data_fetch_freshness_v2(
  'COOLDOWN_TEST',
  'profile',
  true,
  100
);

CREATE TEMP TABLE cooldown_freshness_fixture AS
SELECT last_success_at
FROM public.data_fetch_freshness_v2
WHERE symbol = 'COOLDOWN_TEST'
  AND data_type = 'profile';

INSERT INTO public.api_call_queue_v2 (
  symbol,
  data_type,
  status,
  priority,
  retry_count,
  max_retries,
  estimated_data_size_bytes,
  processed_at
)
VALUES (
  'COOLDOWN_TEST',
  'profile',
  'processing',
  -1,
  3,
  3,
  50000,
  now()
);

SELECT lives_ok(
  $$
    SELECT public.fail_queue_job_v2(
      (
        SELECT id
        FROM public.api_call_queue_v2
        WHERE symbol = 'COOLDOWN_TEST'
          AND data_type = 'profile'
          AND status = 'processing'
        ORDER BY created_at DESC
        LIMIT 1
      ),
      'Profile validation failed',
      1000
    )
  $$,
  'Contract #22: terminal generic failure records queue and cooldown state'
);

SELECT is(
  (
    SELECT consecutive_failures = 1 AND retry_after > now()
    FROM public.refresh_failure_cooldowns_v2
    WHERE symbol = 'COOLDOWN_TEST'
      AND data_type = 'profile'
  ),
  true,
  'Contract #22: first terminal failure activates one cooldown record'
);

INSERT INTO public.api_call_queue_v2 (
  symbol,
  data_type,
  status,
  priority,
  retry_count,
  max_retries,
  estimated_data_size_bytes,
  processed_at,
  error_message
)
VALUES (
  'COOLDOWN_TEST',
  'profile',
  'failed',
  -1,
  3,
  3,
  50000,
  now(),
  'Profile validation failed again'
);

SELECT ok(
  (
    SELECT consecutive_failures = 2
      AND retry_after >= last_failure_at + interval '1 hour 59 minutes'
    FROM public.refresh_failure_cooldowns_v2
    WHERE symbol = 'COOLDOWN_TEST'
      AND data_type = 'profile'
  ),
  'Contract #22: repeated terminal failure advances exponential cooldown'
);

SELECT is(
  (
    SELECT freshness.last_success_at
    FROM public.data_fetch_freshness_v2 AS freshness
    WHERE freshness.symbol = 'COOLDOWN_TEST'
      AND freshness.data_type = 'profile'
  ),
  (
    SELECT fixture.last_success_at
    FROM cooldown_freshness_fixture AS fixture
  ),
  'Contract #22: failure does not advance successful freshness'
);

SELECT is(
  public.queue_refresh_if_not_exists_v2(
    'COOLDOWN_TEST',
    'profile',
    -1,
    50000
  ),
  NULL::uuid,
  'Contract #22: active cooldown suppresses scheduled requeue'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.api_call_queue_v2
    WHERE symbol = 'COOLDOWN_TEST'
      AND data_type = 'profile'
      AND status IN ('pending', 'processing')
  ),
  0,
  'Contract #22: suppressed scheduled work creates no active job'
);

SELECT isnt(
  public.queue_refresh_if_not_exists_v2(
    'COOLDOWN_TEST',
    'profile',
    10,
    50000
  ),
  NULL::uuid,
  'Contract #22: demand-driven work bypasses cooldown'
);

UPDATE public.api_call_queue_v2
SET
  status = 'processing',
  processed_at = now()
WHERE symbol = 'COOLDOWN_TEST'
  AND data_type = 'profile'
  AND status = 'pending';

SELECT lives_ok(
  $$
    SELECT public.complete_queue_job_v2(
      (
        SELECT id
        FROM public.api_call_queue_v2
        WHERE symbol = 'COOLDOWN_TEST'
          AND data_type = 'profile'
          AND status = 'processing'
        ORDER BY created_at DESC
        LIMIT 1
      ),
      50000,
      1
    )
  $$,
  'Contract #22: a successful bypass job completes normally'
);

SELECT is(
  public.is_refresh_failure_cooldown_active_v2(
    'COOLDOWN_TEST',
    'profile'
  ),
  false,
  'Contract #22: successful completion clears prior cooldown'
);

INSERT INTO public.api_call_queue_v2 (
  symbol,
  data_type,
  status,
  priority,
  retry_count,
  max_retries,
  estimated_data_size_bytes,
  processed_at
)
VALUES (
  'COOLDOWN_STALE',
  'financial-statements',
  'processing',
  -1,
  0,
  3,
  600000,
  now()
);

SELECT public.fail_queue_job_v2(
  (
    SELECT id
    FROM public.api_call_queue_v2
    WHERE symbol = 'COOLDOWN_STALE'
      AND data_type = 'financial-statements'
      AND status = 'processing'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  'Stale source timestamp: provider returned older data',
  600000
);

SELECT ok(
  (
    SELECT retry_after >= last_failure_at + interval '23 hours 59 minutes'
    FROM public.refresh_failure_cooldowns_v2
    WHERE symbol = 'COOLDOWN_STALE'
      AND data_type = 'financial-statements'
  ),
  'Contract #22: source regression receives the deterministic 24-hour cooldown'
);

SELECT * FROM finish();
ROLLBACK;
