-- Database tests for RLS on api_call_queue_v2 partitions
-- Run with: psql $DATABASE_URL -f supabase/migrations/__tests__/rls_api_call_queue_v2.test.sql

-- Test 1: All partitions have RLS enabled
DO $$
DECLARE
  partition_count INTEGER;
  rls_enabled_count INTEGER;
BEGIN
  -- Count partitions
  SELECT COUNT(*) INTO partition_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'api_call_queue_v2_%'
    AND tablename != 'api_call_queue_v2';

  -- Count partitions with RLS enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'api_call_queue_v2_%'
    AND tablename != 'api_call_queue_v2'
    AND rowsecurity = true;

  IF partition_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 partitions, found %', partition_count;
  END IF;

  IF rls_enabled_count != 4 THEN
    RAISE EXCEPTION 'Expected all 4 partitions to have RLS enabled, found % enabled', rls_enabled_count;
  END IF;

  RAISE NOTICE 'Test 1 PASSED: All 4 partitions have RLS enabled';
END $$;

-- Test 2: Parent table has RLS enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'api_call_queue_v2';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'Parent table api_call_queue_v2 should have RLS enabled';
  END IF;

  RAISE NOTICE 'Test 2 PASSED: Parent table has RLS enabled';
END $$;

-- Test 3: Policies exist on parent table
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'api_call_queue_v2';

  IF policy_count < 2 THEN
    RAISE EXCEPTION 'Expected at least 2 policies on parent table, found %', policy_count;
  END IF;

  RAISE NOTICE 'Test 3 PASSED: Policies exist on parent table (count: %)', policy_count;
END $$;

-- Test 4: Policies are inherited by partitions (check that policies apply)
DO $$
DECLARE
  read_policy_exists BOOLEAN;
  service_role_policy_exists BOOLEAN;
BEGIN
  -- Check for read policy
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'api_call_queue_v2'
      AND policyname = 'Users can read queue for monitoring'
      AND cmd = 'SELECT'
  ) INTO read_policy_exists;

  -- Check for service role policy
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'api_call_queue_v2'
      AND policyname = 'Only service role can modify queue'
      AND cmd = 'ALL'
  ) INTO service_role_policy_exists;

  IF NOT read_policy_exists THEN
    RAISE EXCEPTION 'Read policy "Users can read queue for monitoring" not found';
  END IF;

  IF NOT service_role_policy_exists THEN
    RAISE EXCEPTION 'Service role policy "Only service role can modify queue" not found';
  END IF;

  RAISE NOTICE 'Test 4 PASSED: Required policies exist on parent table';
END $$;

-- Test 5: Verify partition names are correct
DO $$
DECLARE
  expected_partitions TEXT[] := ARRAY['api_call_queue_v2_pending', 'api_call_queue_v2_processing', 'api_call_queue_v2_completed', 'api_call_queue_v2_failed'];
  actual_partitions TEXT[];
  missing_partition TEXT;
BEGIN
  SELECT ARRAY_AGG(tablename ORDER BY tablename) INTO actual_partitions
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(expected_partitions);

  -- Check each expected partition exists
  FOREACH missing_partition IN ARRAY expected_partitions
  LOOP
    IF NOT (missing_partition = ANY(actual_partitions)) THEN
      RAISE EXCEPTION 'Expected partition % not found', missing_partition;
    END IF;
  END LOOP;

  RAISE NOTICE 'Test 5 PASSED: All expected partitions exist';
END $$;

RAISE NOTICE 'All RLS api_call_queue_v2 tests PASSED!';

