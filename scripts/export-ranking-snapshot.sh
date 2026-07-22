#!/usr/bin/env bash

set -euo pipefail

# This script is intentionally read-only. It uses Supabase's PostgreSQL dump
# path and never invokes an Edge Function or an FMP endpoint.

expected_project_ref="${EXPECTED_SUPABASE_PROJECT_REF:-fqrdybodxzjnhklzsgxx}"
output_path="${1:-/private/tmp/signal-card-ranking-snapshot.sql}"
manifest_path="${output_path}.manifest"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

fail() {
  echo "ranking snapshot export: $*" >&2
  exit 1
}

command -v supabase >/dev/null 2>&1 || fail "supabase CLI is not installed"

case "${output_path}" in
  /*) ;;
  *) output_path="$(pwd -P)/${output_path}" ;;
esac
manifest_path="${output_path}.manifest"

case "${output_path}" in
  "${repo_root}"|"${repo_root}"/*)
    fail "refusing to put production-derived data inside the repository"
    ;;
esac

[[ ! -e "${output_path}" ]] || fail "output already exists: ${output_path}"
[[ ! -e "${manifest_path}" ]] || fail "manifest already exists: ${manifest_path}"
[[ -d "$(dirname "${output_path}")" ]] || fail "output directory does not exist"

project_ref_file="${repo_root}/supabase/.temp/project-ref"
[[ -r "${project_ref_file}" ]] || fail "project is not linked; run supabase link first"

linked_project_ref="$(tr -d '[:space:]' < "${project_ref_file}")"
[[ "${linked_project_ref}" == "${expected_project_ref}" ]] ||
  fail "linked project mismatch (expected ${expected_project_ref}, found ${linked_project_ref})"

umask 077
export_dir="$(mktemp -d "${TMPDIR:-/tmp}/signal-card-ranking-export.XXXXXX")"
schema_dump="${export_dir}/public-schema.sql"
table_list="${export_dir}/public-tables.txt"
raw_dump="${export_dir}/ranking-data.sql"
sanitized_dump="${export_dir}/ranking-data-sanitized.sql"
compatible_dump="${export_dir}/ranking-data-compatible.sql"
data_targets="${export_dir}/data-targets.txt"

cleanup() {
  rm -rf "${export_dir}"
}
trap cleanup EXIT

is_allowed_table() {
  case "$1" in
    profiles|listed_symbols|exchange_variants|compass_pillar_scores) return 0 ;;
    *) return 1 ;;
  esac
}

echo "Inspecting linked project schema (read-only)..."
supabase db dump \
  --linked \
  --schema public \
  --file "${schema_dump}"

sed -nE \
  's/^CREATE TABLE( IF NOT EXISTS)? "public"\."([^"]+)".*/\2/p' \
  "${schema_dump}" | sort -u > "${table_list}"

[[ -s "${table_list}" ]] || fail "could not discover public tables from schema dump"

for required_table in profiles listed_symbols exchange_variants compass_pillar_scores; do
  grep -Fxq "${required_table}" "${table_list}" ||
    fail "required table is missing from linked schema: public.${required_table}"
done

exclude_args=()
while IFS= read -r table_name; do
  if ! is_allowed_table "${table_name}"; then
    exclude_args+=(--exclude "public.${table_name}")
  fi
done < "${table_list}"

echo "Exporting allowlisted ranking data only (read-only; zero FMP calls)..."
supabase db dump \
  --linked \
  --data-only \
  --use-copy \
  --schema public \
  "${exclude_args[@]}" \
  --file "${raw_dump}"

sed -nE \
  -e 's/^COPY "public"\."([^"]+)".*/\1/p' \
  -e 's/^INSERT INTO "public"\."([^"]+)".*/\1/p' \
  "${raw_dump}" | sort -u > "${data_targets}"

[[ -s "${data_targets}" ]] || fail "dump contains no table data targets"

while IFS= read -r table_name; do
  is_allowed_table "${table_name}" ||
    fail "dump validation rejected unexpected data target: public.${table_name}"
done < "${data_targets}"

if grep -Eq '^COPY "(auth|storage|vault|cron|realtime|supabase_functions)"\.' "${raw_dump}"; then
  fail "dump validation rejected a protected schema"
fi

if grep -Eq '^INSERT INTO "(auth|storage|vault|cron|realtime|supabase_functions)"\.' "${raw_dump}"; then
  fail "dump validation rejected a protected schema"
fi

sequence_state_count="$(grep -Ec '^SELECT pg_catalog\.setval\(' "${raw_dump}" || true)"
awk '!/^SELECT pg_catalog\.setval\(/ { print }' \
  "${raw_dump}" > "${sanitized_dump}"

if grep -Eq '^SELECT pg_catalog\.setval\(' "${sanitized_dump}"; then
  fail "dump sanitization did not remove sequence state"
fi

restrict_directive_count="$(grep -Ec '^\\(un)?restrict ' "${sanitized_dump}" || true)"
transaction_timeout_count="$(grep -Ec '^SET transaction_timeout = ' "${sanitized_dump}" || true)"
awk '
  $0 !~ /^\\restrict / &&
  $0 !~ /^\\unrestrict / &&
  $0 !~ /^SET transaction_timeout = / { print }
' \
  "${sanitized_dump}" > "${compatible_dump}"

if ! awk '
  BEGIN { in_copy = 0 }
  /^COPY / { in_copy = 1; next }
  in_copy && $0 == "\\." { in_copy = 0; next }
  !in_copy && /^\\/ { exit 1 }
  END { if (in_copy) exit 1 }
' "${compatible_dump}"; then
  fail "dump validation rejected an unexpected psql meta-command"
fi

mv "${compatible_dump}" "${output_path}"
chmod 0600 "${output_path}"

if command -v shasum >/dev/null 2>&1; then
  checksum="$(shasum -a 256 "${output_path}" | awk '{print $1}')"
elif command -v sha256sum >/dev/null 2>&1; then
  checksum="$(sha256sum "${output_path}" | awk '{print $1}')"
else
  checksum="unavailable"
fi

{
  echo "format=postgresql-sql-data-only"
  echo "project_ref=${linked_project_ref}"
  echo "created_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "sha256=${checksum}"
  echo "tables=public.profiles,public.listed_symbols,public.exchange_variants,public.compass_pillar_scores"
  echo "excluded_schemas=auth,storage,vault,cron,realtime,supabase_functions"
  echo "discarded_sequence_state=${sequence_state_count}"
  echo "discarded_psql_restrict_directives=${restrict_directive_count}"
  echo "discarded_transaction_timeout_settings=${transaction_timeout_count}"
  echo "fmp_requests=0"
} > "${manifest_path}"
chmod 0600 "${manifest_path}"

echo "Snapshot: ${output_path}"
echo "Manifest: ${manifest_path}"
echo "SHA-256: ${checksum}"
echo "Keep both files outside version control."
