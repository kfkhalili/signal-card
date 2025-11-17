#!/bin/bash
# Phase 0: Capture System Baseline
# This script records the current state of the system before migration
# Run this before starting Phase 1

set -e

echo "📊 Capturing system baseline metrics..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "   Set it to your Supabase connection string"
  exit 1
fi

# Capture baseline metrics
psql "$DATABASE_URL" <<EOF
-- Record baseline metrics
DO \$\$
DECLARE
  metric_record RECORD;
BEGIN
  -- Capture all baseline metrics
  FOR metric_record IN SELECT * FROM capture_system_baseline()
  LOOP
    PERFORM record_baseline_metric(
      metric_record.metric_name,
      metric_record.metric_value,
      'Baseline captured before migration - ' || NOW()::TEXT
    );
  END LOOP;

  RAISE NOTICE 'Baseline metrics captured successfully';
END \$\$;

-- Display captured metrics
SELECT
  metric_name,
  metric_value,
  recorded_at
FROM migration_baseline
ORDER BY recorded_at DESC
LIMIT 20;
EOF

echo "✅ Baseline metrics captured successfully!"
echo "   View metrics: SELECT * FROM migration_baseline ORDER BY recorded_at DESC;"

