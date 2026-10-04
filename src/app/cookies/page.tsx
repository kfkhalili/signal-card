import type { Metadata } from "next";
import { AnalyticsConsentControls } from "@/components/privacy/AnalyticsConsentControls";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Cookie Policy - Tickered Financial Data Platform",
  description:
    "Tickered Cookie Policy. Learn about how we use cookies on our financial data platform, API services, and real-time market data feeds.",
  alternates: {
    canonical: "/cookies",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Cookie Policy - Tickered",
    description:
      "Learn about how Tickered uses cookies on our financial data platform and API services.",
    type: "website",
    url: "/cookies",
  },
};

export default function CookiesPage() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Cookie Policy
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Last Updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-8 prose prose-lg dark:prose-invert max-w-none">
            <p>
              This Cookie Policy explains what cookies are, how Tickered uses
              cookies and similar technologies on our website and platform, and
              your choices regarding cookies. Optional analytics are disabled
              unless you explicitly allow them.
            </p>

            <h2 className="!text-2xl !font-semibold">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you
              visit a website. They are widely used to make websites work more
              efficiently and provide information to website owners. Cookies allow
              websites to recognize your device and remember information about your
              visit, such as your preferences and settings.
            </p>

            <h2 className="!text-2xl !font-semibold">2. How We Use Cookies</h2>
            <p>
              Essential cookies and local storage maintain your authentication
              session, remember product settings, and protect the Service. With
              your permission, Tickered also records a small signup funnel so we
              can understand whether visitors reach a useful first research
              action.
            </p>

            <h2 className="!text-2xl !font-semibold">
              3. Types of Cookies We Use
            </h2>
            <p>
              We use both session cookies, which are temporary and deleted when you
              close your browser, and persistent cookies, which remain on your
              device for a set period or until you delete them. We primarily use
              first-party cookies, which are set directly by Tickered. If you
              allow analytics, we use PostHog&apos;s EU service for eight defined
              acquisition events. Analytics do not include names, email
              addresses, symbols, company names, portfolio contents, financial
              values, provider payloads, or free-form research.
            </p>

            <h2 className="!text-2xl !font-semibold">4. Your Choices</h2>
            <p>
              You can allow or withdraw optional analytics at any time below.
              Declining analytics does not disable the product. Browser settings
              can also remove essential cookies and local storage, but doing so
              may sign you out or reset saved product preferences.
            </p>

            <AnalyticsConsentControls />
          </div>
        </div>
      </main>
    </div>
  );
}
