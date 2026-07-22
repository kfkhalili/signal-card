#!/usr/bin/env bash

set -euo pipefail

default_commit_message="Harden backend ranking and scheduler verification"
commit_message="${*:-${default_commit_message}}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

fail() {
  echo "backend/ranking commit: $*" >&2
  exit 1
}

cd "${repo_root}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
  fail "not inside a Git worktree"

if ! git diff --cached --quiet; then
  echo "Already-staged files:" >&2
  git diff --cached --name-only >&2
  fail "refusing to mix existing staged changes into this commit"
fi

files=(
  "docs/verification/BACKEND_RANKING_VERIFICATION_2026-07-22.md"
  "scripts/export-ranking-snapshot.sh"
  "scripts/stage-and-commit-backend-ranking-verification.sh"
  "supabase/migrations/20250615092316_create_exchange_variants_table.sql"
  "supabase/migrations/20251117073831_create_background_staleness_checker_v2.sql"
  "supabase/migrations/20251117074150_create_cron_jobs_v2.sql"
  "supabase/migrations/20251117074151_create_edge_function_invoker_v2.sql"
  "supabase/migrations/20251121100000_deactivate_problematic_symbols.sql"
  "supabase/migrations/20260219051942_create_background_staleness_checker_v2.1.sql"
  "supabase/migrations/20260607000000_fix_memory_commitment.sql"
  "supabase/migrations/20260722000000_harden_compass_leaderboard.sql"
  "supabase/migrations/20260722010000_harden_queue_scheduler.sql"
  "supabase/tests/backend_ranking_benchmark.sql"
  "supabase/tests/backend_ranking_snapshot_benchmark.sql"
  "supabase/tests/backend_ranking_verification.sql"
)

for file in "${files[@]}"; do
  [[ -f "${file}" ]] || fail "expected file is missing: ${file}"
done

bash -n scripts/export-ranking-snapshot.sh
bash -n scripts/stage-and-commit-backend-ranking-verification.sh

git add -- "${files[@]}"
git diff --cached --check

is_expected_file() {
  local candidate="$1"
  local expected

  for expected in "${files[@]}"; do
    [[ "${candidate}" == "${expected}" ]] && return 0
  done

  return 1
}

unexpected_file=""
while IFS= read -r staged_file; do
  if ! is_expected_file "${staged_file}"; then
    unexpected_file="${staged_file}"
    break
  fi
done < <(git diff --cached --name-only)

[[ -z "${unexpected_file}" ]] ||
  fail "unexpected file was staged: ${unexpected_file}"

for file in "${files[@]}"; do
  git diff --cached --name-only | grep -Fxq "${file}" ||
    fail "expected file has no staged change: ${file}"
done

echo "Staged backend/ranking changes:"
git diff --cached --stat

git commit -m "${commit_message}"

echo "Committed as $(git rev-parse --short HEAD)"
echo "Unrelated worktree files were not staged."
