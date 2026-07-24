# FINRA Bonds Production-Drift Audit

**Captured:** 2026-07-24

**Project ref:** `fqrdybodxzjnhklzsgxx`

**Function:** `fetch-finra-bonds`

## Product decision

The corporate-bond feature is shelved. Bond prices remain potentially useful
for investor-sentiment analysis, but obtaining a dependable source proved
disproportionately difficult. The project is prioritizing repair of existing
features over adding this data domain.

No further FINRA API, parser, or product-development work is in scope. The
working-tree implementation must not be deployed; it is an incomplete
prototype, not a production-safe integration.

## Established findings

- Production has active version 13, last updated on 2025-08-10.
- No database job, database HTTP function, tracked application code, or queue
  processor references the function.
- No tracked application code reads `public.corporate_bonds`.
- The function directory and the table migration are untracked.
- Neither artifact appears anywhere in repository history.
- The local parser is explicitly marked as a placeholder.
- The local implementation hard-codes every trade's volume and yield to zero.
- The parser assumes a pipe-delimited response without validating the content
  type, header, field count, timestamps, CUSIPs, or numeric values.
- The function sends raw upstream and database error text to callers.
- The table grants unrestricted reads to `anon` and publishes changes through
  Supabase Realtime despite having no discovered consumer.

## FINRA contract mismatch

The local code posts to:

`https://api.finra.org/data/group/TRACE/name/CorporateAndAgency/download`

FINRA's current Query API documents POST requests as:

`/data/group/{group name}/name/{dataset name}`

The current catalog lists fixed-income Query API datasets under the
`fixedIncomeMarket` group. FINRA also states that the TRACE API is not part of
the FINRA API Platform. No current FINRA documentation was found for the local
`TRACE/CorporateAndAgency/download` path or for the assumed raw-trade response
contract.

Official references:

- [FINRA Query API documentation](https://developer.finra.org/docs)
- [FINRA Query API product page](https://developer.finra.org/products/query-api)
- [FINRA API catalog](https://developer.finra.org/catalog)
- [FINRA authentication guide](https://developer.finra.org/node/1146)

## Checks no longer required

The product decision removes the need to reverse-engineer deployed version 13,
validate the obsolete FINRA contract, or assess the prototype's data quality
for continued operation.

Aggregate table inspection remains optional for data-retention purposes only;
it is not a blocker to disabling access.

## Shelving scope

1. Delete the deployed `fetch-finra-bonds` Edge Function.
2. Preserve `public.corporate_bonds` and its data for now, but remove public
   access and Realtime publication.
3. Keep the untracked local prototype outside project configuration and version
   control; do not deploy it or represent it as a maintained function.
4. Decide separately whether the retained table and prototype should eventually
   be archived or deleted.
5. Do not delete FINRA credentials until ownership and use outside this
   repository have been confirmed.

## Prepared closure

Migration `20260724030000_shelve_finra_bonds.sql` preserves the table and its
rows while revoking `anon` and `authenticated` access, removing the public read
policy, and removing the table from `supabase_realtime`.

The migration was tested twice in an isolated Supabase Postgres instance. The
verification passed after both runs, and the test row remained present.
The local function is excluded from `supabase/config.toml`. Production
migration application and deployed-function deletion remain pending.

## Production result

The production SQL check on 2026-07-24 established that
`public.corporate_bonds` does not exist. There is therefore no production bond
table, stored bond data, table grant, policy, or Realtime publication to
preserve or remove. The shelving migration is a safe no-op in this state.

The corrected production verifier returned `all_checks_pass: true`, with the
table absent and all access, policy, and Realtime checks clear.

The orphaned `fetch-finra-bonds` production Edge Function was deleted
successfully on 2026-07-24. The untracked local prototype remains excluded
from project configuration and version control. This item is complete.
