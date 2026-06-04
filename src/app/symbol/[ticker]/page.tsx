"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Option } from "effect";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, AlertTriangle, DollarSign,
  Activity, Shield, Users, PlusCircle, Loader2,
  Briefcase, Landmark, TrendingUp, TrendingDown
} from "lucide-react";
import { cn, createSecureImageUrl } from "@/lib/utils";
import Image from "next/image";
import { useAddCardToWorkspace } from "@/hooks/useAddCardToWorkspace";
import { useWorkspaceCards, removeSymbolFromWorkspace } from "@/hooks/useWorkspaceCards";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { useSymbolAnalysisData } from "@/hooks/useSymbolAnalysisData";
import { MetricRow } from "@/components/symbol/MetricRow";
import { ScorecardItem } from "@/components/symbol/ScorecardItem";

import { formatFinancialValue } from "@/lib/formatters";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import {
  calculateROIC,
  calculateFCFYield,
  calculateNetDebtToEbitda,
  calculateAltmanZScore,
  calculateInterestCoverage,
} from "@/lib/financial-calculations";
import {
  calculateValuationStatus,
  calculateQualityStatus,
  calculateSafetyStatus,
  calculateContrarianIndicatorsStatus,
} from "@/lib/status-calculations";
import {
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Area
} from "recharts";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ValuationMetrics {
  dcfFairValue: Option.Option<number>;
  currentPrice: Option.Option<number>;
  peRatio: Option.Option<number>;
  pegRatio: Option.Option<number>;
  priceHistory: { date: string; price: number; dcf: number }[];
}

interface QualityMetrics {
  roic: Option.Option<number>;
  wacc: Option.Option<number>;
  grossMargin: Option.Option<number>;
  fcfYield: Option.Option<number>;
  roicHistory: { date: string; dateLabel: string; roic: number; wacc: number }[];
}

interface SafetyMetrics {
  netDebtToEbitda: Option.Option<number>;
  altmanZScore: Option.Option<number>;
  interestCoverage: Option.Option<number>;
  ebitda: Option.Option<number>;
  netDebt: Option.Option<number>;
}

interface InsiderActivity {
  netBuyVolume: Option.Option<number>;
  netSellVolume: Option.Option<number>;
  netSentiment: number; // Net shares (bought - sold) for sentiment calculation
  latestTrade: Option.Option<{ name: string; action: string; shares: number; date: string }>;
}

// Institutional data interface - Coming soon (requires higher API tier)
// interface InstitutionalData {
//   institutionOwnership: Option.Option<number>;
//   hedgeFundOwnership: Option.Option<number>;
//   notableOwners: { name: string; position: string }[];
// }

interface ContrarianIndicators {
  shortInterest: Option.Option<number>;
  analystConsensus: Option.Option<string>;
  priceTarget: Option.Option<number>;
}

// MAIN COMPONENT
// ============================================================================

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

  // State with Option types
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && !isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router, hasMounted]);
  const {
    symbolValid,
    profile,
    quote,
    ratios,
    insiderTransactions,
    valuations,
    financialStatement,
    financialStatementsHistory,
    marketRiskPremiums,
    treasuryRates,
    gradesHistorical,
    analystPriceTargets,
  } = useSymbolAnalysisData(ticker);

  // Determine relevant cards based on data shown on this page
  // MUST be before any conditional returns to comply with Rules of Hooks
  const relevantCardTypes = useMemo((): CardType[] => {
    const cardTypes: CardType[] = ["profile", "price", "keyratios"];

    // Add financial statement cards if we have financial data
    if (Option.isSome(financialStatement)) {
      cardTypes.push("revenue", "solvency", "cashuse");
    }

    // Add analyst grades if we have grades data
    if (gradesHistorical.length > 0) {
      cardTypes.push("analystgrades");
    }

    // Note: dividendHistory, revenueSegmentation, and exchangeVariants
    // are not currently tracked on this page, but cards can still be added
    // The workspace will fetch the data when the cards are initialized

    return cardTypes;
  }, [financialStatement, gradesHistorical]);

  // Derived metrics (using real data from valuations table)
  const valuationMetrics: ValuationMetrics = (() => {
    // Get latest DCF valuation
    const latestDcf = valuations
      .filter(v => v.valuation_type === 'dcf')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const dcfFairValue = latestDcf
      ? Option.some(latestDcf.value)
      : Option.none<number>();

    // Build price history for chart (last 90 days of DCF + price)
    // Only use stock_price_at_calculation - skip entries without historical price
    // Using current price for historical data points would create incorrect chart data
    const priceHistory = valuations
      .filter(v => v.valuation_type === 'dcf')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(v => {
        // Only include entries with stock_price_at_calculation
        // Skip entries without historical price to avoid showing incorrect data
        if (!v.stock_price_at_calculation || v.stock_price_at_calculation <= 0) {
          return null;
        }
        return {
          date: v.date,
          price: v.stock_price_at_calculation,
          dcf: v.value,
        };
      })
      .filter((h): h is { date: string; price: number; dcf: number } => h !== null);

    return {
      dcfFairValue,
      currentPrice: Option.match(quote, {
        onNone: () => Option.none<number>(),
        onSome: (q) => q.current_price ? Option.some(q.current_price) : Option.none<number>(),
      }),
      peRatio: Option.match(ratios, {
        onNone: () => Option.none<number>(),
        onSome: (r) => r.price_to_earnings_ratio_ttm ? Option.some(r.price_to_earnings_ratio_ttm) : Option.none<number>(),
      }),
      pegRatio: Option.match(ratios, {
        onNone: () => Option.none<number>(),
        onSome: (r) => r.price_to_earnings_growth_ratio_ttm ? Option.some(r.price_to_earnings_growth_ratio_ttm) : Option.none<number>(),
      }),
      priceHistory,
    };
  })();

  // Calculate Quality metrics from financial statements
  const qualityMetrics: QualityMetrics = (() => {
    // Get the latest financial statement
    const latestStatement = Option.match(financialStatement, {
      onNone: () => null,
      onSome: (fs) => fs,
    });

    // Calculate ROIC from financial statements
    const roic = calculateROIC(latestStatement);

    // Calculate FCF Yield from financial statements and market cap
    const marketCap = Option.match(quote, {
      onNone: () => Option.none<number>(),
      onSome: (q) => q.market_cap ? Option.some(q.market_cap) : Option.none<number>(),
    });
    const fcfYield = calculateFCFYield(latestStatement, marketCap);

    // Calculate WACC if we have the required data
    // Basic WACC calculation using CAPM for cost of equity
    // WACC = (E/V × Re) + (D/V × Rd × (1-Tc))
    // For now, we'll calculate a simplified version using available data
    const wacc = (() => {
      // Need market risk premiums and treasury rates to be loaded
      if (marketRiskPremiums.length === 0 || treasuryRates.length === 0) {
        return Option.none<number>();
      }

      // Get company country from profile
      const companyCountry = Option.match(profile, {
        onNone: () => null,
        onSome: (p) => p.country || null,
      });

      // Get market risk premium for the company's country (fallback to United States)
      // Try exact match first, then try "United States", then fallback to first available
      const marketRiskPremium = marketRiskPremiums.find(
        (mrp) => mrp.country === companyCountry
      ) || marketRiskPremiums.find((mrp) => mrp.country === "United States")
      || marketRiskPremiums.find((mrp) => mrp.country?.toLowerCase().includes("united states"))
      || marketRiskPremiums[0]; // Fallback to first available

      // Get latest treasury rate (10-year)
      const latestTreasuryRate = treasuryRates.length > 0
        ? treasuryRates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

      // Get beta from profile
      const beta = Option.match(profile, {
        onNone: () => null,
        onSome: (p) => p.beta || null,
      });

      // If we have all required data, calculate WACC using CAPM
      // Re = Rf + β × (Rm - Rf)
      // Note: total_equity_risk_premium is already (Rm - Rf) from the API
      if (marketRiskPremium && latestTreasuryRate && beta !== null && latestTreasuryRate.year10 !== null) {
        const riskFreeRate = latestTreasuryRate.year10 / 100; // Convert percentage to decimal (e.g., 4.06% -> 0.0406)
        const equityRiskPremium = marketRiskPremium.total_equity_risk_premium / 100; // Convert percentage to decimal
        const costOfEquity = riskFreeRate + (beta * equityRiskPremium);

        // For now, use a simplified WACC (assume 100% equity, no debt)
        // TODO: Implement full WACC with debt and tax rate
        const simplifiedWacc = costOfEquity;
        return Option.some(simplifiedWacc);
      }

      return Option.none<number>();
    })();

    return {
      roic,
      wacc,
      grossMargin: Option.match(ratios, {
        onNone: () => Option.none<number>(),
        onSome: (r) => r.gross_profit_margin_ttm ? Option.some(r.gross_profit_margin_ttm) : Option.none<number>(),
      }),
      fcfYield,
      // Build ROIC history from multiple financial statements
      // Calculate ROIC for each statement and pair with WACC
      // Note: Cannot use useMemo here as it's inside an IIFE - calculate directly
      roicHistory: (() => {
        const history = financialStatementsHistory
          .map((fs) => {
            const roic = calculateROIC(fs);
            return Option.match(roic, {
              onNone: () => null,
              onSome: (r) => {
                // Parse date to calculate label
                // Use explicit parsing to avoid timezone issues
                const parts = fs.date.split('-');
                if (parts.length !== 3) {
                  return null;
                }

                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);

                // Validate parsed values
                if (isNaN(year) || isNaN(month) || isNaN(day)) {
                  return null;
                }

                // Create date in local time (month is 0-indexed)
                const date = new Date(year, month - 1, day);

                // Verify date was created correctly
                if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
                  return null;
                }

                // For annual statements (FY period), use year labels
                // For quarterly statements, use quarter labels
                let dateLabel: string;
                if (fs.period === 'FY') {
                  // Annual statements: use full year (e.g., "2024")
                  dateLabel = String(date.getFullYear());
                } else {
                  // Quarterly statements: use quarter label (e.g., "Q3/24")
                  const quarter = Math.floor(date.getMonth() / 3) + 1;
                  const yearShort = String(date.getFullYear()).slice(-2);
                  dateLabel = `Q${quarter}/${yearShort}`;
                }

                return {
                  date: fs.date,
                  dateLabel, // Pre-formatted label (year for annual, quarter for quarterly)
                  roic: r * 100, // Convert to percentage for display
                  wacc: Option.match(wacc, {
                    onNone: () => 0,
                    onSome: (w) => w * 100, // Convert to percentage for display
                  }),
                };
              },
            });
          })
          .filter((h): h is { date: string; dateLabel: string; roic: number; wacc: number } => h !== null)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronologically

        return history;
      })(),
    };
  })();

  // Calculate Safety metrics from financial statements
  const safetyMetrics: SafetyMetrics = (() => {
    // Get the latest financial statement
    const latestStatement = Option.match(financialStatement, {
      onNone: () => null,
      onSome: (fs) => fs,
    });

    // Get market cap for Altman Z-Score
    const marketCap = Option.match(quote, {
      onNone: () => Option.none<number>(),
      onSome: (q) => q.market_cap ? Option.some(q.market_cap) : Option.none<number>(),
    });

    const netDebtToEbitda = calculateNetDebtToEbitda(latestStatement);
    const altmanZScore = calculateAltmanZScore(latestStatement, marketCap);
    const interestCoverage = calculateInterestCoverage(latestStatement);

    let ebitda = Option.none<number>();
    let netDebt = Option.none<number>();

    if (latestStatement) {
      const incomePayload = latestStatement.income_statement_payload as { 
        ebitda?: number; 
        operatingIncome?: number; 
        depreciationAndAmortization?: number; 
        [key: string]: unknown; 
      };
      const balancePayload = latestStatement.balance_sheet_payload as { 
        shortTermDebt?: number; 
        longTermDebt?: number; 
        cashAndCashEquivalents?: number; 
        [key: string]: unknown; 
      };

      if (incomePayload && balancePayload) {
        const std = typeof balancePayload.shortTermDebt === 'number' ? balancePayload.shortTermDebt : 0;
        const ltd = typeof balancePayload.longTermDebt === 'number' ? balancePayload.longTermDebt : 0;
        const cash = typeof balancePayload.cashAndCashEquivalents === 'number' ? balancePayload.cashAndCashEquivalents : 0;
        netDebt = Option.some((std + ltd) - cash);
        const ebitdaVal = incomePayload.ebitda;
        const opInc = typeof incomePayload.operatingIncome === 'number' ? incomePayload.operatingIncome : 0;
        const depAmort = typeof incomePayload.depreciationAndAmortization === 'number' ? incomePayload.depreciationAndAmortization : 0;
        
        if (typeof ebitdaVal === 'number') {
          ebitda = Option.some(ebitdaVal);
        } else {
          ebitda = Option.some(opInc + depAmort);
        }
      }
    }      

    return {
      netDebtToEbitda,
      altmanZScore,
      interestCoverage,
      ebitda,
      netDebt
    };
  })();

  // Calculate insider activity from real data
  const insiderActivity: InsiderActivity = (() => {
    // Determine the cutoff date for the "Last 6 Months" window
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    let totalAcquiredDollars = 0;
    let totalDisposedDollars = 0;
    let netSentiment = 0; // Net shares (bought - sold) for sentiment calculation
    // Calculate using ACTUAL transaction prices from the last 6 months
    insiderTransactions.forEach((t) => {
      const dateStr = t.transaction_date || t.filing_date;
      if (!dateStr) return;
      const tDate = new Date(dateStr);
      if (tDate >= sixMonthsAgo) {
        const shares = Number(t.securities_transacted || 0);
        const price = Number(t.price || 0);
        const type = t.transaction_type || "";

        // Standardize transaction types to filter out Option Exercises (M-Exempt) and Grants (A-Award)
        const isPurchase = type.includes("Purchase") || type === "P";
        const isSale = type.includes("Sale") || type === "S";

        if (t.acquisition_or_disposition === "A" && isPurchase) {
          netSentiment += shares;

          if (price > 0) {
            totalAcquiredDollars += (shares * price);
          }
        } else if (t.acquisition_or_disposition === "D" && isSale) {
          netSentiment -= shares;
          if (price > 0) {
            totalDisposedDollars += (shares * price);
          }
        }
      }
    });
    // Get latest transaction
    const latestTransaction = insiderTransactions[0];
    const latestTrade = latestTransaction
      ? Option.some({
          name: latestTransaction.reporting_name || "Unknown",
          action:
            latestTransaction.acquisition_or_disposition === "A"
              ? "Bought"
              : latestTransaction.acquisition_or_disposition === "D"
              ? "Sold"
              : latestTransaction.transaction_type || "Traded",
          shares: Number(latestTransaction.securities_transacted || 0),
          date: (() => {
            // Use UTC dates for consistent timezone handling
            // Parse date string (YYYY-MM-DD) and create UTC dates for comparison
            const dateStr = latestTransaction.transaction_date || latestTransaction.filing_date;
            if (!dateStr) return "Unknown";

            // Parse date string explicitly
            const parts = dateStr.split('-');
            if (parts.length !== 3) return "Unknown";

            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            if (isNaN(year) || isNaN(month) || isNaN(day)) return "Unknown";

            // Create UTC dates for comparison (avoids timezone issues)
            const dateUTC = new Date(Date.UTC(year, month - 1, day));
            const now = new Date();
            const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

            const diffDays = Math.floor((nowUTC.getTime() - dateUTC.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return "Today";
            if (diffDays === 1) return "1 day ago";
            return `${diffDays} days ago`;
          })(),
        })
      : Option.none<{ name: string; action: string; shares: number; date: string }>();

    return {
      netBuyVolume: Option.some(totalAcquiredDollars),
      netSellVolume: Option.some(totalDisposedDollars),
      netSentiment, // Net shares (bought - sold) for sentiment calculation
      latestTrade,
    };
  })();

  // Institutional data - Coming soon (requires higher API tier)
  // const institutionalData: InstitutionalData = {
  //   institutionOwnership: Option.some(72),
  //   hedgeFundOwnership: Option.some(12),
  //   notableOwners: [{ name: "Berkshire Hathaway", position: "New Position" }],
  // };

  // Calculate analyst consensus from grades_historical
  const analystConsensus = useMemo(() => {
    if (gradesHistorical.length === 0) {
      return Option.none<string>();
    }

    // Get the latest grades entry
    const latestGrades = gradesHistorical
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestGrades) {
      return Option.none<string>();
    }

    // Calculate weighted consensus
    const strongBuy = latestGrades.analyst_ratings_strong_buy || 0;
    const buy = latestGrades.analyst_ratings_buy || 0;
    const hold = latestGrades.analyst_ratings_hold || 0;
    const sell = latestGrades.analyst_ratings_sell || 0;
    const strongSell = latestGrades.analyst_ratings_strong_sell || 0;

    const total = strongBuy + buy + hold + sell + strongSell;
    if (total === 0) {
      return Option.none<string>();
    }

    // Weighted score: Strong Buy = 2, Buy = 1, Hold = 0, Sell = -1, Strong Sell = -2
    const weightedScore = (strongBuy * 2 + buy * 1 + hold * 0 + sell * -1 + strongSell * -2) / total;

    // Map to consensus string
    if (weightedScore >= 1.5) return Option.some("Strong Buy");
    if (weightedScore >= 0.5) return Option.some("Buy");
    if (weightedScore >= -0.5) return Option.some("Hold");
    if (weightedScore >= -1.5) return Option.some("Sell");
    return Option.some("Strong Sell");
  }, [gradesHistorical]);

  const contrarianIndicators: ContrarianIndicators = {
    shortInterest: Option.none(), // Coming soon
    analystConsensus,
    priceTarget: Option.match(analystPriceTargets, {
      onNone: () => Option.none<number>(),
      onSome: (apt) => Option.some(apt.target_consensus),
    }),
  };

  // Calculate contrarian indicators status for border and badge
  const contrarianStatus = calculateContrarianIndicatorsStatus(
    analystConsensus,
    contrarianIndicators.priceTarget,
    valuationMetrics.currentPrice
  );

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
      // Symbol removed from workspace - stay on analysis page
      // The button will automatically update to "Add to Workspace" via hasCardsInWorkspace hook
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

  // Get company name
  const companyName = Option.match(profile, {
    onNone: () => "Loading...",
    onSome: (p) => p.company_name || ticker,
  });

  // Get company logo URL
  const logoUrl = Option.match(profile, {
    onNone: () => null,
    onSome: (p) => p.image || null,
  });

  // Get current price
  const currentPrice = Option.match(quote, {
    onNone: () => null,
    onSome: (q) => q.current_price || null,
  });

  const priceChange = Option.match(quote, {
    onNone: () => null,
    onSome: (q) => q.change_percentage || null,
  });

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
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
            {/* A1. Identity & Price */}
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-primary shrink-0 relative overflow-hidden">
                {logoUrl ? (
                  <>
                    <Image
                      src={createSecureImageUrl(logoUrl)}
                      alt={`${companyName} logo`}
                      fill
                      sizes="64px"
                      className="object-contain p-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        // Show fallback when image fails
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector(".logo-fallback") as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }
                      }}
                      priority={false}
                    />
                    <span className="logo-fallback hidden absolute inset-0 items-center justify-center">
                      {ticker.charAt(0)}
                    </span>
                  </>
                ) : (
                  <span>{ticker.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  {companyName} <span className="text-muted-foreground font-normal text-xl">({ticker})</span>
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  {currentPrice !== null ? (
                    <>
                      <span className="text-2xl font-semibold">
                        {formatFinancialValue(currentPrice, "USD", 2, exchangeRates)}
                      </span>
                      {priceChange !== null && (
                        <Badge
                          variant="default"
                          className={cn(
                            priceChange >= 0
                              ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200"
                              : "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200"
                          )}
                        >
                          {priceChange >= 0 ? (
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 inline mr-1" />
                          )}
                          {priceChange >= 0 ? "+" : ""}
                          {priceChange.toFixed(2)}%
                        </Badge>
                      )}
                    </>
                  ) : (
                    <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                  )}
                  <span className="text-sm text-muted-foreground">Realtime</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {Option.match(profile, {
                    onNone: () => null,
                    onSome: (p) => (
                      <>
                        {p.sector && <Badge variant="outline">{p.sector}</Badge>}
                        {p.exchange && <Badge variant="outline">{p.exchange}</Badge>}
                      </>
                    ),
                  })}
                </div>
              </div>
            </div>

            {/* A2. The "Intelligent" Scorecard */}
            <div className="flex-1 w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
              {valuationStatus.status !== "Unknown" && (
                <ScorecardItem
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Valuation"
                  status={valuationStatus.status}
                  statusColor={valuationStatus.color}
                />
              )}
              <ScorecardItem
                icon={<Shield className="h-4 w-4" />}
                label="Health"
                status={safetyStatus.status}
                statusColor={safetyStatus.color}
              />
              <ScorecardItem
                icon={<Activity className="h-4 w-4" />}
                label="Quality (ROIC)"
                status={qualityStatus.status}
                statusColor={qualityStatus.color}
              />
              <ScorecardItem
                icon={<Users className="h-4 w-4" />}
                label="Sentiment"
                status={Option.match(analystConsensus, {
                  onNone: () => "Unknown",
                  onSome: (s) => s,
                })}
                statusColor={Option.match(analystConsensus, {
                  onNone: () => "text-muted-foreground",
                  onSome: (s) => {
                    if (s === "Strong Buy" || s === "Buy") return "text-green-600";
                    if (s === "Hold") return "text-yellow-600";
                    return "text-red-600";
                  },
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- MAIN GRID LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- ZONE B: THE THESIS BUILDER (LEFT COL - 66%) --- */}
        <div className="lg:col-span-2 space-y-6">
          {/* B1. Valuation & Intrinsic Value */}
          <Card className={cn("border-l-4", valuationStatus.borderColor)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Is it Cheap? (Valuation)
                </CardTitle>
                {valuationStatus.status !== "Unknown" && (
                  <Badge
                    variant="outline"
                    className={cn(
                      valuationStatus.status === "Undervalued" && "bg-green-50 text-green-700 border-green-300",
                      valuationStatus.status === "Overvalued" && "bg-red-50 text-red-700 border-red-300",
                      valuationStatus.status === "Fair" && "bg-yellow-50 text-yellow-700 border-yellow-300"
                    )}
                  >
                    {valuationStatus.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DCF vs Price Chart */}
              <div className="h-48">
                {valuationMetrics.priceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={valuationMetrics.priceHistory}>
                      <XAxis
                        dataKey="date"
                        type="category"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => {
                          // Parse date string (YYYY-MM-DD) explicitly to avoid timezone issues
                          // The value should be the date string from the data
                          let date: Date;
                          if (typeof value === 'string') {
                            // Parse YYYY-MM-DD format explicitly
                            const parts = value.split('-');
                            if (parts.length === 3) {
                              const year = parseInt(parts[0], 10);
                              const month = parseInt(parts[1], 10);
                              const day = parseInt(parts[2], 10);
                              // Create date in local time to avoid UTC timezone shifts
                              date = new Date(year, month - 1, day);
                            } else {
                              date = new Date(value);
                            }
                          } else if (value instanceof Date) {
                            // If Recharts converted it to a Date, use UTC methods to get the original date
                            // This handles cases where "2025-09-27" was parsed as UTC and shifted
                            const year = value.getUTCFullYear();
                            const month = value.getUTCMonth();
                            const day = value.getUTCDate();
                            date = new Date(year, month, day);
                          } else {
                            date = new Date(value);
                          }

                          if (isNaN(date.getTime())) {
                            return String(value);
                          }

                          const quarter = Math.floor(date.getMonth() / 3) + 1;
                          const year = String(date.getFullYear()).slice(-2);
                          return `Q${quarter}/${year}`;
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value.toFixed(1)}
                      />
                      <Tooltip
                        formatter={(value: number) => value.toFixed(1)}
                        labelFormatter={(label, payload) => {
                          // Get the actual date string from the payload to avoid Recharts date conversion issues
                          const dateStr = payload?.[0]?.payload?.date || label;

                          // Parse date string (YYYY-MM-DD) explicitly to avoid timezone issues
                          let date: Date;
                          if (typeof dateStr === 'string') {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                              const year = parseInt(parts[0], 10);
                              const month = parseInt(parts[1], 10);
                              const day = parseInt(parts[2], 10);
                              date = new Date(year, month - 1, day); // month is 0-indexed, local time
                            } else {
                              date = new Date(dateStr);
                            }
                          } else if (dateStr instanceof Date) {
                            // Use UTC methods to avoid timezone shifts
                            const year = dateStr.getUTCFullYear();
                            const month = dateStr.getUTCMonth();
                            const day = dateStr.getUTCDate();
                            date = new Date(year, month, day);
                          } else {
                            date = new Date(dateStr);
                          }

                          if (isNaN(date.getTime())) {
                            return String(label);
                          }

                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="dcf"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        stroke="hsl(var(--primary))"
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full bg-muted/20 rounded flex items-center justify-center border border-dashed">
                    {Option.isSome(valuationMetrics.dcfFairValue) || Option.isSome(valuationMetrics.currentPrice) ? (
                      <span className="text-sm text-muted-foreground">DCF vs Price Chart (Loading...)</span>
                    ) : (
                      <div className="space-y-2 w-full px-4">
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <MetricRow
                  label="DCF Fair Value"
                  value={Option.match(valuationMetrics.dcfFairValue, {
                    onNone: () => null,
                    onSome: (v) => formatFinancialValue(v, "USD", 2, exchangeRates),
                  })}
                  subtext={Option.match(valuationMetrics.currentPrice, {
                    onNone: () => "Calculating...",
                    onSome: (p) => {
                      const dcf = Option.match(valuationMetrics.dcfFairValue, {
                        onNone: () => 0,
                        onSome: (d) => d,
                      });
                      const upside = ((dcf - p) / p) * 100;
                      return `Upside: ${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`;
                    },
                  })}
                  highlight
                />
                <MetricRow
                  label="P/E (TTM)"
                  value={Option.match(valuationMetrics.peRatio, {
                    onNone: () => null,
                    onSome: (r) => r.toFixed(1) + "x",
                  })}
                  subtext="5yr Avg: 28.0x"
                />
                <MetricRow
                  label="PEG Ratio"
                  value={Option.match(valuationMetrics.pegRatio, {
                    onNone: () => null,
                    onSome: (v) => v.toFixed(1),
                  })}
                  subtext="Growth adjusted"
                />
              </div>
            </CardContent>
          </Card>

          {/* B2. Quality & Moat */}
          <Card className={cn("border-l-4", qualityStatus.borderColor)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Is the Business Good? (Quality)
                </CardTitle>
                {qualityStatus.status !== "Unknown" && (
                  <Badge variant="outline" className={qualityStatus.color}>
                    {qualityStatus.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <MetricRow
                  label="ROIC"
                  value={Option.match(qualityMetrics.roic, {
                    onNone: () => null,
                    onSome: (v) => (v * 100).toFixed(1) + "%",
                  })}
                  subtext="Return on Invested Capital"
                  highlight
                />
                <MetricRow
                  label="Gross Margin"
                  value={Option.match(qualityMetrics.grossMargin, {
                    onNone: () => null,
                    onSome: (m) => (m * 100).toFixed(1) + "%",
                  })}
                  subtext="Pricing Power"
                />
                <MetricRow
                  label="FCF Yield"
                  value={Option.match(qualityMetrics.fcfYield, {
                    onNone: () => null,
                    onSome: (v) => (v * 100).toFixed(1) + "%",
                  })}
                  subtext="Cash generation"
                />
                <MetricRow
                  label="WACC"
                  value={Option.match(qualityMetrics.wacc, {
                    onNone: () => null,
                    onSome: (v) => (v * 100).toFixed(1) + "%",
                  })}
                  subtext="Cost of Capital (Equity-only)"
                />
              </div>
              {/* ROIC vs WACC Trend Chart */}
              <div className="h-48">
                {qualityMetrics.roicHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={qualityMetrics.roicHistory}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="dateLabel"
                        type="category"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => {
                          // With type="category" and dataKey="dateLabel", value should be the dateLabel string
                          // We pre-format it in roicHistory as Qx/YY, so just return as-is
                          return String(value);
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value.toFixed(1) + "%"}
                      />
                      <Tooltip
                        formatter={(value: number) => value.toFixed(1) + "%"}
                        labelFormatter={(label, payload) => {
                          // With type="category" and dataKey="dateLabel", label is the dateLabel string (e.g., "Q3/25")
                          // But we need the actual date for the tooltip. Get it from the payload.
                          const dateStr = payload?.[0]?.payload?.date;

                          if (!dateStr) {
                            // Fallback to label if no date in payload
                            return String(label);
                          }

                          // Parse date string (YYYY-MM-DD) explicitly to avoid timezone issues
                          let date: Date;
                          if (typeof dateStr === 'string') {
                            const parts = dateStr.split('-');
                            if (parts.length === 3) {
                              const year = parseInt(parts[0], 10);
                              const month = parseInt(parts[1], 10);
                              const day = parseInt(parts[2], 10);
                              date = new Date(year, month - 1, day); // month is 0-indexed, local time
                            } else {
                              date = new Date(dateStr);
                            }
                          } else if (dateStr instanceof Date) {
                            // Use UTC methods to avoid timezone shifts
                            const year = dateStr.getUTCFullYear();
                            const month = dateStr.getUTCMonth();
                            const day = dateStr.getUTCDate();
                            date = new Date(year, month, day);
                          } else {
                            date = new Date(dateStr);
                          }

                          if (isNaN(date.getTime())) {
                            return String(label); // Fallback to original value if date is invalid
                          }

                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="roic"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="wacc"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full bg-muted/20 rounded flex items-center justify-center border border-dashed">
                    {Option.isNone(qualityMetrics.roic) && Option.isNone(qualityMetrics.wacc) ? (
                      <div className="space-y-2 w-full px-4">
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">ROIC vs WACC Trend (Loading...)</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* B3. Financial Safety */}
          <Card className={cn("border-l-4", safetyStatus.borderColor)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Is it Safe? (Balance Sheet)
                </CardTitle>
                {safetyStatus.status !== "Unknown" && (
                  <Badge variant="outline" className={safetyStatus.color}>
                    {safetyStatus.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex justify-between gap-4">
              <div className="flex-1 text-center p-4 border rounded">
                <div className="text-muted-foreground text-sm mb-1">Net Debt / EBITDA</div>
                {(() => {
                 const isNegativeEbitda = Option.match(safetyMetrics.ebitda, {
                   onNone: () => false,
                   onSome: (v) => v <= 0
                 });
                 const isNetCash = Option.match(safetyMetrics.netDebt, {
                   onNone: () => false,
                   onSome: (v) => v < 0
                 });
                  
                if (isNegativeEbitda) {
                    return <div className="text-lg font-bold text-red-600 leading-tight py-1">High Risk<br/><span className="text-xs font-normal">(Negative EBITDA)</span></div>;
                  }
                  
                if (isNetCash) {
                    return <div className="text-2xl font-bold text-green-600">Net Cash</div>;
                  }
                  
                  return Option.match(safetyMetrics.netDebtToEbitda, {
                    onNone: () => (
                      <div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto mb-1" />
                    ),
                    onSome: (v) => (
                      <div className={cn(
                        "text-2xl font-bold",
                        v < 3 ? "text-green-600" : v < 5 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {v.toFixed(1)}x
                      </div>
                    ),
                  });
                })()}
                <div className="text-xs text-muted-foreground">Safe (&lt; 3.0x)</div>
              </div>
              <div className="flex-1 text-center p-4 border rounded">
                <div className="text-muted-foreground text-sm mb-1">Altman Z-Score</div>
                {Option.match(safetyMetrics.altmanZScore, {
                  onNone: () => (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto mb-1" />
                  ),
                  onSome: (v) => (
                    <div className={cn(
                      "text-2xl font-bold",
                      v > 3 ? "text-green-600" : v > 2.7 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {v.toFixed(1)}
                    </div>
                  ),
                })}
                <div className="text-xs text-muted-foreground">Safe Zone</div>
              </div>
              <div className="flex-1 text-center p-4 border rounded">
                <div className="text-muted-foreground text-sm mb-1">Interest Coverage</div>
                {Option.match(safetyMetrics.interestCoverage, {
                  onNone: () => (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto mb-1" />
                  ),
                  onSome: (v) => (
                    <div
                      className={cn(
                        "text-2xl font-bold",
                        v >= 999
                          ? "text-green-600"
                          : v > 10
                            ? "text-green-600"
                            : v > 5
                              ? "text-yellow-600"
                              : "text-red-600"
                      )}
                    >
                      {v >= 999 ? "∞" : v.toFixed(0) + "x"}
                    </div>
                  ),
                })}
                <div className="text-xs text-muted-foreground">
                  {Option.match(safetyMetrics.interestCoverage, {
                    onNone: () => "Can pay debts",
                    onSome: (v) => {
                      if (v >= 999) {
                        return "No interest expense";
                      } else if (v > 5) {
                        return "Comfortable coverage";
                      } else if (v > 1.5) {
                        return "Tight coverage";
                      } else {
                        return "Inadequate coverage";
                      }
                    },
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- ZONE C: SMART MONEY & SENTIMENT (RIGHT COL - 33%) --- */}
        <div className="space-y-6">
          {/* C1. Insider Trading */}
          <Card className={cn(
            "border-l-4",
            insiderActivity.netSentiment > 0
              ? "border-l-green-500"
              : insiderActivity.netSentiment < 0
              ? "border-l-red-500"
              : "border-l-border"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Insider Activity
                  </CardTitle>
                  <CardDescription>Last 6 Months</CardDescription>
                </div>
                <div className="flex items-center">
                  {insiderActivity.netSentiment > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Net Accumulation
                    </Badge>
                  )}
                  {insiderActivity.netSentiment < 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      Net Distribution
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Buying</span>
                  <span className="text-green-600 font-bold">
                    {Option.match(insiderActivity.netBuyVolume, {
                      onNone: () => <div className="h-4 w-16 bg-muted animate-pulse rounded" />,
                      onSome: (v) => formatFinancialValue(v, "USD", 1, exchangeRates),
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Selling</span>
                  <span className="text-red-600 font-bold">
                    {Option.match(insiderActivity.netSellVolume, {
                      onNone: () => <div className="h-4 w-16 bg-muted animate-pulse rounded" />,
                      onSome: (v) => formatFinancialValue(v, "USD", 1, exchangeRates),
                    })}
                  </span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Latest:{" "}
                  {Option.match(insiderActivity.latestTrade, {
                    onNone: () => <span className="text-muted-foreground">No recent trades</span>,
                    onSome: (t) => (
                      <span className="text-foreground">
                        {t.name} {t.action} {t.shares.toLocaleString()} shares ({t.date})
                      </span>
                    ),
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* C2. Institutional Holdings */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Smart Money
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Landmark className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">Institutional Holdings</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Institutional holdings and smart money tracking data is available through our Enterprise API. Contact{" "}
                  <a href="mailto:support@tickered.com" className="text-primary hover:underline">
                    support@tickered.com
                  </a>
                  {" "}for access.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* C3. Risk/Shorts */}
          <Card className={cn("border-l-4", contrarianStatus.borderColor)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Contrarian Indicators
                  </CardTitle>
                </div>
                {contrarianStatus.status !== "Unknown" && (
                  <Badge
                    variant="outline"
                    className={cn(
                      contrarianStatus.status.includes("Bullish")
                        ? "bg-green-50 text-green-700 border-green-300"
                        : contrarianStatus.status.includes("Bearish")
                        ? "bg-red-50 text-red-700 border-red-300"
                        : "bg-yellow-50 text-yellow-700 border-yellow-300"
                    )}
                  >
                    {contrarianStatus.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Analyst Consensus"
                value={Option.match(contrarianIndicators.analystConsensus, {
                  onNone: () => null,
                  onSome: (s) => s,
                })}
              />
              <MetricRow
                label="Price Target"
                value={Option.match(contrarianIndicators.priceTarget, {
                  onNone: () => "N/A",
                  onSome: (v) => formatFinancialValue(v, "USD", 2, exchangeRates),
                })}
                subtext={Option.match(contrarianIndicators.priceTarget, {
                  onNone: () => "",
                  onSome: (target) => {
                    const current = Option.match(valuationMetrics.currentPrice, {
                      onNone: () => 0,
                      onSome: (p) => p,
                    });
                    if (current === 0) return "";
                    const upside = ((target - current) / current) * 100;
                    return `${upside >= 0 ? "+" : ""}${upside.toFixed(0)}% Upside`;
                  },
                })}
              />

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MICRO COMPONENTS
