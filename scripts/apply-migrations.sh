#!/bin/bash
# Apply all pending migrations
# This script applies migrations and verifies they were successful

set -e

echo "🔄 Applying Migrations"
echo "======================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠️  Supabase CLI not found.${NC}"
  echo ""
  echo "To apply migrations, use one of these methods:"
  echo ""
  echo "1. Install Supabase CLI:"
  echo "   brew install supabase/tap/supabase"
  echo ""
  echo "2. Use Supabase MCP (if configured):"
  echo "   The AI can apply migrations via MCP tools"
  echo ""
  echo "3. Apply manually via Supabase Dashboard:"
  echo "   - Go to Database > Migrations"
  echo "   - Apply pending migrations"
  echo ""
  exit 0
fi

echo "Checking migration status..."
supabase migration list

echo ""
echo "Applying migrations..."
if supabase db push; then
  echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
  echo -e "${RED}✗ Migration failed${NC}"
  exit 1
fi

echo ""
echo "Verifying migrations..."
bash scripts/validate-migration-readiness.sh

