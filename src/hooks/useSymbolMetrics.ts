// src/hooks/useSymbolMetrics.ts
"use client";

import { useMemo } from "react";
import { Option } from "effect";
import type { Database } from "@/lib/supabase/database.types";
import type {
  ValuationsDBRow,
  GradesHistoricalDBRow,
  AnalystPriceTargetsDBRow,
  MarketRiskPremiumDBRow,
  TreasuryRateDBRow,
  RatiosTtmDBRow,
} from "@/lib/supabase/realtime-service";
import type { ProfileDBRow } from "@/hooks/useStockData";
import {
  calculateROIC,
  calculateFCFYield,
  calculateNetDebtToEbitda,
  calculateAltmanZScore,
  calculateInterestCoverage,
} from "@/lib/financial-calculations";
import type {
  ValuationMetrics,
  QualityMetrics,
  SafetyMetrics,
  InsiderActivity,
  ContrarianIndicators,
} from "@/lib/symbol-analysis/types";

type FinancialStatementDBRow = Database["public"]["Tables"]["financial_statements"]["Row"];

interface UseSymbolMetricsParams {
  profile: Option.Option<ProfileDBRow>;
  quote: Option.Option<Database["public"]["Tables"]["live_quote_indicators"]["Row"]>;
  ratios: Option.Option<RatiosTtmDBRow>;
  insiderStatistics: {
    total_acquired: number | null;
    total_disposed: number | null;
  }[];
  insiderTransactions: {
    reporting_name: string | null;
    acquisition_or_disposition: string | null;
    transaction_type: string | null;
    securities_transacted: number | null;
    transaction_date: string | null;
    filing_date: string | null;
  }[];
  valuations: ValuationsDBRow[];
  financialStatement: Option.Option<FinancialStatementDBRow>;
  financialStatementsHistory: FinancialStatementDBRow[];
  marketRiskPremiums: MarketRiskPremiumDBRow[];
  treasuryRates: TreasuryRateDBRow[];
  gradesHistorical: GradesHistoricalDBRow[];
  analystPriceTargets: Option.Option<AnalystPriceTargetsDBRow>;
}

export function useSymbolMetrics({
  profile,
  quote,
  ratios,
  insiderStatistics,
  insiderTransactions,
  valuations,
  financialStatement,
  financialStatementsHistory,
  marketRiskPremiums,
  treasuryRates,
  gradesHistorical,
  analystPriceTargets,
}: UseSymbolMetricsParams) {
  // Derived metrics (using real data from valuations table)
  const valuationMetrics: ValuationMetrics = useMemo(() => {
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
  }, [valuations, quote, ratios]);

  // Calculate Quality metrics from financial statements
  const qualityMetrics: QualityMetrics = useMemo(() => {
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
  }, [financialStatement, financialStatementsHistory, quote, ratios, profile, marketRiskPremiums, treasuryRates]);

  // Calculate Safety metrics from financial statements
  const safetyMetrics: SafetyMetrics = useMemo(() => {
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

    return {
      netDebtToEbitda,
      altmanZScore,
      interestCoverage,
    };
  }, [financialStatement, quote]);

  // Calculate insider activity from real data
  const insiderActivity: InsiderActivity = useMemo(() => {
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
      netBuyVolume: totalAcquiredDollars !== null ? Option.some(totalAcquiredDollars) : Option.none(),
      netSellVolume: totalDisposedDollars !== null ? Option.some(totalDisposedDollars) : Option.none(),
      netSentiment, // Net shares (bought - sold) for sentiment calculation
      latestTrade,
    };
  }, [insiderStatistics, insiderTransactions, quote]);

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

  const contrarianIndicators: ContrarianIndicators = useMemo(() => ({
    shortInterest: Option.none(), // Coming soon
    analystConsensus,
    priceTarget: Option.match(analystPriceTargets, {
      onNone: () => Option.none<number>(),
      onSome: (apt) => Option.some(apt.target_consensus),
    }),
  }), [analystConsensus, analystPriceTargets]);

  return {
    valuationMetrics,
    qualityMetrics,
    safetyMetrics,
    insiderActivity,
    contrarianIndicators,
    analystConsensus,
  };
}
