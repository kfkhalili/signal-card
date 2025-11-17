#!/bin/bash
# Check the current status of the migration
# This script provides a comprehensive status report

set -e

echo "📊 Migration Status Report"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠️  Supabase CLI not found. Some checks will be skipped.${NC}"
  echo ""
  USE_CLI=false
else
  USE_CLI=true
fi

# 1. Feature Flag Status
echo -e "${BLUE}1. Feature Flags${NC}"
echo "-------------------"
if [ "$USE_CLI" = true ]; then
  FLAGS=$(supabase db query "
    SELECT flag_name, is_enabled
    FROM feature_flags
    WHERE flag_name IN ('use_queue_system', 'use_presence_tracking', 'migrate_profile_type')
    ORDER BY flag_name;
  " 2>/dev/null || echo "")

  if [ -n "$FLAGS" ]; then
    echo "$FLAGS"
  else
    echo -e "${YELLOW}⚠ Could not query feature flags${NC}"
  fi
else
  echo "Run: SELECT flag_name, is_enabled FROM feature_flags WHERE flag_name IN ('use_queue_system', 'use_presence_tracking', 'migrate_profile_type');"
fi
echo ""

# 2. Registry Status
echo -e "${BLUE}2. Data Type Registry${NC}"
echo "----------------------"
if [ "$USE_CLI" = true ]; then
  REGISTRY=$(supabase db query "
    SELECT
      data_type,
      table_name,
      default_ttl_minutes,
      refresh_strategy,
      edge_function_name,
      created_at
    FROM data_type_registry_v2
    ORDER BY created_at;
  " 2>/dev/null || echo "")

  if [ -n "$REGISTRY" ]; then
    echo "$REGISTRY"
    REGISTRY_COUNT=$(echo "$REGISTRY" | grep -c "profile" || echo "0")
    if [ "$REGISTRY_COUNT" -gt 0 ]; then
      echo -e "${GREEN}✓ Profile data type registered${NC}"
    else
      echo -e "${RED}✗ Profile data type not found${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Could not query registry${NC}"
  fi
else
  echo "Run: SELECT data_type, table_name, refresh_strategy FROM data_type_registry_v2;"
fi
echo ""

# 3. Queue Status
echo -e "${BLUE}3. Queue Status${NC}"
echo "---------------"
if [ "$USE_CLI" = true ]; then
  QUEUE_STATUS=$(supabase db query "
    SELECT
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE data_type = 'profile') as profile_count
    FROM api_call_queue_v2
    GROUP BY status
    ORDER BY status;
  " 2>/dev/null || echo "")

  if [ -n "$QUEUE_STATUS" ]; then
    echo "$QUEUE_STATUS"
  else
    echo -e "${YELLOW}⚠ Could not query queue${NC}"
  fi
else
  echo "Run: SELECT status, COUNT(*) FROM api_call_queue_v2 GROUP BY status;"
fi
echo ""

# 4. Quota Status
echo -e "${BLUE}4. Quota Status${NC}"
echo "---------------"
if [ "$USE_CLI" = true ]; then
  QUOTA=$(supabase db query "
    SELECT
      date,
      total_bytes,
      is_quota_exceeded_v2() as quota_exceeded
    FROM api_data_usage_v2
    ORDER BY date DESC
    LIMIT 7;
  " 2>/dev/null || echo "")

  if [ -n "$QUOTA" ]; then
    echo "$QUOTA"
  else
    echo -e "${YELLOW}⚠ Could not query quota (table may be empty)${NC}"
  fi
else
  echo "Run: SELECT date, total_bytes FROM api_data_usage_v2 ORDER BY date DESC LIMIT 7;"
fi
echo ""

# 5. Cron Job Status
echo -e "${BLUE}5. Cron Job Status${NC}"
echo "------------------"
if [ "$USE_CLI" = true ]; then
  CRON_JOBS=$(supabase db query "
    SELECT
      jobname,
      schedule,
      active,
      jobid
    FROM cron.job
    WHERE jobname LIKE '%v2%'
    ORDER BY jobname;
  " 2>/dev/null || echo "")

  if [ -n "$CRON_JOBS" ]; then
    echo "$CRON_JOBS"
  else
    echo -e "${YELLOW}⚠ Could not query cron jobs${NC}"
  fi
else
  echo "Run: SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%v2%';"
fi
echo ""

# 6. Recent Queue Activity
echo -e "${BLUE}6. Recent Queue Activity (Last 10 Jobs)${NC}"
echo "----------------------------------------"
if [ "$USE_CLI" = true ]; then
  RECENT=$(supabase db query "
    SELECT
      symbol,
      data_type,
      status,
      priority,
      created_at,
      processed_at
    FROM api_call_queue_v2
    ORDER BY created_at DESC
    LIMIT 10;
  " 2>/dev/null || echo "")

  if [ -n "$RECENT" ]; then
    echo "$RECENT"
  else
    echo -e "${YELLOW}⚠ No recent queue activity${NC}"
  fi
else
  echo "Run: SELECT symbol, data_type, status, created_at FROM api_call_queue_v2 ORDER BY created_at DESC LIMIT 10;"
fi
echo ""

# Summary
echo "=========================="
echo -e "${BLUE}Status Check Complete${NC}"
echo ""
echo "To check status programmatically, use the Supabase MCP tools or run these SQL queries."

