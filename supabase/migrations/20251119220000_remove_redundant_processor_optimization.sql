-- Remove redundant processor optimization migration
-- SUPERSEDES: 20251117180000_optimize_processor_for_one_minute_processing.sql
--
-- The migration 20251117180200_optimize_processor_for_faster_processing.sql
-- already overwrites the settings from 20251117180000, making it redundant.
--
-- This migration documents that 20251117180000 is superseded and adds a comment
-- to the superseded migration file for clarity.

-- Note: We don't actually delete the migration file (that would break migration history),
-- but we document that it's superseded. The final state is defined by 20251117180200.

COMMENT ON FUNCTION invoke_processor_loop_v2 IS 'Loops processor invocations. Loop is in SQL, Edge Function is stateless. Optimized for faster processing (2 iterations, 5s delay). Final settings from 20251117180200_optimize_processor_for_faster_processing.sql.';

