import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing - Tickered Financial Data Platform",
  description:
    "Flexible pricing plans for accessing Tickered's institutional-grade financial data API, real-time market feeds, and enterprise market services. Start free and scale as you grow.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing - Tickered Financial Data Platform",
    description:
      "Flexible pricing plans for accessing Tickered's institutional-grade financial data API and real-time market feeds.",
    type: "website",
    url: "/pricing",
  },
  twitter: {
    card: "summary",
    title: "Pricing - Tickered",
    description:
      "Flexible pricing plans for accessing Tickered's institutional-grade financial data API and real-time market feeds.",
  },
};

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Flexible Pricing for Every Investor
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Choose the plan that&apos;s right for you. Start for free and scale
            up as you grow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-card p-8 rounded-lg border flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <p className="text-muted-foreground mb-6">
              For individuals starting out
            </p>
            <p className="text-4xl font-bold mb-6">
              $0
              <span className="text-lg font-normal text-muted-foreground">
                /month
              </span>
            </p>
            <ul className="space-y-3 text-muted-foreground flex-grow">
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />1
                Workspace
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Up to 10 active cards
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Standard data updates
              </li>
            </ul>
            <Button className="mt-8 w-full" variant="outline" asChild>
              <Link href="/auth#auth-sign-up">Get Started</Link>
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-card p-8 rounded-lg border-2 border-primary flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-muted-foreground mb-6">
              For serious investors and professionals
            </p>
            <p className="text-4xl font-bold mb-6">
              $15
              <span className="text-lg font-normal text-muted-foreground">
                /month
              </span>
            </p>
            <ul className="space-y-3 text-muted-foreground flex-grow">
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Unlimited Workspaces
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Unlimited active cards
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Real-time data updates
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Advanced analytics
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Priority support
              </li>
            </ul>
            <Button className="mt-8 w-full" asChild>
              <Link href="/auth#auth-sign-up">Choose Pro</Link>
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-card p-8 rounded-lg border flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
            <p className="text-muted-foreground mb-6">
              For teams and organizations
            </p>
            <p className="text-4xl font-bold mb-6">Custom</p>
            <ul className="space-y-3 text-muted-foreground flex-grow">
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                All Pro features
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Team collaboration
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Custom integrations
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Dedicated account manager
              </li>
            </ul>
            <Button className="mt-8 w-full" variant="outline" asChild>
              <a href="mailto:support@tickered.com">Contact Sales</a>
            </Button>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground mt-2">
            For questions about pricing or to discuss custom enterprise solutions, please contact our sales team at{" "}
            <a href="mailto:support@tickered.com" className="text-primary hover:underline">
              support@tickered.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
