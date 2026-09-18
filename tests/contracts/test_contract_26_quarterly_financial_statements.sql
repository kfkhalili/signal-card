-- Contract #26: bounded quarterly financial-statement collection

BEGIN;
SELECT plan(3);

SELECT is(
  (
    SELECT api_calls_per_job
    FROM public.data_type_registry_v2
    WHERE data_type = 'financial-statements'
  ),
  6,
  'Contract #26: quota limiter reserves all six statement calls'
);

SELECT cmp_ok(
  (
    SELECT estimated_data_size_bytes
    FROM public.data_type_registry_v2
    WHERE data_type = 'financial-statements'
  ),
  '>=',
  1200000::bigint,
  'Contract #26: predictive quota uses the six-response fallback ceiling'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.data_type_registry_v2
    WHERE data_type = 'financial-statements'
      AND refresh_strategy = 'hybrid'
      AND default_ttl_minutes = 10080
  ),
  'Contract #26: quarterly collection inherits the weekly scheduled policy'
);

SELECT * FROM finish();
ROLLBACK;
