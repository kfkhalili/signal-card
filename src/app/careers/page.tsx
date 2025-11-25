import type { Metadata } from "next";
import { Briefcase, Building, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers - Join Tickered",
  description:
    "Join Tickered and help build the future of financial analysis. We're creating a more accessible and powerful platform for investors with institutional-grade financial data API and real-time market feeds.",
  alternates: {
    canonical: "/careers",
  },
  openGraph: {
    title: "Careers - Join Tickered",
    description:
      "Join Tickered and help build the future of financial analysis with institutional-grade financial data API and real-time market feeds.",
    type: "website",
    url: "/careers",
  },
  twitter: {
    card: "summary",
    title: "Careers - Join Tickered",
    description:
      "Join Tickered and help build the future of financial analysis with institutional-grade financial data API and real-time market feeds.",
  },
};

export default function CareersPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Join the Tickered Team
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            We&apos;re building the future of financial analysis. Help us create
            a more accessible and powerful platform for investors everywhere.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-card p-8 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Why Work With Us?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
            <div>
              <Briefcase className="h-10 w-10 text-primary mx-auto mb-3" />
              <h4 className="font-semibold">Meaningful Work</h4>
              <p className="text-sm text-muted-foreground">
                Democratize financial data for everyone.
              </p>
            </div>
            <div>
              <Users className="h-10 w-10 text-primary mx-auto mb-3" />
              <h4 className="font-semibold">Great Team</h4>
              <p className="text-sm text-muted-foreground">
                Collaborate with a passionate, talented crew.
              </p>
            </div>
            <div>
              <Building className="h-10 w-10 text-primary mx-auto mb-3" />
              <h4 className="font-semibold">Growth Opportunity</h4>
              <p className="text-sm text-muted-foreground">
                Be part of a fast-growing, early-stage startup.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold">No Open Positions Currently</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            We are not actively hiring at the moment, but we&apos;re always
            interested in connecting with talented people. Feel free to reach
            out through our contact page.
          </p>
        </div>
      </main>
    </div>
  );
}
