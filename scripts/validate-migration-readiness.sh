#!/bin/bash
# Validate that the system is ready for migration
# This script checks all prerequisites before enabling the feature flag

set -e

echo "✅ Migration Readiness Validation"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Check 1: Registry entry exists
echo "1️⃣  Checking registry entry..."
if command -v supabase &> /dev/null; then
  REGISTRY_COUNT=$(supabase db query "SELECT COUNT(*) as count FROM data_type_registry_v2 WHERE data_type = 'profile';" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
  if [ "$REGISTRY_COUNT" -eq "1" ]; then
    echo -e "${GREEN}✓ Registry entry exists${NC}"
  else
    echo -e "${RED}✗ Registry entry not found (count: $REGISTRY_COUNT)${NC}"
    ((ERRORS++))
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not available - skipping check${NC}"
  ((WARNINGS++))
fi
echo ""

# Check 2: Feature flag is disabled
echo "2️⃣  Checking feature flag status..."
if command -v supabase &> /dev/null; then
  FLAG_STATUS=$(supabase db query "SELECT is_enabled FROM feature_flags WHERE flag_name = 'use_queue_system';" 2>/dev/null | grep -oE '(true|false)' || echo "unknown")
  if [ "$FLAG_STATUS" = "false" ]; then
    echo -e "${GREEN}✓ Feature flag is disabled (safe)${NC}"
  elif [ "$FLAG_STATUS" = "true" ]; then
    echo -e "${YELLOW}⚠ Feature flag is already enabled${NC}"
    ((WARNINGS++))
  else
    echo -e "${RED}✗ Could not check feature flag status${NC}"
    ((ERRORS++))
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not available - skipping check${NC}"
  ((WARNINGS++))
fi
echo ""

# Check 3: Queue table exists
echo "3️⃣  Checking queue table..."
if command -v supabase &> /dev/null; then
  TABLE_EXISTS=$(supabase db query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_call_queue_v2');" 2>/dev/null | grep -oE '(true|false)' || echo "false")
  if [ "$TABLE_EXISTS" = "true" ]; then
    echo -e "${GREEN}✓ Queue table exists${NC}"
  else
    echo -e "${RED}✗ Queue table not found${NC}"
    ((ERRORS++))
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not available - skipping check${NC}"
  ((WARNINGS++))
fi
echo ""

# Check 4: Staleness function exists
echo "4️⃣  Checking staleness function..."
if command -v supabase &> /dev/null; then
  FUNC_EXISTS=$(supabase db query "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'is_profile_stale_v2');" 2>/dev/null | grep -oE '(true|false)' || echo "false")
  if [ "$FUNC_EXISTS" = "true" ]; then
    echo -e "${GREEN}✓ Staleness function exists${NC}"
  else
    echo -e "${RED}✗ Staleness function not found${NC}"
    ((ERRORS++))
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not available - skipping check${NC}"
  ((WARNINGS++))
fi
echo ""

# Check 5: Queue functions exist
echo "5️⃣  Checking queue functions..."
if command -v supabase &> /dev/null; then
  FUNCS=("get_queue_batch_v2" "complete_queue_job_v2" "queue_refresh_if_not_exists_v2")
  for func in "${FUNCS[@]}"; do
    FUNC_EXISTS=$(supabase db query "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$func');" 2>/dev/null | grep -oE '(true|false)' || echo "false")
    if [ "$FUNC_EXISTS" = "true" ]; then
      echo -e "${GREEN}✓ $func exists${NC}"
    else
      echo -e "${RED}✗ $func not found${NC}"
      ((ERRORS++))
    fi
  done
else
  echo -e "${YELLOW}⚠ Supabase CLI not available - skipping check${NC}"
  ((WARNINGS++))
fi
echo ""

# Check 6: Edge Function exists
echo "6️⃣  Checking Edge Functions..."
if [ -f "supabase/functions/queue-processor-v2/index.ts" ]; then
  echo -e "${GREEN}✓ queue-processor-v2 exists${NC}"
else
  echo -e "${RED}✗ queue-processor-v2 not found${NC}"
  ((ERRORS++))
fi

# track-subscription-v2 removed - now using autonomous discovery via refresh-analytics-from-presence-v2
if [ -f "supabase/functions/refresh-analytics-from-presence-v2/index.ts" ]; then
  echo -e "${GREEN}✓ refresh-analytics-from-presence-v2 exists${NC}"
else
  echo -e "${RED}✗ refresh-analytics-from-presence-v2 not found${NC}"
  ((ERRORS++))
fi
echo ""

# Check 7: Library function exists
echo "7️⃣  Checking library functions..."
if [ -f "supabase/functions/lib/fetch-fmp-profile.ts" ]; then
  echo -e "${GREEN}✓ fetch-fmp-profile.ts exists${NC}"
else
  echo -e "${RED}✗ fetch-fmp-profile.ts not found${NC}"
  ((ERRORS++))
fi
echo ""

# Check 8: Cron jobs exist
echo "8️⃣  Checking cron jobs..."
if command -v supabase &> /dev/null; then
  CRON_COUNT=$(supabase db query "SELECT COUNT(*) as count FROM cron.job WHERE jobname LIKE '%v2%';" 2>/dev/null | grep -oE '[0-9]+' || echo "0")
  if [ "$CRON_COUNT" -ge "4" ]; then
    echo -e "${GREEN}✓ Cron jobs exist (found $CRON_COUNT)${NC}"
  else
    echo -e "${YELLOW}⚠ Expected at least 4 cron jobs, found $CRON_COUNT${NC}"
    ((WARNINGS++))
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not available - skipping check${NC}"
  ((WARNINGS++))
fi
echo ""

# Summary
echo "=================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! System is ready for migration.${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ System is ready but has $WARNINGS warning(s)${NC}"
  exit 0
else
  echo -e "${RED}✗ System is NOT ready. Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
  exit 1
fi

