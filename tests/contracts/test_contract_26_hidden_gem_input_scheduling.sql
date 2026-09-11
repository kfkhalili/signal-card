-- Contract #26: Hidden Gems market and analyst inputs refresh on schedule.

BEGIN;
SELECT plan(4);

SELECT is(
  (
    SELECT refresh_strategy
    FROM public.data_type_registry_v2
    WHERE data_type = 'quote'
  ),
  'scheduled',
  'Contract #26: quotes use scheduled refreshes'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'quote'
  ),
  1440,
  'Contract #26: quotes refresh daily'
);

SELECT is(
  (
    SELECT refresh_strategy
    FROM public.data_type_registry_v2
    WHERE data_type = 'grades-historical'
  ),
  'scheduled',
  'Contract #26: analyst grades use scheduled refreshes'
);

SELECT is(
  (
    SELECT default_ttl_minutes
    FROM public.data_type_registry_v2
    WHERE data_type = 'grades-historical'
  ),
  43200,
  'Contract #26: analyst grades refresh every 30 days'
);

SELECT * FROM finish();
ROLLBACK;
