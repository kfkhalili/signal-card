# Compass Front-End Baseline

**Captured:** 2026-10-03  
**Source:** public `origin/main` at `39df372`  
**Purpose:** Freeze the client contract and visible states before presentation
changes.

## Service contract

The page calls `get_weighted_leaderboard` with exactly:

- the persisted eight-pillar `weights` object;
- `p_industries`, or `null` when no industry is selected; and
- `p_exchanges`, or `null` when no exchange is selected.

The client renders the returned order without sorting or recalculating scores.
`composite_score` is returned for compatibility but is not displayed.

## Current visible states

| State | Current copy |
| --- | --- |
| Rankings loading | `Loading rankings...` |
| Empty result | `No rankings available.` |
| RPC error | `Error: {message}` |
| Freshness loading | `Checking for updates...` |
| Freshness error | `Last updated status unavailable` |
| Freshness missing | `Update time unknown` |
| Freshness available | `Rankings updated {relative time}` |

## Current populated layout

Desktop and mobile render the same ranking and pillar values. The narrow layout
reduces the rank and action columns, hides the action text while retaining its
icon, and allows the pillar chips to wrap. Company, symbol, industry, overall
rank, and all pillar ranks remain present.

The authenticated page was reviewed at the default desktop viewport and at
390×844. Desktop showed filters beside the heading, a single row of presets,
the eight sliders in two rows, and the leaderboard beneath them. Mobile stacked
the filters, wrapped presets, reduced navigation to icons, and rendered sliders
in a single column. The cookie notice partially covered the bottom of both
viewports but did not obscure the header, controls, or first ranked company.
Screenshots were inspected during validation rather than committed as binary
artifacts.

The current public baseline still labels `peg_rank` as `PEG`. This is a known
presentation defect only: the production field now carries the Growth rank. It
will be corrected separately in FE1a so FE0 remains behavior-neutral.

## Automated baseline

- `compassStore.contract.test.ts` freezes the RPC name, payload, null-filter
  behavior, returned ordering, and null values.
- `page.contract.test.tsx` freezes populated ordering, confirms the composite
  score remains hidden, and records loading, empty, error, and freshness copy.

No live backend, database migration, or FMP call is required to run the checks.

## FE0 decision

**Keep.** The client contract and all important states are now reproducible
without a live database, the authenticated responsive baseline has been
reviewed, and the production build is unchanged. Proceed to FE1a as a separate
increment.
