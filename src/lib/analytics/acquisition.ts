"use client";

import type { PostHog } from "posthog-js";
import { readAnalyticsConsent } from "@/lib/analytics/consent";

export const ACQUISITION_EVENT_NAMES = {
  qualifiedLandingVisit: "acquisition_qualified_landing_visit",
  signupCtaClicked: "acquisition_signup_cta_clicked",
  signupFormViewed: "acquisition_signup_form_viewed",
  signupSubmitted: "acquisition_signup_submitted",
  accountConfirmed: "acquisition_account_confirmed",
  firstCompassView: "acquisition_first_compass_view",
  firstResearchAction: "acquisition_first_research_action",
  sevenDayReturn: "acquisition_seven_day_return",
} as const;

export type AcquisitionEventName =
  (typeof ACQUISITION_EVENT_NAMES)[keyof typeof ACQUISITION_EVENT_NAMES];
export type AuthMethod = "email" | "google";
export type ResearchAction = "company_opened" | "workspace_added";
export type DeviceClass = "desktop" | "mobile" | "tablet";
export type PathGroup =
  | "landing"
  | "auth"
  | "compass"
  | "company_research"
  | "workspace"
  | "other";

interface EventProperties {
  [ACQUISITION_EVENT_NAMES.qualifiedLandingVisit]: Record<string, never>;
  [ACQUISITION_EVENT_NAMES.signupCtaClicked]: {
    cta_location: "hero" | "header" | "synthetic_demo";
  };
  [ACQUISITION_EVENT_NAMES.signupFormViewed]: Record<string, never>;
  [ACQUISITION_EVENT_NAMES.signupSubmitted]: {
    auth_method: AuthMethod;
  };
  [ACQUISITION_EVENT_NAMES.accountConfirmed]: {
    auth_method: AuthMethod;
  };
  [ACQUISITION_EVENT_NAMES.firstCompassView]: Record<string, never>;
  [ACQUISITION_EVENT_NAMES.firstResearchAction]: {
    research_action: ResearchAction;
  };
  [ACQUISITION_EVENT_NAMES.sevenDayReturn]: Record<string, never>;
}

type DedupeScope = "session" | "visitor" | "none";

const POSTHOG_EU_HOST = "https://eu.i.posthog.com";
const SCHEMA_VERSION = "ua0.2-v1";
const ATTRIBUTION_KEY = "tickered_acquisition_attribution_v1";
const PENDING_SIGNUP_KEY = "tickered_acquisition_pending_signup_v1";
const ACCOUNT_CONFIRMED_AT_KEY = "tickered_acquisition_confirmed_at_v1";
const DEDUPE_PREFIX = "tickered_acquisition_seen_v1";
const ATTRIBUTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PENDING_SIGNUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const allowedPostHogEvents = new Set<string>([
  ...Object.values(ACQUISITION_EVENT_NAMES),
  "$identify",
]);

interface Attribution {
  source: string;
  medium: string;
  campaign?: string;
  captured_at: string;
}

interface PendingSignup {
  auth_method: AuthMethod;
  submitted_at: string;
}

let posthogPromise: Promise<PostHog | null> | null = null;
let identifiedUserId: string | null = null;
let analyticsEnabled = false;

function sanitizeAttributionValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 64);
  if (!trimmed || !/^[a-zA-Z0-9._ -]+$/.test(trimmed)) return undefined;
  return trimmed;
}

export function getDeviceClass(width: number): DeviceClass {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function getPathGroup(pathname: string): PathGroup {
  if (pathname === "/") return "landing";
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return "auth";
  if (pathname === "/compass") return "compass";
  if (/^\/symbol\/[^/]+$/.test(pathname)) return "company_research";
  if (pathname === "/workspace" || pathname.startsWith("/workspace/")) {
    return "workspace";
  }
  return "other";
}

function currentAttribution(): Attribution {
  try {
    const stored = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Attribution;
      const capturedAt = new Date(parsed.captured_at).getTime();
      if (
        Number.isFinite(capturedAt) &&
        Date.now() - capturedAt <= ATTRIBUTION_MAX_AGE_MS
      ) {
        return parsed;
      }
    }
  } catch {
    // Fall through to a new minimal attribution record.
  }

  const params = new URLSearchParams(window.location.search);
  const source = sanitizeAttributionValue(params.get("utm_source"));
  const medium = sanitizeAttributionValue(params.get("utm_medium"));
  const campaign = sanitizeAttributionValue(params.get("utm_campaign"));
  const externalReferrer = (() => {
    try {
      return Boolean(
        document.referrer &&
          new URL(document.referrer).origin !== window.location.origin
      );
    } catch {
      return false;
    }
  })();

  const attribution: Attribution = {
    source: source ?? (externalReferrer ? "referral" : "direct"),
    medium: medium ?? (externalReferrer ? "referral" : "none"),
    ...(campaign ? { campaign } : {}),
    captured_at: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Analytics remains optional if storage is unavailable.
  }

  return attribution;
}

async function getPostHog(): Promise<PostHog | null> {
  if (readAnalyticsConsent() !== "accepted") return null;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return null;
  if (posthogPromise) {
    const posthog = await posthogPromise;
    if (posthog && !analyticsEnabled) {
      posthog.opt_in_capturing({ captureEventName: false });
      analyticsEnabled = true;
    }
    return posthog;
  }

  posthogPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(token, {
      api_host: POSTHOG_EU_HOST,
      defaults: "2026-05-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_performance: false,
      request_batching: false,
      save_campaign_params: false,
      save_referrer: false,
      ip: false,
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_web_experiments: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      advanced_disable_feature_flags: true,
      person_profiles: "identified_only",
      respect_dnt: true,
      property_denylist: [
        "$current_url",
        "$pathname",
        "$host",
        "$referrer",
        "$referring_domain",
        "$raw_user_agent",
      ],
      before_send: (event) =>
        event && allowedPostHogEvents.has(event.event) ? event : null,
    });
    posthog.opt_in_capturing({ captureEventName: false });
    analyticsEnabled = true;
    return posthog;
  });

  return posthogPromise;
}

function eventDedupeKey(eventName: AcquisitionEventName, scope: DedupeScope) {
  const identity = scope === "visitor" ? identifiedUserId ?? "anonymous" : "session";
  return `${DEDUPE_PREFIX}:${identity}:${eventName}`;
}

function hasSeenEvent(key: string, scope: DedupeScope): boolean {
  if (scope === "none") return false;
  try {
    const storage = scope === "visitor" ? window.localStorage : window.sessionStorage;
    return storage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function markEventSeen(key: string, scope: DedupeScope) {
  if (scope === "none") return;
  try {
    const storage = scope === "visitor" ? window.localStorage : window.sessionStorage;
    storage.setItem(key, "true");
  } catch {
    // Duplicate protection is best effort when storage is unavailable.
  }
}

const defaultDedupeScope: Record<AcquisitionEventName, DedupeScope> = {
  [ACQUISITION_EVENT_NAMES.qualifiedLandingVisit]: "session",
  [ACQUISITION_EVENT_NAMES.signupCtaClicked]: "session",
  [ACQUISITION_EVENT_NAMES.signupFormViewed]: "session",
  [ACQUISITION_EVENT_NAMES.signupSubmitted]: "session",
  [ACQUISITION_EVENT_NAMES.accountConfirmed]: "visitor",
  [ACQUISITION_EVENT_NAMES.firstCompassView]: "visitor",
  [ACQUISITION_EVENT_NAMES.firstResearchAction]: "visitor",
  [ACQUISITION_EVENT_NAMES.sevenDayReturn]: "visitor",
};

export async function trackAcquisitionEvent<Name extends AcquisitionEventName>(
  eventName: Name,
  properties: EventProperties[Name],
  options: { dedupe?: DedupeScope } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const posthog = await getPostHog();
  if (!posthog) return false;

  const eventProperties = properties as Record<string, string>;
  const dedupe = options.dedupe ?? defaultDedupeScope[eventName];
  const dedupeKey = eventDedupeKey(eventName, dedupe);
  if (hasSeenEvent(dedupeKey, dedupe)) return false;

  const attribution = currentAttribution();
  posthog.capture(eventName, {
    schema_version: SCHEMA_VERSION,
    device_class: getDeviceClass(window.innerWidth),
    path_group: getPathGroup(window.location.pathname),
    acquisition_source: attribution.source,
    acquisition_medium: attribution.medium,
    ...(attribution.campaign
      ? { acquisition_campaign: attribution.campaign }
      : {}),
    ...eventProperties,
  });
  markEventSeen(dedupeKey, dedupe);
  return true;
}

export async function identifyAcquisitionUser(userId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const posthog = await getPostHog();
  if (!posthog) return false;
  identifiedUserId = userId;
  posthog.identify(userId);
  return true;
}

export async function resetAcquisitionIdentity(): Promise<void> {
  if (!posthogPromise) return;
  const posthog = await posthogPromise;
  if (!posthog) return;
  posthog.reset(true);
  identifiedUserId = null;
  analyticsEnabled = false;
  if (readAnalyticsConsent() === "accepted") {
    posthog.opt_in_capturing({ captureEventName: false });
    analyticsEnabled = true;
  }
}

export async function optOutAcquisitionAnalytics(): Promise<void> {
  if (!posthogPromise) return;
  const posthog = await posthogPromise;
  posthog?.opt_out_capturing();
  analyticsEnabled = false;
}

export function markSignupSubmitted(authMethod: AuthMethod) {
  if (
    typeof window === "undefined" ||
    readAnalyticsConsent() !== "accepted" ||
    !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  ) {
    return;
  }

  try {
    const pending: PendingSignup = {
      auth_method: authMethod,
      submitted_at: new Date().toISOString(),
    };
    window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
  } catch {
    // Account confirmation can still be measured without anonymous stitching.
  }

  void trackAcquisitionEvent(
    ACQUISITION_EVENT_NAMES.signupSubmitted,
    { auth_method: authMethod }
  );
}

export async function completePendingSignup(userId: string) {
  const identified = await identifyAcquisitionUser(userId);
  if (!identified) return false;

  try {
    const stored = window.localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!stored) return false;
    const pending = JSON.parse(stored) as PendingSignup;
    const submittedAt = new Date(pending?.submitted_at).getTime();
    if (
      !pending ||
      !["email", "google"].includes(pending.auth_method) ||
      !Number.isFinite(submittedAt) ||
      Date.now() - submittedAt > PENDING_SIGNUP_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      return false;
    }

    const captured = await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.accountConfirmed,
      { auth_method: pending.auth_method }
    );
    if (captured) {
      window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      window.localStorage.setItem(
        `${ACCOUNT_CONFIRMED_AT_KEY}:${userId}`,
        new Date().toISOString()
      );
    }
    return captured;
  } catch {
    return false;
  }
}

export async function trackSevenDayReturn(userId: string) {
  try {
    if (identifiedUserId !== userId) return false;
    const confirmedAt = window.localStorage.getItem(
      `${ACCOUNT_CONFIRMED_AT_KEY}:${userId}`
    );
    if (!confirmedAt) return false;
    const elapsed = Date.now() - new Date(confirmedAt).getTime();
    if (!Number.isFinite(elapsed) || elapsed < 7 * 24 * 60 * 60 * 1000) {
      return false;
    }
    return trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.sevenDayReturn,
      {}
    );
  } catch {
    return false;
  }
}
