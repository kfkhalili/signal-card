import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CookieBanner } from "@/components/layout/CookieBanner";
import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsent,
} from "@/lib/analytics/consent";

describe("CookieBanner analytics choice", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("offers equally explicit accept and decline actions", async () => {
    render(<CookieBanner />);

    expect(
      await screen.findByRole("button", { name: "Accept analytics" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decline analytics" })
    ).toBeInTheDocument();
  });

  it("keeps analytics disabled after decline", async () => {
    render(<CookieBanner />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Decline analytics" })
    );

    await waitFor(() => {
      expect(readAnalyticsConsent()).toBe("declined");
      expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("false");
    });
    expect(
      screen.queryByRole("button", { name: "Accept analytics" })
    ).not.toBeInTheDocument();
  });
});
