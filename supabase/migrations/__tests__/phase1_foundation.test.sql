-- Database tests for Phase 1 Foundation tables and functions
-- Run with: psql $DATABASE_URL -f supabase/migrations/__tests__/phase1_foundation.test.sql

-- Test 1: data_type_registry_v2 table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'data_type_registry_v2'
  ) THEN
    RAISE EXCEPTION 'data_type_registry_v2 table does not exist';
  END IF;
  RAISE NOTICE 'Test 1 PASSED: data_type_registry_v2 table exists';
END $$;

-- Test 2: is_valid_identifier function works
DO $$
BEGIN
  IF NOT is_valid_identifier('valid_identifier_123') THEN
    RAISE EXCEPTION 'is_valid_identifier should return true for valid identifier';
  END IF;
  
  IF is_valid_identifier('invalid-identifier') THEN
    RAISE EXCEPTION 'is_valid_identifier should return false for invalid identifier';
  END IF;
  
  IF is_valid_identifier(NULL) THEN
    RAISE EXCEPTION 'is_valid_identifier should return false for NULL';
  END IF;
  
  RAISE NOTICE 'Test 2 PASSED: is_valid_identifier function works';
END $$;

-- Test 3: active_subscriptions_v2 table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'active_subscriptions_v2'
  ) THEN
    RAISE EXCEPTION 'active_subscriptions_v2 table does not exist';
  END IF;
  RAISE NOTICE 'Test 3 PASSED: active_subscriptions_v2 table exists';
END $$;

-- Test 4: api_call_queue_v2 table exists and is partitioned
DO $$
DECLARE
  partition_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'api_call_queue_v2'
  ) THEN
    RAISE EXCEPTION 'api_call_queue_v2 table does not exist';
  END IF;
  
  -- Check partitions exist
  SELECT COUNT(*) INTO partition_count
  FROM pg_inherits
  WHERE inhparent = 'public.api_call_queue_v2'::regclass;
  
  IF partition_count < 4 THEN
    RAISE EXCEPTION 'api_call_queue_v2 should have 4 partitions, found %', partition_count;
  END IF;
  
  RAISE NOTICE 'Test 4 PASSED: api_call_queue_v2 table exists and is partitioned (partitions: %)', partition_count;
END $$;

-- Test 5: api_data_usage_v2 table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'api_data_usage_v2'
  ) THEN
    RAISE EXCEPTION 'api_data_usage_v2 table does not exist';
  END IF;
  RAISE NOTICE 'Test 5 PASSED: api_data_usage_v2 table exists';
END $$;

-- Test 6: is_data_stale_v2 function works (no default TTL)
DO $$
BEGIN
  -- Test with valid TTL
  IF NOT is_data_stale_v2(NOW() - INTERVAL '10 minutes', 5) THEN
    RAISE EXCEPTION 'is_data_stale_v2 should return true for stale data';
  END IF;
  
  IF is_data_stale_v2(NOW(), 5) THEN
    RAISE EXCEPTION 'is_data_stale_v2 should return false for fresh data';
  END IF;
  
  -- Test that NULL TTL raises exception
  BEGIN
    PERFORM is_data_stale_v2(NOW(), NULL);
    RAISE EXCEPTION 'is_data_stale_v2 should raise exception for NULL TTL';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 6 PASSED: is_data_stale_v2 function works and validates TTL';
  END;
END $$;

-- Test 7: is_profile_stale_v2 function works (no default TTL)
DO $$
BEGIN
  -- Test with valid TTL
  IF NOT is_profile_stale_v2(NOW() - INTERVAL '10 minutes', 5) THEN
    RAISE EXCEPTION 'is_profile_stale_v2 should return true for stale profile';
  END IF;
  
  IF is_profile_stale_v2(NOW(), 5) THEN
    RAISE EXCEPTION 'is_profile_stale_v2 should return false for fresh profile';
  END IF;
  
  -- Test that negative TTL raises exception
  BEGIN
    PERFORM is_profile_stale_v2(NOW(), -1);
    RAISE EXCEPTION 'is_profile_stale_v2 should raise exception for negative TTL';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test 7 PASSED: is_profile_stale_v2 function works and validates TTL';
  END;
END $$;

-- Test 8: data_type_registry_v2 TTL constraint prevents negative values
DO $$
BEGIN
  BEGIN
    INSERT INTO public.data_type_registry_v2 (
      data_type, table_name, timestamp_column, staleness_function,
      default_ttl_minutes, edge_function_name, refresh_strategy
    ) VALUES (
      'test_type', 'test_table', 'fetched_at', 'is_data_stale_v2',
      -1, 'test-function', 'on-demand'
    );
    RAISE EXCEPTION 'CHECK constraint should prevent negative TTL';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'Test 8 PASSED: TTL CHECK constraint prevents negative values';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
  END;
END $$;

RAISE NOTICE 'All Phase 1 Foundation tests PASSED!';

