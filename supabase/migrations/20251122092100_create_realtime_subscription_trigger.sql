-- Event-Driven Processing: Trigger on realtime.subscription
-- Automatically checks staleness and creates jobs when subscriptions are created
-- CRITICAL: This eliminates 1-minute latency for new subscriptions
-- CRITICAL: Uses same filter parsing logic as get_active_subscriptions_from_realtime()
-- CRITICAL: Wrapped in exception handler to prevent trigger failure from blocking subscription creation

-- Create trigger function that fires when subscription is inserted
CREATE OR REPLACE FUNCTION public.on_realtime_subscription_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_symbol TEXT;
  v_data_type TEXT;
  v_priority INTEGER := 1; -- High priority for user-facing subscriptions
  v_data_types TEXT[];
BEGIN
  -- Map entity (table name) to data_type (same mapping as get_active_subscriptions_from_realtime)
  CASE NEW.entity::text
    WHEN 'profiles' THEN v_data_type := 'profile';
    WHEN 'live_quote_indicators' THEN v_data_type := 'quote';
    WHEN 'financial_statements' THEN v_data_type := 'financial-statements';
    WHEN 'ratios_ttm' THEN v_data_type := 'ratios-ttm';
    WHEN 'dividend_history' THEN v_data_type := 'dividend-history';
    WHEN 'revenue_product_segmentation' THEN v_data_type := 'revenue-product-segmentation';
    WHEN 'grades_historical' THEN v_data_type := 'grades-historical';
    WHEN 'exchange_variants' THEN v_data_type := 'exchange-variants';
    WHEN 'insider_trading_statistics' THEN v_data_type := 'insider-trading-statistics';
    WHEN 'insider_transactions' THEN v_data_type := 'insider-transactions';
    WHEN 'valuations' THEN v_data_type := 'valuations';
    WHEN 'market_risk_premiums' THEN v_data_type := 'market-risk-premium';
    WHEN 'treasury_rates' THEN v_data_type := 'treasury-rates';
    ELSE
      -- Not a tracked entity, skip
      RETURN NEW;
  END CASE;

  -- For global tables (market_risk_premiums, treasury_rates), use 'GLOBAL' as symbol
  -- These tables don't have symbol filters - they're global datasets
  IF v_data_type IN ('market-risk-premium', 'treasury-rates') THEN
    v_symbol := 'GLOBAL';
  ELSE
    -- Extract symbol from filters using the same logic as get_active_subscriptions_from_realtime
    -- Format: filters::text contains 'symbol,eq,AAPL' or similar
    v_symbol := SUBSTRING(NEW.filters::text FROM 'symbol,eq,([^)]+)');

    -- If we couldn't extract a symbol, skip (might be a global subscription for symbol-specific table)
    IF v_symbol IS NULL OR v_symbol = '' THEN
      RETURN NEW;
    END IF;

    -- Only process if filters contain symbol filter (same check as get_active_subscriptions_from_realtime)
    IF NEW.filters::text NOT LIKE '%symbol,eq,%' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Build data_types array (single element for now)
  v_data_types := ARRAY[v_data_type];

  -- Call staleness checker (wrapped in exception handler to prevent trigger failure)
  BEGIN
    PERFORM public.check_and_queue_stale_batch_v2(
      p_symbol := v_symbol,
      p_data_types := v_data_types,
      p_priority := v_priority
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the trigger (subscription should still be created)
      RAISE WARNING 'Failed to check staleness for subscription % (symbol: %, data_type: %): %',
        NEW.id, v_symbol, v_data_type, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

COMMENT ON FUNCTION public.on_realtime_subscription_insert IS 'Trigger function that automatically checks staleness and creates jobs when a new subscription is added to realtime.subscription. Extracts symbol from filters and maps entity to data_type, then calls check_and_queue_stale_batch_v2() with high priority. Uses same filter parsing logic as get_active_subscriptions_from_realtime(). Wrapped in exception handler to prevent trigger failure from blocking subscription creation.';

-- Create the trigger on realtime.subscription
-- NOTE: Cannot add COMMENT on trigger in realtime schema (not owner of realtime.subscription)
-- Documentation is in the function comment above
CREATE TRIGGER on_realtime_subscription_insert_trigger
AFTER INSERT ON realtime.subscription
FOR EACH ROW
EXECUTE FUNCTION public.on_realtime_subscription_insert();

