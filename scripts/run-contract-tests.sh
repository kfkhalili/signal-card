#!/bin/bash
# Run all contract tests using pgTAP
# This script runs automated tests to verify Sacred Contracts are enforced

set -e

echo "🧪 Running Contract Tests (Sacred Contracts Enforcement)"
echo "========================================================"
echo ""
echo "⚠️  NOTE: Tests run against the database specified by DATABASE_URL"
echo "   Default: Local Supabase (recommended for development)"
echo "   Production: Only use with explicit DATABASE_URL set"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if DATABASE_URL is set, or try to get it from Supabase CLI
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  DATABASE_URL not set.${NC}"
  echo ""
  echo "Attempting to get DATABASE_URL from Supabase CLI..."

  # Try to get it from Supabase status
  if command -v supabase &> /dev/null; then
    # Try JSON output first (more reliable)
    if command -v jq &> /dev/null; then
      SUPABASE_DB_URL=$(supabase status --output json 2>/dev/null | jq -r '.DB_URL' 2>/dev/null)
    fi

    # Fallback to grep/awk method if JSON parsing failed or jq not available
    if [ -z "$SUPABASE_DB_URL" ]; then
      SUPABASE_DB_URL=$(supabase status 2>/dev/null | grep -i 'database url' | awk '{print $NF}' | head -1)
    fi

    if [ -n "$SUPABASE_DB_URL" ] && [ "$SUPABASE_DB_URL" != "null" ]; then
      export DATABASE_URL="$SUPABASE_DB_URL"
      echo -e "${GREEN}✓ Found DATABASE_URL from Supabase (LOCAL): $DATABASE_URL${NC}"
      echo -e "${GREEN}  ✓ Running tests against LOCAL database (safe)${NC}"
    else
      echo -e "${RED}✗ Could not get DATABASE_URL from Supabase CLI${NC}"
      echo ""
      echo "To run contract tests, set DATABASE_URL:"
      echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
      echo ""
      echo "For local Supabase:"
      echo "  supabase start  # Start local Supabase"
      echo "  export DATABASE_URL=\$(supabase status --output json | jq -r '.DB_URL')"
      echo ""
      echo "See tests/contracts/DATABASE_URL_SETUP.md for detailed instructions."
      exit 1
    fi
  else
    echo -e "${RED}✗ Supabase CLI not found${NC}"
    echo ""
    echo "To run contract tests, set DATABASE_URL:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
    echo ""
    echo "See tests/contracts/DATABASE_URL_SETUP.md for detailed instructions."
    exit 1
  fi
fi

# Warn if connecting to production (detect common production patterns)
if [[ "$DATABASE_URL" == *".supabase.co"* ]] || [[ "$DATABASE_URL" == *"pooler.supabase.com"* ]]; then
  echo -e "${YELLOW}⚠️  WARNING: DATABASE_URL appears to be PRODUCTION${NC}"
  echo -e "${YELLOW}   Contract tests are read-only, but be cautious.${NC}"
  echo -e "${YELLOW}   Consider using local Supabase for development.${NC}"
  echo ""
  read -p "Continue with production database? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Use local Supabase: supabase start"
    exit 1
  fi
fi

# Check if pgTAP extension is installed
echo "Checking pgTAP extension..."
if psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_extension WHERE extname = 'pgtap'" | grep -q 1; then
  echo -e "${GREEN}✓ pgTAP extension is installed${NC}"
else
  echo -e "${RED}✗ pgTAP extension is not installed${NC}"
  echo ""
  echo "To install pgTAP:"
  echo "  psql \$DATABASE_URL -c 'CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;'"
  echo ""
  echo "Note: pgTAP may require superuser privileges."
  echo "For Supabase production, contact support to enable the extension."
  echo "For local development, install via:"
  echo "  brew install pgtap  # macOS"
  echo "  apt-get install postgresql-*-pgtap  # Debian/Ubuntu"
  exit 1
fi

echo ""
echo "Running contract tests..."
echo ""

# Change to contracts directory to run tests (so \i paths work correctly)
cd tests/contracts || exit 1

# Run all contract tests
if psql "$DATABASE_URL" -f run_all_contracts.sql; then
  echo ""
  echo -e "${GREEN}✅ All contract tests passed!${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Contract tests failed!${NC}"
  echo ""
  echo "If a contract test fails:"
  echo "  1. DO NOT modify the test to pass"
  echo "  2. FIX the function to maintain the contract"
  echo "  3. If the contract is obsolete, remove both the contract AND the test"
  cd - > /dev/null || exit 1
  exit 1
fi

# Return to original directory
cd - > /dev/null || exit 1

