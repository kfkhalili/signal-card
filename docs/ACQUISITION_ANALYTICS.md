# Acquisition analytics

## Scope

UA0.2 measures the minimum path from a qualified landing visit to a useful
first research action. It uses PostHog Cloud EU because it can preserve an
anonymous visitor's funnel when the visitor becomes an authenticated user
without adding another production database or migration path.

Analytics fail closed. The browser does not load or initialize PostHog unless:

1. the visitor explicitly allows analytics; and
2. `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is configured.

Only the PostHog project token belongs in this public environment variable.
Never expose a PostHog personal API key.

## Stable event contract

| Order | Event | Additional allowed property |
| --- | --- | --- |
| 1 | `acquisition_qualified_landing_visit` | none |
| 2 | `acquisition_signup_cta_clicked` | `cta_location` |
| 3 | `acquisition_signup_form_viewed` | none |
| 4 | `acquisition_signup_submitted` | `auth_method` |
| 5 | `acquisition_account_confirmed` | `auth_method` |
| 6 | `acquisition_first_compass_view` | none |
| 7 | `acquisition_first_research_action` | `research_action` |
| 8 | `acquisition_seven_day_return` | none |

Tickered adds only these controlled fields to the events:

- `schema_version`
- `device_class`: `mobile`, `tablet`, or `desktop`
- `path_group`: a route category, never a URL or ticker
- `acquisition_source`, `acquisition_medium`, and an optional sanitized
  `acquisition_campaign`

The authenticated identity is the opaque Supabase user UUID. Do not attach
person properties.

The analytics contract must never contain an email address, name, symbol,
company name, portfolio contents, price, financial value, provider payload,
full URL, referrer, or free-form research. Autocapture, pageview capture,
session replay, heatmaps, surveys, feature flags, and exception capture are
disabled. Automatic campaign and referrer collection is disabled in favor of
the sanitized attribution fields above. The SDK also rejects events outside
the allowlist above.

## Consent behavior

- Before a choice, analytics are off and the consent banner is shown.
- Prior acceptance of the legacy general cookie banner is not treated as
  consent to this new analytics system.
- Declining stores the preference and keeps analytics off without disabling the
  product.
- Accepting initializes the analytics client and records the current eligible
  funnel step.
- The Cookie Policy lets the visitor change or withdraw the choice later.
- Signing out resets the analytics identity before another account can use the
  browser.

## Internal reports

Create one PostHog funnel named **Acquisition — activated new user** with events
1 through 7 in the order above and a 24-hour conversion window. Use unique
users and create breakdown views for:

- `acquisition_source`
- `device_class`
- `auth_method` on the signup steps
- `path_group` (the current qualified landing group is `landing`)

Create one retention insight named **Acquisition — seven-day return** using
`acquisition_account_confirmed` as the starting event and
`acquisition_seven_day_return` as the returning event.

Do not enable broad product autocapture to fill gaps in these reports. Add a
typed event only when the acquisition plan explicitly requires it.

## Release verification

1. Create or select an EU PostHog project and configure its project token as
   `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` in the deployment environment.
2. Open a clean browser profile. Confirm no PostHog request occurs before a
   consent choice or after declining.
3. Accept analytics, then complete one test path: landing, signup CTA, signup,
   Compass, and company open or Workspace add.
4. Confirm each expected event appears once and the anonymous history is joined
   to the opaque account UUID.
5. Inspect every captured property. Stop the release if any disallowed value or
   provider-derived data appears.
6. Withdraw consent on `/cookies` and confirm further capture stops.

Automated tests cover fail-closed consent, deduplication, opaque identity,
route grouping, the eight-event contract, and the forbidden-property boundary.
