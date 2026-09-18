-- Read-only explanation of material Hidden Gems rank movements observed while
-- freezing the P0.1 baseline. SQL Editor compatible; no writes, queue activity,
-- HTTP requests, or FMP calls.

WITH requested(symbol) AS (
  VALUES
    ('MWA'),
    ('PLAB'),
    ('ERII'),
    ('RMD'),
    ('NICE'),
    ('ADBE')
),
candidates AS MATERIALIZED (
  SELECT candidate.*
  FROM public.get_compass_hidden_gems_shadow_v1(
    200,
    NULL,
    NULL
  ) AS candidate
)
SELECT pg_catalog.jsonb_build_object(
  'captured_at', pg_catalog.now(),
  'requested_symbols', pg_catalog.count(*),
  'found_symbols', pg_catalog.count(candidate.symbol),
  'candidates', pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'symbol', requested.symbol,
      'rank', candidate.rank,
      'opportunity_type', candidate.opportunity_type,
      'opportunity_score', candidate.opportunity_score,
      'neglected_compounder_score',
        candidate.neglected_compounder_score,
      'quality_dislocation_score',
        candidate.quality_dislocation_score,
      'improvement_score', candidate.improvement_score,
      'valuation_score', candidate.valuation_score,
      'insider_conviction_score', candidate.insider_conviction_score,
      'recognition_score', candidate.recognition_score,
      'resilience_score', candidate.resilience_score,
      'dislocation_score', candidate.dislocation_score,
      'repricing_penalty', candidate.repricing_penalty,
      'enterprise_multiple', candidate.enterprise_multiple,
      'price_to_free_cash_flow', candidate.price_to_free_cash_flow,
      'market_cap', candidate.market_cap,
      'analyst_coverage_count', candidate.analyst_coverage_count,
      'price_to_sma_200', candidate.price_to_sma_200,
      'year_range_position', candidate.year_range_position,
      'growth_v2_updated_at', candidate.growth_v2_updated_at,
      'risk_flags', candidate.risk_flags
    )
    ORDER BY candidate.rank NULLS LAST, requested.symbol
  )
) AS compass_shadow_rank_movement_explanation
FROM requested
LEFT JOIN candidates AS candidate
  ON candidate.symbol = requested.symbol;
