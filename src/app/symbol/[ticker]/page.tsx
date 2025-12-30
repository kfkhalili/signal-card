"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Option } from "effect";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, AlertTriangle, PlusCircle, Loader2,
} from "lucide-react";
import { useAddCardToWorkspace } from "@/hooks/useAddCardToWorkspace";
import { useWorkspaceCards, removeSymbolFromWorkspace } from "@/hooks/useWorkspaceCards";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useSymbolValidation } from "@/hooks/useSymbolValidation";
import { useSymbolAnalysisData } from "@/hooks/useSymbolAnalysisData";
import { useSymbolMetrics } from "@/hooks/useSymbolMetrics";
import {
  calculateValuationStatus,
  calculateQualityStatus,
  calculateSafetyStatus,
  calculateContrarianIndicatorsStatus,
} from "@/lib/symbol-analysis/statusCalculations";
import { SymbolHeroSection } from "@/components/symbol-analysis/SymbolHeroSection";
import { ValuationCard } from "@/components/symbol-analysis/ValuationCard";
import { QualityCard } from "@/components/symbol-analysis/QualityCard";
import { SafetyCard } from "@/components/symbol-analysis/SafetyCard";
import { InsiderActivityCard } from "@/components/symbol-analysis/InsiderActivityCard";
import { InstitutionalHoldingsCard } from "@/components/symbol-analysis/InstitutionalHoldingsCard";
import { ContrarianIndicatorsCard } from "@/components/symbol-analysis/ContrarianIndicatorsCard";

export default function SymbolAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string)?.toUpperCase() || "";
  const { addCard } = useAddCardToWorkspace();
  const [addingToWorkspace, setAddingToWorkspace] = useState(false);
  const [removingFromWorkspace, setRemovingFromWorkspace] = useState(false);
  const { hasCards: hasCardsInWorkspace } = useWorkspaceCards(ticker);
  const exchangeRates = useExchangeRate();
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router, hasMounted]);

  // Validate symbol
  const symbolValid = useSymbolValidation(ticker);

  // Fetch all data
  const data = useSymbolAnalysisData(ticker, symbolValid);

  // Calculate metrics
  const {
    valuationMetrics,
    qualityMetrics,
    safetyMetrics,
    insiderActivity,
    contrarianIndicators,
    analystConsensus,
  } = useSymbolMetrics(data);

  // Determine relevant cards based on data shown on this page
  const relevantCardTypes = useMemo((): CardType[] => {
    const cardTypes: CardType[] = ["profile", "price", "keyratios"];

    // Add financial statement cards if we have financial data
    if (Option.isSome(data.financialStatement)) {
      cardTypes.push("revenue", "solvency", "cashuse");
    }

    // Add analyst grades if we have grades data
    if (data.gradesHistorical.length > 0) {
      cardTypes.push("analystgrades");
    }

    return cardTypes;
  }, [data.financialStatement, data.gradesHistorical]);

  // Don't render page content until symbol is validated
  if (symbolValid === null) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating symbol...</p>
        </div>
      </div>
    );
  }

  // Show not-found UI if symbol is invalid
  if (symbolValid === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-semibold text-destructive">
              Symbol Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The symbol <strong className="text-foreground">{ticker}</strong> is not available in our database.
            </p>
            <p className="text-sm text-muted-foreground">
              This symbol may not be listed, may have been delisted, or may not be supported at this time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild variant="default">
                <Link href="/compass">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Compass
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Go to Homepage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddToWorkspace = async () => {
    setAddingToWorkspace(true);
    try {
      await addCard(ticker, relevantCardTypes);
    } finally {
      setAddingToWorkspace(false);
    }
  };

  const handleRemoveFromWorkspace = async () => {
    setRemovingFromWorkspace(true);
    try {
      removeSymbolFromWorkspace(ticker);
    } finally {
      setRemovingFromWorkspace(false);
    }
  };

  // Calculate health statuses
  const valuationStatus = calculateValuationStatus(
    valuationMetrics.currentPrice,
    valuationMetrics.dcfFairValue,
    valuationMetrics.peRatio,
    valuationMetrics.pegRatio
  );
  const qualityStatus = calculateQualityStatus(
    qualityMetrics.roic,
    qualityMetrics.wacc,
    qualityMetrics.grossMargin,
    qualityMetrics.fcfYield,
    qualityMetrics.roicHistory
  );
  const safetyStatus = calculateSafetyStatus(
    safetyMetrics.netDebtToEbitda,
    safetyMetrics.altmanZScore,
    safetyMetrics.interestCoverage
  );
  const contrarianStatus = calculateContrarianIndicatorsStatus(
    contrarianIndicators.analystConsensus,
    contrarianIndicators.priceTarget,
    valuationMetrics.currentPrice
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* --- TOP BAR: NAVIGATION --- */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {hasCardsInWorkspace ? (
          <Button
            onClick={handleRemoveFromWorkspace}
            disabled={removingFromWorkspace}
            size="sm"
            variant="destructive"
            className="gap-2"
          >
            {removingFromWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Remove from Workspace
          </Button>
        ) : (
          <Button onClick={handleAddToWorkspace} disabled={addingToWorkspace} size="sm" className="gap-2">
            {addingToWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Add to Workspace
          </Button>
        )}
      </div>

      {/* --- ZONE A: THE HERO (THESIS & CONTEXT) --- */}
      <SymbolHeroSection
        ticker={ticker}
        profile={data.profile}
        quote={data.quote}
        exchangeRates={exchangeRates}
        valuationStatus={valuationStatus}
        safetyStatus={safetyStatus}
        qualityStatus={qualityStatus}
        analystConsensus={analystConsensus}
      />

      {/* --- MAIN GRID LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- ZONE B: THE THESIS BUILDER (LEFT COL - 66%) --- */}
        <div className="lg:col-span-2 space-y-6">
          {/* B1. Valuation & Intrinsic Value */}
          <ValuationCard
            valuationMetrics={valuationMetrics}
            valuationStatus={valuationStatus}
            exchangeRates={exchangeRates}
          />

          {/* B2. Quality & Moat */}
          <QualityCard
            qualityMetrics={qualityMetrics}
            qualityStatus={qualityStatus}
          />

          {/* B3. Financial Safety */}
          <SafetyCard
            safetyMetrics={safetyMetrics}
            safetyStatus={safetyStatus}
          />
        </div>

        {/* --- ZONE C: SMART MONEY & SENTIMENT (RIGHT COL - 33%) --- */}
        <div className="space-y-6">
          {/* C1. Insider Trading */}
          <InsiderActivityCard
            insiderActivity={insiderActivity}
            exchangeRates={exchangeRates}
          />

          {/* C2. Institutional Holdings */}
          <InstitutionalHoldingsCard />

          {/* C3. Risk/Shorts */}
          <ContrarianIndicatorsCard
            contrarianIndicators={contrarianIndicators}
            contrarianStatus={contrarianStatus}
            valuationMetrics={valuationMetrics}
            exchangeRates={exchangeRates}
          />
        </div>
      </div>
    </div>
  );
}
