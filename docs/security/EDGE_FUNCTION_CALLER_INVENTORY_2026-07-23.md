# Edge Function Caller Inventory

**Captured:** 2026-07-23

**Project ref:** `fqrdybodxzjnhklzsgxx`

**Scope:** P1.2 — map production callers and credential paths

## Status

The production database caller inventory is complete. External monitoring and
invocation-history checks remain to be verified.

The audit was a catalog-only query. It did not invoke cron jobs, database
functions, webhooks, Edge Functions, or FMP.

### Post-inventory P1.3 update

On 2026-07-23, the five known machine caller paths were migrated to the named
`edge_functions_internal` secret API key. Production verification confirmed:

- four direct cron callers use `apikey` and no longer use `Authorization`,
  `anon_key`, or `supabase_service_role_key`;
- the queue processor invoker uses the named key internally and is restricted
  to `queue-processor-v2`;
- all five related cron jobs remain inactive;
- the named key exists in Vault;
- privileged helper grants are restricted to `service_role`.

The caller table and Vault findings below record the pre-migration state that
motivated P1.3.

### `handle-new-user` follow-up

Production verification on 2026-07-24 established that:

- `auth.users` has no application trigger;
- therefore no Database Webhook calls `handle-new-user` (Supabase Database
  Webhooks are Postgres triggers);
- 10 of 20 Auth users have no `public.user_profiles` row;
- the latest Auth user was created on 2026-06-15; and
- no users were created in the preceding 30 days.

The Edge Function was orphaned and profile provisioning was broken. Migration
`20260724000000_restore_user_profile_provisioning.sql` replaced that path with
an idempotent `auth.users` trigger and backfilled only missing profiles.
Production verification passed on 2026-07-24: all 20 Auth users now have
profiles, the trigger is enabled, and its function is executable only by
`supabase_auth_admin`. The deployed Edge Function and its obsolete
`handle_user_created_webhook(jsonb)` RPC were removed successfully on
2026-07-24.

### `fetch-finra-bonds` follow-up

Repository analysis on 2026-07-24 found no caller or consumer for
`fetch-finra-bonds` or `public.corporate_bonds`. The function and table
migration are both untracked and have no repository history. The local source
is an incomplete parser prototype that hard-codes yield and volume to zero and
uses a FINRA endpoint and response contract that do not match the current
official Query API documentation.

The corporate-bond feature was explicitly shelved on 2026-07-24. The production
deployment was removed successfully rather than receiving the local hardening
changes. Reverse-engineering the deployed source and validating the obsolete
FINRA contract are no longer required. A production check established that
`public.corporate_bonds` does not exist, so there is no table or data to retain
and no table exposure to remove. See `FINRA_BONDS_AUDIT_2026-07-24.md`.

### `refresh-analytics-from-presence-v2` follow-up

Repository history established that this function belongs to the removed
`active_subscriptions_v2` heartbeat system, which was superseded by
`realtime.subscription`. Production verification on 2026-07-24 confirmed that
the legacy table, database invoker, and cron job are absent, while
`get_active_subscriptions_from_realtime()` exists. The deployment is verified
safe to retire and was deleted successfully on 2026-07-24.

### Legacy standalone FMP endpoint follow-up

Eight standalone FMP deployments were audited as a batch on 2026-07-24:

- `fetch-fmp-profiles`
- `fetch-fmp-quote-indicators`
- `fetch-fmp-financial-statements`
- `fetch-fmp-ratios-ttm`
- `fetch-fmp-dividend-history`
- `fetch-fmp-revenue-segmentation`
- `fetch-fmp-grades-historical`
- `fetch-fmp-exchange-variants`

Production verification found no cron or database-function caller for any
target and confirmed all eight current queue data types are registered. The
maintained handlers remain embedded in `queue-processor-v2`; only the duplicate
standalone deployments were retired. All eight production deletions completed
successfully on 2026-07-24.

`fetch-fmp-exchange-prices-api` was excluded from the batch. It is callerless
and its historical cron is absent, but it performs bulk NYSE/NASDAQ ingestion;
the queue's `quote` handler is per-symbol and is not a one-to-one replacement.
The unique whole-exchange capability was explicitly approved for retirement on
2026-07-24. Its local config was disabled and its production deployment was
deleted successfully that day.

## Operational state

Production contains 11 cron jobs:

- 3 active database-only jobs:
  - `clean-cron-logs`
  - `maintain-queue-partitions-v2`
  - `refresh-compass-leaderboard-mv`
- 8 inactive jobs, including every API caller, queue producer, and queue
  processor.

This matches the intended FMP quota-hold state.

## Known Edge Function caller chains

| Edge Function | Caller | Active | Current credential path | Finding |
|---|---|---:|---|---|
| `fetch-exchange-rates` | `daily-fetch-exchange-rates` cron, job 40 | No | Vault `anon_key` in `Authorization` | Must migrate before cron recovery |
| `fetch-fmp-all-exchange-market-status` | `hourly-fetch-fmp-all-exchange-market-status` cron, job 81 | No | Vault `anon_key` in `Authorization` | Must migrate before cron recovery |
| `fetch-fmp-available-exchanges` | `hourly-fetch-fmp-available-exchanges` cron, job 78 | No | Vault `anon_key` in `Authorization` | Must migrate before cron recovery |
| `fetch-fmp-shares-float` | `daily-fetch-fmp-shares-float` cron, job 23 | No | Vault `anon_key` in `Authorization` | Job name and repository migration identify the intended target; the production command parser did not recover its URL |
| `queue-processor-v2` | job 84 → `invoke_processor_loop_v2()` → `invoke_processor_if_healthy_v2()` → `invoke_edge_function_v2(...)` | No | Vault `supabase_service_role_key` in `Authorization` | Must migrate before processor recovery |
| `delete-user` | Authenticated profile-page client | User initiated | User access token, currently blocked by the cron-auth comparison | Must become user-JWT-only |
| `health-check` | Expected external monitoring | External | Public endpoint | Provider configuration not discoverable from Postgres |
| `monitoring-alerts` | Expected external monitoring | External | Public endpoint | Provider configuration not discoverable from Postgres |
| `handle-new-user` | None | No | Retired | Replaced by verified `auth.users` trigger; profile coverage is 20/20 |

The inactive `check-stale-data-v2` and `queue-scheduled-refreshes-v2` jobs are
database queue producers; they do not directly call Edge Functions.

## Deployed functions with no discovered caller

No production database caller or tracked application caller was found for:

- `fetch-fmp-profiles` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-quote-indicators` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-financial-statements` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-ratios-ttm` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-dividend-history` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-revenue-segmentation` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-grades-historical` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-exchange-variants` — removed on 2026-07-24; queue handler retained
- `fetch-fmp-exchange-prices-api` — removed on 2026-07-24 by explicit product
  decision; no queue-equivalence claim
- `fetch-finra-bonds` — removed on 2026-07-24 after the feature was shelved
- `refresh-analytics-from-presence-v2` — removed on 2026-07-24 after its
  Realtime replacement was verified

The queue processor imports the current FMP data handlers directly; it does not
need the legacy standalone endpoints for those data types. These 11 deployments
are retirement candidates, but retirement requires checking external/manual
callers and recent invocation logs first.

## Vault and authentication findings

Production Vault contains these secret names:

- `anon_key`
- `latest_project_url`
- `project_url`
- `supabase_service_role_key`

There is no purpose-specific internal Edge Function key in Vault.

No audited cron command or HTTP-capable database function mentions an `apikey`
header. The two current server-to-server patterns are:

1. Public anon key sent as a bearer token by direct cron jobs.
2. Legacy service-role key sent as a bearer token by
   `invoke_edge_function_v2`.

The production database has:

- no Database Webhook trigger;
- no `auth.users` application trigger;
- no explicit custom function grant to `supabase_auth_admin`.

The function's `{ type: "INSERT", record }` request contract is a Database
Webhook payload, not a current Supabase Auth Hook contract. Because Database
Webhooks are implemented as Postgres triggers, the empty `auth.users` trigger
inventory rules out the intended caller.

## External checks still required

Postgres cannot establish:

- whether the five documented UptimeRobot monitors are actually configured;
- whether any third party or operator directly invokes a retirement candidate;
- the deployed gateway `verify_jwt` setting for each function.

Before changing remaining callers:

1. Check the monitoring provider for live `health-check` and
   `monitoring-alerts` monitors.
2. Review recent invocation logs for the remaining retirement candidates.

## P1.2 exit criteria

- [x] Production cron callers and active states captured.
- [x] Vault secret names captured without secret values.
- [x] Database HTTP functions and caller chain captured.
- [x] Database Webhooks, Auth triggers, and Postgres Auth Hook grants checked.
- [x] `handle-new-user` caller contract and production trigger state resolved.
- [ ] External monitoring callers checked.
- [ ] Recent invocations of retirement candidates checked.
