import type { Metadata } from "next";
import { Shield, Zap, BarChart3, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Features - Tickered Financial Data Platform",
  description:
    "Discover Tickered's powerful features: institutional-grade financial data API, real-time market feeds, interactive data visualization, and enterprise market services for modern investors.",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    title: "Features - Tickered Financial Data Platform",
    description:
      "Discover Tickered's powerful features: institutional-grade financial data API, real-time market feeds, and interactive data visualization.",
    type: "website",
    url: "/features",
  },
  twitter: {
    card: "summary",
    title: "Features - Tickered",
    description:
      "Discover Tickered's powerful features: institutional-grade financial data API, real-time market feeds, and interactive data visualization.",
  },
};

export default function FeaturesPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Features Built for Modern Investors
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Discover how Tickered transforms complex financial data into an
            interactive, digestible, and powerful experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Real-time Data</h3>
            </div>
            <p className="text-muted-foreground">
              This page will detail the real-time data capabilities of Tickered,
              including live market data, financial information updates, and the
              technology that powers it.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Dual Audience Focus</h3>
            </div>
            <p className="text-muted-foreground">
              This section will explain how Tickered is designed to be both
              simple enough for beginners and powerful enough for professional
              investors, with features tailored to each audience.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Secure & Reliable</h3>
            </div>
            <p className="text-muted-foreground">
              Here, we&apos;ll outline the enterprise-grade security, data
              privacy measures, and high uptime that make Tickered a trustworthy
              platform for your financial analysis.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Interactive Cards</h3>
            </div>
            <p className="text-muted-foreground">
              A deep dive into our core &quot;Card&quot; system. This will
              showcase the different card types, how they are interactive, and
              how users can build their own dashboards.
            </p>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground mt-2">
            Explore our platform to experience these features firsthand. For detailed information about enterprise features and API integration, contact{" "}
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
