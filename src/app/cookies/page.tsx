import type { Metadata } from "next";

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
              your choices regarding cookies. By using our Service, you consent
              to the use of cookies in accordance with this policy.
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
              We use cookies for several essential purposes: to maintain your
              authentication session and keep you logged in securely, to remember
              your preferences and settings (such as workspace configurations and
              dashboard layouts), to analyze how our Service is used and improve
              performance, and to ensure the security and integrity of our
              financial data platform. Cookies help us deliver personalized
              experiences and maintain the reliability of our real-time market data
              feeds and API services.
            </p>

            <h2 className="!text-2xl !font-semibold">
              3. Types of Cookies We Use
            </h2>
            <p>
              We use both session cookies, which are temporary and deleted when you
              close your browser, and persistent cookies, which remain on your
              device for a set period or until you delete them. We primarily use
              first-party cookies, which are set directly by Tickered. We may also
              use third-party cookies from trusted service providers who help us
              deliver and improve our Service. These cookies are used for
              authentication, security, analytics, and functionality purposes.
            </p>

            <h2 className="!text-2xl !font-semibold">4. Your Choices</h2>
            <p>
              You can control and manage cookies through your browser settings.
              Most browsers allow you to refuse cookies or delete existing cookies.
              However, please note that disabling cookies may affect the
              functionality of our Service, including your ability to access
              certain features, maintain your login session, and receive
              personalized content. Some features of our financial data platform
              and API integration services may require cookies to function
              properly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
