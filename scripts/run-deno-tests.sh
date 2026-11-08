#!/usr/bin/env bash

# Runs the edge-function tests written for Deno: every *.test.ts under
# supabase/functions that calls Deno.test. Jest skips the same files
# (jest.config.mjs), so each test runs under exactly one runner.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
functions_dir="${script_dir}/../supabase/functions"

cd "${functions_dir}"

mapfile -t deno_tests < <(grep -rl --include='*.test.ts' 'Deno.test(' . | sort)

if [[ ${#deno_tests[@]} -eq 0 ]]; then
  echo "No Deno tests found under supabase/functions." >&2
  exit 1
fi

# --no-lock: a deno.lock in supabase/functions would be picked up by deploys.
npx --yes deno test --no-lock --allow-env --allow-net --allow-read "${deno_tests[@]}"
