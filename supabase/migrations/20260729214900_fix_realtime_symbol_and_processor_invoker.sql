-- Repair two defects exposed by the controlled FMP queue recovery:
--
-- 1. realtime.subscription filters include a trailing boolean field, for
--    example "(symbol,eq,ADBE,f)". The previous pattern captured "ADBE,f".
-- 2. invoke_processor_if_healthy_v2 swallowed helper failures as warnings,
--    causing pg_cron to report successful runs that queued no HTTP request.
--
-- This migration does not create queue jobs, invoke Edge Functions, or call
-- FMP. Existing terminal failed jobs remain untouched as audit evidence.

CREATE OR REPLACE FUNCTION public.get_active_subscriptions_from_realtime()
RETURNS TABLE(
  user_id uuid,
  symbol text,
  data_type text,
  subscribed_at timestamptz,
  last_seen_at timestamptz
)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (subscription.claims ->> 'sub')::uuid AS user_id,
    substring(
      subscription.filters::text
      FROM 'symbol,eq,([^,)]+)'
    ) AS symbol,
    CASE
      WHEN subscription.entity::text = 'profiles' THEN 'profile'
      WHEN subscription.entity::text = 'live_quote_indicators' THEN 'quote'
      WHEN subscription.entity::text = 'financial_statements'
        THEN 'financial-statements'
      WHEN subscription.entity::text = 'ratios_ttm' THEN 'ratios-ttm'
      WHEN subscription.entity::text = 'dividend_history'
        THEN 'dividend-history'
      WHEN subscription.entity::text = 'revenue_product_segmentation'
        THEN 'revenue-product-segmentation'
      WHEN subscription.entity::text = 'grades_historical'
        THEN 'grades-historical'
      WHEN subscription.entity::text = 'exchange_variants'
        THEN 'exchange-variants'
      WHEN subscription.entity::text = 'insider_trading_statistics'
        THEN 'insider-trading-statistics'
      WHEN subscription.entity::text = 'insider_transactions'
        THEN 'insider-transactions'
    END AS data_type,
    subscription.created_at::timestamptz AS subscribed_at,
    subscription.created_at::timestamptz AS last_seen_at
  FROM realtime.subscription AS subscription
  WHERE subscription.filters::text LIKE '%symbol,eq,%'
    AND subscription.entity::text IN (
      'profiles',
      'live_quote_indicators',
      'financial_statements',
      'ratios_ttm',
      'dividend_history',
      'revenue_product_segmentation',
      'grades_historical',
      'exchange_variants',
      'insider_trading_statistics',
      'insider_transactions'
    );
END;
$$;

COMMENT ON FUNCTION public.get_active_subscriptions_from_realtime()
IS 'Returns active symbol subscriptions with the Realtime filter metadata suffix excluded from each parsed symbol.';

CREATE OR REPLACE FUNCTION public.on_realtime_subscription_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_symbol text;
  v_data_type text;
  v_priority integer := 1;
BEGIN
  CASE NEW.entity::text
    WHEN 'profiles' THEN v_data_type := 'profile';
    WHEN 'live_quote_indicators' THEN v_data_type := 'quote';
    WHEN 'financial_statements' THEN
      v_data_type := 'financial-statements';
    WHEN 'ratios_ttm' THEN v_data_type := 'ratios-ttm';
    WHEN 'dividend_history' THEN v_data_type := 'dividend-history';
    WHEN 'revenue_product_segmentation' THEN
      v_data_type := 'revenue-product-segmentation';
    WHEN 'grades_historical' THEN v_data_type := 'grades-historical';
    WHEN 'exchange_variants' THEN v_data_type := 'exchange-variants';
    WHEN 'insider_trading_statistics' THEN
      v_data_type := 'insider-trading-statistics';
    WHEN 'insider_transactions' THEN
      v_data_type := 'insider-transactions';
    ELSE
      RETURN NEW;
  END CASE;

  IF NEW.filters::text NOT LIKE '%symbol,eq,%' THEN
    RETURN NEW;
  END IF;

  v_symbol := substring(
    NEW.filters::text
    FROM 'symbol,eq,([^,)]+)'
  );

  IF v_symbol IS NULL OR v_symbol = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.check_and_queue_stale_batch_v2(
      p_symbol := v_symbol,
      p_data_types := ARRAY[v_data_type],
      p_priority := v_priority
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING
        'Failed to check staleness for subscription % (symbol: %, data_type: %): %',
        NEW.id,
        v_symbol,
        v_data_type,
        SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_realtime_subscription_insert()
IS 'Queues fresh-data checks for new Realtime symbol subscriptions after removing the filter metadata suffix from the parsed symbol.';

CREATE OR REPLACE FUNCTION public.invoke_processor_if_healthy_v2()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_recent_failures integer;
  v_lock_acquired boolean;
BEGIN
  SELECT pg_try_advisory_lock(44)
  INTO v_lock_acquired;

  IF NOT v_lock_acquired THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.recover_stuck_jobs_v2();

    SELECT count(*)
    INTO v_recent_failures
    FROM public.api_call_queue_v2 AS queue
    WHERE queue.retry_count > 0
      AND queue.created_at >= now() - interval '10 minutes';

    IF v_recent_failures > 50 THEN
      RAISE EXCEPTION
        'Circuit breaker tripped: % recent failures in last 10 minutes',
        v_recent_failures;
    END IF;

    -- Discard the asynchronous request metadata explicitly. The helper is
    -- VOLATILE, so PERFORM queues exactly one pg_net request.
    PERFORM public.invoke_edge_function_v2(
      'queue-processor-v2',
      '{}'::jsonb,
      300000
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Advisory locks are session-scoped; always release before making the
      -- cron run fail visibly.
      PERFORM pg_advisory_unlock(44);
      RAISE;
  END;

  PERFORM pg_advisory_unlock(44);
END;
$$;

COMMENT ON FUNCTION public.invoke_processor_if_healthy_v2()
IS 'Recovers stale claims and visibly queues one guarded processor invocation; failures propagate to pg_cron after releasing advisory lock 44.';

REVOKE ALL
ON FUNCTION public.invoke_processor_if_healthy_v2()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.invoke_processor_if_healthy_v2()
TO service_role;
