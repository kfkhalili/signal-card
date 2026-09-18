-- P0.2a repeatability check for the current Hidden Gems candidate output.
-- SQL Editor compatible; read-only; no writes, queue activity, HTTP requests,
-- or FMP calls. Both calls use the same database statement snapshot.

WITH first_run AS MATERIALIZED (
  SELECT candidate.*
  FROM public.get_compass_hidden_gems_shadow_v1(
    200,
    NULL,
    NULL
  ) AS candidate
),
second_run AS MATERIALIZED (
  SELECT candidate.*
  FROM public.get_compass_hidden_gems_shadow_v1(
    200,
    NULL,
    NULL
  ) AS candidate
),
first_payload AS (
  SELECT
    pg_catalog.count(*) AS row_count,
    pg_catalog.jsonb_agg(
      pg_catalog.to_jsonb(candidate)
      ORDER BY candidate.rank
    ) AS value
  FROM first_run AS candidate
),
second_payload AS (
  SELECT
    pg_catalog.count(*) AS row_count,
    pg_catalog.jsonb_agg(
      pg_catalog.to_jsonb(candidate)
      ORDER BY candidate.rank
    ) AS value
  FROM second_run AS candidate
),
differences AS (
  SELECT pg_catalog.count(*) AS row_count
  FROM (
    (
      SELECT *
      FROM first_run
      EXCEPT ALL
      SELECT *
      FROM second_run
    )
    UNION ALL
    (
      SELECT *
      FROM second_run
      EXCEPT ALL
      SELECT *
      FROM first_run
    )
  ) AS difference
)
SELECT pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'model_definition_md5', pg_catalog.md5(
    pg_catalog.pg_get_functiondef(
      'public.get_compass_hidden_gems_shadow_v1(integer,text[],text[])'
        ::pg_catalog.regprocedure
    )
  ),
  'first_row_count', first_payload.row_count,
  'second_row_count', second_payload.row_count,
  'first_candidate_md5', pg_catalog.md5(first_payload.value::text),
  'second_candidate_md5', pg_catalog.md5(second_payload.value::text),
  'difference_rows', differences.row_count,
  'repeatable',
    first_payload.value = second_payload.value
    AND differences.row_count = 0
) AS compass_opportunity_snapshot_repeatability
FROM first_payload
CROSS JOIN second_payload
CROSS JOIN differences;
