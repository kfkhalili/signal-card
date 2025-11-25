import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Tickered",
  description:
    "The page you're looking for doesn't exist. Return to Tickered's financial data platform to explore stock analysis, market data, and real-time market feeds.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-primary mb-4">
              404
            </h1>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              The page you're looking for doesn't exist or has been moved.
              Return to our financial data platform to explore stock analysis,
              institutional-grade market data, and real-time market feeds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/symbol">
                <Search className="h-4 w-4 mr-2" />
                Search Stocks
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Need help? Contact our support team:
            </p>
            <a
              href="mailto:support@tickered.com"
              className="text-primary hover:underline text-sm">
              support@tickered.com
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

