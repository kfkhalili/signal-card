# Edge Function Authentication Policy

**Defined:** 2026-07-23

**Project ref:** `fqrdybodxzjnhklzsgxx`

**Scope:** P1.3 — explicit authentication policy and caller migration

## Production status

The known production caller migration was deployed and verified on 2026-07-23.
The consolidated verification returned `all_checks_pass = true`:

- Vault contains the named `edge_functions_internal` key.
- All four direct Edge Function cron callers send the named key in `apikey`.
- No direct caller sends `Authorization` or references the anon/service-role
  keys.
- `invoke_edge_function_v2` uses the named key and accepts only
  `queue-processor-v2`.
- Anonymous and authenticated roles cannot execute the four privileged helper
  functions; `service_role` can.
- All five Edge Function-related cron jobs remain inactive for the quota hold.

The six functions on known production caller paths were deployed:

- `delete-user`
- `fetch-exchange-rates`
- `fetch-fmp-all-exchange-market-status`
- `fetch-fmp-available-exchanges`
- `fetch-fmp-shares-float`
- `queue-processor-v2`

On 2026-07-24, production profile provisioning was restored independently of
the orphaned `handle-new-user` Edge Function:

- `on_auth_user_created` is enabled and targets
  `public.handle_auth_user_created()`;
- all 20 Auth users have a profile;
- only `supabase_auth_admin` can execute the trigger function; and
- the obsolete Edge Function and its RPC were removed successfully.

## Policy

Every deployed Edge Function has exactly one authentication mode:

| Mode | Gateway `verify_jwt` | Handler requirement |
|---|---:|---|
| Authenticated user | `true` | Validate the user access token and authorize the user operation |
| Internal service | `false` | Require the named `edge_functions_internal` secret key in `apikey` |
| Public monitoring | `false` | No caller credential; response must remain deliberately non-sensitive |

Opaque `sb_secret_...` API keys must never be sent as bearer tokens. The
`Authorization` header is reserved for user JWTs.

## Function assignments

| Function | Mode | Intended caller |
|---|---|---|
| `delete-user` | Authenticated user | Profile-page client |
| `fetch-exchange-rates` | Internal service | Database cron |
| `fetch-fmp-all-exchange-market-status` | Internal service | Database cron |
| `fetch-fmp-available-exchanges` | Internal service | Database cron |
| `fetch-fmp-dividend-history` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-exchange-prices-api` | Retired | Unique bulk capability intentionally retired; deployment removed |
| `fetch-fmp-exchange-variants` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-financial-statements` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-grades-historical` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-profiles` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-quote-indicators` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-ratios-ttm` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-revenue-segmentation` | Retired | Callerless wrapper removed; queue handler retained |
| `fetch-fmp-shares-float` | Internal service | Database cron |
| `fetch-finra-bonds` | Retired | Shelved; production deployment removed; untracked prototype excluded |
| `handle-new-user` | Retired | Replaced by verified database trigger |
| `queue-processor-v2` | Internal service | Database processor invoker |
| `refresh-analytics-from-presence-v2` | Retired | Superseded by verified Realtime subscription tracking; deployment removed |
| `health-check` | Public monitoring | External uptime monitor |
| `monitoring-alerts` | Public monitoring | External uptime monitor |

The repository implementation protects retirement candidates while their
invocation history is being checked. Their production deployments remain gated
on that review. Authentication hardening does not decide whether they remain
deployed.

## Core deployment validation

After retirement reconciliation on 2026-07-24, six non-monitoring production
functions remain:

- `delete-user`
- `fetch-exchange-rates`
- `fetch-fmp-all-exchange-market-status`
- `fetch-fmp-available-exchanges`
- `fetch-fmp-shares-float`
- `queue-processor-v2`

Pre-deployment validation completed locally:

- the named internal-key guard passed all four authentication tests;
- all six entrypoints passed `deno check`;
- five invalid `error: null` properties were removed from successful queue
  results in the DCF and analyst-price-target handlers; and
- the two monitoring functions were excluded from this deployment set.

Production deployment of the hardened core set remains pending.

### `delete-user` production result

`delete-user` was deployed successfully on 2026-07-24 with gateway JWT
verification enabled. A POST request with no authorization header returned HTTP
401 with `sb-error-code: UNAUTHORIZED_NO_AUTH_HEADER`. The request was rejected
before the handler and no user operation occurred.

The user-facing function is complete. Deployment and negative-auth verification
remain pending for the five machine-only core functions.

### Machine-only production result

All five machine-only core functions were deployed successfully on 2026-07-24:

- `fetch-exchange-rates`
- `fetch-fmp-all-exchange-market-status`
- `fetch-fmp-available-exchanges`
- `fetch-fmp-shares-float`
- `queue-processor-v2`

Unauthenticated POST requests to every function returned HTTP 401. The guard
rejected each request before database work, queue processing, or external API
access. The related production cron jobs remain inactive.

The function-specific Deno 5 lockfile for
`fetch-fmp-all-exchange-market-status` was removed after the production bundler
rejected its format and its `esm.sh` integrity hash. All direct dependencies
remain version-pinned in `deno.json` or their import specifiers.

The six-function non-monitoring core deployment is complete. Only the separately
postponed `health-check` and `monitoring-alerts` deployment remains.

### Monitoring endpoint follow-up

A live unauthenticated audit on 2026-07-24 confirmed that both monitoring
functions are publicly reachable and return excessive operational detail.
`20260724020000_harden_monitoring_surfaces.sql` and the corresponding handler
changes minimize public responses, restrict the underlying RPCs and
`cron_health_logs` to `service_role`, and make cron health respect the current
active flag. UptimeRobot is owned by another department; the current team
cannot inspect its configuration. The prepared changes remain local and
production rollout is deferred pending that department's monitor inventory.

## Named key contract

- Supabase API key name: `edge_functions_internal`
- Expected value form: `sb_secret_...`
- Edge Function environment source: the
  `SUPABASE_SECRET_KEYS["edge_functions_internal"]` platform value
- Database caller source: Vault secret named `edge_functions_internal`
- HTTP header: `apikey: <value>`

The function guard uses Supabase's server authentication library and accepts
only this named key. It does not accept the default secret key, the legacy
service-role key, the anon/publishable key, or a bearer-key substitute.

## Database changes

Migration
`20260723000000_secure_edge_function_callers.sql`:

- rewrites every repository-defined direct Edge Function cron job that still
  exists, without changing its schedule or active flag;
- changes `invoke_edge_function_v2` from a service-role bearer token to the
  named key in `apikey`;
- restricts that helper to `queue-processor-v2`;
- revokes anonymous and authenticated execution of the processor helpers;
- revokes anonymous and authenticated execution of
  `handle_user_created_webhook(jsonb)`.

The migration does not create or disclose either copy of the secret key and
does not activate a cron job.

## Production rollout procedure

1. In **Settings → API Keys**, create a secret key named
   `edge_functions_internal`.
2. Store the same value in database Vault under the name
   `edge_functions_internal`. If the Dashboard has no Vault page, use
   `vault.create_secret(...)` in the SQL Editor. Do not paste the value into
   source control or task chat.
3. Apply `20260724000000_restore_user_profile_provisioning.sql` and run
   `scripts/security/verify-user-profile-provisioning.sql`.
4. After verification passes, delete the deployed `handle-new-user` function
   and apply `20260724010000_remove_legacy_user_profile_webhook.sql`.
5. Deploy the internal-service functions with `verify_jwt = false`, and deploy
   the corrected user-only `delete-user`.
6. Apply the caller migration. Its `cron.alter_job` calls preserve all current active
   flags, so quota-hold jobs remain paused.
7. Run `scripts/security/verify-edge-function-auth-migration.sql` in the
   production SQL Editor.
8. Test only the authentication rejection path during the FMP quota hold:
   missing and incorrect keys must return `401` before any FMP request.
9. Re-enable data jobs only through the separate quota-recovery procedure.

## Deployment gates

- Do not redeploy `handle-new-user`. Its intended Database Webhook caller is
  absent, and the verified profile-provisioning trigger supersedes it.
- Do not change `health-check` or `monitoring-alerts` authentication until the
  monitoring-provider configuration is confirmed.
- Keep the prepared monitoring hardening local until the owning department
  confirms whether its monitors depend on response bodies or legacy headers.
- Do not send a valid request to an FMP-backed function during the quota hold.
- Do not restore anon-key or service-role bearer callers as a rollback. Pause
  the caller and repair the named-key configuration instead.

## P1.3 exit criteria

- [x] Every repository/deployed function has an explicit policy assignment.
- [x] Every function has an explicit local `verify_jwt` setting.
- [x] Internal functions require one specifically named secret API key.
- [x] `delete-user` no longer rejects valid user JWTs through cron auth.
- [x] Known Postgres callers use `apikey` and no longer send anon/service-role
  bearer keys.
- [x] Privileged invoker and webhook RPC grants are restricted.
- [x] Named secret key created in production.
- [x] Vault copy created in production.
- [x] Six known-caller functions deployed and database migration applied.
- [x] Production verification query passes.
- [x] `handle-new-user` caller state resolved and replacement verified in production.
- [x] `handle-new-user` deployment and obsolete webhook RPC removed.
- [ ] External monitoring and invocation-history checks completed.
- [ ] Remaining internal/retirement-candidate deployments reviewed.
