# Phase 0: Baseline Metrics Documentation

**Purpose:** Record current system state before migration for comparison.

## How to Capture Baseline

### Option 1: Using the Script

```bash
export DATABASE_URL="your-supabase-connection-string"
./scripts/capture-baseline.sh
```

### Option 2: Manual SQL

```sql
-- Capture baseline metrics
SELECT * FROM capture_system_baseline();

-- Record them
DO $$
DECLARE
  metric_record RECORD;
BEGIN
  FOR metric_record IN SELECT * FROM capture_system_baseline()
  LOOP
    PERFORM record_baseline_metric(
      metric_record.metric_name,
      metric_record.metric_value,
      'Baseline captured before migration'
    );
  END LOOP;
END $$;
```

## Metrics Captured

The baseline captures:

1. **Row Counts:**
   - `profiles_row_count`
   - `live_quote_indicators_row_count`
   - `financial_statements_row_count`
   - (and other data tables)

2. **Latest Fetch Times:**
   - `profiles_latest_fetch`
   - `live_quote_indicators_latest_fetch`
   - (and other data tables)

3. **Cron Job Status:**
   - `cron_job_count`

## Viewing Baseline

```sql
-- View all baseline metrics
SELECT * FROM migration_baseline ORDER BY recorded_at DESC;

-- View specific metric
SELECT metric_value FROM migration_baseline
WHERE metric_name = 'profiles_row_count'
ORDER BY recorded_at DESC
LIMIT 1;
```

## Comparison During Migration

During migration, compare new system metrics against baseline:

```sql
-- Compare row counts
SELECT
  'profiles' AS table_name,
  (SELECT (metric_value->>'count')::BIGINT
   FROM migration_baseline
   WHERE metric_name = 'profiles_row_count'
   ORDER BY recorded_at DESC LIMIT 1) AS baseline_count,
  (SELECT COUNT(*) FROM profiles) AS current_count;
```

---

**Status:** Ready to capture baseline before Phase 1

