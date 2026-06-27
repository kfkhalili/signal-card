-- Migration: Add exchange_variants filtering capability to Market Compass RPC

-- 1. Create index for lightning-fast EXISTS filtering lookups
CREATE INDEX IF NOT EXISTS "idx_exchange_variants_symbol_exchange" 
ON "public"."exchange_variants" ("symbol", "exchange_short_name");

-- 2. Drop existing overloads of get_weighted_leaderboard
DROP FUNCTION IF EXISTS public.get_weighted_leaderboard(jsonb);
DROP FUNCTION IF EXISTS public.get_weighted_leaderboard(jsonb, text[]);

-- 3. Recreate get_weighted_leaderboard with optional p_exchanges filter
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
      mv.symbol,
      (
          mv.norm_ps * w_rev +
          mv.norm_evm * w_val +
          mv.norm_sentiment * w_sent +
          mv.norm_peg * w_gro +
          mv.norm_profitability_yield * w_prof +
          mv.norm_buyback_yield * w_buy + 
          mv.norm_div_yield * w_inc +
          mv.norm_health * w_health
      )::NUMERIC(10, 2) AS composite_score,
      mv.market_cap,
      mv.revenue_ttm as revenue,
      mv.ps_rank,
      mv.evm_rank,
      mv.sentiment_rank,
      mv.profitability_rank,
      mv.buyback_rank,
      mv.peg_rank,
      mv.div_yield_rank,
      mv.health_rank,
      mv.industry
    FROM
      public.compass_pillar_scores mv
    WHERE 
      (p_industries IS NULL OR array_length(p_industries, 1) IS NULL OR mv.industry = ANY(p_industries))
      AND (
        p_exchanges IS NULL 
        OR array_length(p_exchanges, 1) IS NULL 
        OR EXISTS (
          SELECT 1 FROM public.exchange_variants ev 
          WHERE ev.symbol = mv.symbol 
            AND UPPER(ev.exchange_short_name) = ANY(p_exchanges)
        )
      )
    ORDER BY 2 DESC
    LIMIT 50
  )
  SELECT
    (ROW_NUMBER() OVER (ORDER BY c.composite_score DESC))::bigint as rank,
    c.symbol,
    c.composite_score,
    c.market_cap,
    c.revenue,
    c.ps_rank,
    c.evm_rank,
    c.sentiment_rank,
    c.profitability_rank,
    c.buyback_rank,
    c.peg_rank,
    c.div_yield_rank,
    c.health_rank,
    c.industry
  FROM calculated_scores c
  ORDER BY c.composite_score DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weighted_leaderboard(jsonb, text[], text[]) TO anon, authenticated, service_role;
