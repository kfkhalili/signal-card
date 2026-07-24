# Edge Function Inventory

**Captured:** 2026-07-23

**Project ref:** `fqrdybodxzjnhklzsgxx`

**Scope:** P1.1 — compare deployed Edge Functions with the repository

## Status

Complete. The repository inventory was compared with the authenticated
production CLI inventory captured on 2026-07-23.

Production has 20 active functions. All 19 tracked functions are deployed.
`fetch-finra-bonds` is also deployed, but its local source is untracked.

### Post-inventory removals

Twelve functions from this 20-function snapshot were removed on 2026-07-24:

- `handle-new-user`, after profile provisioning was restored with a verified
  database trigger; and
- `fetch-finra-bonds`, after the unfinished corporate-bond feature was
  explicitly shelved and production was verified to have no bond table; and
- `refresh-analytics-from-presence-v2`, after its legacy heartbeat table,
  invoker, and cron were verified absent and its Realtime replacement present;
  and
- eight callerless standalone FMP wrappers after their queue handlers and
  production caller absence were verified; and
- `fetch-fmp-exchange-prices-api`, by explicit product decision after confirming
  its unique bulk behavior was dormant and intentionally no longer required.

These removals reduce the captured production set from 20 functions to 8.
`fetch-fmp-exchange-prices-api` was evaluated separately from the wrapper batch
because its whole-exchange ingestion behavior had no one-to-one queue
replacement.

### Current production set

After the removals and hardened core deployments on 2026-07-24, production has
eight Edge Functions:

- `delete-user`
- `fetch-exchange-rates`
- `fetch-fmp-all-exchange-market-status`
- `fetch-fmp-available-exchanges`
- `fetch-fmp-shares-float`
- `queue-processor-v2`
- `health-check`
- `monitoring-alerts`

The first six are deployed with their intended authentication policy and passed
negative-auth production checks. The monitoring pair remains on its previous
deployment pending coordination with the department that owns UptimeRobot.

## Repository inventory

There are 19 tracked Edge Function entrypoints and 16 explicit function
sections in `supabase/config.toml`.

`implicit true` means the function has no explicit config section and therefore
relies on Supabase's default `verify_jwt = true` behavior.

| Function | `verify_jwt` | In-handler guard | Uses service role |
|---|---:|---|---:|
| `delete-user` | `true` | Compares bearer token to anon key before attempting user validation | Yes |
| `fetch-exchange-rates` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-all-exchange-market-status` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-available-exchanges` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-dividend-history` | `true` | Compares bearer token to anon key | Yes |
| `fetch-fmp-exchange-prices-api` | `false` | None | Yes |
| `fetch-fmp-exchange-variants` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-financial-statements` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-grades-historical` | `true` | Compares bearer token to anon key | Yes |
| `fetch-fmp-profiles` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-quote-indicators` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-ratios-ttm` | `false` | Compares bearer token to anon key | Yes |
| `fetch-fmp-revenue-segmentation` | `true` | Compares bearer token to anon key | Yes |
| `fetch-fmp-shares-float` | `true` | Compares bearer token to anon key | Yes |
| `handle-new-user` | implicit `true` | Compares bearer token to anon key | Yes |
| `health-check` | `false` | None; intentionally documented as public | Yes |
| `monitoring-alerts` | `false` | None; intentionally documented as public | Yes |
| `queue-processor-v2` | implicit `true` | None; relies on gateway JWT validation | Yes |
| `refresh-analytics-from-presence-v2` | implicit `true` | None; relies on gateway JWT validation | Yes |

### Config omissions

These tracked, deployed functions have no explicit section in
`supabase/config.toml`:

- `handle-new-user`
- `queue-processor-v2`
- `refresh-analytics-from-presence-v2`

### Working-tree-only function

`supabase/functions/fetch-finra-bonds/` exists in the working tree but is
untracked. Production nevertheless has active version 13 of this function.
Its deployment cannot currently be reproduced from version control, and it has
no explicit section in `supabase/config.toml`.

Post-inventory status: the production deployment was removed on 2026-07-24,
and the untracked prototype remains excluded from project configuration and
version control.

## Production comparison

All functions reported `ACTIVE`.

| Function | Version | Updated at (UTC) | Tracked | Explicit config |
|---|---:|---|---:|---:|
| `fetch-fmp-profiles` | 33 | 2025-11-02 14:32:25 | Yes | Yes |
| `fetch-fmp-quote-indicators` | 8 | 2025-11-05 07:27:05 | Yes | Yes |
| `fetch-fmp-shares-float` | 13 | 2025-11-05 07:27:26 | Yes | Yes |
| `fetch-fmp-financial-statements` | 12 | 2025-11-05 07:27:40 | Yes | Yes |
| `fetch-fmp-ratios-ttm` | 8 | 2025-11-05 07:27:54 | Yes | Yes |
| `fetch-fmp-dividend-history` | 8 | 2025-11-05 07:28:04 | Yes | Yes |
| `fetch-fmp-revenue-segmentation` | 8 | 2025-11-05 07:28:13 | Yes | Yes |
| `fetch-fmp-grades-historical` | 8 | 2025-11-05 07:28:22 | Yes | Yes |
| `fetch-fmp-exchange-variants` | 11 | 2025-11-05 07:28:33 | Yes | Yes |
| `fetch-fmp-available-exchanges` | 8 | 2025-11-05 07:25:24 | Yes | Yes |
| `handle-new-user` | 8 | 2025-11-19 19:40:29 | Yes | No |
| `delete-user` | 8 | 2025-11-05 07:14:18 | Yes | Yes |
| `fetch-finra-bonds` | 13 | 2025-08-10 15:12:08 | **No** | No |
| `fetch-exchange-rates` | 10 | 2025-11-05 07:15:43 | Yes | Yes |
| `fetch-fmp-exchange-prices-api` | 5 | 2025-11-09 09:11:35 | Yes | Yes |
| `queue-processor-v2` | 65 | 2026-02-22 11:09:14 | Yes | No |
| `refresh-analytics-from-presence-v2` | 3 | 2025-11-17 20:46:26 | Yes | No |
| `fetch-fmp-all-exchange-market-status` | 1 | 2025-11-17 16:38:59 | Yes | Yes |
| `health-check` | 5 | 2025-11-21 15:23:41 | Yes | Yes |
| `monitoring-alerts` | 7 | 2025-11-22 07:25:25 | Yes | Yes |

### Reconciliation result

- Deployed and tracked: 19.
- Deployed but untracked: `fetch-finra-bonds`.
- Tracked but not deployed: none.
- Deployed without explicit local config: `fetch-finra-bonds`,
  `handle-new-user`, `queue-processor-v2`, and
  `refresh-analytics-from-presence-v2`.
- Runtime JWT verification settings were not exposed by the CLI inventory, so
  local `config.toml` values remain deployment intent rather than proof of the
  current production gateway setting.

## P1.1 exit criteria

- [x] Production list captured from an authenticated source.
- [x] Every deployed function reconciled to a tracked function or explicitly
  classified as production-only drift.
- [x] Every tracked-but-undeployed function identified.
- [x] No function invoked and no FMP quota consumed during inventory.
