import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Tickered Financial Data Platform",
  description:
    "Tickered Privacy Policy. Learn how we collect, use, and protect your information when using our financial data API, real-time market feeds, and enterprise market services platform.",
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Privacy Policy - Tickered",
    description:
      "Learn how Tickered protects your privacy and handles your data when using our financial data platform and API services.",
    type: "website",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Last Updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-8 prose prose-lg dark:prose-invert max-w-none">
            <p>
              Tickered (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when
              you use our financial data platform and services, including our
              website, API, and related services (collectively, the
              &quot;Service&quot;).
            </p>

            <h2 className="!text-2xl !font-semibold">
              1. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us, including:
              account registration information (email address, username, password),
              user-generated content (custom financial cards, workspace
              configurations, dashboard layouts), and profile information. We also
              automatically collect usage data, including your interactions with
              the platform, API usage patterns, and device information. When you
              access our real-time market data feeds and institutional-grade
              financial data services, we may collect information about your data
              requests and usage patterns.
            </p>

            <h2 className="!text-2xl !font-semibold">
              2. How We Use Your Information
            </h2>
            <p>
              We use the information we collect to provide, maintain, and improve
              our Service, including delivering real-time market data feeds,
              processing API integration requests, and personalizing your
              experience. We use your information to communicate with you about
              your account, service updates, and important notices. We also use
              collected data for security purposes, fraud prevention, and to comply
              with legal obligations. Your information helps us optimize our
              financial data delivery infrastructure and ensure reliable access to
              institutional-grade market data.
            </p>

            <h2 className="!text-2xl !font-semibold">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your
              information, including encryption in transit and at rest, secure
              authentication protocols, and access controls. Our infrastructure
              uses enterprise-grade security practices to safeguard financial data
              and personal information. We partner with trusted service providers,
              including Supabase, who maintain robust security standards. However,
              no method of transmission over the Internet or electronic storage is
              100% secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="!text-2xl !font-semibold">
              4. Your Rights and Choices
            </h2>
            <p>
              You have the right to access, correct, update, or delete your
              personal information at any time through your account settings. You
              may request a copy of your data or request that we delete your
              account and associated data. You can opt out of certain
              communications by following the unsubscribe instructions in our
              emails. If you are located in certain jurisdictions, you may have
              additional rights under applicable data protection laws, including
              the right to data portability and the right to object to certain
              processing activities.
            </p>

            <h2 className="!text-2xl !font-semibold">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at{" "}
              <a
                href="mailto:support@tickered.com"
                className="text-primary hover:underline">
                support@tickered.com
              </a>
              . We will respond to your inquiry within a reasonable timeframe.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
