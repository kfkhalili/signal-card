CREATE TABLE IF NOT EXISTS public.data_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    check_code TEXT NOT NULL,
    field_name TEXT,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    message TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
    source_date DATE,
    source_period TEXT,
    source_reference TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT data_quality_issues_severity_check
        CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT data_quality_issues_status_check
        CHECK (status IN ('open', 'resolved', 'ignored')),
    CONSTRAINT data_quality_issues_occurrence_count_check
        CHECK (occurrence_count > 0)
);

COMMENT ON TABLE public.data_quality_issues IS
    'Persistent, reproducible findings raised by deterministic provider-data validation.';
COMMENT ON COLUMN public.data_quality_issues.fingerprint IS
    'Stable identity for one provider/symbol/check/source combination.';
COMMENT ON COLUMN public.data_quality_issues.evidence IS
    'Machine-readable observed values and reconciliation differences; raw provider payloads remain in their source tables.';

CREATE INDEX IF NOT EXISTS idx_data_quality_issues_symbol_status
    ON public.data_quality_issues (symbol, status, severity);
CREATE INDEX IF NOT EXISTS idx_data_quality_issues_provider_endpoint
    ON public.data_quality_issues (provider, endpoint, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_quality_issues_open_last_seen
    ON public.data_quality_issues (last_seen_at DESC)
    WHERE status = 'open';

CREATE OR REPLACE TRIGGER handle_data_quality_issues_updated_at
BEFORE UPDATE ON public.data_quality_issues
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime('updated_at');

ALTER TABLE public.data_quality_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to data quality issues"
    ON public.data_quality_issues;
CREATE POLICY "Allow public read access to data quality issues"
    ON public.data_quality_issues
    FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Allow service role full access to data quality issues"
    ON public.data_quality_issues;
CREATE POLICY "Allow service role full access to data quality issues"
    ON public.data_quality_issues
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON TABLE public.data_quality_issues
    FROM anon, authenticated;
GRANT SELECT ON TABLE public.data_quality_issues TO anon, authenticated;
GRANT ALL ON TABLE public.data_quality_issues TO service_role;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'data_quality_issues'
    ) THEN
        ALTER PUBLICATION supabase_realtime
            ADD TABLE public.data_quality_issues;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_data_quality_issues(
    p_symbol TEXT,
    p_provider TEXT,
    p_endpoint TEXT,
    p_findings JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_seen_count INTEGER := 0;
    v_resolved_count INTEGER := 0;
BEGIN
    IF p_symbol IS NULL OR BTRIM(p_symbol) = '' THEN
        RAISE EXCEPTION 'p_symbol must not be empty';
    END IF;
    IF p_provider IS NULL OR BTRIM(p_provider) = '' THEN
        RAISE EXCEPTION 'p_provider must not be empty';
    END IF;
    IF p_endpoint IS NULL OR BTRIM(p_endpoint) = '' THEN
        RAISE EXCEPTION 'p_endpoint must not be empty';
    END IF;
    IF p_findings IS NULL OR JSONB_TYPEOF(p_findings) <> 'array' THEN
        RAISE EXCEPTION 'p_findings must be a JSON array';
    END IF;

    WITH parsed_findings AS (
        SELECT
            finding,
            CONCAT_WS(
                '|',
                LOWER(BTRIM(p_provider)),
                LOWER(BTRIM(p_endpoint)),
                UPPER(BTRIM(p_symbol)),
                finding->>'check_code',
                COALESCE(finding->>'field_name', ''),
                COALESCE(finding->>'source_date', ''),
                COALESCE(finding->>'source_period', ''),
                COALESCE(finding->>'source_reference', '')
            ) AS fingerprint
        FROM JSONB_ARRAY_ELEMENTS(p_findings) AS finding
        WHERE NULLIF(BTRIM(finding->>'check_code'), '') IS NOT NULL
          AND NULLIF(BTRIM(finding->>'message'), '') IS NOT NULL
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
        source_date,
        source_period,
        source_reference,
        detected_at,
        last_seen_at,
        resolved_at,
        occurrence_count
    )
    SELECT
        fingerprint,
        UPPER(BTRIM(p_symbol)),
        LOWER(BTRIM(p_provider)),
        LOWER(BTRIM(p_endpoint)),
        finding->>'check_code',
        NULLIF(finding->>'field_name', ''),
        CASE
            WHEN finding->>'severity' IN ('info', 'warning', 'critical')
                THEN finding->>'severity'
            ELSE 'warning'
        END,
        'open',
        finding->>'message',
        COALESCE(finding->'evidence', '{}'::JSONB),
        NULLIF(finding->>'source_date', '')::DATE,
        NULLIF(finding->>'source_period', ''),
        NULLIF(finding->>'source_reference', ''),
        NOW(),
        NOW(),
        NULL,
        1
    FROM parsed_findings
    ON CONFLICT (fingerprint) DO UPDATE
    SET
        severity = EXCLUDED.severity,
        status = 'open',
        message = EXCLUDED.message,
        evidence = EXCLUDED.evidence,
        last_seen_at = NOW(),
        resolved_at = NULL,
        occurrence_count = public.data_quality_issues.occurrence_count + 1;

    GET DIAGNOSTICS v_seen_count = ROW_COUNT;

    WITH active_fingerprints AS (
        SELECT CONCAT_WS(
            '|',
            LOWER(BTRIM(p_provider)),
            LOWER(BTRIM(p_endpoint)),
            UPPER(BTRIM(p_symbol)),
            finding->>'check_code',
            COALESCE(finding->>'field_name', ''),
            COALESCE(finding->>'source_date', ''),
            COALESCE(finding->>'source_period', ''),
            COALESCE(finding->>'source_reference', '')
        ) AS fingerprint
        FROM JSONB_ARRAY_ELEMENTS(p_findings) AS finding
        WHERE NULLIF(BTRIM(finding->>'check_code'), '') IS NOT NULL
          AND NULLIF(BTRIM(finding->>'message'), '') IS NOT NULL
    )
    UPDATE public.data_quality_issues AS issue
    SET
        status = 'resolved',
        resolved_at = NOW()
    WHERE issue.symbol = UPPER(BTRIM(p_symbol))
      AND issue.provider = LOWER(BTRIM(p_provider))
      AND issue.endpoint = LOWER(BTRIM(p_endpoint))
      AND issue.status = 'open'
      AND NOT EXISTS (
          SELECT 1
          FROM active_fingerprints AS active
          WHERE active.fingerprint = issue.fingerprint
      );

    GET DIAGNOSTICS v_resolved_count = ROW_COUNT;

    RETURN JSONB_BUILD_OBJECT(
        'seen', v_seen_count,
        'resolved', v_resolved_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_data_quality_issues(TEXT, TEXT, TEXT, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_data_quality_issues(TEXT, TEXT, TEXT, JSONB)
    TO service_role;
