// src/lib/supabase/realtime-service.ts
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fromPromise } from "neverthrow";
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

export type InsiderTradingStatisticsDBRow =
  Database["public"]["Tables"]["insider_trading_statistics"]["Row"];

export type InsiderTradingStatisticsPayload =
  RealtimePostgresChangesPayload<InsiderTradingStatisticsDBRow>;

type InsiderTradingStatisticsUpdateCallback = (
  payload: InsiderTradingStatisticsPayload
) => void;

export type InsiderTransactionsDBRow =
  Database["public"]["Tables"]["insider_transactions"]["Row"];

export type InsiderTransactionsPayload =
  RealtimePostgresChangesPayload<InsiderTransactionsDBRow>;

type InsiderTransactionsUpdateCallback = (
  payload: InsiderTransactionsPayload
) => void;

export type ValuationsDBRow =
  Database["public"]["Tables"]["valuations"]["Row"];

export type ValuationsPayload =
  RealtimePostgresChangesPayload<ValuationsDBRow>;

type ValuationsUpdateCallback = (payload: ValuationsPayload) => void;

export type MarketRiskPremiumDBRow =
  Database["public"]["Tables"]["market_risk_premiums"]["Row"];

export type MarketRiskPremiumPayload =
  RealtimePostgresChangesPayload<MarketRiskPremiumDBRow>;

type MarketRiskPremiumUpdateCallback = (
  payload: MarketRiskPremiumPayload
) => void;

export type TreasuryRateDBRow =
  Database["public"]["Tables"]["treasury_rates"]["Row"];

export type TreasuryRatePayload =
  RealtimePostgresChangesPayload<TreasuryRateDBRow>;

type TreasuryRateUpdateCallback = (payload: TreasuryRatePayload) => void;

const LIVE_QUOTE_TABLE_NAME = "live_quote_indicators";
const FINANCIAL_STATEMENTS_TABLE_NAME = "financial_statements";
const PROFILES_TABLE_NAME = "profiles";
const RATIOS_TTM_TABLE_NAME = "ratios_ttm";
const DIVIDEND_HISTORY_TABLE_NAME = "dividend_history";
const REVENUE_PRODUCT_SEGMENTATION_TABLE_NAME = "revenue_product_segmentation";
const GRADES_HISTORICAL_TABLE_NAME = "grades_historical";
const EXCHANGE_VARIANTS_TABLE_NAME = "exchange_variants";
const INSIDER_TRADING_STATISTICS_TABLE_NAME = "insider_trading_statistics";
const INSIDER_TRANSACTIONS_TABLE_NAME = "insider_transactions";
const VALUATIONS_TABLE_NAME = "valuations";
const MARKET_RISK_PREMIUMS_TABLE_NAME = "market_risk_premiums";
const TREASURY_RATES_TABLE_NAME = "treasury_rates";

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

// Unified subscription interface for all symbol data types
// NOTE: Quote updates are handled separately by RealtimeStockManager to avoid duplicates
export interface UnifiedSymbolSubscriptionCallbacks {
  onProfileUpdate?: ProfileUpdateCallback;
  // onQuoteUpdate?: QuoteUpdateCallback; // REMOVED: Quotes handled by RealtimeStockManager
  onFinancialStatementUpdate?: FinancialStatementUpdateCallback;
  onRatiosTTMUpdate?: RatiosTtmUpdateCallback;
  onDividendHistoryUpdate?: DividendHistoryUpdateCallback;
  onRevenueSegmentationUpdate?: RevenueProductSegmentationUpdateCallback;
  onGradesHistoricalUpdate?: GradesHistoricalUpdateCallback;
  onExchangeVariantsUpdate?: ExchangeVariantsUpdateCallback;
  onInsiderTradingStatisticsUpdate?: InsiderTradingStatisticsUpdateCallback;
  onInsiderTransactionsUpdate?: InsiderTransactionsUpdateCallback;
  onValuationsUpdate?: ValuationsUpdateCallback;
}

// Unified subscription function - ONE channel per symbol for ALL tables
// This dramatically reduces channel count from ~10 per symbol to 1 per symbol
export function subscribeToAllSymbolUpdates(
  symbol: string,
  callbacks: UnifiedSymbolSubscriptionCallbacks,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for unified symbol updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  // Use a single channel name per symbol (no random suffix to allow reuse)
  const channelName = `symbol-${symbol.toLowerCase().replace(/[^a-z0-9_.-]/gi, "-")}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  // Add listeners for each table if callback is provided
  if (callbacks.onProfileUpdate) {
    channel.on<ProfileDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: PROFILES_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onProfileUpdate) {
          callbacks.onProfileUpdate(payload as ProfilePayload);
        }
      }
    );
  }

  // NOTE: Quote updates are handled separately by RealtimeStockManager
  // Do NOT create quote subscriptions here to avoid duplicates
  // If quote updates are needed, use RealtimeStockManager instead
  // if (callbacks.onQuoteUpdate) {
  //   channel.on<LiveQuoteIndicatorDBRow>(
  //     "postgres_changes",
  //     {
  //       event: "*",
  //       schema: "public",
  //       table: LIVE_QUOTE_TABLE_NAME,
  //       filter: topicFilter,
  //     },
  //     (payload) => {
  //       if (callbacks.onQuoteUpdate) {
  //         callbacks.onQuoteUpdate(payload as LiveQuotePayload);
  //       }
  //     }
  //   );
  // }

  if (callbacks.onFinancialStatementUpdate) {
    channel.on<FinancialStatementDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: FINANCIAL_STATEMENTS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onFinancialStatementUpdate) {
          callbacks.onFinancialStatementUpdate(payload as FinancialStatementPayload);
        }
      }
    );
  }

  if (callbacks.onRatiosTTMUpdate) {
    channel.on<RatiosTtmDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: RATIOS_TTM_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onRatiosTTMUpdate) {
          callbacks.onRatiosTTMUpdate(payload as RatiosTtmPayload);
        }
      }
    );
  }

  if (callbacks.onDividendHistoryUpdate) {
    channel.on<DividendHistoryDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: DIVIDEND_HISTORY_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onDividendHistoryUpdate) {
          callbacks.onDividendHistoryUpdate(payload as DividendHistoryPayload);
        }
      }
    );
  }

  if (callbacks.onRevenueSegmentationUpdate) {
    channel.on<RevenueProductSegmentationDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: REVENUE_PRODUCT_SEGMENTATION_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onRevenueSegmentationUpdate) {
          callbacks.onRevenueSegmentationUpdate(payload as RevenueProductSegmentationPayload);
        }
      }
    );
  }

  if (callbacks.onGradesHistoricalUpdate) {
    channel.on<GradesHistoricalDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: GRADES_HISTORICAL_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onGradesHistoricalUpdate) {
          callbacks.onGradesHistoricalUpdate(payload as GradesHistoricalPayload);
        }
      }
    );
  }

  if (callbacks.onExchangeVariantsUpdate) {
    channel.on<ExchangeVariantsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: EXCHANGE_VARIANTS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onExchangeVariantsUpdate) {
          callbacks.onExchangeVariantsUpdate(payload as ExchangeVariantsPayload);
        }
      }
    );
  }

  if (callbacks.onInsiderTradingStatisticsUpdate) {
    channel.on<InsiderTradingStatisticsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: INSIDER_TRADING_STATISTICS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onInsiderTradingStatisticsUpdate) {
          callbacks.onInsiderTradingStatisticsUpdate(payload as InsiderTradingStatisticsPayload);
        }
      }
    );
  }

  if (callbacks.onInsiderTransactionsUpdate) {
    channel.on<InsiderTransactionsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: INSIDER_TRANSACTIONS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onInsiderTransactionsUpdate) {
          callbacks.onInsiderTransactionsUpdate(payload as InsiderTransactionsPayload);
        }
      }
    );
  }

  if (callbacks.onValuationsUpdate) {
    channel.on<ValuationsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: VALUATIONS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (callbacks.onValuationsUpdate) {
          callbacks.onValuationsUpdate(payload as ValuationsPayload);
        }
      }
    );
  }

  // Subscribe the channel once (even with multiple listeners)
  channel.subscribe((status, err) => {
    if (status === "CHANNEL_ERROR" && err) {
      console.error(`[realtime-service (${symbol})] Unified symbol channel subscription error:`, err);
    }
    const castedStatus = status as SubscriptionStatus;
    if (typeof onStatusChange === "function") {
      onStatusChange(castedStatus, err);
    }
  });

  return () => {
    if (supabase) {
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing unified symbol channel ${channel.topic}:`,
            error.message
          );
        });
      });
    }
  };
}

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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing live quote channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Financial Statement channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Profile channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Ratios TTM channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Dividend History channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Revenue Product Segmentation channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Grades Historical channel ${channel.topic}:`,
            error.message
          );
        });
      });
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
  const topicFilter = `symbol=eq.${baseSymbol}`; // Updated: exchange_variants now uses 'symbol' column (renamed from base_symbol)

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
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${baseSymbol}): Error removing Exchange Variants channel ${channel.topic}:`,
            error.message
          );
        });
      });
    }
  };
}

// Combined subscription for both insider trading tables to reduce channel count
export function subscribeToInsiderTradingUpdates(
  symbol: string,
  onStatisticsUpdate: InsiderTradingStatisticsUpdateCallback | undefined,
  onTransactionsUpdate: InsiderTransactionsUpdateCallback | undefined,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service (${symbol})] Supabase client not available for insider trading updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  // Use a single channel for both tables to reduce channel count
  const channelName = `insider-trading-${symbol
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/gi, "-")}`;
  const topicFilter = `symbol=eq.${symbol}`;

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  // Subscribe to statistics table if callback provided
  if (onStatisticsUpdate) {
    channel.on<InsiderTradingStatisticsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: INSIDER_TRADING_STATISTICS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onStatisticsUpdate === "function") {
          onStatisticsUpdate(payload as InsiderTradingStatisticsPayload);
        }
      }
    );
  }

  // Subscribe to transactions table if callback provided
  if (onTransactionsUpdate) {
    channel.on<InsiderTransactionsDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: INSIDER_TRANSACTIONS_TABLE_NAME,
        filter: topicFilter,
      },
      (payload) => {
        if (typeof onTransactionsUpdate === "function") {
          onTransactionsUpdate(payload as InsiderTransactionsPayload);
        }
      }
    );
  }

  // Subscribe the channel (only once, even with multiple listeners)
  channel.subscribe((status, err) => {
    if (status === "CHANNEL_ERROR" && err) {
      console.error(`[realtime-service (${symbol})] Insider Trading channel subscription error:`, err);
    }
    const castedStatus = status as SubscriptionStatus;
    if (typeof onStatusChange === "function") {
      onStatusChange(castedStatus, err);
    }
  });

  return () => {
    if (supabase) {
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] (${symbol}): Error removing Insider Trading channel ${channel.topic}:`,
            error.message
          );
        });
      });
    }
  };
}

// Keep individual functions for backward compatibility, but they now use the combined channel
export function subscribeToInsiderTradingStatisticsUpdates(
  symbol: string,
  onData: InsiderTradingStatisticsUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  return subscribeToInsiderTradingUpdates(symbol, onData, undefined, onStatusChange);
}

export function subscribeToInsiderTransactionsUpdates(
  symbol: string,
  onData: InsiderTransactionsUpdateCallback,
  onStatusChange: SubscriptionStatusCallback
): () => void {
  return subscribeToInsiderTradingUpdates(symbol, undefined, onData, onStatusChange);
}

export function subscribeToMarketRiskPremiumUpdates(
  onData: MarketRiskPremiumUpdateCallback,
  onStatusChange?: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service] Supabase client not available for market risk premium updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `market-risk-premiums-global`;
  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<MarketRiskPremiumDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: MARKET_RISK_PREMIUMS_TABLE_NAME,
        // No filter - this is a global table
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as MarketRiskPremiumPayload);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err) {
        console.error(`[realtime-service] Market risk premium channel error:`, err);
      }
      const castedStatus = status as SubscriptionStatus;
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      }
    });

  return () => {
    if (supabase) {
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] Error removing Market Risk Premium channel ${channel.topic}:`,
            error.message
          );
        });
      });
    }
  };
}

export function subscribeToTreasuryRateUpdates(
  onData: TreasuryRateUpdateCallback,
  onStatusChange?: SubscriptionStatusCallback
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn(
      `[realtime-service] Supabase client not available for treasury rate updates.`
    );
    if (typeof onStatusChange === "function") {
      onStatusChange(
        "CLIENT_UNAVAILABLE",
        new Error("Supabase client not initialized.")
      );
    }
    return noOpUnsubscribe;
  }

  const channelName = `treasury-rates-global`;
  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on<TreasuryRateDBRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TREASURY_RATES_TABLE_NAME,
        // No filter - this is a global table
      },
      (payload) => {
        if (typeof onData === "function") {
          onData(payload as TreasuryRatePayload);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && err) {
        console.error(`[realtime-service] Treasury rate channel error:`, err);
      }
      const castedStatus = status as SubscriptionStatus;
      if (typeof onStatusChange === "function") {
        onStatusChange(castedStatus, err);
      }
    });

  return () => {
    if (supabase) {
      // Use Result types for error handling (fire and forget)
      void fromPromise(
        supabase.removeChannel(channel),
        (e) => e as Error
      ).then((result) => {
        result.mapErr((error) => {
          console.error(
            `[realtime-service] Error removing Treasury Rate channel ${channel.topic}:`,
            error.message
          );
        });
      });
    }
  };
}

