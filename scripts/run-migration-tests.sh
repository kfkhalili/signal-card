#!/bin/bash
# Run all migration-related tests
# This script runs automated tests to verify the migration is working

set -e

echo "🧪 Running Migration Tests"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Validate readiness
echo "1️⃣  Running readiness validation..."
if bash scripts/validate-migration-readiness.sh > /tmp/readiness.log 2>&1; then
  echo -e "${GREEN}✓ Readiness validation passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Readiness validation failed${NC}"
  cat /tmp/readiness.log
  ((TESTS_FAILED++))
fi
echo ""

# Test 2: Verify registry entry
echo "2️⃣  Verifying registry entry..."
if bash scripts/verify-registry-entry.sh > /tmp/registry.log 2>&1; then
  echo -e "${GREEN}✓ Registry verification passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Registry verification failed${NC}"
  cat /tmp/registry.log
  ((TESTS_FAILED++))
fi
echo ""

# Test 3: End-to-end flow test
echo "3️⃣  Testing end-to-end flow..."
if bash scripts/test-end-to-end-flow.sh > /tmp/e2e.log 2>&1; then
  echo -e "${GREEN}✓ End-to-end test passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ End-to-end test failed${NC}"
  cat /tmp/e2e.log
  ((TESTS_FAILED++))
fi
echo ""

# Test 4: Unit tests
echo "4️⃣  Running unit tests..."
if npm test -- --passWithNoTests > /tmp/unit.log 2>&1; then
  echo -e "${GREEN}✓ Unit tests passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Unit tests failed${NC}"
  tail -20 /tmp/unit.log
  ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "=========================="
echo "Test Summary:"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $TESTS_FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}Failed: $TESTS_FAILED${NC}"
  echo ""
  echo -e "${GREEN}✅ All migration tests passed!${NC}"
  exit 0
fi

