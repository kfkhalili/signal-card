import { readFileSync } from "node:fs";
import path from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("acquisition funnel baseline contract", () => {
  it("routes public signup calls to the sign-up view", () => {
    const landing = readSource("src/app/page.tsx");
    const header = readSource("src/components/layout/Header.tsx");
    const demo = readSource("src/components/landing/DemoCardsGrid.tsx");

    expect(landing).toContain('href="/auth#auth-sign-up"');
    expect(header).toContain('href="/auth#auth-sign-up"');
    expect(header).toContain('href="/auth#auth-sign-in"');
    expect(demo).toContain('router.push("/auth#auth-sign-up")');
  });

  it("offers email/password and Google authentication", () => {
    const authForm = readSource("src/app/auth/AuthForm.tsx");

    expect(authForm).toContain("providers={['google']}");
    expect(authForm).toContain('email_label: "Email address"');
    expect(authForm).toContain('password_label: "Password"');
    expect(authForm).toContain('password_label: "Create a Password"');
  });

  it("freezes the current destination hand-offs", () => {
    const landing = readSource("src/app/page.tsx");
    const authForm = readSource("src/app/auth/AuthForm.tsx");
    const completeProfile = readSource(
      "src/app/auth/complete-profile/page.tsx"
    );

    expect(landing).toContain('router.push("/compass")');
    expect(authForm).toContain(
      'redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`}'
    );
    expect(completeProfile).toContain("router.push('/workspace')");
  });

  it("freezes pathname-only preservation for protected-route redirects", () => {
    const proxy = readSource("src/proxy.ts");

    expect(proxy).toContain('url.searchParams.set("next", pathname)');
    expect(proxy).toContain(
      'url.searchParams.set("message", "Please log in to access this page.")'
    );
  });

  it("wires each acquisition milestone to the real funnel surfaces", () => {
    const landing = readSource("src/app/page.tsx");
    const header = readSource("src/components/layout/Header.tsx");
    const demo = readSource("src/components/landing/DemoCardsGrid.tsx");
    const authForm = readSource("src/app/auth/AuthForm.tsx");
    const analyticsProvider = readSource(
      "src/components/providers/AcquisitionAnalytics.tsx"
    );
    const compass = readSource("src/app/compass/page.tsx");
    const company = readSource("src/app/symbol/[ticker]/page.tsx");

    expect(landing).toContain("ACQUISITION_EVENT_NAMES.signupCtaClicked");
    expect(header).toContain("ACQUISITION_EVENT_NAMES.signupCtaClicked");
    expect(demo).toContain("ACQUISITION_EVENT_NAMES.signupCtaClicked");
    expect(authForm).toContain("ACQUISITION_EVENT_NAMES.signupFormViewed");
    expect(authForm).toContain("markSignupSubmitted");
    expect(analyticsProvider).toContain("completePendingSignup");
    expect(analyticsProvider).toContain(
      "ACQUISITION_EVENT_NAMES.firstCompassView"
    );
    expect(analyticsProvider).toContain(
      "ACQUISITION_EVENT_NAMES.firstResearchAction"
    );
    expect(compass).toContain('research_action: "workspace_added"');
    expect(company).toContain('research_action: "workspace_added"');
  });
});
