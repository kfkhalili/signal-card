// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { fromPromise, Result, ok } from "neverthrow";
import { Option } from "effect";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/supabase/database.types";
import { useRealtimeStock } from "@/contexts/RealtimeStockContext";
import {
  subscribeToProfileUpdates,
  type ProfilePayload,
  subscribeToRatiosTTMUpdates,
  type RatiosTtmPayload,
  type RatiosTtmDBRow,
  subscribeToFinancialStatementUpdates,
  type FinancialStatementPayload,
  subscribeToDividendHistoryUpdates,
  type DividendHistoryPayload,
  type DividendHistoryDBRow,
  subscribeToRevenueProductSegmentationUpdates,
  type RevenueProductSegmentationPayload,
  type RevenueProductSegmentationDBRow,
  subscribeToGradesHistoricalUpdates,
  type GradesHistoricalPayload,
  type GradesHistoricalDBRow,
  subscribeToExchangeVariantsUpdates,
  type ExchangeVariantsPayload,
  type ExchangeVariantsDBRow,
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
      .eq("base_symbol", symbol)
      .limit(1)
      .maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) =>
    response.data ? Option.some(response.data) : Option.none()
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
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[useStockData ${symbol}] Received quote update from RealtimeStockManager`,
          quote
        );
      }
      if (quote.symbol === symbol) {
        if (isMountedRef.current) {
          setLatestQuote(Option.some(quote));
          if (onLiveQuoteUpdate) {
            if (process.env.NODE_ENV === "development") {
              console.log(
                `[useStockData ${symbol}] Calling onLiveQuoteUpdate callback`
              );
            }
            onLiveQuoteUpdate(quote, "realtime");
          } else {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `[useStockData ${symbol}] onLiveQuoteUpdate callback is not provided`
              );
            }
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

  // New effect for profile updates via Realtime
  useEffect(() => {
    if (!supabaseClient || !symbol) return;

    const unsubscribe = subscribeToProfileUpdates(
      symbol,
      (payload: ProfilePayload) => {
        if (payload.new && isMountedRef.current) {
          const updatedProfile = payload.new as ProfileDBRow;
          setProfileData(Option.some(updatedProfile));
          if (onProfileUpdate) onProfileUpdate(updatedProfile);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Profile Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onProfileUpdate]);

  // New effect for financial statement updates via Realtime
  // Only subscribe if callback is provided
  useEffect(() => {
    if (!supabaseClient || !symbol || !onFinancialStatementUpdate) return;

    const unsubscribe = subscribeToFinancialStatementUpdates(
      symbol,
      (payload: FinancialStatementPayload) => {
        if (payload.new && isMountedRef.current && onFinancialStatementUpdate) {
          const updatedStatement = payload.new as FinancialStatementDBRow;
          onFinancialStatementUpdate(updatedStatement);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Financial Statement Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onFinancialStatementUpdate]);

  // New effect for ratios TTM updates via Realtime
  // Only subscribe if callback is provided
  useEffect(() => {
    if (!supabaseClient || !symbol || !onRatiosTTMUpdate) return;

    const unsubscribe = subscribeToRatiosTTMUpdates(
      symbol,
      (payload: RatiosTtmPayload) => {
        if (payload.new && isMountedRef.current && onRatiosTTMUpdate) {
          const updatedRatios = payload.new as RatiosTtmDBRow;
          onRatiosTTMUpdate(updatedRatios);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Ratios TTM Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onRatiosTTMUpdate]);

  // New effect for dividend history updates via Realtime
  useEffect(() => {
    if (!supabaseClient || !symbol || !onDividendHistoryUpdate) return;

    const unsubscribe = subscribeToDividendHistoryUpdates(
      symbol,
      (payload: DividendHistoryPayload) => {
        if (payload.new && isMountedRef.current && onDividendHistoryUpdate) {
          const updatedDividend = payload.new as DividendHistoryDBRow;
          onDividendHistoryUpdate(updatedDividend);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Dividend History Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onDividendHistoryUpdate]);

  // New effect for revenue product segmentation updates via Realtime
  useEffect(() => {
    if (!supabaseClient || !symbol || !onRevenueSegmentationUpdate) return;

    const unsubscribe = subscribeToRevenueProductSegmentationUpdates(
      symbol,
      (payload: RevenueProductSegmentationPayload) => {
        if (payload.new && isMountedRef.current && onRevenueSegmentationUpdate) {
          const updatedSegmentation = payload.new as RevenueProductSegmentationDBRow;
          onRevenueSegmentationUpdate(updatedSegmentation);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Revenue Segmentation Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onRevenueSegmentationUpdate]);

  // New effect for grades historical updates via Realtime
  useEffect(() => {
    if (!supabaseClient || !symbol || !onGradesHistoricalUpdate) return;

    const unsubscribe = subscribeToGradesHistoricalUpdates(
      symbol,
      (payload: GradesHistoricalPayload) => {
        if (payload.new && isMountedRef.current && onGradesHistoricalUpdate) {
          const updatedGrades = payload.new as GradesHistoricalDBRow;
          onGradesHistoricalUpdate(updatedGrades);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Grades Historical Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onGradesHistoricalUpdate]);

  // New effect for exchange variants updates via Realtime
  useEffect(() => {
    if (!supabaseClient || !symbol || !onExchangeVariantsUpdate) return;

    const unsubscribe = subscribeToExchangeVariantsUpdates(
      symbol,
      (payload: ExchangeVariantsPayload) => {
        if (payload.new && isMountedRef.current && onExchangeVariantsUpdate) {
          const updatedVariant = payload.new as ExchangeVariantsDBRow;
          onExchangeVariantsUpdate(updatedVariant);
        }
      },
      (status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            `[useStockData ${symbol}] Exchange Variants Realtime subscription error:`,
            err
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, supabaseClient, onExchangeVariantsUpdate]);

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
    } else {
      setOpeningTime(Option.none());
      setClosingTime(Option.none());
      setTimezone(Option.none());
    }

    if (!exchangeStatusValue) {
      setDerivedMarketStatus("Connecting");
      setMarketStatusMessage(
        Option.some(`Connecting to market status for ${relevantExchangeCode}...`)
      );
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

    setDerivedMarketStatus((prevStatus) =>
      prevStatus !== newStatus ? newStatus : prevStatus
    );
    setMarketStatusMessage((prevMessage) =>
      Option.isSome(prevMessage) && Option.isSome(newMessage) && prevMessage.value === newMessage.value
        ? prevMessage
        : newMessage
    );
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
