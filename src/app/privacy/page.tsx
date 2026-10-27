import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Tickered",
  description:
    "Learn how Tickered collects, uses, and protects information when you use our website and investment-research tools.",
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
      "Learn how Tickered protects your privacy and handles data when you use our website and investment-research tools.",
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
              you use our website and investment-research tools (collectively,
              the &quot;Service&quot;).
            </p>

            <h2 className="!text-2xl !font-semibold">
              1. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us, including:
              account registration information (such as your email address,
              username, and profile information) and content you save in the
              Service, such as workspace configurations. We also automatically
              collect technical and usage information needed to operate and
              secure the Service, including device information and interactions
              with product features.
            </p>
            <p>
              Optional acquisition analytics are disabled unless you consent.
              When enabled, the analytics contract excludes names, email
              addresses, symbols, company names, portfolio contents, financial
              values, provider payloads, and free-form research.
            </p>

            <h2 className="!text-2xl !font-semibold">
              2. How We Use Your Information
            </h2>
            <p>
              We use the information we collect to provide, maintain, and improve
              our Service and personalize your experience. We use your
              information to communicate with you about your account, service
              updates, and important notices. We also use collected data for
              security, fraud prevention, troubleshooting, and compliance with
              legal obligations.
            </p>

            <h2 className="!text-2xl !font-semibold">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your
              information, including authentication and access controls. We work
              with service providers, including Supabase, to operate the Service.
              However, no method of transmission over the Internet or electronic
              storage is 100% secure, and we cannot guarantee absolute security.
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
