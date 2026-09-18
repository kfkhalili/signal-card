-- Make the precomputed Growth v2 pillar the public Compass growth signal.
--
-- The output column remains named peg_rank for API compatibility, but now
-- carries growth_v2_rank. The web client labels it as Growth v2.

BEGIN;

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
  w_rev numeric := COALESCE((weights->>'revenue')::numeric, 0.15);
  w_val numeric := COALESCE((weights->>'value')::numeric, 0.0);
  w_sent numeric := COALESCE((weights->>'sentiment')::numeric, 0.15);
  w_gro numeric := COALESCE((weights->>'growth')::numeric, 0.0);
  w_prof numeric := COALESCE((weights->>'profitability')::numeric, 0.2);
  w_buy numeric := COALESCE((weights->>'buyback')::numeric, 0.15);
  w_inc numeric := COALESCE((weights->>'income')::numeric, 0.0);
  w_health numeric := COALESCE((weights->>'health')::numeric, 0.35);
BEGIN
  RETURN QUERY
  WITH calculated_scores AS (
    SELECT
      scores.symbol,
      (
        scores.norm_ps * w_rev +
        scores.norm_evm * w_val +
        scores.norm_sentiment * w_sent +
        CASE
          WHEN w_gro > 0 THEN scores.norm_growth_v2 * w_gro
          ELSE 0
        END +
        scores.norm_profitability_yield * w_prof +
        scores.norm_buyback_yield * w_buy +
        scores.norm_div_yield * w_inc +
        scores.norm_health * w_health
      )::numeric(10, 2) AS composite_score,
      scores.market_cap,
      scores.revenue_ttm AS revenue,
      scores.ps_rank,
      scores.evm_rank,
      scores.sentiment_rank,
      scores.profitability_rank,
      scores.buyback_rank,
      scores.growth_v2_rank AS peg_rank,
      scores.div_yield_rank,
      scores.health_rank,
      scores.industry
    FROM public.compass_pillar_scores AS scores
    INNER JOIN public.listed_symbols AS listed
      ON listed.symbol = scores.symbol
     AND listed.is_active = true
     AND listed.fmp_is_actively_trading IS DISTINCT FROM false
    WHERE (w_gro <= 0 OR scores.norm_growth_v2 IS NOT NULL)
      AND (
        p_industries IS NULL
        OR pg_catalog.array_length(p_industries, 1) IS NULL
        OR scores.industry = ANY(p_industries)
      )
      AND (
        p_exchanges IS NULL
        OR pg_catalog.array_length(p_exchanges, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.exchange_variants AS variants
          WHERE variants.symbol = scores.symbol
            AND EXISTS (
              SELECT 1
              FROM pg_catalog.unnest(p_exchanges) AS requested(exchange_name)
              WHERE pg_catalog.upper(requested.exchange_name) =
                    pg_catalog.upper(variants.exchange_short_name)
            )
        )
      )
    ORDER BY composite_score DESC NULLS LAST, scores.symbol ASC
    LIMIT 50
  )
  SELECT
    pg_catalog.row_number() OVER (
      ORDER BY calculated.composite_score DESC NULLS LAST,
               calculated.symbol ASC
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
  FROM calculated_scores AS calculated
  ORDER BY calculated.composite_score DESC NULLS LAST,
           calculated.symbol ASC;
END;
$function$;

GRANT EXECUTE
ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[])
TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[]) IS
  'Returns the top 50 curated Compass symbols. A positive Growth weight uses the precomputed Growth v2 score and requires Growth v2 eligibility. The legacy peg_rank output field carries growth_v2_rank for API compatibility.';

COMMIT;
