#!/bin/bash
# Get detailed metrics about the migration
# This script provides comprehensive metrics for monitoring

set -e

echo "📊 Migration Metrics"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠️  Supabase CLI not found. Using SQL queries via MCP...${NC}"
  echo ""
  echo "Run these SQL queries to get metrics:"
  echo ""
  cat << 'EOF'
-- Queue Metrics
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
FROM api_call_queue_v2
GROUP BY status;

-- Profile-specific metrics
SELECT
  status,
  COUNT(*) as count,
  AVG(priority) as avg_priority
FROM api_call_queue_v2
WHERE data_type = 'profile'
GROUP BY status;

-- Quota metrics
SELECT
  date,
  total_bytes,
  total_bytes / 1024 / 1024 / 1024 as total_gb
FROM api_data_usage_v2
ORDER BY date DESC
LIMIT 30;

-- Success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate_percent
FROM api_call_queue_v2
WHERE data_type = 'profile'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Processing time stats
SELECT
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds,
  MIN(EXTRACT(EPOCH FROM (processed_at - created_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_seconds
FROM api_call_queue_v2
WHERE status = 'completed'
  AND processed_at IS NOT NULL
  AND data_type = 'profile';
EOF
  exit 0
fi

# Queue Metrics
echo -e "${BLUE}Queue Metrics:${NC}"
supabase db query "
  SELECT
    status,
    COUNT(*) as count,
    ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as avg_processing_time_seconds
  FROM api_call_queue_v2
  GROUP BY status
  ORDER BY status;
" 2>/dev/null || echo -e "${YELLOW}⚠ Could not query queue metrics${NC}"
echo ""

# Profile-specific metrics
echo -e "${BLUE}Profile Data Type Metrics:${NC}"
supabase db query "
  SELECT
    status,
    COUNT(*) as count,
    AVG(priority) as avg_priority,
    MAX(created_at) as last_job_created
  FROM api_call_queue_v2
  WHERE data_type = 'profile'
  GROUP BY status
  ORDER BY status;
" 2>/dev/null || echo -e "${YELLOW}⚠ Could not query profile metrics${NC}"
echo ""

# Quota metrics
echo -e "${BLUE}Quota Metrics (Last 30 Days):${NC}"
supabase db query "
  SELECT
    date,
    total_bytes,
    ROUND(total_bytes / 1024.0 / 1024.0 / 1024.0, 2) as total_gb,
    is_quota_exceeded_v2() as quota_exceeded
  FROM api_data_usage_v2
  ORDER BY date DESC
  LIMIT 30;
" 2>/dev/null || echo -e "${YELLOW}⚠ Could not query quota metrics${NC}"
echo ""

# Success rate
echo -e "${BLUE}Success Rate (Last 24 Hours):${NC}"
supabase db query "
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0) as success_rate_percent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) as total_count
  FROM api_call_queue_v2
  WHERE data_type = 'profile'
    AND created_at > NOW() - INTERVAL '24 hours';
" 2>/dev/null || echo -e "${YELLOW}⚠ Could not query success rate${NC}"
echo ""

# Processing time stats
echo -e "${BLUE}Processing Time Stats (Profile):${NC}"
supabase db query "
  SELECT
    ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as avg_seconds,
    ROUND(MIN(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as min_seconds,
    ROUND(MAX(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as max_seconds,
    COUNT(*) as sample_size
  FROM api_call_queue_v2
  WHERE status = 'completed'
    AND processed_at IS NOT NULL
    AND data_type = 'profile'
    AND created_at > NOW() - INTERVAL '24 hours';
" 2>/dev/null || echo -e "${YELLOW}⚠ Could not query processing time${NC}"
echo ""

echo "===================="
echo -e "${BLUE}Metrics collection complete${NC}"

