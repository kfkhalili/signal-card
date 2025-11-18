// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { fromPromise, Result, ok } from "neverthrow";
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
}

async function fetchInitialProfile(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<ProfileDBRow | null, Error>> {
  const result = await fromPromise(
    supabase.from("profiles").select("*").eq("symbol", symbol).maybeSingle(),
    (e) => e as Error
  );
  return result.map((response) => response.data);
}

async function fetchInitialQuote(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<LiveQuoteIndicatorDBRow | null, Error>> {
  const result = await fromPromise(
    supabase
      .from("live_quote_indicators")
      .select("*")
      .eq("symbol", symbol)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(), // Use maybeSingle() to avoid 406 errors when data doesn't exist
    (e) => e as Error
  );

  // maybeSingle() returns null when no rows found, so we just need to map the result
  return result.map((response) => response.data);
}

async function fetchExchangeStatus(
  supabase: SupabaseClient<Database>,
  exchangeCode: string
): Promise<Result<ExchangeMarketStatusRecord | null, Error>> {
  const result = await fromPromise(
    supabase
      .from("exchange_market_status")
      .select("*")
      .eq("exchange_code", exchangeCode)
      .maybeSingle(), // Use maybeSingle() to avoid 406 errors when data doesn't exist
    (e) => e as Error
  );
  // maybeSingle() returns null when no rows found, so we just need to map the result
  return result.map((response) => response.data);
}

async function fetchInitialFinancialStatement(
  supabase: SupabaseClient<Database>,
  symbol: string
): Promise<Result<FinancialStatementDBRow | null, Error>> {
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

  // maybeSingle() returns null when no rows found, so we just need to map the result
  return result.map((response) => response.data);
}

export function useStockData({
  symbol,
  onProfileUpdate,
  onLiveQuoteUpdate,
  onExchangeStatusUpdate,
  onFinancialStatementUpdate,
  onRatiosTTMUpdate,
}: UseStockDataProps): MarketStatusUpdate {
  const [profileData, setProfileData] = useState<ProfileDBRow | null>(null);
  const [latestQuote, setLatestQuote] =
    useState<LiveQuoteIndicatorDBRow | null>(null);
  const [exchangeStatus, setExchangeStatus] =
    useState<ExchangeMarketStatusRecord | null>(null);
  const [derivedMarketStatus, setDerivedMarketStatus] =
    useState<DerivedMarketStatus>("Fetching");
  const [marketStatusMessage, setMarketStatusMessage] = useState<string | null>(
    "Initializing..."
  );
  const [openingTime, setOpeningTime] = useState<string | null>(null);
  const [closingTime, setClosingTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);

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
          setLatestQuote(quote);
          if (onLiveQuoteUpdate) onLiveQuoteUpdate(quote, "realtime");
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
    if (!realtimeManager || !profileData?.exchange) return;

    const exchangeCode = profileData.exchange;
    realtimeManager.addExchange(exchangeCode);

    const handleStatusUpdate = (status: ExchangeMarketStatusRecord) => {
      if (status.exchange_code === exchangeCode) {
        if (isMountedRef.current) {
          setExchangeStatus(status);
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
  }, [profileData?.exchange, realtimeManager, onExchangeStatusUpdate]);

  // New effect for profile updates via Realtime
  useEffect(() => {
    if (!supabaseClient || !symbol) return;

    const unsubscribe = subscribeToProfileUpdates(
      symbol,
      (payload: ProfilePayload) => {
        if (payload.new && isMountedRef.current) {
          const updatedProfile = payload.new as ProfileDBRow;
          setProfileData(updatedProfile);
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

  const fetchInitialData = useCallback(async () => {
    if (!isMountedRef.current || !supabaseClient || !symbol) return;

    // Fetch Profile
    const profileResult = await fetchInitialProfile(supabaseClient, symbol);
    if (!isMountedRef.current) return;

    const fetchedProfile = profileResult.match(
      (data) => {
        if (data) {
          setProfileData(data);
          if (onProfileUpdate) onProfileUpdate(data);
        }
        return data;
      },
      (error) => {
        // Only log if it's not a "not found" error (PGRST116) or RLS error (406)
        // Missing data is expected in self-healing architecture - backend will populate it
        const errorMessage = (error as Error).message || String(error);
        if (!errorMessage.includes("PGRST116") && !errorMessage.includes("406")) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial profile:`,
            error
          );
        }
        return null;
      }
    );

    // Fetch Quote
    const quoteResult = await fetchInitialQuote(supabaseClient, symbol);
    if (!isMountedRef.current) return;

    quoteResult.match(
      (data) => {
        if (data) {
          setLatestQuote(data);
          if (onLiveQuoteUpdate) onLiveQuoteUpdate(data, "fetch");
        }
        // If data is null, that's expected in self-healing architecture - backend will populate it
      },
      (error) => {
        // Only log if it's not a "not found" error (PGRST116) or RLS error (406)
        // Missing data is expected in self-healing architecture
        const errorMessage = (error as Error).message || String(error);
        if (!errorMessage.includes("PGRST116") && !errorMessage.includes("406")) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial quote:`,
            error
          );
        }
      }
    );

    // Fetch Exchange Status
    if (fetchedProfile?.exchange) {
      const statusResult = await fetchExchangeStatus(
        supabaseClient,
        fetchedProfile.exchange
      );
      if (!isMountedRef.current) return;
      statusResult.match(
        (data) => {
          if (data) {
            setExchangeStatus(data);
            if (onExchangeStatusUpdate) onExchangeStatusUpdate(data);
          }
          // If data is null, that's expected in self-healing architecture - backend will populate it
        },
        (error) => {
          // Only log if it's not a "not found" error (PGRST116) or RLS error (406)
          // Missing data is expected in self-healing architecture
          const errorMessage = (error as Error).message || String(error);
          if (!errorMessage.includes("PGRST116") && !errorMessage.includes("406")) {
            console.error(
              `[useStockData ${symbol}] Exception fetching initial exchange status:`,
              error
            );
          }
        }
      );
    }

    // Fetch Financial Statement (only if callback is provided AND profile exists)
    // The callback is only provided when there are cards that need financial statements
    // This prevents unnecessary fetches when only viewing profile/price cards
    if (fetchedProfile && onFinancialStatementUpdate) {
      const statementResult = await fetchInitialFinancialStatement(
        supabaseClient,
        symbol
      );
      if (!isMountedRef.current) return;
      statementResult.match(
        (data) => {
          if (data && onFinancialStatementUpdate) {
            onFinancialStatementUpdate(data);
          }
        },
        (error) => {
          // Only log if it's not a "not found" error (PGRST116) or RLS error (406)
          const errorMessage = (error as Error).message || String(error);
          if (!errorMessage.includes("PGRST116") && !errorMessage.includes("406")) {
            console.error(
              `[useStockData ${symbol}] Exception fetching initial financial statement:`,
              error
            );
          }
        }
      );
    }
  }, [
    symbol,
    supabaseClient,
    onProfileUpdate,
    onLiveQuoteUpdate,
    onExchangeStatusUpdate,
    onFinancialStatementUpdate,
    // Note: onRatiosTTMUpdate is not included because ratios TTM data
    // is only received via realtime subscription, not initial fetch
  ]);

  useEffect(() => {
    fetchInitialData().catch((err) =>
      console.error(
        `[useStockData ${symbol}] Unhandled error in fetchInitialData`,
        (err as Error).message
      )
    );
  }, [symbol, supabaseClient, fetchInitialData]);

  useEffect(() => {
    const relevantExchangeCode = profileData?.exchange || latestQuote?.exchange;

    if (!relevantExchangeCode) return;
    if (exchangeStatus) {
      setOpeningTime(exchangeStatus.opening_time_local);
      setClosingTime(exchangeStatus.closing_time_local);
      setTimezone(exchangeStatus.timezone);
    } else {
      setOpeningTime(null);
      setClosingTime(null);
      setTimezone(null);
    }

    if (!exchangeStatus) {
      setDerivedMarketStatus("Connecting");
      setMarketStatusMessage(
        `Connecting to market status for ${relevantExchangeCode}...`
      );
      return;
    }

    let newStatus: DerivedMarketStatus;
    let newMessage: string | null;

    if (exchangeStatus.current_day_is_holiday) {
      newStatus = "Holiday";
      newMessage =
        exchangeStatus.status_message ||
        `Market Closed (Holiday: ${
          exchangeStatus.current_holiday_name || "Official Holiday"
        })`;
    } else if (exchangeStatus.is_market_open) {
      if (latestQuote?.api_timestamp) {
        const diffMinutes =
          (Date.now() - latestQuote.api_timestamp * 1000) / 60000;
        newStatus = diffMinutes > 15 ? "Delayed" : "Open";
        newMessage =
          exchangeStatus.status_message ||
          (newStatus === "Delayed" ? "Live data is delayed." : null);
      } else {
        newStatus = "Open";
        newMessage = exchangeStatus.status_message || "Awaiting first quote";
      }
    } else {
      newStatus = "Closed";
      newMessage = exchangeStatus.status_message || null;
    }

    setDerivedMarketStatus((prevStatus) =>
      prevStatus !== newStatus ? newStatus : prevStatus
    );
    setMarketStatusMessage((prevMessage) =>
      prevMessage !== newMessage ? newMessage : prevMessage
    );
  }, [profileData, latestQuote, exchangeStatus]);

  return {
    status: derivedMarketStatus,
    message: marketStatusMessage,
    openingTime,
    closingTime,
    timezone,
    exchangeName: exchangeStatus?.name || null,
    exchangeCode: exchangeStatus?.exchange_code || null,
  };
}
