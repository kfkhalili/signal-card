# Compass Opportunity Baseline

**Plan step:** P0.1 — Freeze the current shadow baseline
**Status:** Complete — baseline accepted; model remains research-only
**Prepared:** 2026-09-18
**External calls:** None. All source audits are read-only database queries.

## Purpose

Freeze the current Hidden Gems and asymmetric-opportunity behavior before any
new scoring work. This note separates what has already been verified from what
must be rerun against the current production data.

## Existing evidence

### Hidden Gems behavior

The latest saved behavior audit was captured on 2026-09-12:

- 200 baseline candidates;
- industry filtering passed;
- case-insensitive exchange filtering passed;
- impossible filters returned an empty result;
- no candidate had a missing quote;
- one candidate had missing analyst coverage;
- no incomplete quote-quality signal was found; and
- no candidate had a blocking data-quality issue.

The latest saved top-100 audit was also captured on 2026-09-12. Its first five
symbols were `PDD`, `SRAD`, `ATAT`, `DECK`, and `OPRX`. This superseded the
2026-09-11 audit in which all 100 candidates lacked fresh quote proxies and 98
lacked analyst coverage.

### Hidden Gems latency

After the covering-index optimization, the saved five-sample SQL Editor baseline
was:

- p50: 3,449.257 ms;
- p95: 3,465.618 ms;
- average: 3,384.989 ms;
- minimum: 3,107.286 ms;
- maximum: 3,466.371 ms; and
- separate `EXPLAIN ANALYZE` execution: 6,746.268 ms.

This is the comparison baseline. A later change must optimize its query rather
than increase the statement timeout.

### Asymmetric-opportunity audit

The latest saved audit was captured on 2026-09-13 over 200 Hidden Gems
candidates. It produced six mechanical passes:

| Audit rank | Symbol | Lane | Result |
| ---: | --- | --- | --- |
| 1 | XNET | Quality dip | Pass |
| 2 | GIII | Quality dip | Pass |
| 3 | CRTO | Quality dip | Pass |
| 4 | GASS | Overlooked recovery | Pass |
| 5 | YALA | Overlooked recovery | Pass |
| 6 | NATR | Quality dip | Pass |

The most common rejection reasons were:

| Reason | Candidates |
| --- | ---: |
| Modeled bear downside over 30% | 187 |
| Base upside/downside below 2.5x | 185 |
| Modeled base upside below 50% | 181 |
| Modeled bull upside below 100% | 134 |
| Neither defined lane | 84 |
| Missing/nonpositive cash-flow basis | 40 |
| Fewer than three positive-FCF years | 40 |
| Missing net-debt coverage | 40 |
| Net debt over 3x FCF | 38 |
| Interest coverage below 3x or missing | 25 |

## Current-data rerun

### Hidden Gems shadow — 2026-09-18

The first P0.1 rerun was captured at `2026-09-18T05:31:19.573301+00:00`.

- 100 candidates were returned: 80 Quality Dislocations and 20 Neglected
  Compounders.
- 18 candidates had no risk flags.
- 15 candidates carried the over-100%-growth review flag.
- No candidate lacked a fresh quote proxy or analyst-coverage input.
- 24 candidates had positive net insider buying, compared with 22 on
  2026-09-12.
- The first four remained `PDD`, `SRAD`, `ATAT`, and `DECK` in the same order.
- 22 of the previous top 25 remained in the current top 25.
- `MWA`, `PLAB`, and `ERII` entered the reported top 25; `RMD`, `NICE`, and
  `ADBE` left it. This output is limited to 25 rows, so leaving this report does
  not by itself mean that a symbol became ineligible.
- Among the 22 shared names, the largest opportunity-score change was `TKC`,
  up 2.11 points and five rank positions. The remaining movements were small
  enough to be consistent with refreshed price and market inputs.
- Top-25 risk counts were stable: 22 lacked positive net insider buying, six
  required extraordinary-growth review, five were ADRs, two were microcaps,
  and one fell below the dollar-volume threshold.

**Result:** Pass provisionally. The candidate set is stable and its quote and
analyst inputs are complete. The quality audit must still confirm source values,
freshness, data-quality blockers, and the status of `ADBE`.

### Hidden Gems quality verification — 2026-09-18

The second P0.1 rerun was captured at `2026-09-18T06:07:11.81537+00:00`.

- The behavior audit reported healthy results over 200 candidates.
- Industry, case-insensitive exchange, and impossible-filter checks passed.
- No candidate lacked a quote; one candidate lacked analyst coverage and was
  explicitly flagged.
- No candidate used by the model had an incomplete quote-quality signal or a
  blocking financial data-quality issue.
- All five requested symbols were present. All five independently recomputed
  scores, strategy classifications, analyst counts, insider totals, and price
  proxies matched their source data.
- Profile, ratio, financial-statement, and insider inputs for the five sampled
  symbols were current under their configured policies.
- `ADBE` remains eligible as a Quality Dislocation at rank 54 with a score of
  66.34. It left the reported top 25; it did not disappear from the screen or
  fail due to missing data.

Four sampled symbols had an open critical
`empty_exchange_variants_response` issue. This is intentionally not a blocking
issue for Compass because exchange-variant data is excluded from eligibility,
identity, and scoring. All five also had an informational market-cap
reconciliation issue because the validator lacked required fields. That does not
invalidate the reproduced screen score, but market capitalization and share
count must be fully reconciled before lane-specific valuation is trusted.

**Result:** The quality-verification gate passes. One baseline explanation is
still required: `ADBE` moved from rank 22 and score 72.27 on 2026-09-12 to rank
54 and score 66.34. Its inputs are present and fresh, but the quality result does
not expose the component-score change. Run
`scripts/operations/explain-compass-shadow-rank-movements.sql` before the
latency benchmark so the movement is explained rather than assumed.

### Rank-movement explanation — 2026-09-18

The focused diagnostic was captured at `2026-09-18T06:11:34.736061+00:00` and
found all six requested symbols.

`ADBE` remained a Quality Dislocation but moved from rank 22 and score 72.27 to
rank 54 and score 66.34. The component changes reproduce the entire decline:

| Component | Prior | Current | Weighted score effect |
| --- | ---: | ---: | ---: |
| Improvement, 30% | 61.91 | 61.93 | +0.01 |
| Valuation, 25% | 88.96 | 87.34 | -0.41 |
| Insider conviction, 5% | 10.00 | 10.00 | 0.00 |
| Resilience, 25% | 83.46 | 62.16 | -5.33 |
| Dislocation, 15% | 67.29 | 65.89 | -0.21 |

The 21.30-point resilience decline was therefore the material cause. The old
snapshot did not retain resilience's raw health input, so its source-level change
cannot be reconstructed after the fact. Future append-only snapshots must retain
all component scores and source timestamps.

`NICE` moved from rank 15 and score 75.35 to rank 119 and score 60.76. Its
dislocation score fell from 71.71 to 56.02 as price/SMA moved from 0.9401 to
1.0190 and its 52-week-range position moved from 0.2155 to 0.3321. Because the
current model requires dislocation of at least 60, its Quality Dislocation score
became zero and it switched to Neglected Compounder.

`RMD` moved from rank 9 and score 77.00 to rank 136 and score 60.15 for the same
reason. Its dislocation score fell from 63.19 to 54.45 as price/SMA moved from
0.9529 to 0.9914 and its range position moved from 0.3538 to 0.4324. It also
switched from Quality Dislocation to Neglected Compounder.

The three top-25 entrants currently have strong dislocation readings:

- `MWA`: rank 18, score 73.57, dislocation 95.67, resilience 88.49;
- `PLAB`: rank 20, score 72.16, dislocation 88.30, valuation 97.62; and
- `ERII`: rank 24, score 71.55, dislocation 99.43, resilience 87.22.

Their exact point-in-time deltas cannot be reconstructed because the prior audit
stored only the top 25 and they were outside it. This is an evidence-capture gap,
not evidence of nondeterminism.

**Result:** Pass. All observed departures are deterministic and explainable at
the component level. The exercise also exposes two design questions for later
validation: the hard dislocation threshold creates a ranking cliff, and a large
resilience change can dominate the result even when the other components remain
stable.

### Hidden Gems latency — 2026-09-18

The third P0.1 rerun was captured at `2026-09-18T06:14:43.721752+00:00`.

| Measure | Prior baseline | Current | Change |
| --- | ---: | ---: | ---: |
| p50 | 3,449.257 ms | 3,121.864 ms | -9.49% |
| p95 | 3,465.618 ms | 3,902.179 ms | +12.60% |
| Average | 3,384.989 ms | 3,313.137 ms | -2.12% |
| Minimum | 3,107.286 ms | 3,110.709 ms | +0.11% |
| Maximum | 3,466.371 ms | 4,096.989 ms | +18.19% |
| `EXPLAIN ANALYZE` execution | 6,746.268 ms | 3,190.411 ms | -52.71% |

The current analyzed call used 30,205 shared-buffer hits and zero shared reads,
while the prior plan included 3,236 shared reads. Its lower execution time is
therefore partly a more favorable cache state and should not be treated as a
52.71% structural improvement. Temporary I/O remained similar at 625 blocks
read and 627 written, compared with 641 and 643 previously.

**Result:** Pass. Median and average latency improved. The 12.60% p95 increase
remains within the declared 20% tolerance, no upstream timeout occurred, and no
statement-timeout change was required.

### Asymmetric-opportunity audit — 2026-09-18

The final P0.1 rerun was captured at `2026-09-18T06:48:52.075646+00:00` over
200 Hidden Gems candidates.

- Six candidates passed, unchanged from 2026-09-13: four Quality Dips and two
  Overlooked Recoveries.
- The pass set remained `XNET`, `GIII`, `CRTO`, `GASS`, `NATR`, and `YALA`.
  `NATR` and `YALA` exchanged ranks five and six; the first four were unchanged.
- The rejection distribution remained broadly stable. The largest changes were
  six fewer interest-coverage rejections and four more candidates classified
  outside the two current lanes.
- Every one of the 30 reported candidates again had zero quarterly statements
  and used the latest fiscal year as current FCF.
- `XNET` still passed while carrying missing/nonpositive enterprise multiple,
  microcap, ADR, extraordinary-growth-review, and no-positive-insider-buying
  flags.
- `YALA` still passed with a missing/nonpositive provider P/FCF flag. Its
  statement-derived FCF was available, but the disagreement remains material
  evidence that pass criteria and risk flags need an explicit policy.
- `GIII` and `NATR` were the only mechanical passes without current Hidden Gems
  risk flags. This does not constitute investment validation.

The current scenario math was manually rechecked:

| Symbol | Mechanical result | Bear | Base | Bull | Base upside/downside |
| --- | --- | ---: | ---: | ---: | ---: |
| GASS | Pass | -25.19% | +99.50% | +460.61% | 3.95x |
| YALA | Pass | -27.83% | +95.96% | +193.94% | 3.45x |
| DECK | Reject | -47.83% | +39.12% | +194.12% | 0.82x |

The underlying equity-value calculations were unchanged and the return changes
reconciled to refreshed market capitalizations. The current audit therefore
remains deterministic and manually reproducible.

**Result:** Pass as a baseline, not as an investment model. P0.1 is complete.
The frozen evidence supports retaining the current audits as research tools while
holding all threshold tuning and production promotion.

## P0.2a point-in-time snapshot

The first complete candidate snapshot was captured at
`2026-09-18T06:56:48.56645+00:00`.

- Snapshot version: `p0.2a-v1`
- Model-definition MD5: `0749dd436f7e33adaa44277b05e182ee`
- Full snapshot MD5: `87b71104d9f4d11beb21e1083811efc2`
- 200 rows, 200 unique symbols, contiguous ranks 1–200
- 149 Quality Dislocations and 51 Neglected Compounders
- 163 candidates with at least one risk flag
- All 200 profile, ratio, quote, pillar-score, and freshness joins present
- One missing analyst snapshot: `JLHL`, rank 143, explicitly risk-flagged
- All Growth v2 rows shared the same update timestamp:
  `2026-09-18T06:00:00.56193+00:00`

The snapshot reached the function's 200-row cap. It therefore captures the
complete observable function result, but not eligible companies below the cap.
The current function also exposes eligible candidates rather than exclusion
reasons. Both limitations are embedded in the snapshot metadata and must remain
visible when interpreting later entries.

The source evidence confirms:

- every candidate had between four and nine annual statement rows;
- all 200 candidates had zero non-annual statement rows;
- `EFXT` and `RTO` had more than one reported statement currency;
- all 200 had an informational market-cap reconciliation issue because the
  validator lacked required fields;
- 111 had critical empty-exchange-variant issues, which remain irrelevant to
  Compass by design; and
- the remaining financial quality issues were non-blocking severities: five
  informational and two warning balance-sheet reconciliations, four reporting-
  period warnings, and one source-timestamp warning.

The snapshot now retains ADBE's raw current resilience inputs:
`norm_health = 49.5098`, `growth_consistency = 0.9167`, and
`debt_to_equity_ratio_ttm = 0.5748`. The prior raw health input was never saved,
so its historical source-level change remains unrecoverable; future changes are
now traceable.

The same-statement repeatability check ran at
`2026-09-18T07:10:03.700261+00:00`:

- both independently materialized runs returned 200 rows;
- both candidate hashes were `007870cd975c917ff7104c76163df918`;
- the model-definition hash remained
  `0749dd436f7e33adaa44277b05e182ee`; and
- `difference_rows = 0` and `repeatable = true`.

**Result:** P0.2a passes for the complete observable 200-row function output.
Future rank and lane changes can now be compared with a frozen, repeatable
baseline. Continue with P0.2b's quarterly-statement coverage audit.

## P0.2b quarterly-statement coverage

The first stored-data audit ran at `2026-09-18T07:16:00.799064+00:00`.

- All 200 candidates had stored financial statements and fetch-freshness rows.
- None had a quarterly row or usable trailing-four-quarter FCF.
- The entire `financial_statements` table contained 59,016 rows across 12,221
  symbols, all labeled `FY`.
- There were no normalized `(symbol, date, period)` duplicate groups.
- `EFXT` and `RTO` each had more than one reported currency.
- `KOF` was the only stale candidate fetch; its last successful fetch was
  `2026-07-31T10:54:06.876531+00:00`.
- NASDAQ and NYSE both had zero quarterly coverage, ruling out an
  exchange-specific gap.

Repository inspection narrows the cause: the fetcher calls all three FMP
statement endpoints without an explicit `period=quarter` parameter. Its parser,
types, uniqueness key, and database table already accept Q1-Q4 rows. This is a
request-configuration gap, not a schema or period-label limitation.

Provider quarterly availability and response size were then tested with DECK.
The income, balance-sheet, and cash-flow endpoints each returned five aligned
rows: Q1 2026-06-30, Q4 2026-03-31, Q3 2025-12-31, Q2 2025-09-30, and Q1
2025-06-30. All used USD and supplied the fields expected by the existing
parser. The three copied response bodies totaled 25,638 bytes.

Using the last observed 5,271-symbol scheduled universe and one weekly refresh,
that sample extrapolates to approximately 552 MiB of additional rolling-30-day
bandwidth. Symbol response sizes vary, so production usage accounting remains
authoritative. The registry reserves six calls and at least 1.2 MB per complete
job, deliberately allowing the existing quota guard to stop work before the
20 GiB limit if real transfers are materially larger than the sample.

**Current decision:** Add `period=quarter&limit=5` to the three calls made by
the existing weekly financial-statements job. Preserve the annual calls because
Growth v2 requires multi-year evidence. Reserve six API calls and a conservative
1.2 MB per job in the quota controls. Validate one queued DECK refresh after
deployment, then let the weekly scheduler build coverage naturally; do not
trigger a full-universe backfill or change scoring in this increment.

## Manual calculation checks

The current audit uses the following formulas:

- bear value = 75% of the lower of current and normalized FCF, multiplied by
  the lane's bear multiple;
- base value = normalized FCF multiplied by the lane's base multiple;
- bull value = the higher of current and normalized FCF, grown for two years at
  a historical rate capped between 0% and 15%, multiplied by the lane's bull
  multiple; and
- base upside/downside = positive base return divided by the greater of 10% or
  modeled bear downside.

Values below are USD millions except returns.

### GASS — mechanical pass

- Market capitalization: 350.289
- Current FCF: 84.77
- Normalized FCF: 59.84
- Multiples: 6x / 12x / 18x
- Growth rate used in the bull case: capped from 54.21% to 15%
- Bear value: `59.84 × 0.75 × 6 = 269.28`, or approximately -23.12%
- Base value: `59.84 × 12 = 718.08`, or approximately +105.01%
- Bull value: `84.77 × 1.15² × 18 ≈ 2,017.95`, or approximately +476.08%
- Base upside/downside: `1.0501 / 0.2312 = 4.54x`

The manual result agrees with the audit after rounding.

### YALA — mechanical pass

- Market capitalization: 849.233
- Current FCF: 135.21
- Normalized FCF: 137.67
- Multiples: 6x / 12x / 18x
- Growth rate used in the bull case: floored from -1.37% to 0%
- Bear value: `135.21 × 0.75 × 6 = 608.45`, or approximately -28.35%
- Base value: `137.67 × 12 = 1,652.04`, or approximately +94.53%
- Bull value: `137.67 × 18 = 2,478.06`, or approximately +191.80%
- Base upside/downside: `0.9453 / 0.2835 = 3.33x`

The manual result agrees with the audit after rounding.

### DECK — mechanical rejection

- Market capitalization: 11,067.511
- Current FCF: 1,097.33
- Normalized FCF: 943.82
- Multiples: 8x / 16x / 22x
- Growth rate used in the bull case: capped from 79.33% to 15%
- Bear value: `943.82 × 0.75 × 8 = 5,662.92`, or approximately -48.83%
- Base value: `943.82 × 16 = 15,101.12`, or approximately +36.45%
- Bull value: `1,097.33 × 1.15² × 22 ≈ 31,926.82`, or approximately +188.47%
- Base upside/downside: `0.3645 / 0.4883 = 0.75x`

The manual result agrees with the audit. DECK is rejected because modeled bear
downside exceeds 30%, modeled base upside is below 50%, and the base
upside/downside ratio is below 2.5x.

## Baseline findings

1. **The scenario arithmetic is reproducible.** The three sampled calculations
   match the saved audit.
2. **The model inputs are not yet sufficient for model tuning.** All 30 reported
   candidates had zero usable quarterly statements and therefore used the latest
   fiscal year as current FCF.
3. **Universal multiples are the dominant unresolved weakness.** A shipping
   company, cash-backed ADR, apparel company, and software company cannot be
   judged with one generic lane multiple schedule.
4. **Mechanical passes are not validated investments.** Prior manual review
   rejected or deferred several top passes after considering cyclicality,
   deterioration, governance, or accounting context that the model does not yet
   represent.
5. **Existing risk flags and pass criteria are not fully reconciled.** For
   example, XNET mechanically passed while carrying microcap, ADR,
   over-100%-growth-review, and missing/nonpositive enterprise-multiple flags.
6. **DECK exposes an important target mismatch.** It resembles the desired
   high-quality-dislocation pattern but fails a generic asymmetric-return gate.
   That does not prove DECK should pass; it proves Quality Dislocation needs a
   lane-specific valuation test.
7. **Growth v2 is influential but not yet aligned by lane.** The score is visible
   in candidate selection, but its intended role must be resolved in P0.3 before
   it receives additional weight.

## Current decision

**Decision: retain the existing audits as research tools, but do not tune their
thresholds or connect their pass result to production recommendations.**

The arithmetic is sound enough to continue validation. The economic model is
not yet sound enough to optimize because quarterly coverage, lane-specific
valuation, risk-flag treatment, and Growth v2 alignment remain unresolved.

## Required current-data rerun

Run these SQL Editor-compatible scripts in order:

- [x] `scripts/operations/audit-compass-hidden-gems-shadow.sql`
- [x] `scripts/operations/verify-compass-hidden-gems-quality.sql`
- [x] `scripts/operations/explain-compass-shadow-rank-movements.sql`
- [x] `scripts/operations/benchmark-compass-hidden-gems-shadow.sql`
- [x] `scripts/operations/audit-compass-asymmetric-opportunities.sql`

Expected properties:

- read-only or transaction-local temporary tables only;
- no queue writes;
- no HTTP requests or FMP calls; and
- no persistent production changes.

Save all four JSON results with their capture timestamps. Compare them with the
values in this note. P0.1 passes only if:

- behavior remains healthy;
- the top-candidate and pass-set changes are explainable from refreshed inputs;
- the three manual calculations still agree with the current audit;
- no new blocking data-quality issue appears; and
- warm p95 latency is no more than 20% above 3,465.618 ms without an explained
  transient cause.

If any gate fails, fix that issue before beginning P0.2.
