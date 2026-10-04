"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACQUISITION_EVENT_NAMES,
  completePendingSignup,
  identifyAcquisitionUser,
  optOutAcquisitionAnalytics,
  resetAcquisitionIdentity,
  trackAcquisitionEvent,
  trackSevenDayReturn,
} from "@/lib/analytics/acquisition";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  readAnalyticsConsent,
} from "@/lib/analytics/consent";

export function AcquisitionAnalytics() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const previousUserId = useRef<string | null>(null);

  const captureCurrentStep = useCallback(async () => {
    if (readAnalyticsConsent() !== "accepted" || isLoading) return;

    if (user) {
      await identifyAcquisitionUser(user.id);
      await completePendingSignup(user.id);
      await trackSevenDayReturn(user.id);

      if (pathname === "/compass") {
        await trackAcquisitionEvent(
          ACQUISITION_EVENT_NAMES.firstCompassView,
          {}
        );
      } else if (/^\/symbol\/[^/]+$/.test(pathname)) {
        await trackAcquisitionEvent(
          ACQUISITION_EVENT_NAMES.firstResearchAction,
          { research_action: "company_opened" }
        );
      }
      return;
    }

    if (pathname === "/") {
      await trackAcquisitionEvent(
        ACQUISITION_EVENT_NAMES.qualifiedLandingVisit,
        {}
      );
    }
  }, [isLoading, pathname, user]);

  useEffect(() => {
    const priorUserId = previousUserId.current;
    if (priorUserId && !user) {
      void resetAcquisitionIdentity();
    }
    previousUserId.current = user?.id ?? null;
    void captureCurrentStep();
  }, [captureCurrentStep, user]);

  useEffect(() => {
    const handleConsentChange = () => {
      if (readAnalyticsConsent() === "accepted") {
        void captureCurrentStep();
      } else {
        void optOutAcquisitionAnalytics();
      }
    };

    window.addEventListener(
      ANALYTICS_CONSENT_CHANGED_EVENT,
      handleConsentChange
    );
    return () => {
      window.removeEventListener(
        ANALYTICS_CONSENT_CHANGED_EVENT,
        handleConsentChange
      );
    };
  }, [captureCurrentStep]);

  return null;
}
