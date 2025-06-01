// src/lib/supabase/realtime-service.ts
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient, // Ensure this is from '@supabase/supabase-js'
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type LiveQuoteIndicatorDBRow =
  Database["public"]["Tables"]["live_quote_indicators"]["Row"];

export type LiveQuotePayload =
  RealtimePostgresChangesPayload<LiveQuoteIndicatorDBRow>;

type QuoteUpdateCallback = (payload: LiveQuotePayload) => void;

export type SubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR"
  | "CLIENT_UNAVAILABLE"; // Added new status

type SubscriptionStatusCallback = (
  status: SubscriptionStatus,
  err?: Error
) => void;

export type FinancialStatementDBRow =
  Database["public"]["Tables"]["financial_statements"]["Row"];

export type FinancialStatementPayload =
  RealtimePostgresChangesPayload<FinancialStatementDBRow>;

type FinancialStatementUpdateCallback = (
  payload: FinancialStatementPayload
) => void;

const LIVE_QUOTE_TABLE_NAME = "live_quote_indicators";
const FINANCIAL_STATEMENTS_TABLE_NAME = "financial_statements";

let supabaseClientInstance: SupabaseClient<Database> | null = null;
let clientInitialized = false; // Flag to ensure createSupabaseBrowserClient is called only once if needed initially

function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!clientInitialized) {
    supabaseClientInstance = createSupabaseBrowserClient(false); // Pass false
    clientInitialized = true;
  }
  return supabaseClientInstance;
}

const noOpUnsubscribe = () => {
  /* No operation */
};

export function subscribeToQuoteUpdates(
  symbol: string,
  onData: QuoteUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for live quote updates.`
    );
    // Immediately notify about unavailability
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe; // Return a no-op unsubscribe function
  }

  const channelName = `live-quote-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<LiveQuoteIndicatorDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LIVE_QUOTE_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload);
        }
      }
    )
    .subscribe((status, err) => {
      // Cast Supabase's RealtimeChannel['state'] to your SubscriptionStatus
      // This might need more robust mapping if statuses don't align directly
      const castedStatus = status as SubscriptionStatus;
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      }
    });

  return () => {
    // Ensure supabase client is available before trying to remove channel
    if (supabase) {
      supabase
        .removeChannel(channel)
        .catch((error) =>
          console.error(
            `[realtime-service] (${symbol}): Error removing live quote channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}

export function subscribeToFinancialStatementUpdates(
  symbol: string,
  onData: FinancialStatementUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for financial statement updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `financial-statement-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<FinancialStatementDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: FINANCIAL_STATEMENTS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as FinancialStatementPayload);
        }
      }
    )
    .subscribe((status, err) => {
      const castedStatus = status as SubscriptionStatus;
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      }
    });

  return () => {
    if (supabase) {
      supabase
        .removeChannel(channel)
        .catch((error) =>
          console.error(
            `[realtime-service] (${symbol}): Error removing Financial Statement channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}
