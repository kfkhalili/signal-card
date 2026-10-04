"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  type AnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/analytics/consent";

export function CookieBanner() {
  const [consent, setConsent] = useState<AnalyticsConsent | "loading">(
    "loading"
  );

  useEffect(() => {
    queueMicrotask(() => setConsent(readAnalyticsConsent()));
  }, []);

  const handleAccept = () => {
    try {
      writeAnalyticsConsent("accepted");
      setConsent("accepted");
    } catch (error) {
      console.error("Failed to save cookie consent:", error);
    }
  };

  const handleDecline = () => {
    try {
      writeAnalyticsConsent("declined");
      setConsent("declined");
    } catch (error) {
      console.error("Failed to save cookie consent:", error);
    }
  };

  if (consent !== "unset") {
    return null;
  }

  return (
    <div key="cookie-banner" className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm text-muted-foreground">
            Tickered uses essential local storage for the product. With your
            permission, we also collect a small set of privacy-safe signup-funnel
            events. We do not send financial values, research, names, or email
            addresses. Read our{" "}
            <Link href="/cookies" className="underline hover:text-primary">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="flex w-full flex-shrink-0 gap-2 sm:w-auto">
            <Button size="sm" variant="outline" onClick={handleDecline}>
              Decline analytics
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Accept analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
