-- Fix edge_function_name for financial-statements and ratios-ttm
-- These data types have library functions in queue-processor-v2 but registry still points to old functions
-- CRITICAL: This completes the migration to monofunction architecture for these data types

-- Update financial-statements
UPDATE public.data_type_registry_v2
SET 
  edge_function_name = 'queue-processor-v2',
  updated_at = NOW()
WHERE data_type = 'financial-statements'
  AND edge_function_name != 'queue-processor-v2';

-- Update ratios-ttm
UPDATE public.data_type_registry_v2
SET 
  edge_function_name = 'queue-processor-v2',
  updated_at = NOW()
WHERE data_type = 'ratios-ttm'
  AND edge_function_name != 'queue-processor-v2';

-- Verify the updates
DO $$
DECLARE
  financial_statements_count INTEGER;
  ratios_ttm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO financial_statements_count
  FROM public.data_type_registry_v2
  WHERE data_type = 'financial-statements'
    AND edge_function_name = 'queue-processor-v2';

  SELECT COUNT(*) INTO ratios_ttm_count
  FROM public.data_type_registry_v2
  WHERE data_type = 'ratios-ttm'
    AND edge_function_name = 'queue-processor-v2';

  IF financial_statements_count != 1 THEN
    RAISE EXCEPTION 'Failed to update financial-statements edge_function_name to queue-processor-v2';
  END IF;

  IF ratios_ttm_count != 1 THEN
    RAISE EXCEPTION 'Failed to update ratios-ttm edge_function_name to queue-processor-v2';
  END IF;

  RAISE NOTICE 'Successfully updated edge_function_name for financial-statements and ratios-ttm to queue-processor-v2';
END $$;

COMMENT ON TABLE public.data_type_registry_v2 IS 'All data types now use queue-processor-v2 monofunction architecture. Migration complete.';

