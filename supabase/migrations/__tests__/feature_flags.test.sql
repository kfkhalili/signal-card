-- Database tests for feature_flags table
-- These tests verify the feature flags system works correctly
-- Run with: psql $DATABASE_URL -f supabase/migrations/__tests__/feature_flags.test.sql

-- Test 1: Feature flags table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'feature_flags'
  ) THEN
    RAISE EXCEPTION 'Feature flags table does not exist';
  END IF;
  RAISE NOTICE 'Test 1 PASSED: feature_flags table exists';
END $$;

-- Test 2: Initial flags are inserted and disabled
DO $$
DECLARE
  flag_count INTEGER;
  enabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flag_count FROM public.feature_flags;
  SELECT COUNT(*) INTO enabled_count FROM public.feature_flags WHERE enabled = true;

  IF flag_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 feature flags, found %', flag_count;
  END IF;

  IF enabled_count > 0 THEN
    RAISE EXCEPTION 'Expected all flags to be disabled initially, found % enabled', enabled_count;
  END IF;

  RAISE NOTICE 'Test 2 PASSED: Initial flags inserted and disabled (count: %)', flag_count;
END $$;

-- Test 3: is_feature_enabled function works
DO $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  -- Test with disabled flag
  SELECT is_feature_enabled('use_queue_system') INTO is_enabled;
  IF is_enabled THEN
    RAISE EXCEPTION 'Expected use_queue_system to be disabled';
  END IF;

  -- Test with non-existent flag (should return false)
  SELECT is_feature_enabled('non_existent_flag') INTO is_enabled;
  IF is_enabled THEN
    RAISE EXCEPTION 'Expected non-existent flag to return false';
  END IF;

  RAISE NOTICE 'Test 3 PASSED: is_feature_enabled function works correctly';
END $$;

-- Test 4: Can enable a flag
DO $$
BEGIN
  -- Enable a flag (as service role)
  UPDATE public.feature_flags
  SET enabled = true
  WHERE flag_name = 'use_queue_system';

  IF NOT is_feature_enabled('use_queue_system') THEN
    RAISE EXCEPTION 'Failed to enable feature flag';
  END IF;

  -- Disable it again
  UPDATE public.feature_flags
  SET enabled = false
  WHERE flag_name = 'use_queue_system';

  RAISE NOTICE 'Test 4 PASSED: Can enable and disable flags';
END $$;

-- Test 5: updated_at trigger works
DO $$
DECLARE
  old_updated_at TIMESTAMPTZ;
  new_updated_at TIMESTAMPTZ;
BEGIN
  SELECT updated_at INTO old_updated_at
  FROM public.feature_flags
  WHERE flag_name = 'use_queue_system';

  -- Wait a moment to ensure timestamp difference
  PERFORM pg_sleep(0.1);

  UPDATE public.feature_flags
  SET enabled = true
  WHERE flag_name = 'use_queue_system';

  SELECT updated_at INTO new_updated_at
  FROM public.feature_flags
  WHERE flag_name = 'use_queue_system';

  IF new_updated_at <= old_updated_at THEN
    RAISE EXCEPTION 'updated_at trigger did not fire (old: %, new: %)', old_updated_at, new_updated_at;
  END IF;

  -- Reset
  UPDATE public.feature_flags
  SET enabled = false
  WHERE flag_name = 'use_queue_system';

  RAISE NOTICE 'Test 5 PASSED: updated_at trigger works';
END $$;

-- Test 6: Primary key constraint prevents duplicates
DO $$
BEGIN
  BEGIN
    INSERT INTO public.feature_flags (flag_name, enabled)
    VALUES ('use_queue_system', true);
    RAISE EXCEPTION 'Primary key constraint should prevent duplicate flag_name';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Test 6 PASSED: Primary key constraint prevents duplicates';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
  END;
END $$;

RAISE NOTICE 'All feature flags tests PASSED!';

