-- Migration: Create function to extract active subscriptions from realtime.subscription
-- This replaces active_subscriptions_v2 for the staleness checker

CREATE OR REPLACE FUNCTION get_active_subscriptions_from_realtime()
RETURNS TABLE(
  user_id UUID,
  symbol TEXT,
  data_type TEXT,
  subscribed_at TIMESTAMP WITHOUT TIME ZONE,
  last_seen_at TIMESTAMP WITHOUT TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (rs.claims->>'sub')::UUID AS user_id,
    SUBSTRING(rs.filters::text FROM 'symbol,eq,([^)]+)') AS symbol,
    CASE
      WHEN rs.entity::text = 'profiles' THEN 'profile'
      WHEN rs.entity::text = 'financial_statements' THEN 'financial-statements'
      WHEN rs.entity::text = 'ratios_ttm' THEN 'ratios-ttm'
      WHEN rs.entity::text = 'dividend_history' THEN 'dividend-history'
      WHEN rs.entity::text = 'revenue_product_segmentation' THEN 'revenue-product-segmentation'
      WHEN rs.entity::text = 'grades_historical' THEN 'grades-historical'
      WHEN rs.entity::text = 'exchange_variants' THEN 'exchange-variants'
      WHEN rs.entity::text = 'live_quote_indicators' THEN 'quote'
    END AS data_type,
    rs.created_at AS subscribed_at,
    rs.created_at AS last_seen_at  -- Use created_at as proxy (subscription exists = active)
  FROM realtime.subscription rs
  WHERE
    rs.filters::text LIKE '%symbol,eq,%'  -- Only symbol-specific subscriptions
    AND rs.entity::text IN (
      'profiles', 'financial_statements', 'ratios_ttm',
      'dividend_history', 'revenue_product_segmentation',
      'grades_historical', 'exchange_variants', 'live_quote_indicators'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_subscriptions_from_realtime() TO service_role;

COMMENT ON FUNCTION get_active_subscriptions_from_realtime IS 'Extracts active subscriptions from realtime.subscription table. Replaces active_subscriptions_v2 for staleness checker. Returns user_id, symbol, data_type, subscribed_at, and last_seen_at (using created_at as proxy).';

