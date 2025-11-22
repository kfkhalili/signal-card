-- Run all contract tests
-- This file imports and runs all individual contract test files
-- Usage: psql $DATABASE_URL -f tests/contracts/run_all_contracts.sql

\set ON_ERROR_STOP on

-- Check if pgTAP is available (in extensions schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgtap'
  ) THEN
    RAISE EXCEPTION 'pgTAP extension is not installed. Run: CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;';
  END IF;

  -- Ensure extensions schema is in search_path for pgTAP functions
  SET search_path = extensions, public;
END $$;

-- Run all contract tests
-- Note: This file should be run from the project root directory
-- Usage: psql $DATABASE_URL -f tests/contracts/run_all_contracts.sql

\echo 'Running Contract #1: Atomic Batch Claiming...'
\i test_contract_1_atomic_batch_claiming.sql

\echo ''
\echo 'Running Contract #2: SKIP LOCKED in Recovery...'
\i test_contract_2_recovery_deadlock.sql

\echo ''
\echo 'Running Contract #3: Advisory Locks on Cron Jobs...'
\i test_contract_3_advisory_locks.sql

\echo ''
\echo 'Running Contract #8: Scheduled Job Priority...'
\i test_contract_8_scheduled_job_priority.sql

\echo ''
\echo 'Running Contract #13: No TTL Defaults...'
\i test_contract_13_no_ttl_defaults.sql

\echo ''
\echo 'Running Contract #15: Circuit Breaker Sensitivity...'
\i test_contract_15_circuit_breaker.sql

\echo ''
\echo 'Running Contract #16: Polite Partition Maintenance...'
\i test_contract_16_partition_maintenance.sql

\echo ''
\echo 'Running Contract #18: SECURITY DEFINER...'
\i test_contract_18_security_definer.sql

\echo ''
\echo '✅ All contract tests completed!'

