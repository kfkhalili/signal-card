#!/bin/bash
# Apply all migrations via Supabase MCP
# This script is designed to be run by the AI to apply all pending migrations

set -e

echo "🔄 Applying All Migrations via Supabase MCP"
echo "==========================================="
echo ""
echo "This script will apply all Phase 0-5 migrations."
echo "The AI will use Supabase MCP tools to apply each migration."
echo ""
echo "⚠️  Note: This requires Supabase MCP to be configured."
echo ""

# List of migrations in order
MIGRATIONS=(
  "20251117072140_create_feature_flags_table"
  "20251117072141_create_health_check_function"
  "20251117072142_create_baseline_metrics_table"
  "20251117072150_create_data_type_registry_v2"
  "20251117072151_create_is_valid_identifier_function"
  "20251117072630_create_active_subscriptions_v2"
  "20251117072631_create_api_call_queue_v2"
  "20251117072632_create_api_data_usage_v2"
  "20251117072633_create_staleness_functions_v2"
  "20251117073700_create_quota_functions_v2"
  "20251117073701_create_queue_management_functions_v2"
  "20251117073702_create_recovery_functions_v2"
  "20251117073703_create_queue_helpers_v2"
  "20251117073704_create_processor_invoker_v2"
  "20251117073705_create_partition_maintenance_v2"
  "20251117073830_create_staleness_check_functions_v2"
  "20251117073831_create_background_staleness_checker_v2"
  "20251117073832_create_scheduled_refreshes_v2"
  "20251117073833_create_analytics_refresh_v2"
  "20251117074150_create_cron_jobs_v2"
  "20251117074151_create_edge_function_invoker_v2"
  "20251117075000_populate_data_type_registry_profile"
)

echo "Found ${#MIGRATIONS[@]} migrations to apply"
echo ""
echo "To apply migrations, the AI should:"
echo "1. Read each migration file"
echo "2. Use mcp_supabase-tickered_apply_migration with the SQL content"
echo "3. Verify each migration was successful"
echo ""
echo "Migration files are located in: supabase/migrations/"
echo ""
echo "After applying migrations, run:"
echo "  npm run migration:validate"
echo "  npm run migration:status"

