import { useState, useEffect, useCallback } from "react";
import { Option } from "effect";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/supabase/database.types";
import { useStockData, type ProfileDBRow } from "@/hooks/useStockData";
import type { 
  InsiderTransactionsDBRow, 
  ValuationsDBRow, 
  GradesHistoricalDBRow, 
  AnalystPriceTargetsDBRow,
  MarketRiskPremiumDBRow,
  TreasuryRateDBRow,
  MarketRiskPremiumPayload,
  RatiosTtmDBRow
} from "@/lib/supabase/realtime-service";

type FinancialStatementDBRow = Database["public"]["Tables"]["financial_statements"]["Row"];
type DataQualityIssueDBRow = Database["public"]["Tables"]["data_quality_issues"]["Row"];

export function useSymbolAnalysisData(ticker: string) {
  const { supabase } = useAuth();
  const [symbolValid, setSymbolValid] = useState<boolean | null>(null); // null = checking, true = valid, false = invalid
  const [profile, setProfile] = useState<Option.Option<ProfileDBRow>>(Option.none());
  const [quote, setQuote] = useState<Option.Option<Database["public"]["Tables"]["live_quote_indicators"]["Row"]>>(Option.none());
  const [ratios, setRatios] = useState<Option.Option<RatiosTtmDBRow>>(Option.none());
  const [insiderTransactions, setInsiderTransactions] = useState<InsiderTransactionsDBRow[]>([]);
  const [valuations, setValuations] = useState<ValuationsDBRow[]>([]);
  const [financialStatement, setFinancialStatement] = useState<Option.Option<FinancialStatementDBRow>>(Option.none());
  const [financialStatementsHistory, setFinancialStatementsHistory] = useState<FinancialStatementDBRow[]>([]);
  const [marketRiskPremiums, setMarketRiskPremiums] = useState<MarketRiskPremiumDBRow[]>([]);
  const [treasuryRates, setTreasuryRates] = useState<TreasuryRateDBRow[]>([]);
  const [gradesHistorical, setGradesHistorical] = useState<GradesHistoricalDBRow[]>([]);
  const [analystPriceTargets, setAnalystPriceTargets] = useState<Option.Option<AnalystPriceTargetsDBRow>>(Option.none());
  const [dataQualityIssues, setDataQualityIssues] = useState<DataQualityIssueDBRow[]>([]);
  const [isDataQualityLoading, setIsDataQualityLoading] = useState(true);
  const [dataQualityError, setDataQualityError] = useState<string | null>(null);
  const [dataQualityLoadedSymbol, setDataQualityLoadedSymbol] = useState("");

  const handleProfileUpdate = useCallback((profileData: ProfileDBRow) => {
    setProfile(Option.some(profileData));
  }, []);

  const handleQuoteUpdate = useCallback((quoteData: Database["public"]["Tables"]["live_quote_indicators"]["Row"]) => {
    setQuote(Option.some(quoteData));
  }, []);

  const handleRatiosUpdate = useCallback((ratiosData: RatiosTtmDBRow) => {
    setRatios(Option.some(ratiosData));
  }, []);

  const handleInsiderStatisticsUpdate = useCallback(() => {
    return null
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
    setFinancialStatement((prev) => {
      if (Option.isNone(prev)) {
        return Option.some(statementData);
      }
      const prevDate = new Date(prev.value.date);
      const newDate = new Date(statementData.date);
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

  const handleDataQualityIssueChange = useCallback(
    (next: DataQualityIssueDBRow | null, previousId: string | null) => {
      setDataQualityIssues((current) => {
        const withoutPrevious = previousId
          ? current.filter((issue) => issue.id !== previousId)
          : current;

        if (!next || next.status !== "open") {
          return withoutPrevious;
        }

        return [
          ...withoutPrevious.filter((issue) => issue.id !== next.id),
          next,
        ];
      });
    },
    []
  );

  useStockData({
    symbol: symbolValid === true ? ticker : "",
    onProfileUpdate: handleProfileUpdate,
    onLiveQuoteUpdate: handleQuoteUpdate,
    onRatiosTTMUpdate: handleRatiosUpdate,
    onInsiderTradingStatisticsUpdate: handleInsiderStatisticsUpdate,
    onInsiderTransactionsUpdate: handleInsiderTransactionsUpdate,
    onValuationsUpdate: handleValuationsUpdate,
    onFinancialStatementUpdate: handleFinancialStatementUpdate,
    onGradesHistoricalUpdate: handleGradesHistoricalUpdate,
  });

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

    supabase
      .from("analyst_price_targets")
      .select("*")
      .eq("symbol", ticker)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(`[useSymbolAnalysisData] Error fetching analyst price targets:`, error);
          return;
        }
        if (data) {
          handleAnalystPriceTargetsUpdate({ new: data, old: null });
        }
      });

    supabase
      .from("grades_historical")
      .select("*")
      .eq("symbol", ticker)
      .order("date", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[useSymbolAnalysisData] Error fetching grades historical:`, error);
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

  useEffect(() => {
    if (!supabase || !ticker || symbolValid !== true) {
      return;
    }

    let cancelled = false;

    const channel = supabase
      .channel(`data-quality-${ticker}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "data_quality_issues",
          filter: `symbol=eq.${ticker}`,
        },
        (payload) => {
          const next = payload.new && Object.keys(payload.new).length > 0
            ? payload.new as DataQualityIssueDBRow
            : null;
          const previous = payload.old && Object.keys(payload.old).length > 0
            ? payload.old as Partial<DataQualityIssueDBRow>
            : null;

          handleDataQualityIssueChange(next, previous?.id ?? null);
        }
      )
      .subscribe();

    const loadIssues = async () => {
      const { data, error } = await supabase
        .from("data_quality_issues")
        .select("*")
        .eq("symbol", ticker)
        .eq("status", "open")
        .order("last_seen_at", { ascending: false });

      if (cancelled) return;

      setDataQualityLoadedSymbol(ticker);
      if (error) {
        console.error(
          `[useSymbolAnalysisData] Error fetching data-quality issues:`,
          error
        );
        setDataQualityError("Data-quality checks could not be loaded.");
        setDataQualityIssues([]);
      } else {
        setDataQualityError(null);
        setDataQualityIssues(data ?? []);
      }
      setIsDataQualityLoading(false);
    };

    void loadIssues();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    ticker,
    symbolValid,
    handleDataQualityIssueChange,
  ]);

  useEffect(() => {
    if (!supabase) return;

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

    Promise.all([
      supabase
        .from("market_risk_premiums")
        .select("*")
        .then(({ data, error }) => {
          if (error) {
            console.error(`[useSymbolAnalysisData] Error fetching market risk premiums:`, error);
            return;
          }
          if (data) setMarketRiskPremiums(data);
        }),
      supabase
        .from("treasury_rates")
        .select("*")
        .order("date", { ascending: false })
        .limit(30)
        .then(({ data, error }) => {
          if (error) {
            console.error(`[useSymbolAnalysisData] Error fetching treasury rates:`, error);
            return;
          }
          if (data) setTreasuryRates(data);
        }),
    ]);

    return () => {
      supabase.removeChannel(mrpChannel);
      supabase.removeChannel(trChannel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !ticker || symbolValid !== true) return;

    supabase
      .from("financial_statements")
      .select("*")
      .eq("symbol", ticker)
      .eq("period", "FY")
      .order("fetched_at", { ascending: false })
      .order("date", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[useSymbolAnalysisData] Error fetching financial statements history:`, error);
          return;
        }
        if (data) {
          const deduplicated = data
            .reduce((acc: FinancialStatementDBRow[], item: FinancialStatementDBRow) => {
              const existing = acc.find((a) => a.fiscal_year === item.fiscal_year);
              if (!existing) {
                acc.push(item);
              } else {
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
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            })
            .slice(0, 12);

          setFinancialStatementsHistory(deduplicated);
        }
      });
  }, [supabase, ticker, symbolValid]);

  useEffect(() => {
    if (!supabase || !ticker || symbolValid !== true) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    supabase
      .from("insider_transactions")
      .select("*")
      .eq("symbol", ticker)
      .gte("transaction_date", sixMonthsAgoStr)
      .order("transaction_date", { ascending: false, nullsFirst: false })
      .order("filing_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(`[useSymbolAnalysisData] Error fetching insider transactions:`, error);
        if (data) setInsiderTransactions(data);
      });

    supabase
      .from("valuations")
      .select("*")
      .eq("symbol", ticker)
      .eq("valuation_type", "dcf")
      .order("date", { ascending: false })
      .limit(180)
      .then(({ data, error }) => {
        if (error) console.error(`[useSymbolAnalysisData] Error fetching valuations:`, error);
        if (data) setValuations(data);
      });

    supabase
      .from("financial_statements")
      .select("*")
      .eq("symbol", ticker)
      .order("date", { ascending: false })
      .order("fetched_at", { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) console.error(`[useSymbolAnalysisData] Error fetching latest financial statement:`, error);
        if (data && data.length > 0) setFinancialStatement(Option.some(data[0]));
      });
  }, [supabase, ticker, symbolValid]);

  useEffect(() => {
    if (!supabase || !ticker) return;

    supabase
      .from("listed_symbols")
      .select("symbol")
      .eq("symbol", ticker)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(`[useSymbolAnalysisData] Error checking symbol validity:`, error);
          setSymbolValid(true);
          return;
        }
        if (!data) {
          setSymbolValid(false);
        } else {
          setSymbolValid(true);
        }
      });
  }, [supabase, ticker]);

  return {
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
    dataQualityIssues:
      dataQualityLoadedSymbol === ticker ? dataQualityIssues : [],
    isDataQualityLoading:
      dataQualityLoadedSymbol === ticker ? isDataQualityLoading : true,
    dataQualityError:
      dataQualityLoadedSymbol === ticker ? dataQualityError : null,
  };
}
