// src/lib/supabase/realtime-service.ts
import { createClient } from "./client"; // Your Supabase client instance
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

// Interface matching the live_quote_indicators table
interface LiveQuoteIndicatorRow {
  id: string;
  symbol: string;
  current_price: number;
  change_percentage: number | null;
  day_change: number | null;
  volume: number | null;
  day_low: number | null;
  day_high: number | null;
  market_cap: number | null;
  day_open: number | null;
  previous_close: number | null;
  api_timestamp: number; // raw seconds
  sma_50d: number | null;
  sma_200d: number | null;
  fetched_at: string;
  is_market_open: boolean | null;
  market_status_message: string | null;
  market_exchange_name: string | null;
}

export type LiveQuotePayload =
  RealtimePostgresChangesPayload<LiveQuoteIndicatorRow>;
export type QuoteUpdateCallback = (payload: LiveQuotePayload) => void;

const TABLE_NAME = "live_quote_indicators";
let supabaseClientInstance: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient();
  }
  return supabaseClientInstance;
}

/**
 * Subscribes to quote updates for a specific symbol.
 * Each call creates, manages, and returns an unsubscribe function for its own channel.
 */
export function subscribeToQuoteUpdates(
  symbol: string,
  callback: QuoteUpdateCallback
): () => void {
  // Returns an unsubscribe function
  const supabase = getSupabaseClient();
  // Create a unique channel name to avoid conflicts if this function is called multiple times for the same symbol
  // (though useStockData should manage this by unsubscribing first)
  const channelName = `stock-quote-${symbol.toLowerCase()}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  console.log(
    `RealtimeService: Attempting to subscribe to channel ${channelName} for symbol ${symbol} on table ${TABLE_NAME}...`
  );

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: {
      broadcast: { ack: true }, // Useful for knowing client is connected to broadcast
    },
  });

  channel
    .on<LiveQuoteIndicatorRow>(
      "postgres_changes",
      {
        event: "*", // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: "public",
        table: TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        // console.log(`RealtimeService (${symbol}): Received payload on ${channel.topic}`, payload);
        callback(payload as LiveQuotePayload); // Type assertion if needed based on your actual payload
      }
    )
    .subscribe((status, err) => {
      switch (status) {
        case "SUBSCRIBED":
          console.log(
            `RealtimeService (${symbol}): Successfully SUBSCRIBED to ${channel.topic}`
          );
          break;
        case "CHANNEL_ERROR":
          console.error(
            `RealtimeService (${symbol}): CHANNEL_ERROR on ${channel.topic}. Supabase client will attempt to retry. Error:`,
            err
          );
          // The hook (useStockData) can also be notified to update UI for connection status
          break;
        case "TIMED_OUT":
          console.warn(
            `RealtimeService (${symbol}): Subscription TIMED_OUT on ${channel.topic}. Supabase client will attempt to retry.`
          );
          break;
        case "CLOSED":
          console.warn(
            `RealtimeService (${symbol}): Subscription CLOSED for ${channel.topic}. This channel is now inactive.`
          );
          // This state implies the channel will not automatically recover.
          // The useStockData hook will need to re-initiate subscription on visibility change or network online.
          break;
        default:
          // console.log(`RealtimeService (${symbol}): Status for ${channel.topic}: ${status}`);
          break;
      }
    });

  // Return a specific unsubscribe function for THIS channel instance
  return () => {
    console.log(
      `RealtimeService (${symbol}): Unsubscribing and removing channel ${channel.topic}...`
    );
    // Using removeChannel ensures complete cleanup.
    // channel.unsubscribe() only stops listening but channel might still exist on client.
    supabase
      .removeChannel(channel)
      .then((removeStatus) => {
        if (removeStatus === "ok") {
          console.log(
            `RealtimeService (${symbol}): Successfully removed channel ${channel.topic}`
          );
        } else {
          console.warn(
            `RealtimeService (${symbol}): Problem removing channel ${channel.topic}, status: ${removeStatus}`
          );
        }
      })
      .catch((error) =>
        console.error(
          `RealtimeService (${symbol}): Error removing channel ${channel.topic}:`,
          error
        )
      );
  };
}
