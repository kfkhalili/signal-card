CREATE OR REPLACE FUNCTION public.get_weighted_leaderboard(weights jsonb, p_industries text[] DEFAULT NULL)
  RETURNS TABLE(
   rank bigint,
   symbol text,
   composite_score numeric,
   market_cap bigint,
   revenue numeric,
   ps_rank bigint,
   evm_rank bigint,
   sentiment_rank bigint,
   industry text
 )
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, extensions
AS $function$
DECLARE
  -- Extract all JSON weights exactly ONCE here, instead of 8000 times in the query loop
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
      mv.industry
    FROM
      public.mv_compass_pillar_scores mv
    WHERE 
      p_industries IS NULL 
      OR array_length(p_industries, 1) IS NULL 
      OR mv.industry = ANY(p_industries)
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
    c.industry
  FROM calculated_scores c
  ORDER BY c.composite_score DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_weighted_leaderboard(jsonb, text[]) TO anon, authenticated, service_role;
