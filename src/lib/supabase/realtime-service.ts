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

export type ProfileDBRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfilePayload = RealtimePostgresChangesPayload<ProfileDBRow>;

type ProfileUpdateCallback = (payload: ProfilePayload) => void;

export type RatiosTtmDBRow = Database["public"]["Tables"]["ratios_ttm"]["Row"];

export type RatiosTtmPayload = RealtimePostgresChangesPayload<RatiosTtmDBRow>;

type RatiosTtmUpdateCallback = (payload: RatiosTtmPayload) => void;

export type DividendHistoryDBRow =
  Database["public"]["Tables"]["dividend_history"]["Row"];

export type DividendHistoryPayload =
  RealtimePostgresChangesPayload<DividendHistoryDBRow>;

type DividendHistoryUpdateCallback = (payload: DividendHistoryPayload) => void;

export type RevenueProductSegmentationDBRow =
  Database["public"]["Tables"]["revenue_product_segmentation"]["Row"];

export type RevenueProductSegmentationPayload =
  RealtimePostgresChangesPayload<RevenueProductSegmentationDBRow>;

type RevenueProductSegmentationUpdateCallback = (
  payload: RevenueProductSegmentationPayload
) => void;

export type GradesHistoricalDBRow =
  Database["public"]["Tables"]["grades_historical"]["Row"];

export type GradesHistoricalPayload =
  RealtimePostgresChangesPayload<GradesHistoricalDBRow>;

type GradesHistoricalUpdateCallback = (payload: GradesHistoricalPayload) => void;

export type ExchangeVariantsDBRow =
  Database["public"]["Tables"]["exchange_variants"]["Row"];

export type ExchangeVariantsPayload =
  RealtimePostgresChangesPayload<ExchangeVariantsDBRow>;

type ExchangeVariantsUpdateCallback = (payload: ExchangeVariantsPayload) => void;

const LIVE_QUOTE_TABLE_NAME = "live_quote_indicators";
const FINANCIAL_STATEMENTS_TABLE_NAME = "financial_statements";
const PROFILES_TABLE_NAME = "profiles";
const RATIOS_TTM_TABLE_NAME = "ratios_ttm";
const DIVIDEND_HISTORY_TABLE_NAME = "dividend_history";
const REVENUE_PRODUCT_SEGMENTATION_TABLE_NAME = "revenue_product_segmentation";
const GRADES_HISTORICAL_TABLE_NAME = "grades_historical";
const EXCHANGE_VARIANTS_TABLE_NAME = "exchange_variants";

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

export function subscribeToProfileUpdates(
  symbol: string,
  onData: ProfileUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for profile updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `profile-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<ProfileDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: PROFILES_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as ProfilePayload);
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
            `[realtime-service] (${symbol}): Error removing Profile channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}

export function subscribeToRatiosTTMUpdates(
  symbol: string,
  onData: RatiosTtmUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for ratios TTM updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `ratios-ttm-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<RatiosTtmDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: RATIOS_TTM_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as RatiosTtmPayload);
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
            `[realtime-service] (${symbol}): Error removing Ratios TTM channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}

export function subscribeToDividendHistoryUpdates(
  symbol: string,
  onData: DividendHistoryUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for dividend history updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `dividend-history-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<DividendHistoryDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: DIVIDEND_HISTORY_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as DividendHistoryPayload);
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
            `[realtime-service] (${symbol}): Error removing Dividend History channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}

export function subscribeToRevenueProductSegmentationUpdates(
  symbol: string,
  onData: RevenueProductSegmentationUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for revenue product segmentation updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `revenue-segmentation-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<RevenueProductSegmentationDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: REVENUE_PRODUCT_SEGMENTATION_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as RevenueProductSegmentationPayload);
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
            `[realtime-service] (${symbol}): Error removing Revenue Product Segmentation channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}

export function subscribeToGradesHistoricalUpdates(
  symbol: string,
  onData: GradesHistoricalUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for grades historical updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `grades-historical-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<GradesHistoricalDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: GRADES_HISTORICAL_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as GradesHistoricalPayload);
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
            `[realtime-service] (${symbol}): Error removing Grades Historical channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}

export function subscribeToExchangeVariantsUpdates(
  baseSymbol: string,
  onData: ExchangeVariantsUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${baseSymbol})] Supabase client not available for exchange variants updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `exchange-variants-${baseSymbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}-${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  const topicFilter = `base_symbol=eq.${baseSymbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<ExchangeVariantsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: EXCHANGE_VARIANTS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as ExchangeVariantsPayload);
        } else {
          console.warn(`[realtime-service (${baseSymbol})] No onData callback provided`);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err) {
        console.error(`[realtime-service (${baseSymbol})] Channel subscription error:`, err);
      }
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
            `[realtime-service] (${baseSymbol}): Error removing Exchange Variants channel ${channel.topic}:`,
            (error as Error).message
          )
        );
    }
  };
}
