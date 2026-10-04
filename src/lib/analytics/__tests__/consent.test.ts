import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/analytics/consent";

describe("analytics consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("is unset until the visitor makes an explicit choice", () => {
    expect(readAnalyticsConsent()).toBe("unset");
  });

  it.each([
    ["accepted", true],
    ["declined", false],
  ] as const)("persists %s and announces the change", (choice, storedValue) => {
    const listener = jest.fn();
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, listener);

    writeAnalyticsConsent(choice);

    expect(readAnalyticsConsent()).toBe(choice);
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe(
      JSON.stringify(storedValue)
    );
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, listener);
  });
});
