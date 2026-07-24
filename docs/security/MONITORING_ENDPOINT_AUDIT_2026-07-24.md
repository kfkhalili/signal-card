# Public Monitoring Endpoint Audit

**Captured:** 2026-07-24

**Project ref:** `fqrdybodxzjnhklzsgxx`

**Endpoints:**

- `health-check`
- `monitoring-alerts`

## Production observation

One unauthenticated request was made to each deployed endpoint. Neither request
included an API key or authorization header.

Both endpoints were publicly reachable and returned `503`:

- `health-check` exposed the names and exact last-run timestamps of three stale
  quota-hold jobs plus the full four-job result set.
- `monitoring-alerts/all-alerts` exposed exact operational metrics, including
  155.36% quota usage and 1,348 stuck jobs across six data types.

The responses confirm that gateway `verify_jwt = false` is active in
production. They also show that any active status-code monitor should currently
be alerting.

## Caller evidence

Repository history documents UptimeRobot configurations for:

- `/functions/v1/health-check`;
- `/functions/v1/monitoring-alerts/queue-success-rate`;
- `/functions/v1/monitoring-alerts/quota-usage`;
- `/functions/v1/monitoring-alerts/stuck-jobs`; and
- optionally `/functions/v1/monitoring-alerts/all-alerts`.

The archived documents conflict: an earlier health-check guide says the
external monitor was not configured, while a later evaluation says three
UptimeRobot alert monitors were active. Current provider state must therefore
be checked in UptimeRobot rather than inferred from repository history.

## Security findings

1. Both public handlers used a service-role client internally.
2. Public responses disclosed more operational detail than an HTTP status
   monitor requires.
3. Database error messages could be returned to unauthenticated callers.
4. The four underlying `SECURITY DEFINER` RPCs retained direct
   `anon`/`authenticated` execution paths.
5. `public.cron_health_logs` retained direct
   `SELECT`/`INSERT`/`UPDATE` grants for `anon` and `authenticated`.
6. The health check treated deliberately inactive quota-hold jobs as stale,
   making the endpoint permanently unhealthy during the hold.

## Prepared remediation

Migration `20260724020000_harden_monitoring_surfaces.sql`:

- restricts all four monitoring RPCs to `service_role`;
- gives all four `SECURITY DEFINER` functions an empty search path and fully
  qualifies referenced relations;
- restricts `cron_health_logs` access to `service_role`; and
- makes `check_cron_job_health` return only currently active cron jobs from the
  requested allowlist.

The Edge Function changes:

- retain the same paths and `200`/`503` monitor contract;
- allow only `GET`, `HEAD`, and `OPTIONS`;
- return `Cache-Control: no-store`;
- remove database error details, timestamps, metric values, thresholds, and
  raw job results from public responses; and
- retain only coarse status and check names/counts.

## Validation

The migration was applied twice to an isolated Supabase Postgres 17 container.
Validation confirmed:

- inactive cron jobs are excluded while active allowlisted jobs remain;
- all four monitoring queries still return their expected result shapes;
- `anon` and `authenticated` cannot execute the RPCs or access
  `cron_health_logs`;
- `service_role` retains the required access;
- all four functions use an empty search path; and
- `scripts/security/verify-monitoring-surface-hardening.sql` returns
  `all_checks_pass = true`.

Both Edge Function entrypoints pass `deno check`; the repository passes
TypeScript checking and `git diff --check`.

## Remaining decision

UptimeRobot is owned by another department, and the current team does not have
access to its credentials. Production rollout is therefore deferred. The
tested handler and migration changes remain local and unapplied.

The owning department must inspect UptimeRobot and record, for each Tickered
monitor:

- name;
- URL path;
- active or paused state;
- interval;
- header names only; and
- whether an alert contact is attached.

Then choose one of:

1. retain the endpoints and configure a dedicated monitor token;
2. retain them temporarily as minimized public status endpoints; or
3. retire uncalled endpoints.

No authentication change, endpoint retirement, or public response-contract
change should be deployed until that inventory is returned. The current public
information exposure remains an accepted temporary risk during the deferral.
