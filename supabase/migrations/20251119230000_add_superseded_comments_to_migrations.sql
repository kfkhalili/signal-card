-- Add comments to migrations that are superseded by later migrations
-- This documents the migration history without breaking existing migrations
--
-- Note: These are informational comments only. The migrations themselves
-- remain in the history for audit purposes.

-- Document that check_and_queue_stale_data_from_presence_v2 migrations are superseded
DO $$
BEGIN
  -- Note: We can't add comments to migration files directly via SQL,
  -- but we can document the final consolidated state here
  RAISE NOTICE 'Migration cleanup: The following migrations are superseded by 20251119210000_consolidate_staleness_checker_with_all_fixes.sql:';
  RAISE NOTICE '  - 20251117180100_optimize_staleness_checker_timeout.sql (timeout logic kept, but JOIN fixed)';
  RAISE NOTICE '  - 20251118000000_add_exchange_status_check_to_background_staleness_checker.sql (exchange check kept, but JOIN fixed)';
  RAISE NOTICE '  - 20251118030000_fix_background_staleness_checker_for_missing_data.sql (LEFT JOIN kept, but timeout and exchange check added back)';
  RAISE NOTICE '  - 20251119000000_fix_exchange_status_check_for_missing_quote_data.sql (all fixes kept, but timeout added)';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration cleanup: The following migration is superseded by 20251117180200_optimize_processor_for_faster_processing.sql:';
  RAISE NOTICE '  - 20251117180000_optimize_processor_for_one_minute_processing.sql (settings overwritten by later migration)';
END $$;

