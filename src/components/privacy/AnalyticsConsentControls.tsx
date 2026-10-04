"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type AnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/analytics/consent";

export function AnalyticsConsentControls() {
  const [consent, setConsent] = useState<AnalyticsConsent | "loading">(
    "loading"
  );

  useEffect(() => {
    queueMicrotask(() => setConsent(readAnalyticsConsent()));
  }, []);

  const updateConsent = (next: Exclude<AnalyticsConsent, "unset">) => {
    writeAnalyticsConsent(next);
    setConsent(next);
  };

  return (
    <div className="not-prose rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Analytics preference: {consent === "loading" ? "Loading" : consent}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => updateConsent("accepted")}>
          Allow analytics
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateConsent("declined")}
        >
          Decline analytics
        </Button>
      </div>
    </div>
  );
}
