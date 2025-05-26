// src/lib/supabase/realtime-service.ts
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types"; // Import generated types

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

const TABLE_NAME = "live_quote_indicators";
let supabaseClientInstance: SupabaseClient<Database> | null = null; // Typed client

function getSupabaseClient(): SupabaseClient<Database> {
  // Typed client
  if (!supabaseClientInstance) {
    supabaseClientInstance = createSupabaseBrowserClient(); // Typed client
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

  // Minimal logging as per preference
  // if (process.env.NODE_ENV === "development") {
  //   console.debug(
  //     `[realtime-service] Subscribing to channel ${channelName} for symbol ${symbol}...`
  //   );
  // }

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<LiveQuoteIndicatorDBRow>( // Generic type for .on() specifies the expected shape of payload.new
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME, filter: topicFilter },
      (payload) => {
        // payload is RealtimePostgresChangesPayload<LiveQuoteIndicatorDBRow>
        // The 'new' property in payload will be typed as Partial<LiveQuoteIndicatorDBRow>
        // by the Supabase client. If you expect a full row for INSERT/UPDATE,
        // you might cast it, or handle potential partial data if your DB/triggers allow that.
        // For this setup, we assume `useStockData` will handle `payload.new`
        // (which it does, by casting to LiveQuoteIndicatorDBRow).
        if (typeof onData === "function") {
          onData(payload); // Pass the typed payload directly
        }
      }
    )
    .subscribe((status, err) => {
      const castedStatus = status as SubscriptionStatus;
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      }
      // Minimal logging
      // if (process.env.NODE_ENV === "development") {
      //   switch (castedStatus) {
      //     case "CHANNEL_ERROR": console.error(`[realtime-service] (${symbol}): CHANNEL_ERROR:`, err?.message); break;
      //     case "TIMED_OUT": console.warn(`[realtime-service] (${symbol}): Subscription TIMED_OUT.`); break;
      //     // other cases
      //   }
      // }
    });

  const unsubscribe = () => {
    // if (process.env.NODE_ENV === "development") {
    //   console.debug(
    //     `[realtime-service] (${symbol}): Unsubscribing from ${channel.topic}...`
    //   );
    // }
    supabase.removeChannel(channel).catch((error) =>
      console.error(
        // Minimal logging
        `[realtime-service] (${symbol}): Error removing channel ${channel.topic}:`,
        error.message
      )
    );
  };
  return unsubscribe;
}
