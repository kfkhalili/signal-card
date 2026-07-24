# Legacy Standalone FMP Endpoint Audit

**Captured:** 2026-07-24

**Project ref:** `fqrdybodxzjnhklzsgxx`

## Scope

This audit covers eight deployed standalone FMP Edge Functions with no caller
found in the production database or current application:

- `fetch-fmp-profiles`
- `fetch-fmp-quote-indicators`
- `fetch-fmp-financial-statements`
- `fetch-fmp-ratios-ttm`
- `fetch-fmp-dividend-history`
- `fetch-fmp-revenue-segmentation`
- `fetch-fmp-grades-historical`
- `fetch-fmp-exchange-variants`

## Provisional decision

Retire all eight standalone deployments after one final read-only production
caller check.

This removes duplicate HTTP entrypoints, not their active data-processing
capability.

## Current architecture

`queue-processor-v2` directly imports maintained library handlers and routes
jobs for:

- `profile`
- `quote`
- `financial-statements`
- `ratios-ttm`
- `dividend-history`
- `revenue-product-segmentation`
- `grades-historical`
- `exchange-variants`

The monofunction design explicitly avoids Edge-Function-to-Edge-Function calls
and the related connection-pool cost. The standalone functions duplicate older
versions of those handler paths and are not needed by the queue processor.

### Explicit exclusion: `fetch-fmp-exchange-prices-api`

`fetch-fmp-exchange-prices-api` is not part of this retirement batch. It is a
distinct bulk NYSE/NASDAQ updater using FMP's `/api/v3/quotes/{exchange}`
endpoint. The queue's `quote` handler uses
`/stable/quote?symbol={symbol}` for one symbol per job.

The bulk updater has no production caller and its historical minute cron is
absent, but the queue does not reproduce its whole-exchange ingestion behavior.
It therefore required a separate product-retention decision.

## Repository caller check

- No current application code invokes any of the nine endpoints.
- No current Edge Function invokes any of the nine endpoints.
- `fetch-fmp-exchange-prices-api` was reviewed but excluded because it is not a
  one-to-one queue replacement.

## Safety boundary

Retiring these deployments must not:

- invoke any endpoint;
- resume any cron or queue processor;
- make an FMP request;
- remove the queue processor's library handlers; or
- remove tables, registry entries, or stored financial data.

The eight local wrapper configs are disabled. Their source remains available
until the production retirement is verified and the repository cleanup policy
is decided.

The bulk exchange-prices function was intentionally retired by product decision
on 2026-07-24. Its local config is disabled and its production deletion is
pending.

## Exit check

Run `scripts/security/verify-legacy-fmp-endpoint-retirement.sql` in the
production SQL editor. If `safe_to_retire` is true, delete the eight deployed
standalone functions.

`queue_replacement_complete` is reported separately. It confirms the eight
current queue data types are registered, but it is not required to establish
that the callerless wrappers are safe to remove.

## Production verification

Production verification on 2026-07-24 returned:

- zero cron callers;
- zero database-function callers;
- no missing queue data types;
- `queue_replacement_complete: true`; and
- `safe_to_retire: true`.

The caller and replacement checks are complete. All eight deployed standalone
functions were deleted successfully on 2026-07-24. Their maintained queue
handlers remain in `queue-processor-v2`.

The separately classified `fetch-fmp-exchange-prices-api` bulk updater was then
approved for retirement on 2026-07-24. That decision retires the unique
whole-exchange capability rather than claiming it has a queue replacement. Its
production deployment was deleted successfully on 2026-07-24. This retirement
item is complete.
