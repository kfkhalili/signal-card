-- Persist individual deterministic provider findings without resolving other
-- checks that share the same provider/endpoint scope.

CREATE OR REPLACE FUNCTION public.record_data_quality_issue_v2(
  p_symbol text,
  p_provider text,
  p_endpoint text,
  p_check_code text,
  p_severity text,
  p_message text,
  p_evidence jsonb DEFAULT '{}'::jsonb,
  p_field_name text DEFAULT NULL,
  p_source_date date DEFAULT NULL,
  p_source_period text DEFAULT NULL,
  p_source_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_symbol text := pg_catalog.upper(pg_catalog.btrim(p_symbol));
  v_provider text := pg_catalog.lower(pg_catalog.btrim(p_provider));
  v_endpoint text := pg_catalog.lower(pg_catalog.btrim(p_endpoint));
  v_check_code text := pg_catalog.btrim(p_check_code);
  v_field_name text := NULLIF(pg_catalog.btrim(p_field_name), '');
  v_source_period text := NULLIF(
    pg_catalog.btrim(p_source_period),
    ''
  );
  v_source_reference text := NULLIF(
    pg_catalog.btrim(p_source_reference),
    ''
  );
  v_fingerprint text;
  v_issue_id uuid;
BEGIN
  IF v_symbol IS NULL OR v_symbol = '' THEN
    RAISE EXCEPTION 'symbol must not be empty';
  END IF;
  IF v_provider IS NULL OR v_provider = '' THEN
    RAISE EXCEPTION 'provider must not be empty';
  END IF;
  IF v_endpoint IS NULL OR v_endpoint = '' THEN
    RAISE EXCEPTION 'endpoint must not be empty';
  END IF;
  IF v_check_code IS NULL OR v_check_code = '' THEN
    RAISE EXCEPTION 'check code must not be empty';
  END IF;
  IF p_message IS NULL OR pg_catalog.btrim(p_message) = '' THEN
    RAISE EXCEPTION 'message must not be empty';
  END IF;
  IF p_severity IS NULL
     OR p_severity NOT IN ('info', 'warning', 'critical')
  THEN
    RAISE EXCEPTION 'invalid severity: %', p_severity;
  END IF;
  IF p_evidence IS NULL OR pg_catalog.jsonb_typeof(p_evidence) <> 'object' THEN
    RAISE EXCEPTION 'evidence must be a JSON object';
  END IF;

  v_fingerprint := pg_catalog.concat_ws(
    '|',
    v_provider,
    v_endpoint,
    v_symbol,
    v_check_code,
    COALESCE(v_field_name, ''),
    COALESCE(p_source_date::text, ''),
    COALESCE(v_source_period, ''),
    COALESCE(v_source_reference, '')
  );

  INSERT INTO public.data_quality_issues (
    fingerprint,
    symbol,
    provider,
    endpoint,
    check_code,
    field_name,
    severity,
    status,
    message,
    evidence,
    source_date,
    source_period,
    source_reference,
    detected_at,
    last_seen_at,
    resolved_at,
    occurrence_count
  )
  VALUES (
    v_fingerprint,
    v_symbol,
    v_provider,
    v_endpoint,
    v_check_code,
    v_field_name,
    p_severity,
    'open',
    p_message,
    p_evidence,
    p_source_date,
    v_source_period,
    v_source_reference,
    pg_catalog.now(),
    pg_catalog.now(),
    NULL,
    1
  )
  ON CONFLICT (fingerprint) DO UPDATE
  SET
    severity = EXCLUDED.severity,
    status = 'open',
    message = EXCLUDED.message,
    evidence = EXCLUDED.evidence,
    last_seen_at = pg_catalog.now(),
    resolved_at = NULL,
    occurrence_count = public.data_quality_issues.occurrence_count + 1
  RETURNING id INTO v_issue_id;

  RETURN v_issue_id;
END;
$$;

ALTER FUNCTION public.record_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  text,
  text
) OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.record_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  text,
  text
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.record_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  text,
  text
)
TO service_role;

COMMENT ON FUNCTION public.record_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  text,
  text
) IS
  'Atomically opens or refreshes one deterministic provider-data issue without resolving unrelated findings.';

CREATE OR REPLACE FUNCTION public.resolve_data_quality_issue_v2(
  p_symbol text,
  p_provider text,
  p_endpoint text,
  p_check_code text,
  p_field_name text DEFAULT NULL,
  p_source_date date DEFAULT NULL,
  p_source_period text DEFAULT NULL,
  p_source_reference text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fingerprint text := pg_catalog.concat_ws(
    '|',
    pg_catalog.lower(pg_catalog.btrim(p_provider)),
    pg_catalog.lower(pg_catalog.btrim(p_endpoint)),
    pg_catalog.upper(pg_catalog.btrim(p_symbol)),
    pg_catalog.btrim(p_check_code),
    COALESCE(
      NULLIF(pg_catalog.btrim(p_field_name), ''),
      ''
    ),
    COALESCE(p_source_date::text, ''),
    COALESCE(
      NULLIF(pg_catalog.btrim(p_source_period), ''),
      ''
    ),
    COALESCE(
      NULLIF(pg_catalog.btrim(p_source_reference), ''),
      ''
    )
  );
BEGIN
  UPDATE public.data_quality_issues AS issue
  SET
    status = 'resolved',
    resolved_at = pg_catalog.now()
  WHERE issue.fingerprint = v_fingerprint
    AND issue.status = 'open';

  RETURN FOUND;
END;
$$;

ALTER FUNCTION public.resolve_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text
) OWNER TO postgres;

REVOKE ALL
ON FUNCTION public.resolve_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.resolve_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text
)
TO service_role;

COMMENT ON FUNCTION public.resolve_data_quality_issue_v2(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text
) IS
  'Resolves one deterministic provider-data issue by its stable fingerprint.';

-- Backfill source regressions that reached the failed queue before this
-- producer was deployed. Keeping the fingerprint independent of observed
-- timestamps gives each symbol one durable issue whose evidence can evolve.
WITH regression_jobs AS (
  SELECT DISTINCT ON (queue.symbol)
    queue.symbol,
    queue.id,
    queue.created_at,
    queue.processed_at,
    queue.retry_count,
    queue.error_message,
    pg_catalog.substring(
      queue.error_message,
      'source timestamp: (.+) vs existing:'
    ) AS incoming_timestamp,
    pg_catalog.substring(
      queue.error_message,
      'vs existing: (.+)\)\.?$'
    ) AS stored_timestamp
  FROM public.api_call_queue_v2 AS queue
  WHERE queue.data_type = 'financial-statements'
    AND queue.status = 'failed'
    AND queue.error_message
      ILIKE 'FMP returned older financial statements for %'
  ORDER BY
    queue.symbol,
    COALESCE(queue.processed_at, queue.created_at) DESC,
    queue.id
)
INSERT INTO public.data_quality_issues (
  fingerprint,
  symbol,
  provider,
  endpoint,
  check_code,
  field_name,
  severity,
  status,
  message,
  evidence,
  source_reference,
  detected_at,
  last_seen_at,
  occurrence_count
)
SELECT
  pg_catalog.concat_ws(
    '|',
    'fmp',
    'financial-statements',
    pg_catalog.upper(pg_catalog.btrim(regression.symbol)),
    'source_timestamp_regression',
    'accepted_date',
    '',
    '',
    'accepted-date-regression'
  ),
  pg_catalog.upper(pg_catalog.btrim(regression.symbol)),
  'fmp',
  'financial-statements',
  'source_timestamp_regression',
  'accepted_date',
  'warning',
  'open',
  'FMP returned financial statements older than the newest stored filing; the stored data was preserved.',
  pg_catalog.jsonb_build_object(
    'incoming_max_accepted_date', regression.incoming_timestamp,
    'stored_max_accepted_date', regression.stored_timestamp,
    'queue_job_id', regression.id,
    'queue_error', regression.error_message,
    'attempt_count', regression.retry_count + 1,
    'backfilled', true
  ),
  'accepted-date-regression',
  regression.created_at,
  COALESCE(regression.processed_at, regression.created_at),
  GREATEST(regression.retry_count + 1, 1)
FROM regression_jobs AS regression
ON CONFLICT (fingerprint) DO UPDATE
SET
  status = 'open',
  severity = EXCLUDED.severity,
  message = EXCLUDED.message,
  evidence = EXCLUDED.evidence,
  last_seen_at = GREATEST(
    public.data_quality_issues.last_seen_at,
    EXCLUDED.last_seen_at
  ),
  resolved_at = NULL,
  occurrence_count = GREATEST(
    public.data_quality_issues.occurrence_count,
    EXCLUDED.occurrence_count
  );
