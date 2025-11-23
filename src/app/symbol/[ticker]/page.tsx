"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Option } from "effect";
import { useAuth } from "@/contexts/AuthContext";
import type { InsiderTradingStatisticsDBRow, InsiderTransactionsDBRow, ValuationsDBRow } from "@/lib/supabase/realtime-service";
import type { Database } from "@/lib/supabase/database.types";

type FinancialStatementDBRow = Database["public"]["Tables"]["financial_statements"]["Row"];
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, AlertTriangle, DollarSign,
  Activity, Shield, Users, PlusCircle, Loader2,
  Briefcase, Landmark, TrendingUp, TrendingDown, Clock
} from "lucide-react";
import { cn, createSecureImageUrl } from "@/lib/utils";
import Image from "next/image";
import { useAddCardToWorkspace } from "@/hooks/useAddCardToWorkspace";
import { useStockData, type ProfileDBRow } from "@/hooks/useStockData";
import {
  subscribeToMarketRiskPremiumUpdates,
  subscribeToTreasuryRateUpdates,
  type MarketRiskPremiumDBRow,
  type TreasuryRateDBRow,
  type MarketRiskPremiumPayload,
  type TreasuryRatePayload,
} from "@/lib/supabase/realtime-service";
import { formatFinancialValue } from "@/lib/formatters";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { RatiosTtmDBRow } from "@/lib/supabase/realtime-service";
import { calculateROIC, calculateFCFYield } from "@/lib/financial-calculations";
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

type HealthStatus = "Undervalued" | "Fair" | "Overvalued" | "Unknown";
type QualityStatus = "Moat" | "High" | "Moderate" | "Low" | "Unknown";
type SafetyStatus = "Safe" | "Moderate" | "Risky" | "Unknown";

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

function calculateValuationStatus(
  price: Option.Option<number>,
  dcf: Option.Option<number>,
  peRatio: Option.Option<number>,
  pegRatio: Option.Option<number>
): { status: HealthStatus; color: string; borderColor: string } {
  // If we don't have enough data, return unknown
  if (Option.isNone(price) || Option.isNone(dcf)) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  const priceVal = price.value;
  const dcfVal = dcf.value;

  // Edge case: If DCF is negative or zero, treat as overvalued (distressed company)
  if (dcfVal <= 0 || !isFinite(dcfVal)) {
    return { status: "Overvalued", color: "text-red-600", borderColor: "border-l-red-500" };
  }

  const discount = ((dcfVal - priceVal) / dcfVal) * 100;

  // Score-based approach: Consider DCF discount, P/E, and PEG
  let score = 0;
  let signals = 0;

  // Signal 1: DCF Discount (weight: 40%)
  // > 20% discount = undervalued, < -20% = overvalued
  if (discount > 20) {
    score += 40;
    signals++;
  } else if (discount < -20) {
    score -= 40;
    signals++;
  } else if (discount > 0) {
    score += 20; // Slightly undervalued
    signals++;
  } else {
    score -= 20; // Slightly overvalued
    signals++;
  }

  // Signal 2: P/E Ratio (weight: 30%)
  // Compare to typical market average (~20-25) and consider if we have historical context
  // Lower P/E = better (cheaper), Higher P/E = worse (expensive)
  // Edge case: Negative P/E (loss-making companies) = very expensive (no earnings yield)
  if (Option.isSome(peRatio)) {
    const pe = peRatio.value;
    // Handle negative P/E (loss-making companies) - treat as very expensive
    if (pe <= 0 || !isFinite(pe)) {
      score -= 30;
      signals++;
    } else if (pe < 15) {
      score += 30;
      signals++;
    } else if (pe < 20) {
      score += 15;
      signals++;
    } else if (pe > 30) {
      score -= 30;
      signals++;
    } else if (pe > 25) {
      score -= 15;
      signals++;
    } else {
      signals++; // Neutral zone (20 <= pe <= 25)
    }
  }

  // Signal 3: PEG Ratio (weight: 30%)
  // PEG < 1.0 = undervalued, 1.0-2.0 = fair, > 2.0 = overvalued
  // Edge case: Negative PEG (negative growth or earnings) = very overvalued
  if (Option.isSome(pegRatio)) {
    const peg = pegRatio.value;
    // Handle negative PEG (negative growth or earnings) - treat as very overvalued
    if (peg <= 0 || !isFinite(peg)) {
      score -= 30;
      signals++;
    } else if (peg < 1.0) {
      score += 30;
      signals++;
    } else if (peg < 1.5) {
      score += 15;
      signals++;
    } else if (peg > 2.5) {
      score -= 30;
      signals++;
    } else if (peg > 2.0) {
      score -= 15;
      signals++;
    } else {
      signals++; // Neutral zone (1.5 <= peg <= 2.0)
    }
  }

  // Determine status based on composite score
  // If we have at least 2 signals, use the score
  // Otherwise, fall back to DCF-only logic
  if (signals >= 2) {
    if (score >= 30) {
      return { status: "Undervalued", color: "text-green-600", borderColor: "border-l-green-500" };
    } else if (score <= -30) {
      return { status: "Overvalued", color: "text-red-600", borderColor: "border-l-red-500" };
    } else {
      return { status: "Fair", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
    }
  } else {
    // Fallback to DCF-only logic if we don't have enough signals
    if (discount > 20) {
      return { status: "Undervalued", color: "text-green-600", borderColor: "border-l-green-500" };
    } else if (discount < -20) {
      return { status: "Overvalued", color: "text-red-600", borderColor: "border-l-red-500" };
    } else {
      return { status: "Fair", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
    }
  }
}

function calculateQualityStatus(roic: Option.Option<number>): { status: QualityStatus; color: string } {
  if (Option.isNone(roic)) {
    return { status: "Unknown", color: "text-muted-foreground" };
  }

  const roicVal = roic.value;
  if (roicVal > 15) return { status: "Moat", color: "text-green-600" };
  if (roicVal > 10) return { status: "High", color: "text-green-600" };
  if (roicVal > 5) return { status: "Moderate", color: "text-yellow-600" };
  return { status: "Low", color: "text-red-600" };
}

function calculateSafetyStatus(
  netDebtToEbitda: Option.Option<number>
): { status: SafetyStatus; color: string } {
  if (Option.isNone(netDebtToEbitda)) {
    return { status: "Unknown", color: "text-muted-foreground" };
  }

  const ratio = netDebtToEbitda.value;
  if (ratio < 3) return { status: "Safe", color: "text-green-600" };
  if (ratio < 5) return { status: "Moderate", color: "text-yellow-600" };
  return { status: "Risky", color: "text-red-600" };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SymbolAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string)?.toUpperCase() || "";
  const { addCard } = useAddCardToWorkspace();
  const [addingToWorkspace, setAddingToWorkspace] = useState(false);
  const exchangeRates = useExchangeRate();

  // State with Option types
  const { supabase } = useAuth();
  const [profile, setProfile] = useState<Option.Option<ProfileDBRow>>(Option.none());
  const [quote, setQuote] = useState<Option.Option<Database["public"]["Tables"]["live_quote_indicators"]["Row"]>>(Option.none());
  const [ratios, setRatios] = useState<Option.Option<RatiosTtmDBRow>>(Option.none());

  // Insider trading data (arrays for multiple records)
  const [insiderStatistics, setInsiderStatistics] = useState<InsiderTradingStatisticsDBRow[]>([]);
  const [insiderTransactions, setInsiderTransactions] = useState<InsiderTransactionsDBRow[]>([]);

  // Valuations data (array for historical DCF data)
  const [valuations, setValuations] = useState<ValuationsDBRow[]>([]);

  // Financial statements data (latest statement for ROIC and FCF Yield calculations)
  const [financialStatement, setFinancialStatement] = useState<Option.Option<FinancialStatementDBRow>>(Option.none());
  // Historical financial statements for ROIC history chart
  const [financialStatementsHistory, setFinancialStatementsHistory] = useState<FinancialStatementDBRow[]>([]);

  // Global market data (for WACC calculations)
  const [marketRiskPremiums, setMarketRiskPremiums] = useState<MarketRiskPremiumDBRow[]>([]);
  const [treasuryRates, setTreasuryRates] = useState<TreasuryRateDBRow[]>([]);

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
    const priceHistory = valuations
      .filter(v => v.valuation_type === 'dcf')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(v => {
        const currentPrice = Option.match(quote, {
          onNone: () => null,
          onSome: (q) => q.current_price || null,
        });
        // Use stock_price_at_calculation if available, otherwise use current price
        const price = v.stock_price_at_calculation || currentPrice || 0;
        return {
          date: v.date,
          price,
          dcf: v.value,
        };
      })
      .filter(h => h.price > 0); // Only include entries with valid price

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
      roicHistory: useMemo(() => {
        // Build ROIC history from multiple financial statements
        // Calculate ROIC for each statement and pair with WACC
        const history = financialStatementsHistory
          .map((fs) => {
            const roic = calculateROIC(fs);
            return Option.match(roic, {
              onNone: () => null,
              onSome: (r) => {
                // Parse date to calculate quarter label
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

                const quarter = Math.floor(date.getMonth() / 3) + 1;
                const yearShort = String(date.getFullYear()).slice(-2);
                const quarterLabel = `Q${quarter}${yearShort}`;

                return {
                  date: fs.date,
                  dateLabel: quarterLabel, // Pre-formatted quarter label
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
      }, [financialStatementsHistory, wacc]),
    };
  })();

  const safetyMetrics: SafetyMetrics = {
    netDebtToEbitda: Option.some(0.8),
    altmanZScore: Option.some(4.5),
    interestCoverage: Option.some(18.0),
  };

  // Calculate insider activity from real data
  const insiderActivity: InsiderActivity = (() => {
    // Get current price for dollar value calculations
    const currentPrice = Option.match(quote, {
      onNone: () => null,
      onSome: (q) => q.current_price || null,
    });

    // Calculate net buy/sell volumes from last 6 months (2 quarters)
    const last6Months = insiderStatistics.slice(0, 2);
    const totalAcquiredShares = last6Months.reduce((sum, s) => sum + Number(s.total_acquired || 0), 0);
    const totalDisposedShares = last6Months.reduce((sum, s) => sum + Number(s.total_disposed || 0), 0);

    // Calculate net insider sentiment (shares bought - shares sold)
    const netSentiment = totalAcquiredShares - totalDisposedShares;

    // Convert to dollar values using current price
    // ⚠️ NOTE: This calculates current market value, not actual purchase/sale price
    // If an insider bought at $10 and price is now $100, this shows 10x the actual amount
    // Future enhancement: Use transaction_price from API if available for accurate volume
    const totalAcquiredDollars = currentPrice && totalAcquiredShares > 0
      ? totalAcquiredShares * currentPrice
      : null;
    const totalDisposedDollars = currentPrice && totalDisposedShares > 0
      ? totalDisposedShares * currentPrice
      : null;

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
            if (latestTransaction.transaction_date) {
              const date = new Date(latestTransaction.transaction_date);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 0) return "Today";
              if (diffDays === 1) return "1 day ago";
              return `${diffDays} days ago`;
            }
            if (latestTransaction.filing_date) {
              const date = new Date(latestTransaction.filing_date);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 0) return "Today";
              if (diffDays === 1) return "1 day ago";
              return `${diffDays} days ago`;
            }
            return "Unknown";
          })(),
        })
      : Option.none<{ name: string; action: string; shares: number; date: string }>();

    return {
      netBuyVolume: totalAcquiredDollars !== null ? Option.some(totalAcquiredDollars) : Option.none(),
      netSellVolume: totalDisposedDollars !== null ? Option.some(totalDisposedDollars) : Option.none(),
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

  const contrarianIndicators: ContrarianIndicators = {
    shortInterest: Option.some(2.1),
    analystConsensus: Option.some("Buy"),
    priceTarget: Option.some(180),
  };

  // Memoize callbacks to prevent infinite re-renders
  const handleProfileUpdate = useCallback((profileData: ProfileDBRow) => {
    setProfile(Option.some(profileData));
  }, []);

  const handleQuoteUpdate = useCallback((quoteData: Database["public"]["Tables"]["live_quote_indicators"]["Row"]) => {
    setQuote(Option.some(quoteData));
  }, []);

  const handleRatiosUpdate = useCallback((ratiosData: RatiosTtmDBRow) => {
    setRatios(Option.some(ratiosData));
  }, []);

  const handleInsiderStatisticsUpdate = useCallback((statsData: InsiderTradingStatisticsDBRow) => {
    setInsiderStatistics((prev) => {
      const existing = prev.findIndex(
        (s) => s.symbol === statsData.symbol && s.year === statsData.year && s.quarter === statsData.quarter
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = statsData;
        return updated;
      }
      return [...prev, statsData].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter - a.quarter;
      });
    });
  }, []);

  const handleInsiderTransactionsUpdate = useCallback((transactionData: InsiderTransactionsDBRow) => {
    setInsiderTransactions((prev) => {
      const existing = prev.findIndex(
        (t) =>
          t.symbol === transactionData.symbol &&
          t.filing_date === transactionData.filing_date &&
          t.reporting_cik === transactionData.reporting_cik &&
          t.securities_transacted === transactionData.securities_transacted
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = transactionData;
        return updated.sort((a, b) => {
          const aDate = a.transaction_date || a.filing_date;
          const bDate = b.transaction_date || b.filing_date;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
      }
      return [...prev, transactionData].sort((a, b) => {
        const aDate = a.transaction_date || a.filing_date;
        const bDate = b.transaction_date || b.filing_date;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    });
  }, []);

  const handleValuationsUpdate = useCallback((valuationData: ValuationsDBRow) => {
    setValuations((prev) => {
      const existing = prev.findIndex(
        (v) =>
          v.symbol === valuationData.symbol &&
          v.date === valuationData.date &&
          v.valuation_type === valuationData.valuation_type
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = valuationData;
        return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return [...prev, valuationData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const handleFinancialStatementUpdate = useCallback((statementData: FinancialStatementDBRow) => {
    // Only update if this is the latest statement (by date)
    setFinancialStatement((prev) => {
      if (Option.isNone(prev)) {
        return Option.some(statementData);
      }
      const prevDate = new Date(prev.value.date);
      const newDate = new Date(statementData.date);
      // Update if new statement is more recent
      if (newDate >= prevDate) {
        return Option.some(statementData);
      }
      return prev;
    });
  }, []);

  // Use the existing useStockData hook for Realtime subscriptions
  useStockData({
    symbol: ticker,
    onProfileUpdate: handleProfileUpdate,
    onLiveQuoteUpdate: handleQuoteUpdate,
    onRatiosTTMUpdate: handleRatiosUpdate,
    onInsiderTradingStatisticsUpdate: handleInsiderStatisticsUpdate,
    onInsiderTransactionsUpdate: handleInsiderTransactionsUpdate,
    onValuationsUpdate: handleValuationsUpdate,
    onFinancialStatementUpdate: handleFinancialStatementUpdate,
  });

  // Subscribe to global market data tables (market risk premiums and treasury rates)
  // These are global tables, so we subscribe once per app instance
  // The data can be used for WACC calculations or any other purpose
  useEffect(() => {
    const handleMarketRiskPremiumUpdate = (payload: MarketRiskPremiumPayload) => {
      if (payload.new) {
        const newItem = payload.new as MarketRiskPremiumDBRow;
        setMarketRiskPremiums((prev) => {
          // Update or add the country's market risk premium
          const existing = prev.findIndex((mrp) => mrp.country === newItem.country);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newItem;
            return updated;
          }
          return [...prev, newItem];
        });
      } else if (payload.old) {
        // Handle deletion (unlikely but handle it)
        const oldItem = payload.old as MarketRiskPremiumDBRow;
        setMarketRiskPremiums((prev) => prev.filter((mrp) => mrp.country !== oldItem.country));
      }
    };

    const handleTreasuryRateUpdate = (payload: TreasuryRatePayload) => {
      if (payload.new) {
        const newItem = payload.new as TreasuryRateDBRow;
        setTreasuryRates((prev) => {
          // Update or add the date's treasury rate
          const existing = prev.findIndex((tr) => tr.date === newItem.date);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newItem;
            return updated;
          }
          return [...prev, newItem];
        });
      } else if (payload.old) {
        // Handle deletion (unlikely but handle it)
        const oldItem = payload.old as TreasuryRateDBRow;
        setTreasuryRates((prev) => prev.filter((tr) => tr.date !== oldItem.date));
      }
    };

    const unsubscribeMRP = subscribeToMarketRiskPremiumUpdates(
      handleMarketRiskPremiumUpdate,
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error("[Symbol Page] Market Risk Premium subscription error:", err);
        }
      }
    );

    const unsubscribeTR = subscribeToTreasuryRateUpdates(
      handleTreasuryRateUpdate,
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error("[Symbol Page] Treasury Rate subscription error:", err);
        }
      }
    );

    return () => {
      unsubscribeMRP();
      unsubscribeTR();
    };
  }, []);

  // Fetch initial global market data (market risk premiums and treasury rates)
  useEffect(() => {
    if (!supabase) return;

    // Fetch market risk premiums (all countries)
    supabase
      .from("market_risk_premiums")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching market risk premiums:`, error);
          return;
        }
        if (data) {
          console.log(`[SymbolAnalysisPage] Fetched ${data.length} market risk premiums`);
          setMarketRiskPremiums(data);
        }
      });

    // Fetch treasury rates (latest dates)
    supabase
      .from("treasury_rates")
      .select("*")
      .order("date", { ascending: false })
      .limit(30) // Last 30 days
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching treasury rates:`, error);
          return;
        }
        if (data) {
          console.log(`[SymbolAnalysisPage] Fetched ${data.length} treasury rates`);
          setTreasuryRates(data);
        }
      });
  }, [supabase]);

  // Fetch initial insider trading data and valuations
  useEffect(() => {
    if (!supabase || !ticker) return;

    // Fetch insider trading statistics (last 6 months = 2 quarters)
    supabase
      .from("insider_trading_statistics")
      .select("*")
      .eq("symbol", ticker)
      .order("year", { ascending: false })
      .order("quarter", { ascending: false })
      .limit(8) // Last 2 years (8 quarters)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching insider statistics:`, error);
          return;
        }
        if (data) {
          setInsiderStatistics(data);
        }
      });

    // Fetch insider transactions (recent 100)
    supabase
      .from("insider_transactions")
      .select("*")
      .eq("symbol", ticker)
      .order("transaction_date", { ascending: false, nullsFirst: false })
      .order("filing_date", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching insider transactions:`, error);
          return;
        }
        if (data) {
          setInsiderTransactions(data);
        }
      });

    // Fetch valuations (DCF - last 180 days for chart)
    supabase
      .from("valuations")
      .select("*")
      .eq("symbol", ticker)
      .eq("valuation_type", "dcf")
      .order("date", { ascending: false })
      .limit(180)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching valuations:`, error);
          return;
        }
        if (data) {
          setValuations(data);
        }
      });

    // Fetch historical financial statements for ROIC history chart (last 12 annual reports)
    // Filter for annual reports (FY period) to get end-of-year dates (September for AAPL)
    // Handle duplicates by taking the latest fetched_at for each fiscal_year
    supabase
      .from("financial_statements")
      .select("*")
      .eq("symbol", ticker)
      .eq("period", "FY") // Only annual reports (fiscal year end)
      .order("fetched_at", { ascending: false })
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching financial statements history:`, error);
          return;
        }
        if (data) {
          // Deduplicate: For each fiscal_year, keep only the one with the latest fetched_at
          const deduplicated = data.reduce((acc, current) => {
            const existing = acc.find(item => item.fiscal_year === current.fiscal_year);
            if (!existing) {
              acc.push(current);
            } else {
              // Compare fetched_at dates - keep the one with the latest fetched_at
              const existingFetchedAt = existing.fetched_at ? new Date(existing.fetched_at).getTime() : 0;
              const currentFetchedAt = current.fetched_at ? new Date(current.fetched_at).getTime() : 0;
              if (currentFetchedAt > existingFetchedAt) {
                // Replace with the newer one
                const index = acc.indexOf(existing);
                acc[index] = current;
              }
            }
            return acc;
          }, [] as typeof data);

          // Sort by date descending and take the latest 12
          const sorted = deduplicated
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 12);

          setFinancialStatementsHistory(sorted);
        }
      });
  }, [supabase, ticker]);

  const handleAddToWorkspace = async () => {
    setAddingToWorkspace(true);
    try {
      await addCard(ticker, ["profile", "keyratios"]);
    } finally {
      setAddingToWorkspace(false);
    }
  };

  // Calculate health statuses
  const valuationStatus = calculateValuationStatus(
    valuationMetrics.currentPrice,
    valuationMetrics.dcfFairValue,
    valuationMetrics.peRatio,
    valuationMetrics.pegRatio
  );
  const qualityStatus = calculateQualityStatus(qualityMetrics.roic);
  const safetyStatus = calculateSafetyStatus(safetyMetrics.netDebtToEbitda);

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
        <Button onClick={handleAddToWorkspace} disabled={addingToWorkspace} size="sm" className="gap-2">
          {addingToWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          Add to Workspace
        </Button>
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
                status={Option.match(contrarianIndicators.analystConsensus, {
                  onNone: () => "Unknown",
                  onSome: (s) => s,
                })}
                statusColor="text-yellow-600"
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
                          return `Q${quarter}${year}`;
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Is the Business Good? (Quality)
              </CardTitle>
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
                  subtext="Cost of Capital"
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
                          // But verify and log to debug
                          if (typeof value !== 'string') {
                            console.warn('[ROIC Chart XAxis] Non-string value received:', typeof value, value);
                          }
                          // Verify it matches expected format
                          if (typeof value === 'string' && value.match(/^Q[1-4]\d{2}$/)) {
                            return value;
                          }
                          // If it's not the expected format, log and return as-is
                          console.error('[ROIC Chart XAxis] Unexpected dateLabel format:', value);
                          return String(value);
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value.toFixed(1) + "%"}
                      />
                      <Tooltip
                        formatter={(value: number) => value.toFixed(1) + "%"}
                        labelFormatter={(label) => {
                          // Recharts may pass the date as a Date object or string
                          // We need to handle both and parse explicitly to avoid timezone issues
                          let date: Date;

                          if (label instanceof Date) {
                            // If it's already a Date object, check if it was created from a string
                            // Use UTC methods to avoid timezone shifts
                            const year = label.getUTCFullYear();
                            const month = label.getUTCMonth();
                            const day = label.getUTCDate();
                            date = new Date(year, month, day); // Recreate in local time from UTC components
                          } else if (typeof label === 'string') {
                            // Parse date string (YYYY-MM-DD) explicitly to avoid timezone issues
                            const parts = label.split('-');
                            if (parts.length === 3) {
                              const year = parseInt(parts[0], 10);
                              const month = parseInt(parts[1], 10);
                              const day = parseInt(parts[2], 10);
                              date = new Date(year, month - 1, day); // month is 0-indexed, local time
                            } else {
                              // Fallback for other string formats
                              date = new Date(label);
                            }
                          } else {
                            // Fallback for other types
                            date = new Date(label);
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Is it Safe? (Balance Sheet)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between gap-4">
              <div className="flex-1 text-center p-4 border rounded">
                <div className="text-muted-foreground text-sm mb-1">Net Debt / EBITDA</div>
                <div className={cn(
                  "text-2xl font-bold",
                  Option.match(safetyMetrics.netDebtToEbitda, {
                    onNone: () => "text-muted-foreground",
                    onSome: (v) => v < 3 ? "text-green-600" : v < 5 ? "text-yellow-600" : "text-red-600",
                  })
                )}>
                  {Option.match(safetyMetrics.netDebtToEbitda, {
                    onNone: () => "...",
                    onSome: (v) => v.toFixed(1) + "x",
                  })}
                </div>
                <div className="text-xs text-muted-foreground">Safe (&lt; 3.0x)</div>
              </div>
              <div className="flex-1 text-center p-4 border rounded">
                <div className="text-muted-foreground text-sm mb-1">Altman Z-Score</div>
                <div className={cn(
                  "text-2xl font-bold",
                  Option.match(safetyMetrics.altmanZScore, {
                    onNone: () => "text-muted-foreground",
                    onSome: (v) => v > 3 ? "text-green-600" : v > 2.7 ? "text-yellow-600" : "text-red-600",
                  })
                )}>
                  {Option.match(safetyMetrics.altmanZScore, {
                    onNone: () => "...",
                    onSome: (v) => v.toFixed(1),
                  })}
                </div>
                <div className="text-xs text-muted-foreground">Safe Zone</div>
              </div>
              <div className="flex-1 text-center p-4 border rounded">
                <div className="text-muted-foreground text-sm mb-1">Interest Coverage</div>
                <div className="text-2xl font-bold">
                  {Option.match(safetyMetrics.interestCoverage, {
                    onNone: () => "...",
                    onSome: (v) => v.toFixed(0) + "x",
                  })}
                </div>
                <div className="text-xs text-muted-foreground">Can pay debts</div>
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

          {/* C2. Institutional Holdings - Coming Soon */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Smart Money
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Institutional holdings and smart money tracking will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* C3. Risk/Shorts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Contrarian Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Short Interest"
                value={Option.match(contrarianIndicators.shortInterest, {
                  onNone: () => null,
                  onSome: (v) => (v * 100).toFixed(1) + "%",
                })}
                subtext="Low Squeeze Risk"
              />
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
                  onNone: () => null,
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
// ============================================================================

interface ScorecardItemProps {
  icon: React.ReactNode;
  label: string;
  status: string;
  statusColor: string;
}

function ScorecardItem({ icon, label, status, statusColor }: ScorecardItemProps) {
  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={cn("font-bold text-lg truncate", statusColor)}>
        {status}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string | null;
  subtext?: string;
  highlight?: boolean;
}

function MetricRow({ label, value, subtext, highlight }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {subtext && <div className="text-xs text-muted-foreground/70">{subtext}</div>}
      </div>
      <div className={cn("text-base font-medium", highlight && "text-xl font-bold text-primary")}>
        {value || <div className="h-4 w-16 bg-muted animate-pulse rounded" />}
      </div>
    </div>
  );
}
