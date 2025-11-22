-- Contract #16: Polite Partition Maintenance
-- Test: maintain_queue_partitions_v2 must set lock_timeout = '1s' before TRUNCATE
--
-- Why: TRUNCATE requires ACCESS EXCLUSIVE lock, which blocks all other operations
-- (SELECT, INSERT, UPDATE, DELETE). Without lock timeout, maintenance job can create
-- "stop-the-world" deadlock with processors. This brings the entire queueing system to a halt.
--
-- What NOT to do:
-- - ❌ Use TRUNCATE without lock_timeout (blocks all operations indefinitely)
-- - ❌ Allow maintenance job to wait for locks (causes system-wide deadlock)

BEGIN;
SELECT plan(2);

-- Test 1: Function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'maintain_queue_partitions_v2'
  ),
  'Contract #16: maintain_queue_partitions_v2 function exists'
);

-- Test 2: Function sets lock_timeout before TRUNCATE
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'maintain_queue_partitions_v2'
      AND (
        pg_get_functiondef(p.oid) ~* 'lock_timeout\s*=\s*[''"]1s[''"]'
        OR pg_get_functiondef(p.oid) ~* 'SET\s+lock_timeout\s*=\s*[''"]1s[''"]'
      )
      AND pg_get_functiondef(p.oid) ~* 'TRUNCATE'
      -- Ensure lock_timeout is set BEFORE TRUNCATE (not after)
      AND position(
        UPPER('SET lock_timeout') IN UPPER(pg_get_functiondef(p.oid))
      ) < position(
        UPPER('TRUNCATE') IN UPPER(pg_get_functiondef(p.oid))
      )
  ),
  'Contract #16: maintain_queue_partitions_v2 sets lock_timeout = 1s before TRUNCATE'
);

SELECT * FROM finish();
ROLLBACK;

