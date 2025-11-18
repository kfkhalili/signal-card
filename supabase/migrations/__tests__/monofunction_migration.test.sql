-- Database tests for monofunction migration
-- Verifies that all data types in registry use queue-processor-v2
-- Run with: psql $DATABASE_URL -f supabase/migrations/__tests__/monofunction_migration.test.sql

-- Test 1: All data types use queue-processor-v2
DO $$
DECLARE
  total_count INTEGER;
  monofunction_count INTEGER;
  non_monofunction_types TEXT;
BEGIN
  -- Count total data types
  SELECT COUNT(*) INTO total_count
  FROM public.data_type_registry_v2;

  -- Count data types using queue-processor-v2
  SELECT COUNT(*) INTO monofunction_count
  FROM public.data_type_registry_v2
  WHERE edge_function_name = 'queue-processor-v2';

  -- Get list of data types NOT using queue-processor-v2
  SELECT STRING_AGG(data_type, ', ') INTO non_monofunction_types
  FROM public.data_type_registry_v2
  WHERE edge_function_name != 'queue-processor-v2';

  IF total_count = 0 THEN
    RAISE EXCEPTION 'No data types found in registry';
  END IF;

  IF monofunction_count != total_count THEN
    RAISE EXCEPTION 'Not all data types use queue-processor-v2. Total: %, Using monofunction: %, Non-monofunction types: %',
      total_count, monofunction_count, COALESCE(non_monofunction_types, 'none');
  END IF;

  RAISE NOTICE 'Test 1 PASSED: All % data types use queue-processor-v2', total_count;
END $$;

-- Test 2: Specific data types that were migrated are correct
DO $$
DECLARE
  financial_statements_function TEXT;
  ratios_ttm_function TEXT;
BEGIN
  -- Check financial-statements
  SELECT edge_function_name INTO financial_statements_function
  FROM public.data_type_registry_v2
  WHERE data_type = 'financial-statements';

  IF financial_statements_function != 'queue-processor-v2' THEN
    RAISE EXCEPTION 'financial-statements should use queue-processor-v2, found: %', financial_statements_function;
  END IF;

  -- Check ratios-ttm
  SELECT edge_function_name INTO ratios_ttm_function
  FROM public.data_type_registry_v2
  WHERE data_type = 'ratios-ttm';

  IF ratios_ttm_function != 'queue-processor-v2' THEN
    RAISE EXCEPTION 'ratios-ttm should use queue-processor-v2, found: %', ratios_ttm_function;
  END IF;

  RAISE NOTICE 'Test 2 PASSED: financial-statements and ratios-ttm use queue-processor-v2';
END $$;

-- Test 3: All data types have required fields
DO $$
DECLARE
  missing_fields_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_fields_count
  FROM public.data_type_registry_v2
  WHERE table_name IS NULL
     OR timestamp_column IS NULL
     OR staleness_function IS NULL
     OR default_ttl_minutes IS NULL
     OR edge_function_name IS NULL
     OR refresh_strategy IS NULL;

  IF missing_fields_count > 0 THEN
    RAISE EXCEPTION 'Found % data types with missing required fields', missing_fields_count;
  END IF;

  RAISE NOTICE 'Test 3 PASSED: All data types have required fields';
END $$;

-- Test 4: All data types have valid refresh_strategy
DO $$
DECLARE
  invalid_strategy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_strategy_count
  FROM public.data_type_registry_v2
  WHERE refresh_strategy NOT IN ('on-demand', 'scheduled');

  IF invalid_strategy_count > 0 THEN
    RAISE EXCEPTION 'Found % data types with invalid refresh_strategy', invalid_strategy_count;
  END IF;

  RAISE NOTICE 'Test 4 PASSED: All data types have valid refresh_strategy';
END $$;

-- Test 5: All data types have positive TTL
DO $$
DECLARE
  invalid_ttl_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_ttl_count
  FROM public.data_type_registry_v2
  WHERE default_ttl_minutes <= 0;

  IF invalid_ttl_count > 0 THEN
    RAISE EXCEPTION 'Found % data types with invalid TTL (must be > 0)', invalid_ttl_count;
  END IF;

  RAISE NOTICE 'Test 5 PASSED: All data types have positive TTL';
END $$;

RAISE NOTICE 'All monofunction migration tests PASSED!';

