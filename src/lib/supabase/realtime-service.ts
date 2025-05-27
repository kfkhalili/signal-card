// src/lib/supabase/realtime-service.ts
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Use the generated type for the shape of the row from database.types.ts
export type LiveQuoteIndicatorDBRow =
  Database["public"]["Tables"]["live_quote_indicators"]["Row"];

// LiveQuotePayload now uses the generated LiveQuoteIndicatorDBRow
export type LiveQuotePayload =
  RealtimePostgresChangesPayload<LiveQuoteIndicatorDBRow>;

// QuoteUpdateCallback expects a payload where 'new' (if present) is LiveQuoteIndicatorDBRow
type QuoteUpdateCallback = (payload: LiveQuotePayload) => void;

export type SubscriptionStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

type SubscriptionStatusCallback = (
  status: SubscriptionStatus,
  err?: Error
) => void;

// --- New types for Financial Statements ---
export type FinancialStatementDBRow =
  Database["public"]["Tables"]["financial_statements"]["Row"];

export type FinancialStatementPayload =
  RealtimePostgresChangesPayload<FinancialStatementDBRow>;

type FinancialStatementUpdateCallback = (
  payload: FinancialStatementPayload
) => void;
// --- End new types ---

const LIVE_QUOTE_TABLE_NAME = "live_quote_indicators";
const FINANCIAL_STATEMENTS_TABLE_NAME = "financial_statements";

let supabaseClientInstance: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createSupabaseBrowserClient();
  }
  return supabaseClientInstance;
}

export function subscribeToQuoteUpdates(
  symbol: string,
  onData: QuoteUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
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
      const castedStatus = status as SubscriptionStatus;
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      }
    });

  const unsubscribe = () => {
    supabase
      .removeChannel(channel)
      .catch((error) =>
        console.error(
          `[realtime-service] (${symbol}): Error removing live quote channel ${channel.topic}:`,
          (error as Error).message
        )
      );
  };
  return unsubscribe;
}

// New function for financial statement updates
export function subscribeToFinancialStatementUpdates(
  symbol: string,
  onData: FinancialStatementUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
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
        event: "*", // Listen to INSERT, UPDATE, DELETE. Handler will decide if relevant.
        schema: "public",
        table: FINANCIAL_STATEMENTS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          // The payload from Supabase is already RealtimePostgresChangesPayload<FinancialStatementDBRow>
          // which matches our FinancialStatementPayload type.
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

  const unsubscribe = () => {
    supabase
      .removeChannel(channel)
      .catch((error) =>
        console.error(
          `[realtime-service] (${symbol}): Error removing Financial Statement channel ${channel.topic}:`,
          (error as Error).message
        )
      );
  };
  return unsubscribe;
}
