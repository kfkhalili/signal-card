// src/hooks/useSymbolAnalysisData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { Option } from "effect";
import { useAuth } from "@/contexts/AuthContext";
import { useStockData, type ProfileDBRow } from "@/hooks/useStockData";
import type { Database } from "@/lib/supabase/database.types";
import type {
  InsiderTradingStatisticsDBRow,
  InsiderTransactionsDBRow,
  ValuationsDBRow,
  GradesHistoricalDBRow,
  AnalystPriceTargetsDBRow,
  MarketRiskPremiumDBRow,
  TreasuryRateDBRow,
  MarketRiskPremiumPayload,
  RatiosTtmDBRow,
} from "@/lib/supabase/realtime-service";

type FinancialStatementDBRow = Database["public"]["Tables"]["financial_statements"]["Row"];

export interface SymbolAnalysisData {
  symbolValid: boolean | null; // null = checking, true = valid, false = invalid
  profile: Option.Option<ProfileDBRow>;
  quote: Option.Option<Database["public"]["Tables"]["live_quote_indicators"]["Row"]>;
  ratios: Option.Option<RatiosTtmDBRow>;
  insiderStatistics: InsiderTradingStatisticsDBRow[];
  insiderTransactions: InsiderTransactionsDBRow[];
  valuations: ValuationsDBRow[];
  financialStatement: Option.Option<FinancialStatementDBRow>;
  financialStatementsHistory: FinancialStatementDBRow[];
  marketRiskPremiums: MarketRiskPremiumDBRow[];
  treasuryRates: TreasuryRateDBRow[];
  gradesHistorical: GradesHistoricalDBRow[];
  analystPriceTargets: Option.Option<AnalystPriceTargetsDBRow>;
}

export function useSymbolAnalysisData(ticker: string, symbolValid: boolean | null) {
  const { supabase } = useAuth();

  // State
  const [profile, setProfile] = useState<Option.Option<ProfileDBRow>>(Option.none());
  const [quote, setQuote] = useState<Option.Option<Database["public"]["Tables"]["live_quote_indicators"]["Row"]>>(Option.none());
  const [ratios, setRatios] = useState<Option.Option<RatiosTtmDBRow>>(Option.none());
  const [insiderStatistics, setInsiderStatistics] = useState<InsiderTradingStatisticsDBRow[]>([]);
  const [insiderTransactions, setInsiderTransactions] = useState<InsiderTransactionsDBRow[]>([]);
  const [valuations, setValuations] = useState<ValuationsDBRow[]>([]);
  const [financialStatement, setFinancialStatement] = useState<Option.Option<FinancialStatementDBRow>>(Option.none());
  const [financialStatementsHistory, setFinancialStatementsHistory] = useState<FinancialStatementDBRow[]>([]);
  const [marketRiskPremiums, setMarketRiskPremiums] = useState<MarketRiskPremiumDBRow[]>([]);
  const [treasuryRates, setTreasuryRates] = useState<TreasuryRateDBRow[]>([]);
  const [gradesHistorical, setGradesHistorical] = useState<GradesHistoricalDBRow[]>([]);
  const [analystPriceTargets, setAnalystPriceTargets] = useState<Option.Option<AnalystPriceTargetsDBRow>>(Option.none());

  // Update handlers
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

  const handleGradesHistoricalUpdate = useCallback((gradesData: GradesHistoricalDBRow) => {
    setGradesHistorical((prev) => {
      const existing = prev.findIndex(
        (g) => g.symbol === gradesData.symbol && g.date === gradesData.date
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = gradesData;
        return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return [...prev, gradesData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, []);

  const handleAnalystPriceTargetsUpdate = useCallback((payload: { new: AnalystPriceTargetsDBRow | null; old: AnalystPriceTargetsDBRow | null }) => {
    if (payload.new) {
      setAnalystPriceTargets(Option.some(payload.new));
    } else if (payload.old && !payload.new) {
      setAnalystPriceTargets(Option.none());
    }
  }, []);

  // Use the existing useStockData hook for Realtime subscriptions
  useStockData({
    symbol: symbolValid === true ? ticker : "", // Only subscribe if symbol is valid
    onProfileUpdate: handleProfileUpdate,
    onLiveQuoteUpdate: handleQuoteUpdate,
    onRatiosTTMUpdate: handleRatiosUpdate,
    onInsiderTradingStatisticsUpdate: handleInsiderStatisticsUpdate,
    onInsiderTransactionsUpdate: handleInsiderTransactionsUpdate,
    onValuationsUpdate: handleValuationsUpdate,
    onFinancialStatementUpdate: handleFinancialStatementUpdate,
    onGradesHistoricalUpdate: handleGradesHistoricalUpdate,
  });

  // Subscribe to analyst_price_targets separately (not in useStockData yet)
  useEffect(() => {
    if (!supabase || !ticker || symbolValid !== true) return;

    const channel = supabase
      .channel(`analyst-price-targets-${ticker}`)
      .on<AnalystPriceTargetsDBRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "analyst_price_targets",
          filter: `symbol=eq.${ticker}`,
        },
        (payload) => {
          handleAnalystPriceTargetsUpdate({
            new: (payload.new as AnalystPriceTargetsDBRow) || null,
            old: (payload.old as AnalystPriceTargetsDBRow) || null,
          });
        }
      )
      .subscribe();

    // Fetch initial data
    supabase
      .from("analyst_price_targets")
      .select("*")
      .eq("symbol", ticker)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching analyst price targets:`, error);
          return;
        }
        if (data) {
          handleAnalystPriceTargetsUpdate({ new: data, old: null });
        }
      });

    // Fetch initial grades_historical
    supabase
      .from("grades_historical")
      .select("*")
      .eq("symbol", ticker)
      .order("date", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching grades historical:`, error);
          return;
        }
        if (data) {
          setGradesHistorical(data);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, ticker, symbolValid, handleAnalystPriceTargetsUpdate]);

  // Subscribe to global tables (market_risk_premiums, treasury_rates) for WACC
  useEffect(() => {
    if (!supabase) return;

    // Subscribe to market_risk_premiums (global table, no symbol filter)
    const mrpChannel = supabase
      .channel("market-risk-premiums-global")
      .on<MarketRiskPremiumDBRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "market_risk_premiums",
        },
        (payload: MarketRiskPremiumPayload) => {
          if (payload.new) {
            const newRecord = payload.new as MarketRiskPremiumDBRow;
            setMarketRiskPremiums((prev): MarketRiskPremiumDBRow[] => {
              const existing = prev.findIndex((m) => m.country === newRecord.country);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newRecord;
                return updated;
              }
              return [...prev, newRecord];
            });
          } else if (payload.old && !payload.new) {
            const oldRecord = payload.old as MarketRiskPremiumDBRow;
            setMarketRiskPremiums((prev): MarketRiskPremiumDBRow[] =>
              prev.filter((m) => m.country !== oldRecord.country)
            );
          }
        }
      )
      .subscribe();

    // Subscribe to treasury_rates (global table, no symbol filter)
    const trChannel = supabase
      .channel("treasury-rates-global")
      .on<TreasuryRateDBRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "treasury_rates",
        },
        (payload) => {
          if (payload.new) {
            const newRecord = payload.new as TreasuryRateDBRow;
            setTreasuryRates((prev): TreasuryRateDBRow[] => {
              const existing = prev.findIndex((t) => t.date === newRecord.date);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newRecord;
                return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              }
              return [...prev, newRecord].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            });
          } else if (payload.old && !payload.new) {
            const oldRecord = payload.old as TreasuryRateDBRow;
            setTreasuryRates((prev): TreasuryRateDBRow[] =>
              prev.filter((t) => t.date !== oldRecord.date)
            );
          }
        }
      )
      .subscribe();

    // Fetch initial data for global tables
    Promise.all([
      supabase
        .from("market_risk_premiums")
        .select("*")
        .then(({ data, error }) => {
          if (error) {
            console.error(`[SymbolAnalysisPage] Error fetching market risk premiums:`, error);
            return;
          }
          if (data) {
            setMarketRiskPremiums(data);
          }
        }),
      supabase
        .from("treasury_rates")
        .select("*")
        .order("date", { ascending: false })
        .limit(30) // Get last 30 days
        .then(({ data, error }) => {
          if (error) {
            console.error(`[SymbolAnalysisPage] Error fetching treasury rates:`, error);
            return;
          }
          if (data) {
            setTreasuryRates(data);
          }
        }),
    ]);

    return () => {
      supabase.removeChannel(mrpChannel);
      supabase.removeChannel(trChannel);
    };
  }, [supabase]);

  // Fetch historical financial statements for ROIC chart
  useEffect(() => {
    if (!supabase || !ticker || symbolValid !== true) return;

    supabase
      .from("financial_statements")
      .select("*")
      .eq("symbol", ticker)
      .eq("period", "FY") // Only annual reports
      .order("fetched_at", { ascending: false })
      .order("date", { ascending: false })
      .limit(20) // Get more than needed, then deduplicate
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching financial statements history:`, error);
          return;
        }
        if (data) {
          // Deduplicate: keep only the latest entry (by fetched_at) for each fiscal_year
          const deduplicated = data
            .reduce((acc: FinancialStatementDBRow[], item: FinancialStatementDBRow) => {
              const existing = acc.find((a) => a.fiscal_year === item.fiscal_year);
              if (!existing) {
                acc.push(item);
              } else {
                // Keep the one with the latest fetched_at
                const existingFetchedAt = new Date(existing.fetched_at).getTime();
                const itemFetchedAt = new Date(item.fetched_at).getTime();
                if (itemFetchedAt > existingFetchedAt) {
                  const index = acc.indexOf(existing);
                  acc[index] = item;
                }
              }
              return acc;
            }, [])
            .sort((a: FinancialStatementDBRow, b: FinancialStatementDBRow) => {
              // Sort by date descending
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            })
            .slice(0, 12); // Take latest 12 quarters (3 years)

          setFinancialStatementsHistory(deduplicated);
        }
      });
  }, [supabase, ticker, symbolValid]);

  // Fetch initial insider trading data and valuations
  useEffect(() => {
    if (!supabase || !ticker || symbolValid !== true) return;

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

    // Fetch latest financial statement for Safety metrics calculations (any period)
    supabase
      .from("financial_statements")
      .select("*")
      .eq("symbol", ticker)
      .order("date", { ascending: false })
      .order("fetched_at", { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[SymbolAnalysisPage] Error fetching latest financial statement:`, error);
          return;
        }
        if (data && data.length > 0) {
          setFinancialStatement(Option.some(data[0]));
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
          const deduplicated = data.reduce((acc: typeof data, current: typeof data[0]) => {
            const existing = acc.find((item: typeof data[0]) => item.fiscal_year === current.fiscal_year);
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
          }, [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 12); // Take latest 12 annual reports

          setFinancialStatementsHistory((prev) => {
            // Merge with existing data, deduplicate by fiscal_year
            const merged = [...prev, ...deduplicated].reduce((acc: typeof data, current: typeof data[0]) => {
              const existing = acc.find((item: typeof data[0]) => item.fiscal_year === current.fiscal_year);
              if (!existing) {
                acc.push(current);
              } else {
                const existingFetchedAt = existing.fetched_at ? new Date(existing.fetched_at).getTime() : 0;
                const currentFetchedAt = current.fetched_at ? new Date(current.fetched_at).getTime() : 0;
                if (currentFetchedAt > existingFetchedAt) {
                  const index = acc.indexOf(existing);
                  acc[index] = current;
                }
              }
              return acc;
            }, [])
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 12);
            return merged;
          });
        }
      });
  }, [supabase, ticker, symbolValid]);

  return {
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
  };
}
