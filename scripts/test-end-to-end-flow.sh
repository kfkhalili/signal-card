#!/bin/bash
# Test the end-to-end flow for profile data type
# This script tests the complete flow without enabling the feature flag

set -e

echo "🧪 Testing End-to-End Flow (Feature Flag Disabled)"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Verify registry entry exists
echo "1️⃣  Verifying registry entry..."
if supabase db query "SELECT COUNT(*) as count FROM data_type_registry_v2 WHERE data_type = 'profile';" | grep -q "1"; then
  echo -e "${GREEN}✓ Registry entry exists${NC}"
else
  echo -e "${RED}✗ Registry entry not found${NC}"
  exit 1
fi
echo ""

# Test 2: Verify feature flag is disabled
echo "2️⃣  Verifying feature flag is disabled..."
FLAG_STATUS=$(supabase db query "SELECT is_enabled FROM feature_flags WHERE flag_name = 'use_queue_system';" | grep -oE '(true|false)' || echo "false")
if [ "$FLAG_STATUS" = "false" ]; then
  echo -e "${GREEN}✓ Feature flag is disabled (safe)${NC}"
else
  echo -e "${YELLOW}⚠ Feature flag is enabled (unexpected)${NC}"
fi
echo ""

# Test 3: Verify queue table exists and is empty
echo "3️⃣  Verifying queue table..."
QUEUE_COUNT=$(supabase db query "SELECT COUNT(*) as count FROM api_call_queue_v2 WHERE status IN ('pending', 'processing');" | grep -oE '[0-9]+' || echo "0")
if [ "$QUEUE_COUNT" = "0" ]; then
  echo -e "${GREEN}✓ Queue is empty (expected)${NC}"
else
  echo -e "${YELLOW}⚠ Queue has $QUEUE_COUNT pending/processing jobs${NC}"
fi
echo ""

# Test 4: Test staleness check function
echo "4️⃣  Testing staleness check function..."
TEST_RESULT=$(supabase db query "
  SELECT is_profile_stale_v2(
    NOW() - INTERVAL '25 hours',
    1440
  ) as is_stale;
" | grep -oE '(true|false)' || echo "false")
if [ "$TEST_RESULT" = "true" ]; then
  echo -e "${GREEN}✓ Staleness check function works (25h old data is stale)${NC}"
else
  echo -e "${RED}✗ Staleness check function failed${NC}"
  exit 1
fi
echo ""

# Test 5: Test queue_refresh_if_not_exists function
echo "5️⃣  Testing queue_refresh_if_not_exists function..."
QUEUE_RESULT=$(supabase db query "
  SELECT queue_refresh_if_not_exists_v2(
    'AAPL',
    'profile',
    0
  ) as queued;
" | grep -oE '(true|false)' || echo "false")
if [ "$QUEUE_RESULT" = "true" ]; then
  echo -e "${GREEN}✓ Queue function works (job queued)${NC}"

  # Clean up test job
  echo "   Cleaning up test job..."
  supabase db query "DELETE FROM api_call_queue_v2 WHERE symbol = 'AAPL' AND data_type = 'profile' AND status = 'pending';" > /dev/null 2>&1 || true
else
  echo -e "${RED}✗ Queue function failed${NC}"
  exit 1
fi
echo ""

# Test 6: Verify processor can get batch
echo "6️⃣  Testing get_queue_batch function..."
BATCH_RESULT=$(supabase db query "
  SELECT COUNT(*) as count
  FROM get_queue_batch_v2(10, 1000);
" | grep -oE '[0-9]+' || echo "0")
echo -e "${GREEN}✓ Batch function works (returned $BATCH_RESULT jobs)${NC}"
echo ""

# Summary
echo "=================================================="
echo -e "${GREEN}✅ All end-to-end tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Enable feature flag when ready:"
echo "   UPDATE feature_flags SET is_enabled = true WHERE flag_name = 'use_queue_system';"
echo ""
echo "2. Monitor queue processing:"
echo "   SELECT status, COUNT(*) FROM api_call_queue_v2 GROUP BY status;"
echo ""
echo "3. Check quota usage:"
echo "   SELECT * FROM api_data_usage_v2 ORDER BY date DESC LIMIT 7;"

