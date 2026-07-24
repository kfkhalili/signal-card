# Refresh Analytics Edge Function Audit

**Captured:** 2026-07-24

**Project ref:** `fqrdybodxzjnhklzsgxx`

**Function:** `refresh-analytics-from-presence-v2`

## Provisional decision

Retire the deployed Edge Function after a read-only production dependency check.

The function is a leftover from the removed
`public.active_subscriptions_v2` heartbeat system. It should not be rewritten or
rescheduled.

## Repository findings

- The handler only reads, deletes from, and counts
  `public.active_subscriptions_v2`.
- No current application code invokes the Edge Function.
- No current migration creates its historical database invoker,
  `public.refresh_analytics_from_presence_v2()`.
- The production caller inventory found no cron job or database function that
  invokes the Edge Function.
- Current staleness-checker migrations read Supabase's built-in
  `realtime.subscription` through
  `public.get_active_subscriptions_from_realtime()`.

## Superseding architecture

Commit `44e00d6` removed the custom heartbeat hooks and migrated subscription
tracking to `realtime.subscription`. Its removal migrations documented and
removed all three legacy components:

1. cron job `refresh-analytics-v2`;
2. database function `public.refresh_analytics_from_presence_v2()`; and
3. table `public.active_subscriptions_v2`.

Those intermediate removal migrations were later consolidated out of the
repository, but the current repository retains the replacement Realtime-based
staleness checker and no active application use of the legacy table.

## Security and reliability impact

The deployed Edge Function still has service-role access and destructive delete
logic for a table that is no longer part of the current architecture. If the
table is absent, every invocation fails. If an obsolete table unexpectedly
exists, invoking the function deletes rows older than five minutes.

The working-tree hardening guard should not be deployed merely to preserve this
obsolete behavior.

## Exit check

Run `scripts/security/verify-refresh-analytics-retirement.sql` in the production
SQL editor. If `safe_to_retire` is true, delete the deployed
`refresh-analytics-from-presence-v2` function. Its local config is already
disabled.

`realtime_replacement_exists` is reported separately. A false value would
identify a problem in the current staleness architecture, but would not make the
orphaned legacy cleanup function useful or safe to retain.

## Production verification

Production verification on 2026-07-24 returned:

- `legacy_table_absent: true`;
- `legacy_invoker_absent: true`;
- `legacy_cron_absent: true`;
- `realtime_replacement_exists: true`; and
- `safe_to_retire: true`.

The database dependency check is complete. The deployed
`refresh-analytics-from-presence-v2` Edge Function was deleted successfully on
2026-07-24. Its local config remains disabled. This item is complete.
