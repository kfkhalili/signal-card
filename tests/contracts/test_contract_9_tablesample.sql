-- Contract #9: Bounded Scheduled Job Performance
-- Test: queue_scheduled_refreshes_v2 must use a bounded oldest-first scan and
-- a calibrated queue-depth target.
--
-- Why: TABLESAMPLE avoided a full cross join but could repeatedly miss symbols.
-- A partial index plus LIMIT gives deterministic full-universe coverage without
-- materializing a symbols × data-types cross join.
--
-- What NOT to do:
-- - Use a full CROSS JOIN across symbols and data types
-- - Scan the entire symbol universe in one cron invocation
-- - Recreate an unbounded pending backlog

BEGIN;
SELECT plan(4);

-- Test 1: Function exists
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
  ),
  'Contract #9: queue_scheduled_refreshes_v2 function exists'
);

-- Test 2: deterministic round robin is bounded
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
      AND pg_get_functiondef(p.oid)
          ~* 'ORDER BY\s+listed\.last_processed_at\s+ASC\s+NULLS\s+FIRST'
      AND pg_get_functiondef(p.oid) ~* 'LIMIT\s+max_symbols_per_run'
  ),
  'Contract #9: scheduler uses bounded oldest-first round robin'
);

-- Test 3: queue growth is tied to the calibrated processor batch
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'queue_scheduled_refreshes_v2'
      AND pg_get_functiondef(p.oid)
          ~* 'target_queue_depth\s*:=\s*GREATEST\(batch_capacity\s*\*\s*2,\s*50\)'
      AND pg_get_functiondef(p.oid)
          ~* 'queue_depth\s*>=\s*target_queue_depth'
  ),
  'Contract #9: scheduler bounds pending work to a calibrated two-batch buffer'
);

-- Test 4: the partial index supports the scheduling order
SELECT has_index(
  'public',
  'listed_symbols',
  'idx_listed_symbols_active_last_processed',
  'Contract #9: active-symbol round robin has a supporting index'
);

SELECT * FROM finish();
ROLLBACK;
