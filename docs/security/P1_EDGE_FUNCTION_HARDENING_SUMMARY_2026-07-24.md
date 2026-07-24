# P1 Edge Function Hardening Summary

**Completed:** 2026-07-24

**Project ref:** `fqrdybodxzjnhklzsgxx`

## Outcome

The non-monitoring Edge Function hardening scope is complete.

Production was reduced from 20 deployed Edge Functions to 8. Six retained core
functions now use their intended authentication model and passed production
negative-auth checks. Two monitoring functions remain intentionally unchanged
until the external monitor owner can coordinate credential and response-contract
changes.

## Retained and verified

| Function | Authentication | Production check |
|---|---|---|
| `delete-user` | User JWT; gateway verification enabled | Missing JWT rejected with gateway HTTP 401 |
| `fetch-exchange-rates` | Named `edge_functions_internal` API key | Missing key rejected with HTTP 401 |
| `fetch-fmp-all-exchange-market-status` | Named `edge_functions_internal` API key | Missing key rejected with HTTP 401 |
| `fetch-fmp-available-exchanges` | Named `edge_functions_internal` API key | Missing key rejected with HTTP 401 |
| `fetch-fmp-shares-float` | Named `edge_functions_internal` API key | Missing key rejected with HTTP 401 |
| `queue-processor-v2` | Named `edge_functions_internal` API key | Missing key rejected with HTTP 401 |

The database caller migration and production verifier previously confirmed that
known machine callers send the named key in `apikey`, do not send legacy bearer
credentials, and remain inactive during the FMP quota hold.

## Retired

Twelve deployments were removed:

- `handle-new-user`, replaced by a verified `auth.users` profile trigger;
- `fetch-finra-bonds`, after the unfinished bond feature was shelved;
- `refresh-analytics-from-presence-v2`, superseded by
  `realtime.subscription`;
- eight standalone FMP wrappers whose maintained handlers remain in
  `queue-processor-v2`; and
- `fetch-fmp-exchange-prices-api`, whose unique whole-exchange capability was
  explicitly retired by product decision.

## Validation

- Shared internal-key authentication tests: 4 passed, 0 failed.
- Six retained core entrypoints: `deno check` passed.
- `delete-user`: missing JWT rejected in production.
- Five internal functions: missing named key rejected in production.
- No authentication probe invoked FMP, processed queue jobs, or mutated data.

## Deferred monitoring work

`health-check` and `monitoring-alerts` remain deployed with their old public
contracts. Hardened local implementations and a database migration have been
prepared and tested, but deployment is postponed because UptimeRobot is owned
by another department and its credentials/configuration are unavailable.

See `MONITORING_ENDPOINT_AUDIT_2026-07-24.md` for the prepared changes and
coordination requirements.
