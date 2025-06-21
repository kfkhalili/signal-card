export default function PrivacyPage() {
  const lastUpdated = "June 21, 2025";

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
              This is a placeholder for the Tickered Privacy Policy. This
              document will explain how we collect, use, and protect your
              personal information when you use our services.
            </p>

            <h2 className="!text-2xl !font-semibold">
              1. Information We Collect
            </h2>
            <p>
              This section will detail the types of information we collect, such
              as account information (email, password), user-generated content
              (custom cards, workspace layouts), and usage data (interactions
              with the platform).
            </p>

            <h2 className="!text-2xl !font-semibold">
              2. How We Use Your Information
            </h2>
            <p>
              Here, we will describe how we use the collected information to
              provide and improve our services, personalize your experience,
              communicate with you, and for security purposes.
            </p>

            <h2 className="!text-2xl !font-semibold">3. Data Security</h2>
            <p>
              This part will outline the security measures we implement to
              protect your data, including encryption, access controls, and our
              partnership with Supabase.
            </p>

            <h2 className="!text-2xl !font-semibold">
              4. Your Rights and Choices
            </h2>
            <p>
              This section will inform you of your rights regarding your
              personal data, such as accessing, correcting, or deleting your
              information.
            </p>

            <h2 className="!text-2xl !font-semibold">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, this section
              will provide our contact information.
            </p>

            <div className="bg-card border p-6 rounded-md text-center mt-12">
              <h3 className="font-bold text-lg">
                This is not a legal document.
              </h3>
              <p className="text-muted-foreground text-sm">
                The content on this page is for placeholder purposes only and
                should not be considered a legally binding privacy policy.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
