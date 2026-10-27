import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Terms of Service - Tickered",
  description:
    "Read the terms and conditions for using Tickered's website and investment-research tools.",
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Terms of Service - Tickered",
    description:
      "Terms and conditions for using Tickered's website and investment-research tools.",
    type: "website",
    url: "/terms",
  },
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Last Updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-8 prose prose-lg dark:prose-invert max-w-none">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of Tickered&apos;s website and investment-research tools
              (collectively, the &quot;Service&quot;)
              operated by Tickered (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;). By accessing or using our Service, you agree to be
              bound by these Terms. If you disagree with any part of these Terms,
              you may not access the Service.
            </p>

            <h2 className="!text-2xl !font-semibold">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing our website, or using our
              research tools, you acknowledge that you have read,
              understood, and agree to be bound by these Terms and our Privacy
              Policy. These Terms constitute a legally binding agreement between
              you and Tickered. If you are using the Service on behalf of an
              organization, you represent that you have authority to bind that
              organization to these Terms.
            </p>

            <h2 className="!text-2xl !font-semibold">
              2. License to Use Service
            </h2>
            <p>
              Subject to your compliance with these Terms, we grant you a limited,
              non-exclusive, non-transferable, revocable license to access and use
              our Service for your personal use. This license includes access to
              the research and visualization tools made available through the
              Service. You may not resell, redistribute, or commercially exploit
              data or content obtained through our Service without explicit
              written permission.
            </p>

            <h2 className="!text-2xl !font-semibold">
              3. User Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You agree to use the Service only for lawful purposes and
              in accordance with these Terms. You must not use the Service to
              violate any applicable laws, infringe upon the rights of others, or
              transmit any harmful code or malicious software. You are responsible
              for ensuring that your use of the Service complies with all
              applicable regulations and does not violate third-party rights.
            </p>

            <h2 className="!text-2xl !font-semibold">
              4. Limitation of Liability
            </h2>
            <p>
              The information, data, and content provided through our Service,
              are for informational and research purposes only and do not
              constitute financial, investment, or trading advice. Information
              may be delayed, incomplete, or inaccurate. We are not a registered
              investment advisor, broker-dealer, or financial planner. You should
              consult qualified financial professionals before making investment
              decisions. To the maximum extent permitted by law, Tickered shall
              not be liable for any indirect, incidental, special, consequential,
              or punitive damages arising from your use of the Service or reliance
              on information provided through the Service.
            </p>

            <h2 className="!text-2xl !font-semibold">5. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of Germany, without regard to its conflict of law
              provisions. Any disputes arising from these Terms or your use of the
              Service shall be resolved in the appropriate courts located in
              Germany. If any provision of these Terms is found to be
              unenforceable, the remaining provisions shall remain in full force
              and effect.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
