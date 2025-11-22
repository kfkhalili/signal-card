"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Option } from "effect";
import { useAuth } from "@/contexts/AuthContext";
import type { InsiderTradingStatisticsDBRow, InsiderTransactionsDBRow } from "@/lib/supabase/realtime-service";
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
import { useStockData, type ProfileDBRow } from "@/hooks/useStockData";
import { formatFinancialValue } from "@/lib/formatters";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { RatiosTtmDBRow } from "@/lib/supabase/realtime-service";
import type { Database } from "@/lib/supabase/database.types";
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
  roicHistory: { date: string; roic: number; wacc: number }[];
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

interface InstitutionalData {
  institutionOwnership: Option.Option<number>;
  hedgeFundOwnership: Option.Option<number>;
  notableOwners: { name: string; position: string }[];
}

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
  dcf: Option.Option<number>
): { status: HealthStatus; color: string } {
  if (Option.isNone(price) || Option.isNone(dcf)) {
    return { status: "Unknown", color: "text-muted-foreground" };
  }

  const priceVal = price.value;
  const dcfVal = dcf.value;
  const discount = ((dcfVal - priceVal) / dcfVal) * 100;

  if (discount > 20) return { status: "Undervalued", color: "text-green-600" };
  if (discount < -20) return { status: "Overvalued", color: "text-red-600" };
  return { status: "Fair", color: "text-yellow-600" };
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

  // Derived metrics (placeholders for now - will be calculated from real data)
  const valuationMetrics: ValuationMetrics = {
    dcfFairValue: Option.some(145.0), // TODO: Calculate from financials
    currentPrice: Option.match(quote, {
      onNone: () => Option.none<number>(),
      onSome: (q) => q.current_price ? Option.some(q.current_price) : Option.none<number>(),
    }),
    peRatio: Option.match(ratios, {
      onNone: () => Option.none<number>(),
      onSome: (r) => r.price_to_earnings_ratio_ttm ? Option.some(r.price_to_earnings_ratio_ttm) : Option.none<number>(),
    }),
    pegRatio: Option.some(1.1),
    priceHistory: [], // TODO: Fetch historical price data
  };

  const qualityMetrics: QualityMetrics = {
    roic: Option.some(22.0), // TODO: Calculate from financials
    wacc: Option.some(8.5), // TODO: Calculate
    grossMargin: Option.match(ratios, {
      onNone: () => Option.none<number>(),
      onSome: (r) => r.gross_profit_margin_ttm ? Option.some(r.gross_profit_margin_ttm) : Option.none<number>(),
    }),
    fcfYield: Option.some(4.2),
    roicHistory: [], // TODO: Fetch historical ROIC data
  };

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

    // Convert to dollar values using current price (approximation)
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

  const institutionalData: InstitutionalData = {
    institutionOwnership: Option.some(72),
    hedgeFundOwnership: Option.some(12),
    notableOwners: [{ name: "Berkshire Hathaway", position: "New Position" }],
  };

  const contrarianIndicators: ContrarianIndicators = {
    shortInterest: Option.some(2.1),
    analystConsensus: Option.some("Buy"),
    priceTarget: Option.some(180),
  };

  // Use the existing useStockData hook for Realtime subscriptions
  useStockData({
    symbol: ticker,
    onProfileUpdate: (profileData) => {
      setProfile(Option.some(profileData));
    },
    onLiveQuoteUpdate: (quoteData) => {
      setQuote(Option.some(quoteData));
    },
    onRatiosTTMUpdate: (ratiosData) => {
      setRatios(Option.some(ratiosData));
    },
    onInsiderTradingStatisticsUpdate: (statsData) => {
      // Add or update the statistics record
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
    },
    onInsiderTransactionsUpdate: (transactionData) => {
      // Add or update the transaction record
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
    },
  });

  // Fetch initial insider trading data
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
    valuationMetrics.dcfFairValue
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
              <ScorecardItem
                icon={<DollarSign className="h-4 w-4" />}
                label="Valuation"
                status={valuationStatus.status}
                statusColor={valuationStatus.color}
              />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Is it Cheap? (Valuation)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DCF vs Price Chart */}
              <div className="h-48">
                {valuationMetrics.priceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={valuationMetrics.priceHistory}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
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
                    <span className="text-sm text-muted-foreground">DCF vs Price Chart (Loading...)</span>
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
              </div>
              {/* ROIC vs WACC Trend Chart */}
              <div className="h-48">
                {qualityMetrics.roicHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={qualityMetrics.roicHistory}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
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
                    <span className="text-sm text-muted-foreground">ROIC vs WACC Trend (Loading...)</span>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Insider Activity
                  </CardTitle>
                  <CardDescription>Last 6 Months</CardDescription>
                </div>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Buying</span>
                  <span className="text-green-600 font-bold">
                    {Option.match(insiderActivity.netBuyVolume, {
                      onNone: () => "...",
                      onSome: (v) => formatFinancialValue(v, "USD", 1, exchangeRates),
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Selling</span>
                  <span className="text-red-600 font-bold">
                    {Option.match(insiderActivity.netSellVolume, {
                      onNone: () => "...",
                      onSome: (v) => formatFinancialValue(v, "USD", 1, exchangeRates),
                    })}
                  </span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Latest:{" "}
                  {Option.match(insiderActivity.latestTrade, {
                    onNone: () => "No recent trades",
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Smart Money
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Institutions"
                value={Option.match(institutionalData.institutionOwnership, {
                  onNone: () => null,
                  onSome: (v) => (v * 100).toFixed(0) + "%",
                })}
              />
              <MetricRow
                label="Hedge Funds"
                value={Option.match(institutionalData.hedgeFundOwnership, {
                  onNone: () => null,
                  onSome: (v) => (v * 100).toFixed(0) + "%",
                })}
              />
              {institutionalData.notableOwners.length > 0 && (
                <div className="p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                  Notable Owner: <strong>{institutionalData.notableOwners[0].name}</strong> ({institutionalData.notableOwners[0].position})
                </div>
              )}
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
