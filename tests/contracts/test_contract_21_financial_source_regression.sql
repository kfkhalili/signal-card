-- Contract #21: Financial Source Timestamp Regressions
-- Deterministic upstream regressions are durable quality issues, preserve
-- successful freshness, and fail once without consuming retry bandwidth.

BEGIN;
SELECT plan(14);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'record_data_quality_issue_v2'
      AND procedure.prosecdef
  ),
  'Contract #21: individual issue recorder is SECURITY DEFINER'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'resolve_data_quality_issue_v2'
      AND procedure.prosecdef
  ),
  'Contract #21: individual issue resolver is SECURITY DEFINER'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_data_quality_issue_v2(text,text,text,text,text,text,jsonb,text,date,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.record_data_quality_issue_v2(text,text,text,text,text,text,jsonb,text,date,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.record_data_quality_issue_v2(text,text,text,text,text,text,jsonb,text,date,text,text)',
    'EXECUTE'
  ),
  'Contract #21: only service code can record individual issues'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.resolve_data_quality_issue_v2(text,text,text,text,text,date,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.resolve_data_quality_issue_v2(text,text,text,text,text,date,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.resolve_data_quality_issue_v2(text,text,text,text,text,date,text,text)',
    'EXECUTE'
  ),
  'Contract #21: only service code can resolve individual issues'
);

SELECT lives_ok(
  $$
    SELECT public.record_data_quality_issue_v2(
      p_symbol := 'dqtest',
      p_provider := 'FMP',
      p_endpoint := 'financial-statements',
      p_check_code := 'source_timestamp_regression',
      p_severity := 'warning',
      p_message := 'Provider source timestamp regressed.',
      p_evidence := jsonb_build_object(
        'incoming_max_accepted_date', '2025-06-30 00:00:00',
        'stored_max_accepted_date', '2025-09-19T16:00:54+00:00'
      ),
      p_field_name := 'accepted_date',
      p_source_reference := 'accepted-date-regression'
    )
  $$,
  'Contract #21: a source regression can be recorded'
);

SELECT is(
  (
    SELECT concat_ws('|', symbol, check_code, severity, status)
    FROM public.data_quality_issues
    WHERE symbol = 'DQTEST'
      AND check_code = 'source_timestamp_regression'
  ),
  'DQTEST|source_timestamp_regression|warning|open',
  'Contract #21: the durable issue is normalized, open, and warning severity'
);

SELECT lives_ok(
  $$
    SELECT public.record_data_quality_issue_v2(
      p_symbol := 'DQTEST',
      p_provider := 'fmp',
      p_endpoint := 'financial-statements',
      p_check_code := 'source_timestamp_regression',
      p_severity := 'warning',
      p_message := 'Provider source timestamp regressed again.',
      p_evidence := '{}'::jsonb,
      p_field_name := 'accepted_date',
      p_source_reference := 'accepted-date-regression'
    )
  $$,
  'Contract #21: a repeated observation updates the same issue'
);

SELECT is(
  (
    SELECT occurrence_count
    FROM public.data_quality_issues
    WHERE symbol = 'DQTEST'
      AND check_code = 'source_timestamp_regression'
  ),
  2,
  'Contract #21: repeated observations increment occurrence count'
);

SELECT lives_ok(
  $$
    SELECT public.record_data_quality_issue_v2(
      p_symbol := 'DQTEST',
      p_provider := 'fmp',
      p_endpoint := 'financial-statements',
      p_check_code := 'balance_sheet_reconciliation',
      p_severity := 'warning',
      p_message := 'Unrelated reconciliation finding.',
      p_evidence := '{}'::jsonb,
      p_field_name := 'total_assets',
      p_source_reference := 'accounting-equation'
    )
  $$,
  'Contract #21: an unrelated financial finding can coexist'
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
  'DQTEST',
  'financial-statements',
  'processing',
  -1,
  0,
  3,
  600000,
  now()
);

SELECT lives_ok(
  $$
    SELECT public.fail_queue_job_v2(
      (
        SELECT id
        FROM public.api_call_queue_v2
        WHERE symbol = 'DQTEST'
          AND data_type = 'financial-statements'
          AND status = 'processing'
        ORDER BY created_at DESC
        LIMIT 1
      ),
      'Stale source timestamp: provider returned older data.',
      600000
    )
  $$,
  'Contract #21: source-regression failure is accepted by queue management'
);

SELECT is(
  (
    SELECT status
    FROM public.api_call_queue_v2
    WHERE symbol = 'DQTEST'
      AND data_type = 'financial-statements'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  'failed',
  'Contract #21: deterministic source regression fails immediately'
);

SELECT is(
  (
    SELECT retry_count
    FROM public.api_call_queue_v2
    WHERE symbol = 'DQTEST'
      AND data_type = 'financial-statements'
    ORDER BY created_at DESC
    LIMIT 1
  ),
  0,
  'Contract #21: deterministic source regression consumes no retry'
);

SELECT is(
  public.resolve_data_quality_issue_v2(
    p_symbol := 'DQTEST',
    p_provider := 'fmp',
    p_endpoint := 'financial-statements',
    p_check_code := 'source_timestamp_regression',
    p_field_name := 'accepted_date',
    p_source_reference := 'accepted-date-regression'
  ),
  true,
  'Contract #21: a later valid response resolves the regression fingerprint'
);

SELECT is(
  (
    SELECT concat_ws(
      '|',
      max(status) FILTER (
        WHERE check_code = 'source_timestamp_regression'
      ),
      max(status) FILTER (
        WHERE check_code = 'balance_sheet_reconciliation'
      )
    )
    FROM public.data_quality_issues
    WHERE symbol = 'DQTEST'
      AND provider = 'fmp'
      AND endpoint = 'financial-statements'
  ),
  'resolved|open',
  'Contract #21: resolving the regression leaves unrelated findings open'
);

SELECT * FROM finish();
ROLLBACK;
