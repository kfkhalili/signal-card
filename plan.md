# Compass Opportunity Engine: Incremental Validation Plan

**Last updated:** 2026-09-18
**Status:** Working plan
**Primary goal:** Determine whether Compass can identify financially sound,
asymmetric opportunities before the market recognizes them.

This plan deliberately favors evidence over feature volume. Each increment
tests one hypothesis, produces an inspectable result, and ends with an explicit
decision to keep, revise, or discard the change.

## 1. Product objective

Compass should surface companies where:

1. downside is reasonably protected by business quality, cash generation,
   balance-sheet strength, or realizable assets;
2. upside materially outweighs the downside;
3. the market appears to be underestimating a specific, evidence-backed change;
4. management behavior supports the thesis; and
5. the underlying data is fresh, complete, and explainable.

Compass is a research triage system, not an autonomous investment adviser. A
high score should mean "research this next," not "buy this without review."

### Execution order

- [ ] **P0:** Build the measurement loop and freeze the current baseline.
- [ ] **P1:** Validate Quality Dislocation v1.
- [ ] **P2:** Add the smallest reliable management-quality overlay.
- [ ] **P3:** Validate Structural Inflection v1.
- [ ] **P4:** Validate cash-backed and asset-backed special situations separately.
- [ ] **P5:** Validate Underappreciated Compounder v1.
- [ ] **P6:** Add Emerging Turnaround as a lower-confidence watchlist.
- [ ] **P7:** Integrate only the lanes that pass their validation gates.

Only one unchecked implementation increment should be active at a time.

## 2. Non-negotiable guardrails

- Do not combine unlike opportunities into one universal ranking. Compare
  companies within a clearly defined opportunity lane.
- Do not use FMP exchange-variant data for eligibility, identity, or scoring.
- Do not use future information in historical tests. Every replay must use only
  data that was available on its measurement date.
- Do not silently convert missing data into a favorable score. Missing critical
  evidence lowers confidence or makes a company ineligible.
- Do not relax solvency, dilution, liquidity, or blocking data-quality checks to
  make historical winners pass.
- Use scheduled refreshes as the normal data path. Audits should be read-only
  and make zero FMP calls unless a bounded refresh is explicitly approved.
- Respect the 20 GiB rolling quota, its safety ceiling, and the existing quota
  guard. Every new input must include a measured bandwidth estimate.
- Preserve the current statement timeout. Performance work must optimize the
  query rather than increase the timeout.
- Do not cut a shadow model into production recommendations until its correctness,
  behavior, and performance gates pass.

## 3. Working method

Every implementation unit follows the same loop:

1. **State one hypothesis.** Describe the behavior expected to improve.
2. **Make one bounded change.** Avoid mixing data plumbing, scoring, and UI work.
3. **Run deterministic checks.** Contract tests, fixtures, and manual calculations
   must agree.
4. **Run a read-only production shadow audit.** Record candidates, rejection
   reasons, input freshness, data-quality blockers, and query timing.
5. **Compare with the previous snapshot.** Explain every material entry, exit,
   and rank movement.
6. **Decide:** keep, revise, or remove. Record the decision before starting the
   next unit.

An increment is not complete merely because its code is merged.

### Definition of done for every increment

- [ ] The hypothesis and expected behavior are written down.
- [ ] Automated tests cover the intended behavior and important failure cases.
- [ ] Any migration applies on a clean local database in the reviewed order.
- [ ] A rollback or disable path is documented.
- [ ] Missing-data and stale-data behavior is explicit.
- [ ] No new blocking data-quality issue is ignored.
- [ ] Query latency is measured against the prior baseline; no statement-timeout
      increase is used.
- [ ] FMP call and bandwidth impact is zero or explicitly bounded.
- [ ] A production shadow snapshot is saved and manually reviewed.
- [ ] The keep/revise/remove decision is recorded.

## 4. Evaluation contract

The following contract must be fixed before tuning scores. Changing it later is
allowed only as a separate, documented decision—not as part of a scoring tweak.

### Outcomes

Measure each eligible candidate at 20, 60, 120, and 252 trading days after the
selection date:

- total return;
- excess return versus a broad-market benchmark;
- excess return versus an appropriate sector or industry benchmark when
  available;
- maximum drawdown;
- whether the written thesis catalyst occurred; and
- whether a pre-declared thesis breaker occurred.

### Aggregate measures

- median excess return, not just average return;
- hit rate and severe-loss rate;
- upside capture versus downside capture;
- results by opportunity lane and confidence grade;
- results by liquidity and market-cap band; and
- coverage: candidates found, qualified opportunities missed, and false
  positives admitted.

### Evidence tiers

- **Forward shadow evidence:** strongest and required before a production cutover.
- **Point-in-time database replay:** useful if data availability can be proven.
- **Manual historical case study:** useful for model design, but not a backtest.
- **Current-data reconstruction of an old date:** prohibited as performance
  evidence because it introduces look-ahead bias.

### Baseline findings that must not be dropped

These findings came from P0.1. They are ordered by leverage and mapped to the
work item that owns them.

| Priority | Finding | Why it matters | Owner |
| ---: | --- | --- | --- |
| 1 | Prior audits saved only the top 25, so new entrants' previous component scores could not be reconstructed. | Without point-in-time evidence, we cannot distinguish model improvement from unexplained churn. | P0.2a |
| 2 | All 30 reported asymmetry candidates had zero usable quarterly statements and used annual FCF fallback. | Stale annual cash flow can materially misstate current downside and upside. | P0.2b |
| 3 | Market-cap reconciliation could not be fully evaluated for all five quality-audit samples. | Valuation is unsafe until price, diluted shares, currency, and market capitalization reconcile. | P0.2c |
| 4 | XNET and YALA mechanically passed despite material risk flags; the model does not define which flags block, lower confidence, or merely disclose. | A favorable score must not silently override missing primary evidence, liquidity, dilution, or data quality. | P0.2d and P1.1 |
| 5 | ADBE's 21.30-point resilience decline caused almost its entire rank drop, while the prior raw health input was not retained. | A dominant component must be traceable and stable enough to trust. | P0.2e and P0.4 |
| 6 | NICE and RMD fell through the hard `dislocation_score >= 60` boundary and switched lanes. | A small market move can currently cause a large score and lane cliff. | P0.2e and P1.4 |
| 7 | Universal FCF multiples make unlike businesses appear directly comparable. | Shipping, software, apparel, and cash-backed situations require different valuation logic. | P1.2 and P4 |
| 8 | Growth v2 materially influences candidate selection, but its role has not been validated per lane. | A useful compounder signal may be stale, duplicated, or actively misleading in another lane. | P0.4 |
| 9 | Exchange-variant quality issues appeared for four samples but did not affect model inputs. | These issues remain intentionally non-blocking because Compass must not depend on FMP exchange-variant data. | Guardrail; no scoring work |
| 10 | Warm p95 was 3.90 seconds, within tolerance, with unchanged statement timeout. | Performance is acceptable but remains a regression gate for every material query change. | Every increment |

## 5. Prioritized execution plan

### P0 — Build the measurement loop

This is the highest-leverage work. It prevents us from making the model more
complicated without learning whether it is becoming more useful.

#### P0.1 — Freeze the current shadow baseline

**Hypothesis:** We can explain and reproduce the current Hidden Gems and
asymmetry results before changing them.

- [x] Run the existing Hidden Gems quality and latency audits.
- [x] Run the asymmetric-opportunity audit without changing its rules.
- [x] Save the top candidates, all rejection counts, input freshness, blocking
      quality issues, and p50/p95 latency.
- [x] Manually reproduce scenario math for at least three candidates, including
      one pass and one rejection.
- [x] Record known weaknesses, including universal FCF multiples and annual-data
      fallback.

**Decision:** Passed on 2026-09-18. Retain the audits as research tools; do not
tune thresholds or promote the mechanical pass result. Evidence is recorded in
`docs/verification/COMPASS_OPPORTUNITY_BASELINE.md`.

**Pass gate:** Repeated runs over unchanged data agree, manual calculations match,
and every output field is traceable to a source table and timestamp.

**Stop condition:** Fix correctness, freshness, or unexplained nondeterminism
before changing the model.

#### P0.2 — Close baseline evidence and financial-input gaps

This is the immediate next priority. Complete each sub-increment separately and
validate it before starting the next one.

##### P0.2a — Capture a complete point-in-time candidate snapshot

**Hypothesis:** Saving every candidate and component makes all future rank and
lane changes explainable.

- [x] Extend the read-only snapshot to include all 200 candidates, not only the
      displayed top 25.
- [x] Capture model version, lane, rank, every component score, raw source
      values, source timestamps, risk flags, available rejection reasons, and
      filters; record explicitly where the current function exposes no rejection
      reason.
- [x] Save the output as an immutable dated artifact; do not add a production
      table in this increment.
- [x] Prove that rerunning against unchanged inputs produces the same result.

**Pass gate:** Any candidate's entry, exit, rank movement, or lane change can be
reconstructed without querying current data.

##### P0.2b — Diagnose quarterly-statement coverage

**Hypothesis:** The zero-quarter result is a data-shape or ingestion-coverage
problem that can be measured before making any FMP calls.

- [x] Audit statement periods, dates, currencies, duplicates, and freshness for
      all 200 candidates.
- [x] Distinguish missing provider data from ingestion, parsing, or period-label
      behavior.
- [ ] Quantify how many candidates can support trailing-four-quarter FCF and how
      candidate values change when quarterly data exists.
- [x] If new fetching is required, propose it separately with scheduled cadence,
      bounded calls, and a measured quota estimate.

**Pass gate:** Quarterly coverage and its failure modes are quantified; annual
fallback is explicit and lowers confidence rather than silently standing in for
current cash flow.

##### P0.2c — Reconcile market capitalization and share count

**Hypothesis:** Price multiplied by the correct diluted/security share count can
reproduce the market capitalization used in valuation within an explicit
tolerance.

- [ ] Identify the authoritative price, share-count, security, currency, and
      timestamp fields.
- [ ] Test common shares, ADR ratios, multiple share classes, buybacks, issuance,
      and foreign currencies separately.
- [ ] Define a tolerance and distinguish timing differences from genuine data
      conflicts.
- [ ] Make unresolved reconciliation a valuation blocker or low-confidence
      condition; never a favorable input.

**Pass gate:** The valuation denominator is reproducible for the case set and a
stratified production sample.

##### P0.2d — Define risk-flag consequences

**Hypothesis:** Separating blockers, confidence penalties, and disclosures stops
mechanical upside from overriding missing or unsafe evidence.

- [ ] Classify every existing risk flag as blocker, confidence penalty,
      disclosure, or irrelevant to the lane.
- [ ] Resolve the observed XNET and YALA pass/flag contradictions explicitly.
- [ ] Keep exchange-variant issues irrelevant to Compass scoring.
- [ ] Test the policy without changing score weights in the same increment.

**Pass gate:** Every pass has all required evidence, and every non-blocking flag
has a written reason for remaining non-blocking.

##### P0.2e — Measure score and lane-boundary stability

**Hypothesis:** Small input changes should not create disproportionate rank or
lane changes unless they cross an economically meaningful boundary.

- [ ] Decompose resilience into its raw health and growth-consistency inputs and
      retain both in snapshots.
- [ ] Explain ADBE's health/resilience change at the source-field level.
- [ ] Run sensitivity checks around the dislocation threshold using NICE, RMD,
      and nearby candidates.
- [ ] Quantify rank churn caused by percentile recomputation versus real company
      changes.
- [ ] Do not change the threshold in this diagnostic increment.

**Pass gate:** Dominant component changes are source-traceable, and the later
lane design has evidence for either keeping, smoothing, or replacing hard
boundaries.

#### P0.3 — Create a small adjudicated case set

**Hypothesis:** A compact, explicit set of positive and negative examples can
catch directionally wrong model changes without becoming a fitted backtest.

- [ ] Add recent research cases: DECK, YALA, GASS, GIII, CRTO, NATR, and XNET.
- [ ] Label the expected lane, supporting evidence, principal risk, confidence,
      and whether the company should pass the current research gate.
- [ ] Add manual historical studies: Coca-Cola (1988), Apple (2003), NVIDIA
      (2015), AMD (2015), Tesla (2019), and HOCHTIEF (2022).
- [ ] Clearly mark historical cases that were financially sound at selection
      separately from speculative turnarounds that carried real solvency or
      execution risk.
- [ ] Add ordinary, expensive, deteriorating, leveraged, and data-incomplete
      negative controls.

**Pass gate:** Each label has a written rationale and source date; no fixture
contains facts published after its measurement date.

**Stop condition:** Treat disputed cases as research notes, not test assertions.

#### P0.4 — Validate Growth v2 against the opportunity targets

**Hypothesis:** Growth v2 measures durable per-share economic progress, but its
usefulness and proper weight differ by opportunity lane.

Do not tune Growth v2 during this step. First establish what the existing model
actually rewards and where that behavior does or does not match our targets.

- [ ] Reproduce the complete Growth v2 calculation manually for at least five
      companies across high, middle, and low scores.
- [ ] Audit its inputs separately: revenue per share, operating income per share,
      free cash flow per share, growth consistency, return on invested capital,
      dilution, annual-history coverage, and source freshness.
- [ ] Review stratified samples from the top and bottom score deciles across
      sectors and market-cap bands.
- [ ] Test known failure modes: cyclical rebound from a weak base, acquisition-led
      growth, foreign-exchange effects, buybacks masking weak operations,
      dilution, one exceptional year, and annual data lag.
- [ ] Compare Growth v2 with the adjudicated case set and already researched
      winner examples using only information available on each measurement
      date; repeat the check as the P0.5 missed-winner ledger grows.
- [ ] Produce a lane-alignment decision for each model: primary signal,
      supporting signal, eligibility gate, confidence input, or not applicable.
- [ ] Pay particular attention to likely differences: Growth v2 should align
      strongly with Underappreciated Compounders, may support Quality
      Dislocations, is probably too slow for early Structural Inflections, and
      should not force-fit cash-backed, asset-backed, or emerging-turnaround
      situations.
- [ ] Measure overlap with profitability and quality inputs so the same economic
      behavior is not counted multiple times under different names.

**Pass gate:** Every Growth v2 component is traceable and manually reproducible,
its top-ranked population matches the behavior its name promises, and each
opportunity lane has an explicit rule for how—or whether—it uses the score.

**Stop condition:** If the existing score materially rewards accounting noise,
base effects, or stale growth, fix and revalidate Growth v2 as its own increment
before using it in a lane model.

#### P0.5 — Add a missed-winner ledger

**Hypothesis:** Reviewing top gainers can reveal useful signals Compass failed to
see without turning short-term price moves into ranking inputs.

- [ ] Capture daily and weekly gainers in an append-only research dataset.
- [ ] Classify each material move: operating/earnings inflection,
      product/adoption, thematic re-rating, restructuring/capital return, M&A,
      binary event, or low-float/squeeze noise.
- [ ] For repeatable event classes, evaluate Compass at 60, 20, 5, and 1 trading
      days before the move using point-in-time evidence only.
- [ ] Record whether the company was eligible, its lane and percentile, blockers,
      and information that existed but was not modeled.
- [ ] Do not reward the model for M&A, clinical binary events, reverse splits, or
      squeeze behavior it was not designed to predict.

**Pass gate:** Every reviewed mover answers: "Was the future economic change
already visible, and if so, why did Compass miss it?"

**Stop condition:** Do not alter rankings from one anecdotal winner. Require a
recurring, economically coherent miss pattern.

#### P0.6 — Establish the forward shadow scorecard

**Hypothesis:** A frozen, append-only selection history gives us more trustworthy
evidence than repeated retrospective tuning.

- [ ] Snapshot each lane's candidates, inputs, score version, confidence, and
      rejection reasons on a fixed schedule.
- [ ] Store the contemporaneous thesis, catalyst, and thesis breakers.
- [ ] Calculate the evaluation-contract outcomes without rewriting old records.
- [ ] Publish a small internal scorecard by lane and model version.

**Pass gate:** A prior selection can be reconstructed exactly without using
current inputs.

**Stop condition:** No production recommendation cutover until this history is
running reliably.

### P1 — Implement Quality Dislocation v1

This lane comes first because it best matches the demonstrated Adobe, Microsoft,
ASML, and DECK pattern: a durable business suffers a material price decline while
its underlying economics remain sound.

#### P1.1 — Define eligibility only

**Hypothesis:** Separating durable businesses from merely cheap businesses
removes the most damaging false positives.

- [ ] Require fresh price, profile, ratio, and financial-statement inputs.
- [ ] Require positive normalized free cash flow and acceptable leverage,
      interest coverage, dilution, and liquidity.
- [ ] Enforce the P0.2d blocker/confidence/disclosure policy before calculating
      an investability result.
- [ ] Require evidence that business quality remains intact; initially use a
      small, auditable set such as margins, returns on capital, and per-share cash
      generation.
- [ ] Exclude sectors that need specialized accounting until a sector model
      exists.
- [ ] Return explicit rejection reasons; do not score ineligible companies.

**Validation:** Run the case set, inspect a stratified production sample, and
manually verify all values for the top ten and ten near misses.

**Pass gate:** DECK-like quality dips are eligible; deteriorating, highly
leveraged, and data-incomplete lookalikes are not.

#### P1.2 — Add lane-specific valuation scenarios

**Hypothesis:** Conservative, normalized owner earnings produce more useful
downside/upside estimates than a universal FCF multiple.

- [ ] Reconcile market capitalization, share count, currency, debt, cash, and
      minority interest.
- [ ] Use current, normalized, and stressed cash flow with transparent bear,
      base, and bull assumptions.
- [ ] Compare multiples with the company's own history and industry rather than
      applying the same multiple to every business.
- [ ] Report sensitivity instead of hiding uncertainty in one number.

**Validation:** Independently calculate at least five cases and vary every major
assumption. Confirm rankings do not depend on implausibly precise inputs.

**Pass gate:** Material upside survives reasonable assumptions and modeled bear
downside stays within the declared lane limit.

#### P1.3 — Add confidence separately from attractiveness

**Hypothesis:** Separating "large possible upside" from "we trust the evidence"
prevents fragile stories from outranking well-supported opportunities.

- [ ] Grade data completeness, cash-flow stability, accounting complexity,
      estimate dispersion, and evidence recency.
- [ ] Keep confidence out of raw valuation math; use it to qualify and present
      the result.
- [ ] Show why confidence is high, medium, or low.

**Validation:** Confirm that missing quarterly evidence, currency ambiguity, or
volatile cash flow lowers confidence without creating favorable valuation.

**Pass gate:** No low-confidence candidate appears as the lane's strongest
current opportunity.

#### P1.4 — Remove unjustified ranking cliffs

**Hypothesis:** A lane can require meaningful dislocation without turning a tiny
price move around one threshold into a large score or strategy change.

- [ ] Use the P0.2e sensitivity evidence to compare the existing hard boundary
      with a graded eligibility or confidence transition.
- [ ] Test candidate churn and directionality without changing valuation rules.
- [ ] Preserve a clear minimum opportunity standard; smoothing must not admit
      fully repriced companies.

**Validation:** Replay NICE, RMD, DECK, and candidates on both sides of the
boundary. Explain every lane change.

**Pass gate:** Immaterial price movement does not cause a disproportionate score
cliff, while genuinely undislocated companies remain outside the lane.

### P2 — Add a behavior-based management overlay

Management matters across every lane, but the model should score observable
stewardship rather than charisma or media reputation.

#### P2.1 — Audit available evidence

**Hypothesis:** We have enough reliable data to measure a narrow management
signal without inventing proxy precision.

- [ ] Measure coverage for share-count change, buybacks, debt issuance/repayment,
      reinvestment, margins, return on capital, insider transactions, and related
      governance flags.
- [ ] Distinguish genuine buybacks from repurchases offset by dilution.
- [ ] Identify fields that cannot be measured consistently and leave them out.

**Pass gate:** Each proposed feature has documented coverage, freshness, unit,
direction, and known failure modes.

#### P2.2 — Implement the smallest useful overlay

**Hypothesis:** Per-share outcomes, capital allocation, and financial stewardship
improve candidate ordering within a lane.

- [ ] Start with no more than three well-covered signals.
- [ ] Apply management as supporting evidence in Quality Dislocation, a larger
      factor in compounders/inflections, and a hard gate in turnarounds.
- [ ] Treat governance or related-party concerns as explicit risk flags and
      potential vetoes for special situations.

**Validation:** Compare rankings before/after, inspect every large movement, and
test historical cases without changing unrelated lane rules.

**Pass gate:** The overlay rewards durable per-share value creation and penalizes
value-destructive behavior without merely duplicating profitability or growth.

### P3 — Implement Structural Inflection v1

This lane targets economically visible change before it becomes broadly priced,
as in Apple, NVIDIA, and HOCHTIEF—not companies that are simply growing quickly.

#### P3.1 — Establish point-in-time inflection features

**Hypothesis:** Acceleration in operating evidence can be identified from data
available before a major re-rating.

- [ ] Test quarterly revenue, gross-profit, operating-income, and free-cash-flow
      acceleration.
- [ ] Test margin direction, capex efficiency, backlog where reliable, and
      per-share improvement.
- [ ] Require more than one supporting signal and compare with prior-year periods
      to reduce seasonality errors.
- [ ] Track whether the signal is new rather than merely high.

**Pass gate:** Historical case studies show the intended direction with no
look-ahead data, and negative controls do not pass on one noisy quarter.

#### P3.2 — Add valuation and durability gates

**Hypothesis:** An inflection is investable only when the price still leaves
meaningful upside and the balance sheet can fund execution.

- [ ] Add lane-appropriate downside, dilution, liquidity, and funding checks.
- [ ] Measure how much of the expected improvement is already priced in.
- [ ] Add explicit thesis-breaker conditions.

**Pass gate:** The lane distinguishes an early operating inflection from a fully
recognized momentum trade.

### P4 — Split special situations into honest sub-models

Do not value YALA and GASS with the same generic FCF formula.

#### P4.1 — Cash-backed special situations

**Hypothesis:** Haircut liquid assets plus conservatively valued operations can
identify protected upside without double-counting cash flow.

- [ ] Build a cash/investments reconciliation with liability and accessibility
      haircuts.
- [ ] Value the operating business separately.
- [ ] Include capital-return behavior, control structure, and cash-trap risk.
- [ ] Use YALA as a researched case, not a hard-coded target.

**Pass gate:** The model cannot count the same cash in both enterprise value and
operating value, and the result is robust to conservative asset haircuts.

#### P4.2 — Asset-backed and cyclical situations

**Hypothesis:** Net asset value plus through-cycle earnings is more appropriate
than peak/current FCF for asset-heavy cyclicals.

- [ ] Add asset value, debt, encumbrance, cycle position, normalized earnings,
      and management/governance checks.
- [ ] Use conservative liquidation or replacement-value haircuts.
- [ ] Use GASS as a researched case, not a hard-coded target.

**Pass gate:** Peak-cycle cash flow cannot manufacture upside, and weak minority
shareholder protections are visible in confidence or eligibility.

### P5 — Add Underappreciated Compounder v1

**Hypothesis:** Sustained per-share value creation plus reinvestment runway can
justify an opportunity even when the company is not small, obscure, or visibly
distressed.

- [ ] Measure multi-year per-share revenue, earnings, and free-cash-flow growth.
- [ ] Measure returns on incremental capital and reinvestment capacity.
- [ ] Add valuation discipline and capital-allocation evidence.
- [ ] Do not use low analyst coverage or small market capitalization as mandatory
      definitions of "overlooked."

**Pass gate:** Coca-Cola-style quality and reinvestment can qualify even when the
company is widely known, while expensive quality without sufficient prospective
return does not.

### P6 — Add Emerging Turnaround as a separate watchlist

This is intentionally last among model lanes. AMD (2015) and Tesla (2019) show
that enormous upside can coexist with real financing and execution risk.

#### P6.1 — Detect improvement without weakening safety rules

- [ ] Require measurable sequential operating improvement and adequate funding
      runway.
- [ ] Define the product, cost, capacity, or balance-sheet catalyst.
- [ ] Make dilution and refinancing risk first-class outputs.
- [ ] Label all results lower confidence until financial durability is proven.

**Pass gate:** These companies appear in a speculative research watchlist, not as
high-certainty or downside-protected recommendations.

### P7 — Production integration

Begin only after at least one lane has passed correctness, performance, case-set,
and forward-shadow gates.

#### P7.1 — Stabilize the service contract

- [ ] Return lane, attractiveness, confidence, valuation range, evidence,
      catalyst, risks, thesis breakers, freshness, and model version.
- [ ] Keep the existing Compass leaderboard behavior unchanged during shadow
      operation.
- [ ] Add service-role access controls and contract tests.

#### P7.2 — Compare, then cut over narrowly

- [ ] Run the candidate lane beside the existing experience.
- [ ] Review forward results and material disagreements.
- [ ] Cut over one lane only; retain a rapid disable path.
- [ ] Monitor latency, errors, freshness, data quality, quota use, and candidate
      churn.

**Pass gate:** The lane provides a demonstrable research-quality improvement,
not merely different rankings.

## 6. Deliberately deferred work

- A single score that mixes every opportunity type.
- UI polish before the research model is validated.
- Automated trade execution or personalized position sizing.
- Specialized banks, insurers, REITs, and pre-revenue biotechnology models.
- Exchange-variant-dependent logic.
- New paid or high-bandwidth data sources without a measured information gain.
- Raising database statement timeouts to hide expensive queries.

## 7. Immediate next increment

Continue with **P0.2b — Diagnose quarterly-statement coverage**.

Working evidence and the current decision are recorded in
`docs/verification/COMPASS_OPPORTUNITY_BASELINE.md`.

P0.2a is complete. Its immutable snapshot, hashes, and repeatability result are
recorded in the baseline document. P0.2b has now established that:

1. all 200 candidates have stored financial statements;
2. none has a quarterly row or enough evidence for trailing-four-quarter FCF;
3. all 59,016 rows in the complete stored statement table are `FY` rows; and
4. the fetcher omits an explicit quarterly period while the parser and table
   already support Q1-Q4 records.

The bounded DECK provider probe passed: all three endpoints returned five
aligned Q1-Q4 records and complete payload shapes in about 25 KB combined. The
next increment adds those capped quarterly calls to the existing weekly
financial-statements job, reserves all six calls and a conservative 1.2 MB per
job, and validates one queued DECK refresh before allowing natural weekly
coverage. At the last observed 5,271-symbol universe, DECK's measured quarterly
payload extrapolates to roughly 552 MiB per rolling 30 days; production usage
accounting remains authoritative and the conservative reservation may throttle
earlier. Do not start a universe-wide backfill or change scoring in this
increment.
