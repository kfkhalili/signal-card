"use client";

import { useState, useEffect } from "react";
import { Option } from "effect";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "tickered_cookie_consent";

export function CookieBanner() {
  const [consent, setConsent] = useState<Option.Option<boolean>>(Option.none());

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      // Schedule state update to avoid cascading renders
      queueMicrotask(() => {
        if (storedConsent) {
          setConsent(Option.some(JSON.parse(storedConsent)));
        } else {
          setConsent(Option.some(false));
        }
      });
    } catch {
      // If localStorage is not available (e.g., SSR or private browsing)
      // we can default to not showing the banner until client-side hydration.
      // Schedule state update to avoid cascading renders
      queueMicrotask(() => {
        setConsent(Option.some(false));
      });
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(true));
      setConsent(Option.some(true));
    } catch (error) {
      console.error("Failed to save cookie consent:", error);
    }
  };

  // Show banner only if consent is Some(false) (user hasn't accepted)
  if (Option.isNone(consent) || (Option.isSome(consent) && consent.value === true)) {
    return null;
  }

  return (
    <div key="cookie-banner" className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          <p className="text-sm text-muted-foreground">
            We use cookies and local storage to enhance your experience and
            remember your workspace settings. By continuing to use our site, you
            agree to our{" "}
            <Link href="/cookies" className="underline hover:text-primary">
              Cookie Policy
            </Link>
            .
          </p>
          <div className="flex-shrink-0">
            <Button size="sm" onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}