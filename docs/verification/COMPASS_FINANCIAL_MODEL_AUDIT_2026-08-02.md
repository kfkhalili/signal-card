# Compass Financial Model Audit — 2026-08-02

## Outcome

The current Compass implementation calculates and filters its scores correctly,
but a correct calculation is not yet a reliable high-quality value strategy.
The live top results contain value traps, illiquid microcaps, severe shareholder
dilution, and financial securities whose accounting is not comparable with an
ordinary operating company.

No FMP requests were made for this audit. No production score or ranking was
changed.

## What the current labels actually measure

| Compass label | Current production input |
| --- | --- |
| Revenue | Revenue divided by market capitalization (inverse P/S) |
| Value | Enterprise-value multiple |
| Sentiment | Six-month net insider transaction dollars |
| Growth | PEG ratio |
| Profitability | Lower of earnings yield and free-cash-flow yield |
| Buyback | Five-year average share-count change |
| Income | Dividend yield |
| Health | Net-debt/cash-flow tier plus quick ratio |

Several labels therefore imply more than their inputs establish. In particular,
the Profitability pillar measures cheapness of earnings and cash flow, not the
quality or durability of those profits.

## Live failure examples

The read-only audit found these among the current leaders:

- `RDGT` ranked second for Value despite a roughly $0.7 million market cap,
  declining revenue, approximately 284% year-over-year dilution, and only one
  positive free-cash-flow year out of five.
- `CISS` ranked seventh for Value despite effectively no usable market-cap value
  and approximately 2,127% year-over-year dilution.
- A preferred-style Prudential security appeared in the Quality leaders, even
  though it is not comparable with a common operating company.
- Banks, insurers, and credit vehicles occupied much of the Quality top 20
  because industrial-company cash-flow and leverage measures do not mean the
  same thing for financial companies.

These are model-quality findings, not investment recommendations about the
named securities.

## Model direction

Compass v2 should select quality first and cheapness second:

1. Establish that the row represents a current, analyzable common stock with
   adequate source coverage and practical tradability.
2. Use separate models for operating companies, financial companies, and real
   estate companies.
3. Reject mathematically invalid valuation inputs. Negative or zero P/E, PEG,
   price-to-FCF, and enterprise multiples must not receive a favorable rank.
4. Measure quality over several years: cash-flow consistency, gross profit on
   assets, accrual quality, revenue durability, balance-sheet safety, and share
   dilution.
5. Rank value within comparable sectors and industries after the quality floor
   is met.
6. Scale insider activity by company size rather than comparing raw dollars.
7. Report data coverage and risk reasons with every shadow score. Missing data
   must not silently become a neutral or favorable result.

This direction follows established evidence that profitability improves value
selection and that quality combines profitability, growth, safety, and capital
returned to shareholders:

- Robert Novy-Marx, [The Other Side of Value](https://www.nber.org/papers/w15940)
- Asness, Frazzini, and Pedersen, [Quality Minus Junk](https://www.aqr.com/-/media/AQR/Documents/Insights/Working-Papers/Quality-Minus-Junk.pdf)
- Joseph Piotroski, [Value Investing: The Use of Historical Financial Statement Information](https://ideas.repec.org/a/bla/joares/v38y2000ip1-41.html)

The liquidity controls also reflect the SEC's warning that microcap securities
can have limited public information, low trading volume, and greater
manipulation risk: [Microcap Stock: A Guide for Investors](https://www.sec.gov/about/reports-publications/investorpubsmicrocapstock).

## First implementation slice

Migration `20260802000000_add_compass_quality_shadow_audit.sql` adds a
service-only, read-only audit of the existing top 50. It reports the current
rank beside provisional gate failures and risk flags. It does not alter the
leaderboard.

The provisional gate currently tests:

- fund/ETF and security-name leakage;
- whether a specialized financial or real-estate model is required;
- market cap below $50 million;
- average daily dollar volume below $500,000;
- fewer than three annual statements;
- fewer than three positive free-cash-flow years for operating companies;
- missing or stale financial inputs;
- more than 50% year-over-year share dilution.

The audit also warns about less severe liquidity, dilution, accrual, debt,
revenue, and invalid-ratio risks. These thresholds are hypotheses to measure,
not final production policy.

## Validation sequence

1. Run the shadow audit against each current investor profile.
2. Measure how many top-50 candidates fail each rule and manually inspect the
   borderline cases.
3. Agree on production cutoffs from that evidence.
4. Build the operating-company v2 score alongside the existing score.
5. Validate calculations by hand and compare old/new top 50 results.
6. Use point-in-time filings, prices, and delistings for historical testing so
   future information and survivorship cannot leak into results.
7. Switch user recommendations only after the shadow results are credible and
   explainable.

This sequence consumes no FMP quota until a separate historical-data plan is
explicitly approved.
