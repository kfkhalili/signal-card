-- Read-only production audit for the Hidden Gems shadow screen.
-- SQL Editor compatible: no psql meta-commands and no external requests.

WITH candidates AS MATERIALIZED (
  SELECT *
  FROM public.get_compass_hidden_gems_shadow_v1(100, NULL, NULL)
),
summary AS (
  SELECT pg_catalog.jsonb_build_object(
    'captured_at', pg_catalog.now(),
    'screen', 'Compass opportunity shadow',
    'candidate_count', pg_catalog.count(*),
    'candidates_with_positive_net_insider_buying',
      pg_catalog.count(*) FILTER (WHERE net_insider_value > 0),
    'candidates_missing_fresh_quote_proxy',
      pg_catalog.count(*) FILTER (
        WHERE 'quote_missing_or_stale' = ANY(risk_flags)
      ),
    'candidates_missing_analyst_coverage',
      pg_catalog.count(*) FILTER (
        WHERE 'analyst_coverage_missing' = ANY(risk_flags)
      )
  ) AS value
  FROM candidates
),
top_candidates AS (
  SELECT pg_catalog.jsonb_agg(
    pg_catalog.to_jsonb(candidate)
    ORDER BY candidate.rank
  ) AS value
  FROM (
    SELECT *
    FROM candidates
    ORDER BY rank
    LIMIT 25
  ) AS candidate
)
SELECT pg_catalog.jsonb_build_object(
  'summary', summary.value,
  'top_candidates', coalesce(top_candidates.value, '[]'::jsonb)
)
FROM summary
CROSS JOIN top_candidates;
