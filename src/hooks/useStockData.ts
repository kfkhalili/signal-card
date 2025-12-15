// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { fromPromise, Result, ok } from "neverthrow";
import { Option } from "effect";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/supabase/database.types";
import { useRealtimeStock } from "@/contexts/RealtimeStockContext";
import {
  subscribeToAllSymbolUpdates,
  type UnifiedSymbolSubscriptionCallbacks,
  type ProfilePayload,
  type RatiosTtmPayload,
  type RatiosTtmDBRow,
  type FinancialStatementPayload,
  type DividendHistoryPayload,
  type DividendHistoryDBRow,
  type RevenueProductSegmentationPayload,
  type RevenueProductSegmentationDBRow,
  type GradesHistoricalPayload,
  type GradesHistoricalDBRow,
  type ExchangeVariantsPayload,
  type ExchangeVariantsDBRow,
  type InsiderTradingStatisticsPayload,
  type InsiderTradingStatisticsDBRow,
  type InsiderTransactionsPayload,
  type InsiderTransactionsDBRow,
  type ValuationsDBRow,
  type ValuationsPayload,
} from "@/lib/supabase/realtime-service";

export type ProfileDBRow = Database["public"]["Tables"]["profiles"]["Row"];
type LiveQuoteIndicatorDBRow =
  Database["public"]["Tables"]["live_quote_indicators"]["Row"];
type FinancialStatementDBRow =
  Database["public"]["Tables"]["financial_statements"]["Row"];
type ExchangeMarketStatusRecord =
  Database["public"]["Tables"]["exchange_market_status"]["Row"];

export type DerivedMarketStatus =
  | "Open"
  | "Closed"
  | "Delayed"
  | "Holiday"
  | "Unknown"
  | "Error"
  | "Fetching"
  | "Connecting"
  | "ClientUnavailable";

export interface MarketStatusUpdate {
  status: DerivedMarketStatus;
  message: string | null;
  openingTime: string | null;
  closingTime: string | null;
  timezone: string | null;
  exchangeName: string | null;
  exchangeCode: string | null;
}

interface UseStockDataProps {
  symbol: string;
  onProfileUpdate?: (profile: ProfileDBRow) => void;
  onLiveQuoteUpdate?: (
    quote: LiveQuoteIndicatorDBRow,
    source: "fetch" | "realtime"
  ) => void;
  onExchangeStatusUpdate?: (status: ExchangeMarketStatusRecord) => void;
  onFinancialStatementUpdate?: (statement: FinancialStatementDBRow) => void;
  onRatiosTTMUpdate?: (ratios: RatiosTtmDBRow) => void;
  onDividendHistoryUpdate?: (dividend: DividendHistoryDBRow) => void;
  onRevenueSegmentationUpdate?: (segmentation: RevenueProductSegmentationDBRow) => void;
  onGradesHistoricalUpdate?: (grades: GradesHistoricalDBRow) => void;
  onExchangeVariantsUpdate?: (variant: ExchangeVariantsDBRow) => void;
  onInsiderTradingStatisticsUpdate?: (statistics: InsiderTradingStatisticsDBRow) => void;
  onInsiderTransactionsUpdate?: (transaction: InsiderTransactionsDBRow) => void;
  onValuationsUpdate?: (valuation: ValuationsDBRow) => void;
}

async function fetchInitialProfile(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<ProfileDBRow>, Error>> {
  const result = await fromPromise(
    supabase.from("profiles").select("*").eq("symbol", symbol).maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialQuote(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<LiveQuoteIndicatorDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("live_quote_indicators")
      .select("*")
      .eq("symbol", symbol)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchExchangeStatus(
  supabase: SupabaseClient<Database>,
  exchangeCode: string
): Promise<Result<Option.Option<ExchangeMarketStatusRecord>, Error>> {
  const result = await fromPromise(
    supabase
      .from("exchange_market_status")
      .select("*")
      .eq("exchange_code", exchangeCode)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialFinancialStatement(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<FinancialStatementDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("financial_statements")
      .select("*")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialRatiosTTM(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<RatiosTtmDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("ratios_ttm")
      .select("*")
      .eq("symbol", symbol)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialDividendHistory(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<DividendHistoryDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("dividend_history")
      .select("*")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialRevenueSegmentation(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<RevenueProductSegmentationDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("revenue_product_segmentation")
      .select("*")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialGradesHistorical(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<GradesHistoricalDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("grades_historical")
      .select("*")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialExchangeVariants(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<ExchangeVariantsDBRow>, Error>> {
  const result = await fromPromise(
    supabase
      .from("exchange_variants")
      .select("*")
      .eq("symbol", symbol)
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialInsiderTradingStatistics(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<InsiderTradingStatisticsDBRow[]>, Error>> {
  const result = await fromPromise(
    supabase
      .from("insider_trading_statistics")
      .select("*")
      .eq("symbol", symbol)
      .order("year", { ascending: false })
      .order("quarter", { ascending: false })
      .limit(8), // Last 2 years (8 quarters)
    (e) => e as Error
  );
  return result.map((response) =>
    response.data && response.data.length > 0 ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialInsiderTransactions(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<InsiderTransactionsDBRow[]>, Error>> {
  const result = await fromPromise(
    supabase
      .from("insider_transactions")
      .select("*")
      .eq("symbol", symbol)
      .order("transaction_date", { ascending: false, nullsFirst: false })
      .order("filing_date", { ascending: false })
      .limit(100), // Recent 100 transactions
    (e) => e as Error
  );
  return result.map((response) =>
    response.data && response.data.length > 0 ? Option.some(response.data) : Option.none()
  );
}

async function fetchInitialValuations(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<Option.Option<ValuationsDBRow[]>, Error>> {
  const result = await fromPromise(
    supabase
      .from("valuations")
      .select("*")
      .eq("symbol", symbol)
      .eq("valuation_type", "dcf")
      .order("date", { ascending: false })
      .limit(90), // Last 90 days for chart
    (e) => e as Error
  );
  return result.map((response) =>
    response.data && response.data.length > 0 ? Option.some(response.data) : Option.none()
  );
}

export function useStockData({
  symbol,
  onProfileUpdate,
  onLiveQuoteUpdate,
  onExchangeStatusUpdate,
  onFinancialStatementUpdate,
  onRatiosTTMUpdate,
  onDividendHistoryUpdate,
  onRevenueSegmentationUpdate,
  onGradesHistoricalUpdate,
  onExchangeVariantsUpdate,
  onInsiderTradingStatisticsUpdate,
  onInsiderTransactionsUpdate,
  onValuationsUpdate,
}: UseStockDataProps): MarketStatusUpdate {
  const [profileData, setProfileData] = useState<Option.Option<ProfileDBRow>>(Option.none());
  const [latestQuote, setLatestQuote] = useState<Option.Option<LiveQuoteIndicatorDBRow>>(Option.none());
  const [exchangeStatus, setExchangeStatus] = useState<Option.Option<ExchangeMarketStatusRecord>>(Option.none());
  const [derivedMarketStatus, setDerivedMarketStatus] =
    useState<DerivedMarketStatus>("Fetching");
  const [marketStatusMessage, setMarketStatusMessage] = useState<Option.Option<string>>(
    Option.some("Initializing...")
  );
  const [openingTime, setOpeningTime] = useState<Option.Option<string>>(Option.none());
  const [closingTime, setClosingTime] = useState<Option.Option<string>>(Option.none());
  const [timezone, setTimezone] = useState<Option.Option<string>>(Option.none());

  const { supabase: supabaseClient } = useAuth();
  const { manager: realtimeManager } = useRealtimeStock();
  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // New effect for live quote handling via RealtimeStockManager
  useEffect(() => {
    if (!realtimeManager || !symbol) return;

    realtimeManager.addSymbol(symbol);

    const handleQuoteUpdate = (quote: LiveQuoteIndicatorDBRow) => {
      if (quote.symbol === symbol) {
        if (isMountedRef.current) {
          setLatestQuote(Option.some(quote));
          if (onLiveQuoteUpdate) {
            onLiveQuoteUpdate(quote, "realtime");
          }
        }
      }
    };

    realtimeManager.on("quote", handleQuoteUpdate);

    return () => {
      if (realtimeManager) {
        realtimeManager.removeListener("quote", handleQuoteUpdate);
        realtimeManager.removeSymbol(symbol);
      }
    };
  }, [symbol, realtimeManager, onLiveQuoteUpdate]);

  // New effect for exchange status handling via RealtimeStockManager
  useEffect(() => {
    if (!realtimeManager || !Option.isSome(profileData)) return;

    const exchangeCode = profileData.value.exchange;
    if (!exchangeCode) return;
    realtimeManager.addExchange(exchangeCode);

    const handleStatusUpdate = (status: ExchangeMarketStatusRecord) => {
      if (status.exchange_code === exchangeCode) {
        if (isMountedRef.current) {
          setExchangeStatus(Option.some(status));
          if (onExchangeStatusUpdate) onExchangeStatusUpdate(status);
        }
      }
    };

    realtimeManager.on("exchange_status", handleStatusUpdate);

    return () => {
      if (realtimeManager) {
        realtimeManager.removeListener("exchange_status", handleStatusUpdate);
        realtimeManager.removeExchange(exchangeCode);
      }
    };
  }, [profileData, realtimeManager, onExchangeStatusUpdate]);

  // Use refs to store latest callbacks to avoid recreating subscription on every render
  // This prevents infinite loops when callbacks are not memoized in parent components
  // Note: We store the hook's callbacks (which expect row data), not payload callbacks
  const callbacksRef = useRef<{
    onProfileUpdate?: (profile: ProfileDBRow) => void;
    onFinancialStatementUpdate?: (statement: FinancialStatementDBRow) => void;
    onRatiosTTMUpdate?: (ratios: RatiosTtmDBRow) => void;
    onDividendHistoryUpdate?: (dividend: DividendHistoryDBRow) => void;
    onRevenueSegmentationUpdate?: (segmentation: RevenueProductSegmentationDBRow) => void;
    onGradesHistoricalUpdate?: (grades: GradesHistoricalDBRow) => void;
    onExchangeVariantsUpdate?: (variant: ExchangeVariantsDBRow) => void;
    onInsiderTradingStatisticsUpdate?: (statistics: InsiderTradingStatisticsDBRow) => void;
    onInsiderTransactionsUpdate?: (transaction: InsiderTransactionsDBRow) => void;
    onValuationsUpdate?: (valuation: ValuationsDBRow) => void;
  }>({});
  const exchangeStatusRef = useRef(exchangeStatus);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);
  const isSubscribingRef = useRef(false); // Prevent concurrent subscription attempts

  // Update refs when props change (but don't trigger re-subscription)
  useEffect(() => {
    exchangeStatusRef.current = exchangeStatus;
  }, [exchangeStatus]);

  useEffect(() => {
    callbacksRef.current = {
      onProfileUpdate,
      onFinancialStatementUpdate,
      onRatiosTTMUpdate,
      onDividendHistoryUpdate,
      onRevenueSegmentationUpdate,
      onGradesHistoricalUpdate,
      onExchangeVariantsUpdate,
      onInsiderTradingStatisticsUpdate,
      onInsiderTransactionsUpdate,
      onValuationsUpdate,
    };
  }, [
    onProfileUpdate,
    onFinancialStatementUpdate,
    onRatiosTTMUpdate,
    onDividendHistoryUpdate,
    onRevenueSegmentationUpdate,
    onGradesHistoricalUpdate,
    onExchangeVariantsUpdate,
    onInsiderTradingStatisticsUpdate,
    onInsiderTransactionsUpdate,
    onValuationsUpdate,
  ]);

  // Unified subscription - ONE channel per symbol for ALL tables
  // This reduces channel count from ~8-9 per symbol to just 1 per symbol
  // CRITICAL: Track current symbol to prevent re-subscription on every render
  const currentSymbolRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabaseClient || !symbol) {
      // Clean up if symbol becomes invalid
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
        currentSymbolRef.current = null;
      }
      return;
    }

    // If already subscribed to this symbol, don't subscribe again
    if (isSubscribedRef.current && currentSymbolRef.current === symbol) return;

    // If currently subscribing, don't start another subscription
    if (isSubscribingRef.current) return;

    // If subscribed to a different symbol, unsubscribe first
    if (subscriptionRef.current && currentSymbolRef.current !== symbol) {
      subscriptionRef.current();
      subscriptionRef.current = null;
      isSubscribedRef.current = false;
    }

    // Mark as subscribing to prevent concurrent attempts
    isSubscribingRef.current = true;

    // Build callbacks object using refs to get latest callbacks
    const callbacks: UnifiedSymbolSubscriptionCallbacks = {};

    // Profile updates
    if (callbacksRef.current.onProfileUpdate) {
      callbacks.onProfileUpdate = (payload: ProfilePayload) => {
        if (payload.new && isMountedRef.current) {
          const updatedProfile = payload.new as ProfileDBRow;
          setProfileData(Option.some(updatedProfile));
          if (callbacksRef.current.onProfileUpdate) {
            callbacksRef.current.onProfileUpdate(updatedProfile);
          }

          // If profile arrives via realtime and has an exchange, fetch exchange status if not already fetched
          // CRITICAL: Use ref to check current status to avoid dependency on exchangeStatus in useEffect
          if (updatedProfile.exchange && Option.isNone(exchangeStatusRef.current)) {
            fetchExchangeStatus(supabaseClient, updatedProfile.exchange).then(
              (result) => {
                result.match(
                  (statusOption) => {
                    if (isMountedRef.current) {
                      setExchangeStatus(statusOption);
                      if (Option.isSome(statusOption) && onExchangeStatusUpdate) {
                        onExchangeStatusUpdate(statusOption.value);
                      }
                    }
                  },
                  (error) => {
                    console.error(
                      `[useStockData ${symbol}] Error fetching exchange status after profile update:`,
                      error
                    );
                  }
                );
              }
            );
          }
        }
      };
    }

    // Quote updates (handled by RealtimeStockManager, but we can also subscribe here if needed)
    // Note: Quote is typically handled by RealtimeStockManager, so we might skip this
    // But leaving the option open if needed

    // Financial statement updates
    if (callbacksRef.current.onFinancialStatementUpdate) {
      callbacks.onFinancialStatementUpdate = (payload: FinancialStatementPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onFinancialStatementUpdate) {
          const updatedStatement = payload.new as FinancialStatementDBRow;
          callbacksRef.current.onFinancialStatementUpdate(updatedStatement);
        }
      };
        }

    // Ratios TTM updates
    if (callbacksRef.current.onRatiosTTMUpdate) {
      callbacks.onRatiosTTMUpdate = (payload: RatiosTtmPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onRatiosTTMUpdate) {
          const updatedRatios = payload.new as RatiosTtmDBRow;
          callbacksRef.current.onRatiosTTMUpdate(updatedRatios);
        }
      };
        }

    // Dividend history updates
    if (callbacksRef.current.onDividendHistoryUpdate) {
      callbacks.onDividendHistoryUpdate = (payload: DividendHistoryPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onDividendHistoryUpdate) {
          const updatedDividend = payload.new as DividendHistoryDBRow;
          callbacksRef.current.onDividendHistoryUpdate(updatedDividend);
        }
      };
        }

    // Revenue segmentation updates
    if (callbacksRef.current.onRevenueSegmentationUpdate) {
      callbacks.onRevenueSegmentationUpdate = (payload: RevenueProductSegmentationPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onRevenueSegmentationUpdate) {
          const updatedSegmentation = payload.new as RevenueProductSegmentationDBRow;
          callbacksRef.current.onRevenueSegmentationUpdate(updatedSegmentation);
        }
      };
    }

    // Grades historical updates
    if (callbacksRef.current.onGradesHistoricalUpdate) {
      callbacks.onGradesHistoricalUpdate = (payload: GradesHistoricalPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onGradesHistoricalUpdate) {
          const updatedGrades = payload.new as GradesHistoricalDBRow;
          callbacksRef.current.onGradesHistoricalUpdate(updatedGrades);
        }
      };
    }

    // Exchange variants updates
    if (callbacksRef.current.onExchangeVariantsUpdate) {
      callbacks.onExchangeVariantsUpdate = (payload: ExchangeVariantsPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onExchangeVariantsUpdate) {
          const updatedVariant = payload.new as ExchangeVariantsDBRow;
          callbacksRef.current.onExchangeVariantsUpdate(updatedVariant);
        }
      };
    }

    // Insider trading statistics updates
    if (callbacksRef.current.onInsiderTradingStatisticsUpdate) {
      callbacks.onInsiderTradingStatisticsUpdate = (payload: InsiderTradingStatisticsPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onInsiderTradingStatisticsUpdate) {
          const updatedStats = payload.new as InsiderTradingStatisticsDBRow;
          callbacksRef.current.onInsiderTradingStatisticsUpdate(updatedStats);
        }
      };
    }

    // Insider transactions updates
    if (callbacksRef.current.onInsiderTransactionsUpdate) {
      callbacks.onInsiderTransactionsUpdate = (payload: InsiderTransactionsPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onInsiderTransactionsUpdate) {
          const updatedTransaction = payload.new as InsiderTransactionsDBRow;
          callbacksRef.current.onInsiderTransactionsUpdate(updatedTransaction);
        }
    };
    }

    // Valuations updates
    if (callbacksRef.current.onValuationsUpdate) {
      callbacks.onValuationsUpdate = (payload: ValuationsPayload) => {
        if (payload.new && isMountedRef.current && callbacksRef.current.onValuationsUpdate) {
          const updatedValuation = payload.new as ValuationsDBRow;
          callbacksRef.current.onValuationsUpdate(updatedValuation);
        }
      };
    }

    // Only subscribe if we have at least one callback
    if (Object.keys(callbacks).length === 0) return;

    // Mark as subscribed before creating subscription
    isSubscribedRef.current = true;
    currentSymbolRef.current = symbol;

    const unsubscribe = subscribeToAllSymbolUpdates(
      symbol,
      callbacks,
      (status, err) => {
        // Clear subscribing flag once subscription completes (success or error)
        isSubscribingRef.current = false;

        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Unified symbol Realtime subscription error:`,
            err
          );
          // On error, reset subscription state to allow retry
          // But don't immediately retry - let the effect handle it on next render
          isSubscribedRef.current = false;
          currentSymbolRef.current = null;
        } else if (status === "SUBSCRIBED") {
          // Successfully subscribed
          isSubscribingRef.current = false;
        }
      }
    );

    subscriptionRef.current = unsubscribe;

    return () => {
      isSubscribedRef.current = false;
      isSubscribingRef.current = false;
      currentSymbolRef.current = null;
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
    // CRITICAL: Only depend on symbol and supabaseClient
    // Callbacks are accessed via refs to prevent infinite re-subscriptions
    // onExchangeStatusUpdate removed - accessed via closure in callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    symbol,
    supabaseClient,
  ]);

  const fetchInitialData = useCallback(async (): Promise<Result<void, Error>> => {
    if (!isMountedRef.current || !supabaseClient || !symbol) {
      return ok(undefined);
    }

    // Fetch Profile
    const profileResult = await fetchInitialProfile(supabaseClient, symbol);
    if (!isMountedRef.current) return ok(undefined);

    const fetchedProfile = profileResult.match(
      (profileOption) => {
        // Option<ProfileDBRow> - Some(data) or None
        setProfileData(profileOption);
        if (Option.isSome(profileOption)) {
          if (onProfileUpdate) onProfileUpdate(profileOption.value);
        }
        return profileOption;
      },
      (error) => {
        // This branch is only for actual errors (network, auth, etc.)
        console.error(
          `[useStockData ${symbol}] Error fetching initial profile:`,
          error
        );
        return Option.none();
      }
    );

    // Fetch Quote
    const quoteResult = await fetchInitialQuote(supabaseClient, symbol);
    if (!isMountedRef.current) return ok(undefined);

    quoteResult.match(
      (quoteOption) => {
        // Option<LiveQuoteIndicatorDBRow> - Some(data) or None
        setLatestQuote(quoteOption);
        if (Option.isSome(quoteOption)) {
          if (onLiveQuoteUpdate) onLiveQuoteUpdate(quoteOption.value, "fetch");
        }
      },
      (error) => {
        // This branch is only for actual errors (network, auth, etc.)
        console.error(
          `[useStockData ${symbol}] Error fetching initial quote:`,
          error
        );
      }
    );

    // Fetch Exchange Status
    if (Option.isSome(fetchedProfile) && fetchedProfile.value.exchange) {
      const statusResult = await fetchExchangeStatus(
        supabaseClient,
        fetchedProfile.value.exchange
      );
      if (!isMountedRef.current) return ok(undefined);
      statusResult.match(
        (statusOption) => {
          // Option<ExchangeMarketStatusRecord> - Some(data) or None
          setExchangeStatus(statusOption);
          if (Option.isSome(statusOption)) {
            if (onExchangeStatusUpdate) onExchangeStatusUpdate(statusOption.value);
          }
        },
        (error) => {
          // This branch is only for actual errors (network, auth, etc.)
          console.error(
            `[useStockData ${symbol}] Error fetching initial exchange status:`,
            error
          );
        }
      );
    }

    // Fetch Financial Statement (only if callback is provided AND profile exists)
    // The callback is only provided when there are cards that need financial statements
    // This prevents unnecessary fetches when only viewing profile/price cards
    if (Option.isSome(fetchedProfile) && onFinancialStatementUpdate) {
      const statementResult = await fetchInitialFinancialStatement(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      statementResult.match(
        (statementOption) => {
          // Option<FinancialStatementDBRow> - Some(data) or None
          if (Option.isSome(statementOption) && onFinancialStatementUpdate) {
            onFinancialStatementUpdate(statementOption.value);
          }
        },
        (error) => {
          // This branch is only for actual errors (network, auth, etc.)
          console.error(
            `[useStockData ${symbol}] Error fetching initial financial statement:`,
            error
          );
        }
      );
    }

    // Fetch Ratios TTM (only if callback is provided)
    if (onRatiosTTMUpdate) {
      const ratiosResult = await fetchInitialRatiosTTM(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      ratiosResult.match(
        (ratiosOption) => {
          if (Option.isSome(ratiosOption) && onRatiosTTMUpdate) {
            onRatiosTTMUpdate(ratiosOption.value);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial ratios TTM:`,
            error
          );
        }
      );
    }

    // Fetch Dividend History (only if callback is provided)
    if (onDividendHistoryUpdate) {
      const dividendResult = await fetchInitialDividendHistory(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      dividendResult.match(
        (dividendOption) => {
          if (Option.isSome(dividendOption) && onDividendHistoryUpdate) {
            onDividendHistoryUpdate(dividendOption.value);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial dividend history:`,
            error
          );
        }
      );
    }

    // Fetch Revenue Segmentation (only if callback is provided)
    if (onRevenueSegmentationUpdate) {
      const segmentationResult = await fetchInitialRevenueSegmentation(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      segmentationResult.match(
        (segmentationOption) => {
          if (Option.isSome(segmentationOption) && onRevenueSegmentationUpdate) {
            onRevenueSegmentationUpdate(segmentationOption.value);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial revenue segmentation:`,
            error
          );
        }
      );
    }

    // Fetch Grades Historical (only if callback is provided)
    if (onGradesHistoricalUpdate) {
      const gradesResult = await fetchInitialGradesHistorical(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      gradesResult.match(
        (gradesOption) => {
          if (Option.isSome(gradesOption) && onGradesHistoricalUpdate) {
            onGradesHistoricalUpdate(gradesOption.value);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial grades historical:`,
            error
          );
        }
      );
    }

    // Fetch Exchange Variants (only if callback is provided)
    if (onExchangeVariantsUpdate) {
      const variantsResult = await fetchInitialExchangeVariants(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      variantsResult.match(
        (variantsOption) => {
          if (Option.isSome(variantsOption) && onExchangeVariantsUpdate) {
            onExchangeVariantsUpdate(variantsOption.value);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial exchange variants:`,
            error
          );
        }
      );
    }

    // Fetch Insider Trading Statistics (only if callback is provided)
    if (onInsiderTradingStatisticsUpdate) {
      const statsResult = await fetchInitialInsiderTradingStatistics(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      statsResult.match(
        (statsOption) => {
          if (Option.isSome(statsOption) && statsOption.value.length > 0) {
            // Call callback with the most recent quarter
            onInsiderTradingStatisticsUpdate(statsOption.value[0]);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial insider trading statistics:`,
            error
          );
        }
      );
    }

    // Fetch Insider Transactions (only if callback is provided)
    if (onInsiderTransactionsUpdate) {
      const transactionsResult = await fetchInitialInsiderTransactions(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      transactionsResult.match(
        (transactionsOption) => {
          if (Option.isSome(transactionsOption) && transactionsOption.value.length > 0) {
            // Call callback with the most recent transaction
            onInsiderTransactionsUpdate(transactionsOption.value[0]);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial insider transactions:`,
            error
          );
        }
      );
    }

    if (onValuationsUpdate) {
      const valuationsResult = await fetchInitialValuations(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return ok(undefined);
      valuationsResult.match(
        (valuationsOption) => {
          if (Option.isSome(valuationsOption) && valuationsOption.value.length > 0) {
            // Call callback with the most recent DCF valuation
            onValuationsUpdate(valuationsOption.value[0]);
          }
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Error fetching initial valuations:`,
            error
          );
        }
      );
    }

    return ok(undefined);
  }, [
    symbol,
    supabaseClient,
    onProfileUpdate,
    onLiveQuoteUpdate,
    onExchangeStatusUpdate,
    onFinancialStatementUpdate,
    onRatiosTTMUpdate,
    onDividendHistoryUpdate,
    onRevenueSegmentationUpdate,
    onGradesHistoricalUpdate,
    onExchangeVariantsUpdate,
    onInsiderTradingStatisticsUpdate,
    onInsiderTransactionsUpdate,
    onValuationsUpdate,
  ]);

  useEffect(() => {
    void fetchInitialData().then((result) => {
      result.match(
        () => {
          // Success - all data fetched and handled internally
        },
        (error) => {
          console.error(
            `[useStockData ${symbol}] Unhandled error in fetchInitialData`,
            error.message
          );
        }
      );
    });
  }, [symbol, supabaseClient, fetchInitialData]);

  // Extract values for stable dependency comparison
  // Option objects are compared by reference, so we need to extract values
  // to prevent infinite re-renders
  const profileExchange = Option.isSome(profileData) ? profileData.value.exchange : null;
  const quoteExchange = Option.isSome(latestQuote) ? latestQuote.value.exchange : null;
  const exchangeStatusValue = Option.isSome(exchangeStatus) ? exchangeStatus.value : null;
  const latestQuoteValue = Option.isSome(latestQuote) ? latestQuote.value : null;

  useEffect(() => {
    const relevantExchangeCode = profileExchange || quoteExchange || null;

    if (!relevantExchangeCode) return;

    if (exchangeStatusValue) {
      // Schedule state updates to avoid cascading renders
      queueMicrotask(() => {
        setOpeningTime(
          exchangeStatusValue.opening_time_local
            ? Option.some(exchangeStatusValue.opening_time_local)
            : Option.none()
        );
        setClosingTime(
          exchangeStatusValue.closing_time_local
            ? Option.some(exchangeStatusValue.closing_time_local)
            : Option.none()
        );
        setTimezone(
          exchangeStatusValue.timezone
            ? Option.some(exchangeStatusValue.timezone)
            : Option.none()
        );
      });
    } else {
      // Schedule state updates to avoid cascading renders
      queueMicrotask(() => {
        setOpeningTime(Option.none());
        setClosingTime(Option.none());
        setTimezone(Option.none());
      });
    }

    if (!exchangeStatusValue) {
      // Schedule state updates to avoid cascading renders
      queueMicrotask(() => {
        setDerivedMarketStatus("Connecting");
        setMarketStatusMessage(
          Option.some(`Connecting to market status for ${relevantExchangeCode}...`)
        );
      });
      return;
    }

    const status = exchangeStatusValue;
    let newStatus: DerivedMarketStatus;
    let newMessage: Option.Option<string>;

    if (status.current_day_is_holiday) {
      newStatus = "Holiday";
      newMessage = Option.fromNullable(
        status.status_message ||
        `Market Closed (Holiday: ${
          status.current_holiday_name || "Official Holiday"
        })`
      );
    } else if (status.is_market_open) {
      if (latestQuoteValue?.api_timestamp) {
        const diffMinutes =
          (Date.now() - latestQuoteValue.api_timestamp * 1000) / 60000;
        newStatus = diffMinutes > 15 ? "Delayed" : "Open";
        newMessage = Option.fromNullable(
          status.status_message ||
          (newStatus === "Delayed" ? "Live data is delayed." : null)
        );
      } else {
        newStatus = "Open";
        newMessage = Option.fromNullable(status.status_message || "Awaiting first quote");
      }
    } else {
      newStatus = "Closed";
      newMessage = Option.fromNullable(status.status_message);
    }

    // Schedule state updates to avoid cascading renders
    queueMicrotask(() => {
      setDerivedMarketStatus((prevStatus) =>
        prevStatus !== newStatus ? newStatus : prevStatus
      );
      setMarketStatusMessage((prevMessage) =>
        Option.isSome(prevMessage) && Option.isSome(newMessage) && prevMessage.value === newMessage.value
          ? prevMessage
          : newMessage
      );
    });
  }, [profileExchange, quoteExchange, exchangeStatusValue, latestQuoteValue]);

  return {
    status: derivedMarketStatus,
    // Convert Option<T> to T | null for backward compatibility with consumers
    message: Option.isSome(marketStatusMessage) ? marketStatusMessage.value : null,
    openingTime: Option.isSome(openingTime) ? openingTime.value : null,
    closingTime: Option.isSome(closingTime) ? closingTime.value : null,
    timezone: Option.isSome(timezone) ? timezone.value : null,
    exchangeName: Option.isSome(exchangeStatus) ? exchangeStatus.value.name : null,
    exchangeCode: Option.isSome(exchangeStatus) ? exchangeStatus.value.exchange_code : null,
  };
}
