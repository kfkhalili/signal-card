-- Production latency smoke baseline for the Hidden Gems shadow screen.
-- SQL Editor compatible. Uses transaction-local temporary tables only;
-- ROLLBACK leaves no persistent data and the calls make no external requests.

BEGIN;

CREATE TEMPORARY TABLE hidden_gems_latency_samples (
  sample_number integer PRIMARY KEY,
  elapsed_ms numeric NOT NULL
) ON COMMIT DROP;

CREATE TEMPORARY TABLE hidden_gems_plan_result (
  plan jsonb NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  sample_number integer;
  started_at timestamptz;
  captured_plan jsonb;
BEGIN
  EXECUTE $explain$
    EXPLAIN (
      ANALYZE,
      BUFFERS,
      TIMING OFF,
      SUMMARY ON,
      FORMAT JSON
    )
    SELECT *
    FROM public.get_compass_hidden_gems_shadow_v1(100, NULL, NULL)
  $explain$
  INTO captured_plan;

  INSERT INTO hidden_gems_plan_result (plan)
  VALUES (captured_plan);

  FOR sample_number IN 1..5 LOOP
    started_at := pg_catalog.clock_timestamp();

    PERFORM *
    FROM public.get_compass_hidden_gems_shadow_v1(100, NULL, NULL);

    INSERT INTO hidden_gems_latency_samples (
      sample_number,
      elapsed_ms
    )
    VALUES (
      sample_number,
      EXTRACT(
        EPOCH FROM pg_catalog.clock_timestamp() - started_at
      ) * 1000
    );
  END LOOP;
END;
$$;

SELECT pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'query', 'get_compass_hidden_gems_shadow_v1(100, NULL, NULL)',
  'scope', 'five-sample SQL Editor smoke baseline',
  'samples', pg_catalog.count(*),
  'minimum_ms', pg_catalog.round(pg_catalog.min(elapsed_ms), 3),
  'average_ms', pg_catalog.round(pg_catalog.avg(elapsed_ms), 3),
  'p50_ms', pg_catalog.round(
    pg_catalog.percentile_cont(0.50) WITHIN GROUP (
      ORDER BY elapsed_ms
    )::numeric,
    3
  ),
  'p95_ms', pg_catalog.round(
    pg_catalog.percentile_cont(0.95) WITHIN GROUP (
      ORDER BY elapsed_ms
    )::numeric,
    3
  ),
  'maximum_ms', pg_catalog.round(pg_catalog.max(elapsed_ms), 3),
  'plan', (SELECT plan FROM hidden_gems_plan_result)
) AS hidden_gems_latency_baseline
FROM hidden_gems_latency_samples;

ROLLBACK;
