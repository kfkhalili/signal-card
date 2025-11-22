#!/bin/bash
# Verify that data_type_registry_v2 has the profile entry
# This script can be run to check the current state of the registry

set -e

echo "🔍 Verifying data_type_registry_v2 entry for 'profile'"
echo "=================================================="
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "⚠️  Supabase CLI not found. Using SQL query via MCP..."
  echo ""
  echo "Run this SQL query manually:"
  echo ""
  echo "SELECT * FROM data_type_registry_v2 WHERE data_type = 'profile';"
  echo ""
  exit 0
fi

# Use Supabase CLI to query
echo "Querying data_type_registry_v2..."
supabase db query "
  SELECT
    data_type,
    table_name,
    timestamp_column,
    staleness_function,
    default_ttl_minutes,
    edge_function_name,
    refresh_strategy,
    refresh_schedule,
    priority,
    estimated_data_size_bytes,
    symbol_column,
    source_timestamp_column,
    created_at,
    updated_at
  FROM data_type_registry_v2
  WHERE data_type = 'profile';
" || {
  echo "❌ Failed to query registry. Check Supabase connection."
  exit 1
}

echo ""
echo "✅ Registry verification complete"

