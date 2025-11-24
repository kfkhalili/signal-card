-- Contract #11: Table Partitioning (Day 90 Performance)
-- Test: api_call_queue_v2 must be partitioned by status to prevent table bloat performance catastrophe
--
-- Why: High UPDATE volume (thousands/minute) creates dead tuples faster than autovacuum can clean.
-- This leads to massive table and index bloat (1 GB → 100 GB on disk with same row count).
-- Partitioning ensures the "hot" partition (pending) is always small, fast, and dense.
--
-- What NOT to do:
-- - ❌ Use unpartitioned table for high-throughput queue (will bloat and fail at scale)
-- - ❌ Remove partitioning to "simplify" schema

BEGIN;
SELECT plan(3);

-- Test 1: Table exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'api_call_queue_v2'
  ),
  'Contract #11: api_call_queue_v2 table exists'
);

-- Test 2: Table is partitioned by status
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'api_call_queue_v2'
      AND c.relkind = 'p' -- 'p' = partitioned table
  ),
  'Contract #11: api_call_queue_v2 is a partitioned table'
);

-- Test 3: Has required partitions (pending, processing, completed, failed)
SELECT ok(
  (
    SELECT COUNT(*) >= 4
    FROM pg_inherits i
    JOIN pg_class c ON i.inhparent = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'api_call_queue_v2'
  ),
  'Contract #11: api_call_queue_v2 has at least 4 partitions (pending, processing, completed, failed)'
);

SELECT * FROM finish();
ROLLBACK;

