export default function CookiesPage() {
  const lastUpdated = "June 21, 2025";

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
              This is a placeholder for the Tickered Cookie Policy. This
              document explains what cookies are, how we use them on
              tickered.com, and your choices regarding cookies.
            </p>

            <h2 className="!text-2xl !font-semibold">1. What Are Cookies?</h2>
            <p>
              This section will provide a general explanation of cookies, which
              are small text files stored on your device to help a website
              remember information about your visit.
            </p>

            <h2 className="!text-2xl !font-semibold">2. How We Use Cookies</h2>
            <p>
              Here, we will detail our use of cookies for essential functions
              (like keeping you logged in), performance analytics (to understand
              how our service is used), and preferences (to remember your
              settings).
            </p>

            <h2 className="!text-2xl !font-semibold">
              3. Types of Cookies We Use
            </h2>
            <p>
              This part will break down the specific types of cookies used, such
              as &apos;Session Cookies&apos; and &apos;Persistent Cookies&apos;,
              and distinguish between first-party and third-party cookies.
            </p>

            <h2 className="!text-2xl !font-semibold">4. Your Choices</h2>
            <p>
              This section will explain how you can control and manage cookies
              through your browser settings and any other tools we might
              provide.
            </p>

            <div className="bg-card border p-6 rounded-md text-center mt-12">
              <h3 className="font-bold text-lg">
                This is not a legal document.
              </h3>
              <p className="text-muted-foreground text-sm">
                The content on this page is for placeholder purposes only and
                should not be considered a legally binding policy.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
