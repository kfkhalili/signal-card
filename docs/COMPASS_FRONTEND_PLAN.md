# Compass Front-End: Incremental Trust and Clarity Plan

**Last updated:** 2026-10-03  
**Status:** Working plan  
**Goal:** Help users understand and act on the improved Compass rankings without
changing the ranking model, exposing meaningless scores, or implying investment
certainty.

The production leaderboard already receives backend improvements through the
existing `get_weighted_leaderboard` contract. Front-end work should make that
output easier to understand. It must not invent a second ranking system in the
browser.

## 1. Product principles

- Compass prioritizes companies for further research; it does not predict
  returns or tell a user what to buy.
- Do not display `composite_score`. It has no useful standalone interpretation.
- Use plain product language. Show **Growth**, not implementation names such as
  `Growth v2`, and never show the legacy `PEG` label for the current growth rank.
- Explain ranks as relative positions: lower is better.
- Preserve the existing RPC, weights, presets, ranking order, filters, and
  freshness indicator unless a later increment explicitly validates a change.
- Do not expose shadow opportunity lanes, confidence claims, risk flags, or
  proprietary model internals before their production contracts pass backend
  validation.
- Do not use exchange-variant data for new front-end logic. The existing optional
  exchange filter is outside this plan and must not be expanded.
- Each increment should be independently reviewable, reversible, and small
  enough for one focused pull request.

## 2. Validation loop

Every increment follows the same sequence:

1. State the user problem and expected improvement.
2. Capture the current desktop and mobile behavior.
3. Make one bounded UI change.
4. Verify that the RPC request and returned symbol order are unchanged.
5. Run focused component tests, the existing build/type checks, and one
   Playwright desktop/mobile smoke check.
6. Review loading, empty, error, stale, and populated states.
7. Record a keep, revise, or remove decision before starting the next increment.

### Definition of done

- [ ] No backend migration, new endpoint, or additional FMP call was introduced.
- [ ] The same inputs produce the same symbols in the same order.
- [ ] The change is understandable without knowing Compass implementation names.
- [ ] Mobile layout, keyboard access, and screen-reader text remain usable.
- [ ] Existing persisted weights and filters continue to load.
- [ ] The change has a simple rollback consisting only of reverting its UI commit.

## 3. Prioritized increments

Only one unchecked increment should be active at a time.

### FE0 — Freeze the current client contract

**Why first:** Later UI changes are only safe if we can prove they did not alter
recommendations.

- [x] Add a focused test fixture for one leaderboard response containing all
      currently rendered fields, including null ranks.
- [x] Assert that changing presentation does not change the RPC name, payload,
      weights, filters, or result ordering.
- [x] Capture one populated desktop view and one narrow mobile view as the visual
      baseline.
- [x] Record the current loading, empty, RPC-error, and freshness-error copy.

**Pass gate:** The UI contract and important states can be checked without a live
production database.

### FE1 — Correct terminology and explain the ranks

**Hypothesis:** One plain-language explanation removes the largest comprehension
gap without adding visual or conceptual weight.

#### FE1a — User-facing growth label

- [x] Label the pillar **Growth** wherever the user sees it.
- [x] Keep `peg_rank` only as an internal compatibility field in TypeScript.
- [x] Do not mention version numbers or the old PEG implementation in visible UI.

**Validation:** Search rendered Compass copy for `PEG`, `Growth v2`, and
`peg_rank`; none should be user-visible. Confirm the value still comes from the
same response field.

**Decision (2026-10-03): Keep.** Desktop and 390 px mobile checks show the
existing rank as **Growth**, with no visible PEG/version terminology and no
change to the RPC, payload, filters, ordering, or freshness behavior.

#### FE1b — Rank explanation

- [ ] Add one compact line immediately above the results:
      **“Pillar ranks show how each company compares with other eligible
      companies. Lower is better.”**
- [ ] Keep the wording informational. Do not add a score, confidence label,
      expected return, or recommendation claim.
- [ ] Ensure the explanation remains visible on mobile without occupying a table
      column.

**Pass gate:** A user can correctly explain what a pillar rank means after seeing
the page, and the rendered leaderboard is otherwise unchanged.

### FE2 — Replace cryptic abbreviations one at a time

**Hypothesis:** Clear names improve interpretation more than adding more metrics.

- [ ] Audit each existing chip against the actual backend meaning before changing
      its copy: EVM, Profitability, Dividend Yield, Health, Price/Sales,
      Sentiment, and Buybacks.
- [ ] Change only labels and accessible descriptions; do not combine ranks or
      calculate client-side summaries.
- [ ] Prefer concise visible labels with full plain-language tooltips or
      accessible text where space is constrained.
- [ ] Validate one terminology group per pull request rather than rewriting every
      chip at once.

**Pass gate:** User-facing names match the underlying metric, fit at narrow
widths, and introduce no claim about absolute company quality.

### FE3 — Improve information hierarchy without adding data

**Hypothesis:** The company and its rank should remain primary while pillar
details become easier to scan on demand.

- [ ] Test a compact **Pillar ranks** disclosure on mobile before changing the
      desktop layout.
- [ ] Keep the overall rank, company, symbol, industry, and research action
      visible at all times.
- [ ] If the disclosure improves comprehension, apply the same pattern to
      desktop; otherwise retain the current chips.
- [ ] Do not hide missing values or replace them with favorable language.

**Pass gate:** The populated page is easier to scan in a small usability review,
with no loss of metric availability or additional interaction required for the
primary research action.

### FE4 — Make freshness states trustworthy

**Hypothesis:** Users need to distinguish fresh rankings from unavailable update
metadata without interpreting either as market-data recency.

- [ ] Verify the timestamp describes the successful ranking refresh—not quote
      recency or the time the page loaded.
- [ ] Keep the existing relative timestamp when available.
- [ ] Give unavailable and failed freshness checks distinct, calm wording.
- [ ] Add stale presentation only after the backend defines an explicit stale
      threshold; do not invent one in the client.

**Pass gate:** Every freshness state is accurate and cannot be mistaken for a
real-time market-data promise.

### FE5 — Validate research actions

**Hypothesis:** The best near-term product value comes from helping users inspect
ranked companies, not from adding more recommendation language.

- [ ] Verify individual **Add** and **Explore Top 3** actions preserve the shown
      ordering and fail clearly.
- [ ] Check whether opening a company gives enough context to investigate the
      pillars shown in Compass.
- [ ] Propose any missing research handoff separately; do not expand workspace
      cards as part of terminology or layout work.

**Pass gate:** Users can move from a ranked company to research without losing
which company they selected or why it caught their attention.

### FE6 — Prepare, but do not activate, future opportunity lanes

This begins only after a backend lane passes correctness, performance, and
forward-evidence gates.

- [ ] Define a minimal versioned contract for lane, evidence, risks, confidence,
      catalyst, thesis breakers, and freshness.
- [ ] Test the new lane beside the existing leaderboard behind an internal flag.
- [ ] Present evidence and uncertainty before any stronger recommendation copy.
- [ ] Roll out one validated lane at a time with a rapid disable path.

**Pass gate:** The interface explains a validated research thesis without
exposing internal formulas or presenting a shadow result as production advice.

## 4. Explicitly deferred

- Displaying `composite_score` or any renamed equivalent.
- Changing default weights or investor presets before forward evidence supports
  the change.
- Client-side scoring, confidence calculation, or risk-flag interpretation.
- Public Hidden Gems, Growth-version labels, or shadow opportunity lanes.
- A Compass redesign, new charting system, or expanded workspace workflow.
- Claims such as “best investment,” “high certainty,” “expected upside,” or
  “buy.”

## 5. Immediate next increment

Start with **FE0**, then deliver **FE1a** and **FE1b** as separate, small commits.
The first visible change should contain only the plain **Growth** label and the
rank explanation. It should not include layout restructuring or new data.
