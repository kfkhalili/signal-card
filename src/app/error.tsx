"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    // Never expose error details to users - only log server-side or to monitoring service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-semibold mb-4">
              Something Went Wrong
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We encountered an unexpected error. Our team has been notified
              and is working to fix the issue. Please try again or return to
              our financial data platform.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              If this problem persists, please contact our support team:
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

