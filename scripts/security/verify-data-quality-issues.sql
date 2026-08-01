\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    v_detected_at TIMESTAMPTZ;
    v_occurrence_count INTEGER;
    v_status TEXT;
    v_resolved_at TIMESTAMPTZ;
BEGIN
    PERFORM public.sync_data_quality_issues(
        'QA-TEST',
        'fmp',
        'quote',
        '[{
          "check_code": "market_cap_reconciliation",
          "field_name": "marketCap",
          "severity": "warning",
          "message": "Initial test finding",
          "evidence": {"relativeDifference": 0.10},
          "source_reference": "price-times-shares"
        }]'::JSONB
    );

    SELECT detected_at, occurrence_count, status
    INTO v_detected_at, v_occurrence_count, v_status
    FROM public.data_quality_issues
    WHERE symbol = 'QA-TEST'
      AND check_code = 'market_cap_reconciliation';

    IF v_occurrence_count <> 1 OR v_status <> 'open' THEN
        RAISE EXCEPTION 'Initial finding was not opened correctly';
    END IF;

    PERFORM public.sync_data_quality_issues(
        'QA-TEST',
        'fmp',
        'quote',
        '[{
          "check_code": "market_cap_reconciliation",
          "field_name": "marketCap",
          "severity": "critical",
          "message": "Repeated test finding",
          "evidence": {"relativeDifference": 0.30},
          "source_reference": "price-times-shares"
        }]'::JSONB
    );

    SELECT occurrence_count, status
    INTO v_occurrence_count, v_status
    FROM public.data_quality_issues
    WHERE symbol = 'QA-TEST'
      AND check_code = 'market_cap_reconciliation';

    IF v_occurrence_count <> 2 OR v_status <> 'open' THEN
        RAISE EXCEPTION 'Repeated finding was not reinforced correctly';
    END IF;

    IF (
        SELECT detected_at
        FROM public.data_quality_issues
        WHERE symbol = 'QA-TEST'
          AND check_code = 'market_cap_reconciliation'
    ) <> v_detected_at THEN
        RAISE EXCEPTION 'Original detection timestamp was not preserved';
    END IF;

    PERFORM public.sync_data_quality_issues(
        'QA-TEST',
        'fmp',
        'quote',
        '[]'::JSONB
    );

    SELECT status, resolved_at
    INTO v_status, v_resolved_at
    FROM public.data_quality_issues
    WHERE symbol = 'QA-TEST'
      AND check_code = 'market_cap_reconciliation';

    IF v_status <> 'resolved' OR v_resolved_at IS NULL THEN
        RAISE EXCEPTION 'Absent finding was not resolved correctly';
    END IF;

    PERFORM public.sync_data_quality_issues(
        'QA-TEST',
        'fmp',
        'quote',
        '[{
          "check_code": "market_cap_reconciliation",
          "field_name": "marketCap",
          "severity": "warning",
          "message": "Recurring test finding",
          "evidence": {"relativeDifference": 0.11},
          "source_reference": "price-times-shares"
        }]'::JSONB
    );

    SELECT occurrence_count, status, resolved_at
    INTO v_occurrence_count, v_status, v_resolved_at
    FROM public.data_quality_issues
    WHERE symbol = 'QA-TEST'
      AND check_code = 'market_cap_reconciliation';

    IF v_occurrence_count <> 3 OR v_status <> 'open' OR v_resolved_at IS NOT NULL THEN
        RAISE EXCEPTION 'Recurring finding was not reopened correctly';
    END IF;

    IF has_function_privilege(
        'anon',
        'public.sync_data_quality_issues(text,text,text,jsonb)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'anon must not execute sync_data_quality_issues';
    END IF;

    IF NOT has_table_privilege('anon', 'public.data_quality_issues', 'SELECT') THEN
        RAISE EXCEPTION 'anon should be able to read data-quality findings';
    END IF;

    IF has_table_privilege('anon', 'public.data_quality_issues', 'INSERT') THEN
        RAISE EXCEPTION 'anon must not insert data-quality findings';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'data-quality issue verification passed' AS result;
