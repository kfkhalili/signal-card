# User Acquisition Baseline

**Captured:** 2026-10-03  
**Scope:** UA0.1, behavior-preserving acquisition and activation baseline  
**Data boundary:** No FMP calls or provider-derived values were used.

## Current funnel contract

| Step | Observed behavior | Baseline risk |
| --- | --- | --- |
| Public landing | Unauthenticated visitors see the synthetic product preview. The main signup links open `/auth#auth-sign-up`. | None found in the entry path. |
| Authentication | Email/password and Google are offered. Login remains available for returning users. | The Google callback URL does not carry the requested `next` destination. |
| Protected routes | `/compass`, `/symbol`, and `/workspace` redirect unauthenticated visitors to `/auth` and preserve the requested pathname in `next`. | The original query string is dropped. |
| Email confirmation | A valid confirmation routes to `/auth/complete-profile`. | The original destination is not preserved through confirmation. |
| Profile completion | Username is required; full name is optional. Success routes to `/workspace`. | This blocks the first product session and sends acquisition users away from the Compass-led journey. |
| Authenticated home | An authenticated visit to `/` routes to `/compass`. | This conflicts with the profile-completion destination. |
| First research action | An existing test account could open the first Compass company and reach its company-research page. | No dead end found in this action. |

The public landing and signup entry points were checked at 1280×900 and 390×844.
Protected-route redirects and the source-level hand-offs above are covered by
repeatable contract tests.

## One-run local production quality baseline

These Lighthouse results are diagnostic baselines from a local production
build, not field performance measurements.

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Landing | 79 | 92 | 100 | 100 | 0.77 s | 5.85 s | 46 ms | 0 |
| Auth | 83 | 96 | 100 | 100 | 0.76 s | 4.30 s | 56 ms | 0.107 |

Observed accessibility failures are narrow and reproducible:

- The primary signup CTA, header signup CTA, cookie acceptance button, and
  several auth controls do not meet the audited color-contrast threshold.
- The synthetic preview's 52-week low/high controls are smaller than the
  audited minimum touch target.

SEO mechanics passed the automated checks, but the content contract still has
two product-trust problems: global metadata retains unsupported API/real-time
positioning, and protected product routes are listed in the sitemap while also
being disallowed by `robots.txt`.

## Prioritized findings

1. Instrument the frozen funnel before changing it (UA0.2).
2. Remove unsupported public claims and the sitemap/robots contradiction
   (UA0.3).
3. Preserve destination intent through Google auth, email confirmation, errors,
   and retries (UA2.1).
4. Remove or defer blocking profile completion and align successful signup with
   Compass (UA2.2–UA2.3).
5. Correct CTA/auth contrast, touch targets, and landing/auth render delay as
   part of the relevant public-page and signup increments.

## Reproduction

```bash
npm test -- --runInBand \
  src/app/auth/__tests__/callback.refactor.test.ts \
  src/app/auth/__tests__/confirm.refactor.test.ts \
  src/app/auth/__tests__/acquisition-funnel.contract.test.ts

npm run test:e2e -- e2e/acquisition-funnel.spec.ts
```

