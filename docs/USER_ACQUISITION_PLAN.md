# Tickered User Acquisition Plan

**Status:** Active
**Primary objective:** Increase the number of qualified visitors who create an
account and reach a first useful research action.  
**North-star metric:** Weekly activated new users.

An **activated new user** is a newly registered user who, within 24 hours,
opens a company from Compass or adds a company to Workspace. Signup count remains
important, but it is not sufficient by itself: attracting people who never see
the product's value would optimize the wrong outcome.

## Product position

Tickered should lead with one promise:

> Find financially sound companies the market may be overlooking, then inspect
> the evidence yourself.

The primary audience is the self-directed, long-term investor looking for
mispriced or under-recognized companies. Compass is the discovery engine;
company analysis and Workspace are the evidence and research tools.

Avoid claims that the product predicts returns, provides investment advice, or
offers real-time data where the underlying data is scheduled. Do not expose the
ranking formula merely to demonstrate the product; explain the principles and
show the resulting workflow.

## Hard data-licensing constraint

Tickered is not licensed to redistribute or publicly display FMP data. Treat
this as a release-blocking constraint, not a copy preference.

- Never place FMP-derived values, rankings, company rows, payloads, screenshots,
  or exports on unauthenticated pages, indexed pages, social previews, emails,
  or shareable links.
- Never expose FMP-derived data through a public API route, even when the API key
  itself remains server-side.
- Public demonstrations must use clearly labeled synthetic fixtures that cannot
  be mistaken for current market data.
- Acquisition analytics must not capture provider payloads or financial values.
- Every public-data change requires a licensing-boundary test before release.

## Current-state findings

- The landing page leads with institutional data, API integration, enterprise
  services, and real-time feeds instead of the working discovery product.
- The landing page has one signup button and a grid of cards, but it does not
  explain Compass, the research workflow, or why a visitor should trust it.
- The landing-page card grid previously rendered stored provider-derived data.
  UA0.0 replaced that path with a clearly labeled, versioned synthetic fixture
  and protected the remaining profile-image route behind authentication.
- UA0.2 now defines and instruments the privacy-safe acquisition funnel. It
  remains inert until an EU PostHog project token is configured and a visitor
  explicitly accepts analytics.
- Signup supports email and Google, but confirmed users are forced through a
  separate profile-completion form before reaching the product.
- Profile completion redirects to Workspace even though the authenticated home
  page and current product strategy lead with Compass.
- Features, Help, Blog, Pricing, API, and Status include unfinished or
  unverified claims. Several are included in the sitemap despite being
  placeholders.
- Public pages are largely absent from unauthenticated navigation, so visitors
  cannot easily evaluate the product before signing up.
- The existing Compass frontend work improves comprehension after activation,
  but it cannot materially improve acquisition while Compass remains hidden
  behind authentication.

## Funnel and measurement contract

Measure the same funnel for each acquisition source and device class:

1. Qualified landing visit
2. Primary signup CTA click
3. Signup form viewed
4. Signup submitted
5. Account created or confirmed
6. First Compass view
7. First research action: company opened or added to Workspace
8. Seven-day return

Minimum reporting:

- Visitor → signup CTA click rate
- CTA click → signup form completion rate
- Signup submission → confirmed account rate
- Confirmed account → first Compass view rate
- First Compass view → first research action rate
- Visitor → activated account rate
- Seven-day retention for activated users
- Breakdown by source/UTM, landing page, device class, and auth method

Never send email addresses, names, portfolio contents, or free-form financial
research to the analytics provider. Define event names and properties in one
typed module and test them as a stable contract.

## Prioritized roadmap

Every numbered item is intended to be a small pull request with its own
measurement or verification gate. Do not combine phases simply because the
changes touch the same page.

### P0 — Make the funnel observable and truthful

This is the highest-leverage work. Without it, design changes are opinions and
signup losses are invisible.

#### UA0.0 — Contain public provider-data exposure

- [x] Confirm the provenance and unauthenticated behavior of `/api/demo-cards`.
- [x] Replace provider-derived demo responses with a versioned synthetic fixture.
- [x] Inventory all public API routes and acquisition assets for provider-derived
  values or payloads.
- [x] Add a regression test proving unauthenticated acquisition routes cannot return
  FMP-derived market data.

**Pass gate:** Public marketing surfaces and unauthenticated endpoints expose no
FMP-derived data, while the authenticated product remains functional.

**Verified 2026-10-03:** `/api/demo-cards` now returns only the deterministic
`synthetic-v1` fixture and the landing page fails closed unless that provenance
header is present. The unauthenticated landing path no longer queries exchange
rates. The only other public API route found was the profile-image proxy; it now
requires an authenticated user and uses private caching. Desktop and mobile
landing checks showed the synthetic disclosure and fictional `DEMO` cards, and
an authenticated Compass check confirmed company logos still load through the
protected proxy.

#### UA0.1 — Freeze the acquisition baseline

- [x] Record current landing, auth, confirmation, profile-completion, Compass, and
  first-research-action behavior on desktop and mobile.
- [x] Add contract tests for CTA destinations, `next` preservation, auth methods,
  post-confirmation routing, and protected-route behavior.
- [x] Record current performance, accessibility, and SEO baselines for the landing
  and auth pages.

**Pass gate:** The current funnel and its failure states can be reproduced
without changing production behavior.

**Verified 2026-10-03:** The current route hand-offs, desktop/mobile entry
points, protected-route redirects, auth methods, and first company-research
action are frozen in tests. Local production Lighthouse baselines and the
observed routing, accessibility, performance, and SEO gaps are recorded in
[`USER_ACQUISITION_BASELINE.md`](./USER_ACQUISITION_BASELINE.md). No product
behavior or provider-data path changed in this increment.

#### UA0.2 — Add privacy-safe funnel analytics

- [x] Select one analytics system capable of anonymous acquisition attribution and
  authenticated funnel analysis.
- [x] Add the minimum event contract listed above.
- [x] Respect cookie consent and verify that no disallowed personal data is sent.
- [x] Define the small internal funnel and retention reports; do not add unrelated
  behavioral tracking.

**Pass gate:** A test signup can be followed from landing source through first
research action, with no duplicate events or personal data leakage.

**Implementation verified 2026-10-03:** The typed PostHog EU integration is
opt-in, fails closed without its public project token, disables broad behavioral
capture, deduplicates each funnel milestone, and identifies accounts only by
their opaque Supabase UUID. Contract tests exercise landing through first
research action and reject disallowed properties. The exact report definitions
and production smoke procedure are recorded in
[`ACQUISITION_ANALYTICS.md`](./ACQUISITION_ANALYTICS.md). The production pass
gate remains open until the deployment token is configured and one consented
test signup is inspected in the EU project.

#### UA0.3 — Remove misleading public claims and dead acquisition surfaces

- Inventory every public claim against actual product behavior and data
  freshness.
- Remove placeholder pages from the sitemap and public navigation until they
  contain real content; use `noindex` where removal is inappropriate.
- Do not advertise paid plans, API access, live status, newsletters, or real-time
  data unless the corresponding experience exists and is supported.
- Reconcile the sitemap and `robots.txt`: do not advertise protected product
  routes to crawlers while simultaneously disallowing them.
- Replace unsupported API, real-time, and institutional-grade metadata claims
  with the approved research-product position.
- Replace the public demo-card data path with deterministic synthetic fixtures;
  do not merely hide the provider key while returning provider-derived data.
- Audit all unauthenticated routes, metadata images, screenshots, and generated
  content for FMP-derived values, and add a regression test that fails if a
  public acquisition surface imports the authenticated market-data path.

**Pass gate:** Every indexed public page is useful, complete, internally
consistent, makes only supportable claims, and contains no FMP-derived data.

### P1 — Make the landing page explain the product

#### UA1.1 — Correct the hero and CTA

- Replace API/enterprise copy with the overlooked-company research promise.
- Use one primary CTA: **Create a free account**.
- Add one low-friction secondary action: **See how it works**, anchored to the
  product explanation on the same page.
- State that Tickered is a research tool, not a promise of returns.
- Correct the measured signup-CTA contrast and preview touch-target failures;
  preserve keyboard behavior and mobile readability.
- Treat the recorded landing LCP as a regression baseline and remove avoidable
  render delay while changing the hero.

**Pass gate:** In a five-person comprehension check, at least four people can
say what Tickered helps them do and what happens after signup.

#### UA1.2 — Demonstrate the complete workflow

- Show three concise steps: personalize Compass, inspect a candidate, save
  research to Workspace.
- Use the real product shell populated only with clearly labeled synthetic
  fixtures, not provider-derived values, abstract stock imagery, or invented
  testimonials.
- Explain why a company appears without publishing proprietary weights or
  presenting the result as advice.

**Pass gate:** The workflow is understandable without creating an account and
does not materially slow the landing page.

#### UA1.3 — Add evidence and trust

- Add a short methodology summary: financial quality, valuation, growth,
  resilience, recognition, and risk flags.
- Show data freshness honestly and link to a focused methodology/trust page.
- Add visible privacy, data-source, limitations, and contact links.
- Use genuine product evidence; do not manufacture user counts, performance
  claims, or testimonials.

**Pass gate:** A visitor can understand what the ranking is, what it is not, and
where its inputs come from before signing up.

### P2 — Remove signup and onboarding friction

#### UA2.1 — Make signup intent persistent

- Preserve the requested destination and acquisition attribution through email
  confirmation, Google auth, errors, and retries.
- Preserve any allowlisted acquisition query parameters rather than only the
  pathname, without creating an open redirect.
- Default acquisition CTAs to signup while keeping login obvious for returning
  users.
- Make auth errors actionable and retain entered intent after recovery.

**Pass gate:** Email and Google users reach the intended destination after every
successful path; automated tests cover the failure paths.

#### UA2.2 — Defer nonessential profile fields

- Audit dependencies on username and full name.
- If neither is required for the first research session, defer both to Profile
  and remove the blocking completion page.
- If a field is technically required, generate a reversible default and ask for
  customization later.

**Pass gate:** A new user can reach Compass immediately after authentication,
without breaking ownership, security, or existing profiles.

#### UA2.3 — Align every first-session route

- Send new and returning users to Compass unless they explicitly requested a
  different protected page.
- Change empty Workspace guidance to lead back to Compass.
- Preserve a clear path from Compass to company analysis and Workspace.

**Pass gate:** There is no successful signup path that strands a user in an
empty or unrelated screen.

### P3 — Deliver the first useful result quickly

#### UA3.1 — Lightweight investment-style start

- Present the existing presets inside Compass; do not add a separate mandatory
  onboarding wizard.
- Start with a sensible default and make changing it reversible.
- Explain in one sentence that the preset changes ranking emphasis, not expected
  return or certainty.

**Pass gate:** A first-time user can produce a personally relevant ranking in
under one minute.

#### UA3.2 — Strengthen discovery → evidence

- Keep company, rank, risk flags, and research action primary.
- Verify company-detail and Workspace actions preserve the candidate the user
  selected.
- Explain missing data and ranking freshness without adding recommendation
  language.
- Continue the existing Compass terminology plan only where it improves this
  first-session journey.

**Pass gate:** At least one clearly instrumented action takes a user from a
ranked company to supporting evidence with no dead end.

#### UA3.3 — Validate activation quality

- Review the first-session funnel by source, device, and auth method.
- Inspect where activated and non-activated signups diverge.
- Change one friction point at a time and retain only improvements that do not
  reduce downstream research actions or seven-day retention.

**Pass gate:** Visitor → activated-account conversion improves against the P0
baseline without degrading data quality, performance, or trust.

### P4 — Build sustainable organic acquisition

Start only after P0–P3 produce a coherent, measurable first session.

#### UA4.1 — Establish a focused public information architecture

- Keep only complete, useful public pages in navigation and the sitemap.
- Create focused pages for Compass, methodology, company research, Workspace,
  pricing/free access, privacy, and help.
- Give every page one audience, one search intent, and one next action.

#### UA4.2 — Publish evidence-led search content

- Build content around real user questions: finding overlooked companies,
  evaluating a dip, reading risk flags, and validating growth or cash flow.
- Link educational content to a relevant product example and signup CTA.
- Add Search Console measurement and monitor qualified signup conversions, not
  impressions alone.

#### UA4.3 — Evaluate a synthetic public product walkthrough

- Use synthetic companies and values to demonstrate the interaction model.
- Do not publish delayed, sampled, aggregated, or transformed FMP data as a
  workaround; public provider-derived data remains prohibited.
- Require signup for access to the authenticated product experience.

**P4 pass gate:** Organic landings generate activated accounts at an acceptable
rate; the walkthrough contains no provider-derived data and does not erode the
proprietary model.

### P5 — Add distribution and referral loops

Start only after the core funnel converts and retains users.

- Test shareable methodology or workflow pages using synthetic examples only.
  Do not generate public company-research summaries from FMP-derived data.
- Publish a consistent evidence-led Reddit/content cadence tied to useful public
  pages rather than generic promotion.
- Consider a weekly saved-search or Compass digest only after users can control
  preferences and unsubscribe reliably.
- Add referral mechanics only if organic sharing already occurs.

**Pass gate:** Referred users activate and retain at least as well as comparable
non-paid acquisition traffic.

## Experiment rules

- One hypothesis and one meaningful behavioral change per pull request.
- Instrument before changing the behavior being measured.
- Keep RPCs, ranking logic, and financial claims unchanged unless a separate
  backend-quality task explicitly authorizes them.
- Segment results by source and device; aggregate conversion can hide a broken
  mobile or email-confirmation path.
- Do not call an experiment successful on clicks alone. Check account creation,
  first research action, and seven-day retention.
- Prefer sequential validation until traffic is high enough for a meaningful
  controlled experiment. Do not perform decorative A/B tests with inadequate
  sample sizes.
- Feed each result back into this plan: keep, revise, or remove the next task
  based on the observed bottleneck.

## Decisions required before implementation

Recommended defaults are in bold.

1. Primary audience: **self-directed long-term investors seeking overlooked,
   financially sound companies** rather than a simultaneous beginner,
   professional, API, and enterprise audience.
2. Primary conversion: **free account creation followed by a research action**;
   paid-plan conversion is out of scope until billing and entitlements are real.
3. Analytics: choose a privacy-compatible product analytics system with EU data
   handling and consent support; **instrument only the defined funnel first**.
4. Profile completion: **defer username and full name unless the dependency audit
   proves one is required**.
5. Public proof: **show principles and a clearly labeled synthetic walkthrough;
   never publish FMP-derived data, the live leaderboard, or the proprietary
   formula**.

## Immediate next step after approval

Execute **UA0.2 only**: add the minimum privacy-safe funnel event contract and
report. Do not redesign the landing page until acquisition and activation are
observable.
