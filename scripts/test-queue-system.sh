#!/bin/bash
# Automated test script for queue system
# This script runs all tests related to the new queue system

set -e

echo "🧪 Running Queue System Tests"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run tests and track results
run_test_suite() {
  local suite_name=$1
  local test_command=$2
  
  echo -e "${YELLOW}Running: ${suite_name}${NC}"
  if eval "$test_command"; then
    echo -e "${GREEN}✓ ${suite_name} passed${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ ${suite_name} failed${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

# 1. Unit Tests: Card Data Type Mapping
echo "1️⃣  Unit Tests: Card Data Type Mapping"
run_test_suite "Card Data Type Mapping" "npm test -- src/lib/__tests__/card-data-type-mapping.test.ts"
echo ""

# 2. Unit Tests: Feature Flags
echo "2️⃣  Unit Tests: Feature Flags"
run_test_suite "Feature Flags Integration" "npm test -- src/lib/__tests__/feature-flags-integration.test.ts"
echo ""

# 3. Unit Tests: useTrackSubscription Hook
echo "3️⃣  Unit Tests: useTrackSubscription Hook"
run_test_suite "useTrackSubscription Hook" "npm test -- src/hooks/__tests__/useTrackSubscription.test.tsx"
echo ""

# 4. SQL Integration Tests (if Supabase MCP is available)
echo "4️⃣  SQL Integration Tests"
if command -v supabase &> /dev/null; then
  echo "   Running SQL tests via Supabase..."
  # Note: SQL tests would need to be run via Supabase CLI or MCP
  echo -e "${YELLOW}⚠ SQL tests require Supabase connection (skipped in automated run)${NC}"
else
  echo -e "${YELLOW}⚠ Supabase CLI not found (skipped)${NC}"
fi
echo ""

# Summary
echo "================================"
echo "Test Summary:"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
  exit 1
else
  echo -e "${GREEN}Failed: ${TESTS_FAILED}${NC}"
  echo ""
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi

