export const ANALYTICS_CONSENT_KEY =
  "tickered_acquisition_analytics_consent_v1";
export const ANALYTICS_CONSENT_CHANGED_EVENT =
  "tickered:analytics-consent-changed";

export type AnalyticsConsent = "accepted" | "declined" | "unset";

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unset";

  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (stored === JSON.stringify(true)) return "accepted";
    if (stored === JSON.stringify(false)) return "declined";
  } catch {
    // Storage can be unavailable in private browsing or hardened environments.
  }

  return "unset";
}

export function writeAnalyticsConsent(consent: Exclude<AnalyticsConsent, "unset">) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    ANALYTICS_CONSENT_KEY,
    JSON.stringify(consent === "accepted")
  );
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, {
      detail: { consent },
    })
  );
}
