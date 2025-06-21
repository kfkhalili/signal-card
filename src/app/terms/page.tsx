export default function TermsPage() {
  const lastUpdated = "June 21, 2025";

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
              This is a placeholder for the Tickered Terms of Service. This
              document will outline the rules and regulations for the use of
              Tickered&apos;s Website, located at tickered.com.
            </p>

            <h2 className="!text-2xl !font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing this website, we assume you accept these terms and
              conditions. This section will detail the binding nature of this
              agreement.
            </p>

            <h2 className="!text-2xl !font-semibold">
              2. License to Use Website
            </h2>
            <p>
              This section will describe the license granted to users to view
              and use the content and services provided on the platform, subject
              to the restrictions outlined in these terms.
            </p>

            <h2 className="!text-2xl !font-semibold">
              3. User Responsibilities
            </h2>
            <p>
              Here, we will detail user responsibilities, including maintaining
              the confidentiality of their account and not using the platform
              for any unlawful purpose.
            </p>

            <h2 className="!text-2xl !font-semibold">
              4. Limitation of Liability
            </h2>
            <p>
              This clause will clarify that the information on Tickered is for
              informational purposes only and should not be considered financial
              advice. We are not liable for any investment decisions made based
              on the data.
            </p>

            <h2 className="!text-2xl !font-semibold">5. Governing Law</h2>
            <p>
              This section will specify the jurisdiction and laws that govern
              these terms.
            </p>

            <div className="bg-card border p-6 rounded-md text-center mt-12">
              <h3 className="font-bold text-lg">
                This is not a legal document.
              </h3>
              <p className="text-muted-foreground text-sm">
                The content on this page is for placeholder purposes only and
                should not be considered a legally binding agreement.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
