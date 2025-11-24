-- Add logging to trigger function to verify it's firing
-- This will help us debug if the trigger is actually being called

CREATE OR REPLACE FUNCTION public.on_realtime_subscription_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_symbol TEXT;
  v_data_type TEXT;
  v_priority INTEGER := 1;
  v_data_types TEXT[];
BEGIN
  -- LOG: Trigger fired
  RAISE NOTICE 'Trigger fired for subscription %: entity=%, filters=%', NEW.id, NEW.entity::text, NEW.filters::text;

  -- Extract symbol from filters
  v_symbol := SUBSTRING(NEW.filters::text FROM 'symbol,eq,([^)]+)');
  RAISE NOTICE 'Extracted symbol: %', v_symbol;

  -- If we couldn't extract a symbol, skip
  IF v_symbol IS NULL OR v_symbol = '' THEN
    RAISE NOTICE 'No symbol extracted, skipping';
    RETURN NEW;
  END IF;

  -- Only process if filters contain symbol filter
  IF NEW.filters::text NOT LIKE '%symbol,eq,%' THEN
    RAISE NOTICE 'Filters do not contain symbol,eq, pattern, skipping';
    RETURN NEW;
  END IF;

  -- Map entity to data_type
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
    ELSE
      RAISE NOTICE 'Entity % not tracked, skipping', NEW.entity::text;
      RETURN NEW;
  END CASE;

  RAISE NOTICE 'Mapped to data_type: %, calling check_and_queue_stale_batch_v2', v_data_type;

  -- Build data_types array
  v_data_types := ARRAY[v_data_type];

  -- Call staleness checker
  BEGIN
    PERFORM public.check_and_queue_stale_batch_v2(
      p_symbol := v_symbol,
      p_data_types := v_data_types,
      p_priority := v_priority
    );
    RAISE NOTICE 'Successfully called check_and_queue_stale_batch_v2 for %/%', v_symbol, v_data_type;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to check staleness for subscription % (symbol: %, data_type: %): %',
        NEW.id, v_symbol, v_data_type, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.on_realtime_subscription_insert IS 'Trigger function with logging. Automatically checks staleness and creates jobs when a new subscription is added to realtime.subscription. Includes RAISE NOTICE statements for debugging.';

