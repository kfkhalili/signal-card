#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
supabase_cli="${repo_root}/node_modules/.bin/supabase"

if [[ ! -x "${supabase_cli}" ]]; then
  echo "Pinned Supabase CLI is missing. Run: npm ci" >&2
  exit 1
fi

echo "Running database contracts with Supabase CLI $(${supabase_cli} --version)..."

"${supabase_cli}" test db --local \
  "${repo_root}"/tests/contracts/test_contract_*.sql
