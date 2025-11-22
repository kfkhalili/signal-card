-- Monitoring Alert Functions for UptimeRobot Integration
-- These functions return alert status for queue health, quota usage, and stuck jobs

/**
 * Check queue success rate (alert if <90%)
 * Returns: success_rate_percent, completed_count, failed_count
 */
CREATE OR REPLACE FUNCTION public.check_queue_success_rate_alert()
RETURNS TABLE (
  success_rate_percent NUMERIC,
  completed_count BIGINT,
  failed_count BIGINT,
  alert_status TEXT
) AS $$
DECLARE
  v_success_rate NUMERIC;
  v_completed BIGINT;
  v_failed BIGINT;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
      NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_success_rate, v_completed, v_failed
  FROM api_call_queue_v2
  WHERE created_at > NOW() - INTERVAL '24 hours';

  RETURN QUERY SELECT 
    COALESCE(v_success_rate, 100),
    COALESCE(v_completed, 0),
    COALESCE(v_failed, 0),
    CASE 
      WHEN v_success_rate < 90 THEN 'alert'
      ELSE 'healthy'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_queue_success_rate_alert() IS 'Checks queue success rate over last 24 hours. Returns alert_status = alert if <90%';

/**
 * Check quota usage (alert if >80%)
 * Returns: usage_percent, total_bytes, alert_status
 */
CREATE OR REPLACE FUNCTION public.check_quota_usage_alert()
RETURNS TABLE (
  usage_percent NUMERIC,
  total_bytes BIGINT,
  alert_status TEXT
) AS $$
DECLARE
  v_usage_percent NUMERIC;
  v_total_bytes BIGINT;
BEGIN
  SELECT 
    ROUND(total_bytes / (20.0 * 1024 * 1024 * 1024) * 100, 2),
    total_bytes
  INTO v_usage_percent, v_total_bytes
  FROM api_data_usage_v2
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY date DESC
  LIMIT 1;

  RETURN QUERY SELECT 
    COALESCE(v_usage_percent, 0),
    COALESCE(v_total_bytes, 0),
    CASE 
      WHEN v_usage_percent > 80 THEN 'alert'
      ELSE 'healthy'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_quota_usage_alert() IS 'Checks quota usage over rolling 30 days. Returns alert_status = alert if >80%';

/**
 * Check stuck jobs (alert if >10)
 * Returns: stuck_count, affected_data_types, alert_status
 */
CREATE OR REPLACE FUNCTION public.check_stuck_jobs_alert()
RETURNS TABLE (
  stuck_count BIGINT,
  affected_data_types BIGINT,
  alert_status TEXT
) AS $$
DECLARE
  v_stuck_count BIGINT;
  v_affected_types BIGINT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(DISTINCT data_type)
  INTO v_stuck_count, v_affected_types
  FROM api_call_queue_v2
  WHERE status = 'processing'
    AND processed_at < NOW() - INTERVAL '10 minutes';

  RETURN QUERY SELECT 
    COALESCE(v_stuck_count, 0),
    COALESCE(v_affected_types, 0),
    CASE 
      WHEN v_stuck_count > 10 THEN 'alert'
      ELSE 'healthy'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_stuck_jobs_alert() IS 'Checks for stuck jobs (processing >10 minutes). Returns alert_status = alert if >10 jobs';

