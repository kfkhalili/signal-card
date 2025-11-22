#!/bin/bash
# AI-Friendly Status Check
# This script provides status information that the AI can use
# Outputs JSON for easy parsing

set -e

echo "{"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"checks\": {"

# Check registry (via MCP or fallback)
echo "    \"registry\": {"
if command -v supabase &> /dev/null; then
  REGISTRY_COUNT=$(supabase db query "SELECT COUNT(*) as count FROM data_type_registry_v2 WHERE data_type = 'profile';" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
  echo "      \"profile_entry_exists\": $([ "$REGISTRY_COUNT" -eq "1" ] && echo "true" || echo "false"),"
  echo "      \"count\": $REGISTRY_COUNT"
else
  echo "      \"profile_entry_exists\": null,"
  echo "      \"note\": \"Use Supabase MCP to check: SELECT COUNT(*) FROM data_type_registry_v2 WHERE data_type = 'profile';\""
fi
echo "    },"

# Check feature flags
echo "    \"feature_flags\": {"
if command -v supabase &> /dev/null; then
  FLAG_STATUS=$(supabase db query "SELECT is_enabled FROM feature_flags WHERE flag_name = 'use_queue_system';" 2>/dev/null | grep -oE '(true|false)' || echo "unknown")
  echo "      \"use_queue_system\": \"$FLAG_STATUS\""
else
  echo "      \"use_queue_system\": null,"
  echo "      \"note\": \"Use Supabase MCP to check: SELECT is_enabled FROM feature_flags WHERE flag_name = 'use_queue_system';\""
fi
echo "    },"

# Check queue
echo "    \"queue\": {"
if command -v supabase &> /dev/null; then
  QUEUE_COUNT=$(supabase db query "SELECT COUNT(*) FROM api_call_queue_v2 WHERE status IN ('pending', 'processing');" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
  echo "      \"pending_or_processing\": $QUEUE_COUNT"
else
  echo "      \"pending_or_processing\": null,"
  echo "      \"note\": \"Use Supabase MCP to check: SELECT COUNT(*) FROM api_call_queue_v2 WHERE status IN ('pending', 'processing');\""
fi
echo "    }"

echo "  }"
echo "}"

