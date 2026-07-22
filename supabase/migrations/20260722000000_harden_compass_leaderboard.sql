-- Keep stale/inactive score rows out of the Compass and make ordering
-- deterministic when a precomputed score is incomplete.
CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(
  weights jsonb,
  p_industries text[] DEFAULT NULL,
  p_exchanges text[] DEFAULT NULL
)
RETURNS TABLE(
  rank bigint,
  symbol text,
  composite_score numeric,
  market_cap bigint,
  revenue numeric,
  ps_rank bigint,
  evm_rank bigint,
  sentiment_rank bigint,
  profitability_rank bigint,
  buyback_rank bigint,
  peg_rank bigint,
  div_yield_rank bigint,
  health_rank bigint,
  industry text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $function$
DECLARE
  w_rev NUMERIC := COALESCE((weights->>'revenue')::NUMERIC, 0.15);
  w_val NUMERIC := COALESCE((weights->>'value')::NUMERIC, 0.0);
  w_sent NUMERIC := COALESCE((weights->>'sentiment')::NUMERIC, 0.15);
  w_gro NUMERIC := COALESCE((weights->>'growth')::NUMERIC, 0.0);
  w_prof NUMERIC := COALESCE((weights->>'profitability')::NUMERIC, 0.2);
  w_buy NUMERIC := COALESCE((weights->>'buyback')::NUMERIC, 0.15);
  w_inc NUMERIC := COALESCE((weights->>'income')::NUMERIC, 0.0);
  w_health NUMERIC := COALESCE((weights->>'health')::NUMERIC, 0.35);
BEGIN
  RETURN QUERY
  WITH calculated_scores AS (
    SELECT
      scores.symbol,
      (
        scores.norm_ps * w_rev +
        scores.norm_evm * w_val +
        scores.norm_sentiment * w_sent +
        scores.norm_peg * w_gro +
        scores.norm_profitability_yield * w_prof +
        scores.norm_buyback_yield * w_buy +
        scores.norm_div_yield * w_inc +
        scores.norm_health * w_health
      )::NUMERIC(10, 2) AS composite_score,
      scores.market_cap,
      scores.revenue_ttm AS revenue,
      scores.ps_rank,
      scores.evm_rank,
      scores.sentiment_rank,
      scores.profitability_rank,
      scores.buyback_rank,
      scores.peg_rank,
      scores.div_yield_rank,
      scores.health_rank,
      scores.industry
    FROM public.compass_pillar_scores scores
    INNER JOIN public.listed_symbols listed
      ON listed.symbol = scores.symbol
     AND listed.is_active = TRUE
    WHERE
      (
        p_industries IS NULL
        OR array_length(p_industries, 1) IS NULL
        OR scores.industry = ANY(p_industries)
      )
      AND (
        p_exchanges IS NULL
        OR array_length(p_exchanges, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.exchange_variants variants
          WHERE variants.symbol = scores.symbol
            AND EXISTS (
              SELECT 1
              FROM unnest(p_exchanges) AS requested(exchange_name)
              WHERE UPPER(requested.exchange_name) = UPPER(variants.exchange_short_name)
            )
        )
      )
    ORDER BY composite_score DESC NULLS LAST, scores.symbol ASC
    LIMIT 50
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY calculated.composite_score DESC NULLS LAST, calculated.symbol ASC
    )::bigint AS rank,
    calculated.symbol,
    calculated.composite_score,
    calculated.market_cap,
    calculated.revenue,
    calculated.ps_rank,
    calculated.evm_rank,
    calculated.sentiment_rank,
    calculated.profitability_rank,
    calculated.buyback_rank,
    calculated.peg_rank,
    calculated.div_yield_rank,
    calculated.health_rank,
    calculated.industry
  FROM calculated_scores calculated
  ORDER BY calculated.composite_score DESC NULLS LAST, calculated.symbol ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[])
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[]) IS
  'Returns the top 50 active Compass symbols. Industry and exchange filters are optional; exchange matching is case-insensitive. Incomplete composite scores sort after complete scores.';
