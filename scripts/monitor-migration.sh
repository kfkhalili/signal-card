#!/bin/bash
# Continuous monitoring script for migration
# Run this script to watch the migration progress in real-time

set -e

echo "📈 Migration Monitor (Press Ctrl+C to stop)"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check interval (seconds)
INTERVAL=${1:-5}

# Function to get queue stats
get_queue_stats() {
  if command -v supabase &> /dev/null; then
    supabase db query "
      SELECT
        status,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE data_type = 'profile') as profile_count
      FROM api_call_queue_v2
      GROUP BY status
      ORDER BY status;
    " 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# Function to get recent activity
get_recent_activity() {
  if command -v supabase &> /dev/null; then
    supabase db query "
      SELECT
        symbol,
        data_type,
        status,
        created_at::text as created
      FROM api_call_queue_v2
      WHERE created_at > NOW() - INTERVAL '1 minute'
      ORDER BY created_at DESC
      LIMIT 5;
    " 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# Function to get quota status
get_quota_status() {
  if command -v supabase &> /dev/null; then
    supabase db query "
      SELECT
        is_quota_exceeded_v2() as quota_exceeded,
        (SELECT COALESCE(SUM(total_bytes), 0) FROM api_data_usage_v2 WHERE date >= CURRENT_DATE - INTERVAL '30 days') as total_30d_bytes;
    " 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# Main monitoring loop
while true; do
  clear
  echo "📈 Migration Monitor (Refreshing every ${INTERVAL}s)"
  echo "==========================================="
  echo ""
  echo -e "${BLUE}Timestamp:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # Queue Stats
  echo -e "${BLUE}Queue Status:${NC}"
  QUEUE_STATS=$(get_queue_stats)
  if [ -n "$QUEUE_STATS" ]; then
    echo "$QUEUE_STATS"
  else
    echo -e "${YELLOW}⚠ Could not query queue${NC}"
  fi
  echo ""

  # Recent Activity
  echo -e "${BLUE}Recent Activity (Last Minute):${NC}"
  RECENT=$(get_recent_activity)
  if [ -n "$RECENT" ]; then
    echo "$RECENT"
  else
    echo "No recent activity"
  fi
  echo ""

  # Quota Status
  echo -e "${BLUE}Quota Status:${NC}"
  QUOTA=$(get_quota_status)
  if [ -n "$QUOTA" ]; then
    echo "$QUOTA"
  else
    echo -e "${YELLOW}⚠ Could not query quota${NC}"
  fi
  echo ""

  echo "Press Ctrl+C to stop monitoring..."
  sleep $INTERVAL
done

