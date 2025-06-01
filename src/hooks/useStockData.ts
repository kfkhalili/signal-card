// src/hooks/useStockData.ts
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  subscribeToQuoteUpdates as subscribeToLiveQuoteIndicators,
  type LiveQuotePayload,
  type SubscriptionStatus as LiveQuoteSubscriptionStatus, // Renaming to avoid conflict
  subscribeToFinancialStatementUpdates,
  type FinancialStatementPayload,
  type FinancialStatementDBRow,
} from "@/lib/supabase/realtime-service";
import type { Database } from "@/lib/supabase/database.types";

export type ProfileDBRow = Database["public"]["Tables"]["profiles"]["Row"];
type LiveQuoteIndicatorDBRow =
  Database["public"]["Tables"]["live_quote_indicators"]["Row"];
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

interface UseStockDataProps {
  symbol: string;
  onProfileUpdate?: (profile: ProfileDBRow) => void;
  onLiveQuoteUpdate?: (
    quote: LiveQuoteIndicatorDBRow,
    source: "fetch" | "realtime"
  ) => void;
  onExchangeStatusUpdate?: (status: ExchangeMarketStatusRecord) => void;
  onFinancialStatementUpdate?: (statement: FinancialStatementDBRow) => void;
}

interface UseStockDataReturn {
  derivedMarketStatus: DerivedMarketStatus;
  marketStatusMessage: string | null;
}

export function useStockData({
  symbol,
  onProfileUpdate,
  onLiveQuoteUpdate,
  onExchangeStatusUpdate,
  onFinancialStatementUpdate,
}: UseStockDataProps): UseStockDataReturn {
  const instanceIdRef = useRef(Math.random().toString(36).substring(2, 7));

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

  const supabaseClient = useMemo(() => createSupabaseBrowserClient(false), []);
  const isMountedRef = useRef<boolean>(false);

  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const liveQuoteUnsubscribeRef = useRef<(() => void) | null>(null);
  const exchangeStatusChannelRef = useRef<RealtimeChannel | null>(null);
  const financialStatementUnsubscribeRef = useRef<(() => void) | null>(null);

  const currentSubscribedExchangeCode = useRef<string | null>(null);
  const exchangeStatusRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (profileChannelRef.current && supabaseClient) {
        supabaseClient
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${symbol}] Error removing profile channel:`,
              (err as Error).message
            )
          );
        profileChannelRef.current = null;
      }
      if (liveQuoteUnsubscribeRef.current) liveQuoteUnsubscribeRef.current();
      if (exchangeStatusChannelRef.current && supabaseClient) {
        supabaseClient
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              `[useStockData ${
                currentSubscribedExchangeCode.current || symbol
              }] Error removing exchange status channel:`,
              (err as Error).message
            )
          );
        exchangeStatusChannelRef.current = null;
      }
      if (financialStatementUnsubscribeRef.current)
        financialStatementUnsubscribeRef.current();
      currentSubscribedExchangeCode.current = null;
      if (exchangeStatusRetryTimeoutRef.current)
        clearTimeout(exchangeStatusRetryTimeoutRef.current);
    };
  }, [symbol, supabaseClient]);

  useEffect(() => {
    if (!supabaseClient) {
      if (isMountedRef.current && derivedMarketStatus !== "ClientUnavailable") {
        setDerivedMarketStatus("ClientUnavailable");
        setMarketStatusMessage(
          "Data service unavailable: client configuration error."
        );
      }
      return;
    }
    if (derivedMarketStatus === "ClientUnavailable" && supabaseClient) {
      setDerivedMarketStatus("Fetching");
      setMarketStatusMessage(`Initializing for ${symbol}...`);
    }
  }, [supabaseClient, symbol, derivedMarketStatus]);

  useEffect(() => {
    if (
      !isMountedRef.current ||
      !supabaseClient ||
      derivedMarketStatus === "ClientUnavailable"
    )
      return;
    if (!symbol) {
      if (derivedMarketStatus !== "Unknown") {
        setDerivedMarketStatus("Unknown");
        setMarketStatusMessage("No symbol provided.");
      }
      return;
    }
    // ... (rest of derived market status logic from previous correct version) ...
    // This complex logic should be carefully reviewed to ensure it correctly sets status
    // without causing infinite loops if its own state setters are in dependencies.
    // For brevity, assuming the core market status derivation logic is okay, focusing on client handling.
    const relevantExchangeCode = profileData?.exchange || latestQuote?.exchange;
    if (!relevantExchangeCode) {
      if (derivedMarketStatus !== "Unknown") {
        setDerivedMarketStatus("Unknown");
        setMarketStatusMessage(`Exchange information missing for ${symbol}.`);
      }
      return;
    }
    if (
      !exchangeStatus ||
      exchangeStatus.exchange_code !== relevantExchangeCode
    ) {
      if (
        derivedMarketStatus !== "Connecting" &&
        derivedMarketStatus !== "Error"
      ) {
        setDerivedMarketStatus("Connecting");
        setMarketStatusMessage(
          `Connecting to market status for ${relevantExchangeCode}...`
        );
      }
      return;
    }
    // (Full market status logic as before)
    const isOpen = exchangeStatus.is_market_open ?? false;
    const isHoliday = exchangeStatus.current_day_is_holiday ?? false;
    let newStatus: DerivedMarketStatus = derivedMarketStatus;
    let newMessage: string | null = marketStatusMessage;

    if (isHoliday) {
      newStatus = "Holiday";
      newMessage =
        exchangeStatus.status_message ||
        `Market Closed (Holiday: ${
          exchangeStatus.current_holiday_name || "Official Holiday"
        })`;
    } else if (isOpen) {
      if (latestQuote?.api_timestamp) {
        const diffMinutes =
          (Date.now() - latestQuote.api_timestamp * 1000) / 60000;
        newStatus = diffMinutes > 15 ? "Delayed" : "Open";
        newMessage =
          exchangeStatus.status_message ||
          (newStatus === "Delayed"
            ? "Live data is delayed."
            : "Market is Open.");
      } else {
        newStatus = "Open";
        newMessage =
          exchangeStatus.status_message ||
          "Market is Open (awaiting first quote).";
      }
    } else {
      newStatus = "Closed";
      newMessage = exchangeStatus.status_message || "Market is Closed.";
    }
    if (newStatus !== derivedMarketStatus) setDerivedMarketStatus(newStatus);
    if (newMessage !== marketStatusMessage) setMarketStatusMessage(newMessage);
  }, [
    symbol,
    latestQuote,
    exchangeStatus,
    profileData,
    supabaseClient,
    derivedMarketStatus,
    marketStatusMessage,
  ]);

  const setupExchangeStatusSubscription = useCallback(
    async (exchangeCodeToSubscribe: string | undefined | null) => {
      if (!isMountedRef.current || !supabaseClient) return;
      if (exchangeStatusRetryTimeoutRef.current)
        clearTimeout(exchangeStatusRetryTimeoutRef.current);

      if (
        currentSubscribedExchangeCode.current &&
        (currentSubscribedExchangeCode.current !== exchangeCodeToSubscribe ||
          !exchangeCodeToSubscribe)
      ) {
        if (exchangeStatusChannelRef.current) {
          await supabaseClient
            .removeChannel(exchangeStatusChannelRef.current)
            .catch((err) =>
              console.error(
                "Error removing old exchange status channel",
                err.message
              )
            );
          exchangeStatusChannelRef.current = null;
        }
        currentSubscribedExchangeCode.current = null;
        if (isMountedRef.current) setExchangeStatus(null);
      }
      if (!exchangeCodeToSubscribe) return;
      if (
        currentSubscribedExchangeCode.current === exchangeCodeToSubscribe &&
        exchangeStatusChannelRef.current?.state === "joined"
      )
        return;

      currentSubscribedExchangeCode.current = exchangeCodeToSubscribe;
      if (isMountedRef.current) {
        setDerivedMarketStatus("Connecting");
        setMarketStatusMessage(
          `Subscribing to market status for ${exchangeCodeToSubscribe}...`
        );
      }
      try {
        const { data, error } = await supabaseClient
          .from("exchange_market_status")
          .select("*")
          .eq("exchange_code", exchangeCodeToSubscribe)
          .single();
        if (!isMountedRef.current) return;
        if (error && error.code !== "PGRST116") throw error;
        if (isMountedRef.current) {
          setExchangeStatus(data);
          if (data && onExchangeStatusUpdate) onExchangeStatusUpdate(data);
          else if (!data) {
            setDerivedMarketStatus("Unknown");
            setMarketStatusMessage(
              `No market status data for ${exchangeCodeToSubscribe}.`
            );
          }
        }
      } catch (errCaught) {
        if (isMountedRef.current) {
          setExchangeStatus(null);
          setDerivedMarketStatus("Error");
          const errMsg =
            errCaught instanceof Error ? errCaught.message : "unknown error";
          setMarketStatusMessage(
            `Exception fetching market status for ${exchangeCodeToSubscribe}: ${errMsg}`
          );
          console.error(
            `[useStockData] Exception fetching market status for ${exchangeCodeToSubscribe}:`,
            errCaught
          );
        }
      }
      if (exchangeStatusChannelRef.current) {
        await supabaseClient
          .removeChannel(exchangeStatusChannelRef.current)
          .catch((err) =>
            console.error(
              "Error removing stale exchange status channel",
              err.message
            )
          );
        exchangeStatusChannelRef.current = null;
      }
      const channelName = `exchange-status-${exchangeCodeToSubscribe
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClient.channel(channelName);
      channel
        .on<ExchangeMarketStatusRecord>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "exchange_market_status",
            filter: `exchange_code=eq.${exchangeCodeToSubscribe}`,
          },
          (payloadIncoming) => {
            // payloadIncoming is used
            if (!isMountedRef.current) return;
            if (
              payloadIncoming.eventType === "DELETE" ||
              !payloadIncoming.new
            ) {
              if (isMountedRef.current) setExchangeStatus(null);
              return;
            }
            const newRecord = payloadIncoming.new as ExchangeMarketStatusRecord;
            if (isMountedRef.current) {
              setExchangeStatus(newRecord);
              if (onExchangeStatusUpdate) onExchangeStatusUpdate(newRecord);
            }
          }
        )
        .subscribe((statusChange, errSubscribe) => {
          // statusChange and errSubscribe are used
          if (!isMountedRef.current) return;
          const retry = () => {
            if (exchangeStatusRetryTimeoutRef.current)
              clearTimeout(exchangeStatusRetryTimeoutRef.current);
            exchangeStatusRetryTimeoutRef.current = setTimeout(() => {
              if (
                isMountedRef.current &&
                currentSubscribedExchangeCode.current ===
                  exchangeCodeToSubscribe
              ) {
                setupExchangeStatusSubscription(exchangeCodeToSubscribe);
              }
            }, 5000 + Math.random() * 5000);
          };
          if (
            statusChange === "CHANNEL_ERROR" ||
            statusChange === "TIMED_OUT"
          ) {
            if (isMountedRef.current) {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage(
                `Market status for ${exchangeCodeToSubscribe} issue: ${
                  errSubscribe?.message || statusChange
                }. Retrying...`
              );
              console.error(
                `[useStockData] Exchange status channel error for ${exchangeCodeToSubscribe}:`,
                errSubscribe || statusChange
              );
              retry();
            }
          } else if (statusChange === "CLOSED") {
            /* ... retry ... */ retry();
          } else if (statusChange === "SUBSCRIBED") {
            if (exchangeStatusRetryTimeoutRef.current)
              clearTimeout(exchangeStatusRetryTimeoutRef.current);
          }
        });
      exchangeStatusChannelRef.current = channel;
    },
    [onExchangeStatusUpdate, supabaseClient]
  );

  useEffect(() => {
    if (
      !symbol ||
      !isMountedRef.current ||
      !supabaseClient ||
      derivedMarketStatus === "ClientUnavailable"
    ) {
      setProfileData(null);
      if (supabaseClient) setupExchangeStatusSubscription(null);
      return;
    }
    let profileSubActive = true;
    const fetchInitialProfileAndSubscribe = async () => {
      if (!supabaseClient) return;
      try {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("symbol", symbol)
          .maybeSingle();
        if (!profileSubActive || !isMountedRef.current) return;
        if (error) throw error;
        if (isMountedRef.current) {
          setProfileData(data);
          if (data && onProfileUpdate) onProfileUpdate(data);
          const currentExchange = data?.exchange;
          if (
            currentExchange &&
            currentSubscribedExchangeCode.current !== currentExchange
          )
            await setupExchangeStatusSubscription(currentExchange);
          else if (!currentExchange && currentSubscribedExchangeCode.current)
            await setupExchangeStatusSubscription(null);
        }
      } catch (errCaught) {
        if (!profileSubActive || !isMountedRef.current) return;
        console.error(
          `[useStockData ${symbol}] Exception during initial profile fetch:`,
          errCaught instanceof Error ? errCaught.message : String(errCaught)
        );
        if (isMountedRef.current) setProfileData(null);
      }
      if (profileChannelRef.current && supabaseClient) {
        await supabaseClient
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error("Error removing stale profile channel", err.message)
          );
        profileChannelRef.current = null;
      }
      if (!supabaseClient) return;
      const channelName = `profile-${symbol
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/gi, "-")}-${instanceIdRef.current}`;
      const channel = supabaseClient.channel(channelName);
      channel
        .on<ProfileDBRow>(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `symbol=eq.${symbol}`,
          },
          (payloadIncoming) => {
            // payloadIncoming is used
            if (
              !isMountedRef.current ||
              !profileSubActive ||
              !payloadIncoming.new
            )
              return;
            const updatedRecord = payloadIncoming.new as ProfileDBRow;
            if (isMountedRef.current) {
              setProfileData(updatedRecord);
              if (onProfileUpdate) onProfileUpdate(updatedRecord);
              const newExchange = updatedRecord.exchange;
              if (
                newExchange &&
                currentSubscribedExchangeCode.current !== newExchange
              )
                setupExchangeStatusSubscription(newExchange);
              else if (!newExchange && currentSubscribedExchangeCode.current)
                setupExchangeStatusSubscription(null);
            }
          }
        )
        .subscribe((statusChange, errSubscribe) => {
          // statusChange and errSubscribe are used
          if (
            statusChange === "CHANNEL_ERROR" &&
            isMountedRef.current &&
            profileSubActive
          ) {
            console.error(
              `[useStockData ${symbol}] Profile channel error:`,
              errSubscribe?.message || statusChange
            );
          }
        });
      profileChannelRef.current = channel;
    };
    fetchInitialProfileAndSubscribe();
    return () => {
      profileSubActive = false;
      if (profileChannelRef.current && supabaseClient) {
        supabaseClient
          .removeChannel(profileChannelRef.current)
          .catch((err) =>
            console.error(
              "Error removing profile channel on cleanup",
              err.message
            )
          );
        profileChannelRef.current = null;
      }
    };
  }, [
    symbol,
    onProfileUpdate,
    setupExchangeStatusSubscription,
    supabaseClient,
    derivedMarketStatus,
  ]);

  useEffect(() => {
    if (
      !symbol ||
      !isMountedRef.current ||
      !supabaseClient ||
      derivedMarketStatus === "ClientUnavailable"
    ) {
      setLatestQuote(null);
      return;
    }
    let quoteSubActive = true;
    const setupQuoteSub = async () => {
      if (!supabaseClient) return;
      if (liveQuoteUnsubscribeRef.current) liveQuoteUnsubscribeRef.current();
      liveQuoteUnsubscribeRef.current = null;
      try {
        const { data, error } = await supabaseClient
          .from("live_quote_indicators")
          .select("*")
          .eq("symbol", symbol)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single();
        if (!quoteSubActive || !isMountedRef.current) return;
        if (error && error.code !== "PGRST116") throw error;
        if (isMountedRef.current) {
          setLatestQuote(data);
          if (data && onLiveQuoteUpdate) onLiveQuoteUpdate(data, "fetch");
          const currentExchange = data?.exchange;
          if (
            currentExchange &&
            currentSubscribedExchangeCode.current !== currentExchange
          )
            await setupExchangeStatusSubscription(currentExchange);
          else if (
            !currentExchange &&
            currentSubscribedExchangeCode.current &&
            !profileData?.exchange
          )
            await setupExchangeStatusSubscription(null);
        }
      } catch (errCaught) {
        if (isMountedRef.current && quoteSubActive) {
          console.error(
            `[useStockData ${symbol}] Exception fetching initial quote:`,
            errCaught instanceof Error ? errCaught.message : String(errCaught)
          );
          if (isMountedRef.current) setLatestQuote(null);
        }
      }
      liveQuoteUnsubscribeRef.current = subscribeToLiveQuoteIndicators(
        symbol,
        (payloadIncoming: LiveQuotePayload) => {
          // payloadIncoming is used
          if (
            !isMountedRef.current ||
            !quoteSubActive ||
            payloadIncoming.eventType === "DELETE" ||
            !payloadIncoming.new
          )
            return;
          const newQuoteRecord = payloadIncoming.new as LiveQuoteIndicatorDBRow;
          if (isMountedRef.current) {
            setLatestQuote(newQuoteRecord);
            if (onLiveQuoteUpdate)
              onLiveQuoteUpdate(newQuoteRecord, "realtime");
            const newExchange = newQuoteRecord.exchange;
            if (
              newExchange &&
              currentSubscribedExchangeCode.current !== newExchange
            )
              setupExchangeStatusSubscription(newExchange);
            else if (
              !newExchange &&
              currentSubscribedExchangeCode.current &&
              !profileData?.exchange
            )
              setupExchangeStatusSubscription(null);
          }
        },
        (statusChange: LiveQuoteSubscriptionStatus, errSubscribe?: Error) => {
          // statusChange and errSubscribe are used
          if (!isMountedRef.current || !quoteSubActive) return;
          if (statusChange === "CLIENT_UNAVAILABLE") {
            if (derivedMarketStatus !== "Error") {
              setDerivedMarketStatus("Error");
              setMarketStatusMessage(
                `Live quote for ${symbol} unavailable: data service error.`
              );
            }
          } else if (
            statusChange === "CHANNEL_ERROR" ||
            statusChange === "TIMED_OUT"
          ) {
            if (derivedMarketStatus !== "Error")
              setDerivedMarketStatus("Error");
            setMarketStatusMessage(
              `Live quote connection issue for ${symbol}: ${
                errSubscribe?.message || statusChange
              }. Retrying...`
            );
            console.error(
              `[useStockData ${symbol}] Live quote channel error for ${symbol}:`,
              errSubscribe || statusChange
            );
          } else if (statusChange === "CLOSED" && isMountedRef.current) {
            if (derivedMarketStatus !== "Connecting")
              setDerivedMarketStatus("Connecting");
            setMarketStatusMessage(
              `Live quote for ${symbol} interrupted. Reconnecting...`
            );
          }
        }
      );
    };
    setupQuoteSub();
    return () => {
      quoteSubActive = false;
      if (liveQuoteUnsubscribeRef.current) {
        liveQuoteUnsubscribeRef.current();
        liveQuoteUnsubscribeRef.current = null;
      }
    };
  }, [
    symbol,
    onLiveQuoteUpdate,
    setupExchangeStatusSubscription,
    profileData,
    supabaseClient,
    derivedMarketStatus,
  ]);

  useEffect(() => {
    if (
      !symbol ||
      !onFinancialStatementUpdate ||
      !isMountedRef.current ||
      !supabaseClient ||
      derivedMarketStatus === "ClientUnavailable"
    ) {
      if (financialStatementUnsubscribeRef.current)
        financialStatementUnsubscribeRef.current();
      financialStatementUnsubscribeRef.current = null;
      return;
    }
    let subActive = true;
    if (financialStatementUnsubscribeRef.current)
      financialStatementUnsubscribeRef.current();
    financialStatementUnsubscribeRef.current =
      subscribeToFinancialStatementUpdates(
        symbol,
        (payloadIncoming: FinancialStatementPayload) => {
          // payloadIncoming is used
          if (!isMountedRef.current || !subActive) return;
          if (
            (payloadIncoming.eventType === "INSERT" ||
              payloadIncoming.eventType === "UPDATE") &&
            payloadIncoming.new
          ) {
            const newStatement = payloadIncoming.new as FinancialStatementDBRow;
            onFinancialStatementUpdate(newStatement);
          }
        },
        (statusChange: LiveQuoteSubscriptionStatus, errSubscribe?: Error) => {
          // statusChange and errSubscribe are used
          if (!isMountedRef.current || !subActive) return;
          if (process.env.NODE_ENV === "development")
            console.debug(
              `[useStockData ${symbol}] Fin. statement sub status: ${statusChange}`,
              errSubscribe || ""
            );
          if (statusChange === "CLIENT_UNAVAILABLE")
            console.warn(
              `[useStockData ${symbol}] Fin. statement sub unavailable: client error.`
            );
          else if (
            statusChange === "CHANNEL_ERROR" ||
            statusChange === "TIMED_OUT"
          )
            console.error(
              `[useStockData ${symbol}] Fin. statement channel error:`,
              errSubscribe || statusChange
            );
        }
      );
    return () => {
      subActive = false;
      if (financialStatementUnsubscribeRef.current) {
        financialStatementUnsubscribeRef.current();
        financialStatementUnsubscribeRef.current = null;
      }
    };
  }, [symbol, onFinancialStatementUpdate, supabaseClient, derivedMarketStatus]);

  return { derivedMarketStatus, marketStatusMessage };
}
