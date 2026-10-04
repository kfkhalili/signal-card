const mockPosthog = {
  init: jest.fn(),
  opt_in_capturing: jest.fn(),
  opt_out_capturing: jest.fn(),
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
};

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: mockPosthog,
}));

import {
  ACQUISITION_EVENT_NAMES,
  completePendingSignup,
  getDeviceClass,
  getPathGroup,
  identifyAcquisitionUser,
  markSignupSubmitted,
  optOutAcquisitionAnalytics,
  trackAcquisitionEvent,
  trackSevenDayReturn,
} from "@/lib/analytics/acquisition";
import { writeAnalyticsConsent } from "@/lib/analytics/consent";

const forbiddenPropertyNames = new Set([
  "email",
  "name",
  "symbol",
  "ticker",
  "company",
  "price",
  "financial_value",
  "provider_payload",
  "portfolio",
  "research",
  "$current_url",
  "$pathname",
  "$referrer",
]);

describe("acquisition analytics", () => {
  const originalToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test_token";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = originalToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/?utm_source=search&utm_medium=cpc");
  });

  it("reduces routes and devices to non-sensitive categories", () => {
    expect(getPathGroup("/symbol/SECRET")).toBe("company_research");
    expect(getPathGroup("/compass")).toBe("compass");
    expect(getPathGroup("/unknown/details")).toBe("other");
    expect(getDeviceClass(390)).toBe("mobile");
    expect(getDeviceClass(768)).toBe("tablet");
    expect(getDeviceClass(1440)).toBe("desktop");
  });

  it("fails closed before consent", async () => {
    const captured = await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.qualifiedLandingVisit,
      {}
    );

    expect(captured).toBe(false);
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });

  it("captures the complete signup-to-activation funnel once without sensitive properties", async () => {
    writeAnalyticsConsent("accepted");

    await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.qualifiedLandingVisit,
      {}
    );
    await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.signupCtaClicked,
      { cta_location: "hero" }
    );
    await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.signupFormViewed,
      {}
    );
    await markSignupSubmitted("email");
    await completePendingSignup("00000000-0000-4000-8000-000000000001");
    await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.firstCompassView,
      {}
    );
    await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.firstResearchAction,
      { research_action: "company_opened" }
    );

    await trackAcquisitionEvent(
      ACQUISITION_EVENT_NAMES.firstResearchAction,
      { research_action: "workspace_added" }
    );

    const capturedNames = mockPosthog.capture.mock.calls.map(([name]) => name);
    expect(capturedNames).toEqual([
      ACQUISITION_EVENT_NAMES.qualifiedLandingVisit,
      ACQUISITION_EVENT_NAMES.signupCtaClicked,
      ACQUISITION_EVENT_NAMES.signupFormViewed,
      ACQUISITION_EVENT_NAMES.signupSubmitted,
      ACQUISITION_EVENT_NAMES.accountConfirmed,
      ACQUISITION_EVENT_NAMES.firstCompassView,
      ACQUISITION_EVENT_NAMES.firstResearchAction,
    ]);

    for (const [, properties] of mockPosthog.capture.mock.calls) {
      expect(Object.keys(properties)).toEqual(
        expect.arrayContaining([
          "schema_version",
          "device_class",
          "path_group",
          "acquisition_source",
          "acquisition_medium",
        ])
      );
      for (const property of Object.keys(properties)) {
        expect(forbiddenPropertyNames).not.toContain(property);
      }
    }
  });

  it("only identifies a valid opaque account id", async () => {
    writeAnalyticsConsent("accepted");

    expect(await identifyAcquisitionUser("person@example.com")).toBe(false);
    expect(
      await identifyAcquisitionUser("00000000-0000-4000-8000-000000000002")
    ).toBe(true);
    expect(mockPosthog.identify).toHaveBeenCalledTimes(1);
    expect(mockPosthog.identify).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000002"
    );
  });

  it("resumes capture after consent is withdrawn and granted again", async () => {
    writeAnalyticsConsent("declined");
    await optOutAcquisitionAnalytics();
    writeAnalyticsConsent("accepted");

    expect(
      await trackAcquisitionEvent(
        ACQUISITION_EVENT_NAMES.signupFormViewed,
        {}
      )
    ).toBe(true);
    expect(mockPosthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(mockPosthog.capture).toHaveBeenCalledWith(
      ACQUISITION_EVENT_NAMES.signupFormViewed,
      expect.any(Object)
    );
  });

  it("emits the seven-day return once after the waiting period", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T00:00:00Z"));
    writeAnalyticsConsent("accepted");
    await markSignupSubmitted("google");
    await completePendingSignup("00000000-0000-4000-8000-000000000003");

    expect(
      await trackSevenDayReturn("00000000-0000-4000-8000-000000000003")
    ).toBe(false);
    jest.setSystemTime(new Date("2026-10-09T00:00:00Z"));
    expect(
      await trackSevenDayReturn("00000000-0000-4000-8000-000000000003")
    ).toBe(true);
    expect(
      await trackSevenDayReturn("00000000-0000-4000-8000-000000000003")
    ).toBe(false);
    expect(
      mockPosthog.capture.mock.calls.filter(
        ([name]) => name === ACQUISITION_EVENT_NAMES.sevenDayReturn
      )
    ).toHaveLength(1);

    jest.useRealTimers();
  });
});
