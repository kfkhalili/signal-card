import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { EventEmitter } from "events";

type LiveQuote = Database["public"]["Tables"]["live_quote_indicators"]["Row"];
type ExchangeStatus =
  Database["public"]["Tables"]["exchange_market_status"]["Row"];

export class RealtimeStockManager extends EventEmitter {
  private supabase: SupabaseClient<Database>;
  private quoteChannels = new Map<string, RealtimeChannel>();
  private exchangeStatusChannel: RealtimeChannel | null = null;
  private subscribedSymbols = new Set<string>();
  private subscribedExchanges = new Set<string>();
  private static instance: RealtimeStockManager | null = null;

  private constructor(supabase: SupabaseClient<Database>) {
    super();
    this.supabase = supabase;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  public static getInstance(
    supabase: SupabaseClient<Database>
  ): RealtimeStockManager {
    if (!this.instance) {
      this.instance = new RealtimeStockManager(supabase);
      this.instance.initialize();
    }
    return this.instance;
  }

  private initialize() {
    if (typeof window !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
  }

  private handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      this.resubscribe();
    }
  }

  public addSymbol(symbol: string) {
    if (this.subscribedSymbols.has(symbol)) return;

    this.subscribedSymbols.add(symbol);
    this.updateSubscription();
  }

  public removeSymbol(symbol: string) {
    if (!this.subscribedSymbols.has(symbol)) return;

    this.subscribedSymbols.delete(symbol);
    this.updateSubscription();
  }

  public addExchange(exchangeCode: string) {
    if (this.subscribedExchanges.has(exchangeCode)) return;

    this.subscribedExchanges.add(exchangeCode);
    this.updateExchangeSubscription();
  }

  public removeExchange(exchangeCode: string) {
    if (!this.subscribedExchanges.has(exchangeCode)) return;

    this.subscribedExchanges.delete(exchangeCode);
    this.updateExchangeSubscription();
  }

  private updateSubscription() {
    // Remove channels for symbols that are no longer subscribed
    for (const [symbol, channel] of this.quoteChannels.entries()) {
      if (!this.subscribedSymbols.has(symbol)) {
        channel.unsubscribe();
        this.quoteChannels.delete(symbol);
      }
    }

    // Add channels for newly subscribed symbols
    for (const symbol of this.subscribedSymbols) {
      if (this.quoteChannels.has(symbol)) continue; // Already subscribed

      const channelName = `live-quote-${symbol.toLowerCase().replace(/[^a-z0-9_.-]/gi, "-")}`;
      const filter = `symbol=eq.${symbol}`;

      const channel = this.supabase.channel(channelName, {
        config: { broadcast: { ack: true } },
      });

      // Subscribe to both INSERT and UPDATE events with symbol-specific filter
      channel
        .on<LiveQuote>(
          "postgres_changes",
          {
            event: "*", // Listen to both INSERT and UPDATE
            schema: "public",
            table: "live_quote_indicators",
            filter: filter, // Symbol-specific filter for realtime.subscription tracking
          },
          (payload) => {
            // Use payload.new for both INSERT and UPDATE
            if (payload.new) {
              this.emit("quote", payload.new);
            } else if (payload.old && payload.eventType === "UPDATE") {
              // Fallback: if new is missing, try old (shouldn't happen but be safe)
              console.warn(
                `[RealtimeStockManager] UPDATE event missing payload.new, using payload.old`
              );
            }
          }
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" && err) {
            console.error(`[RealtimeStockManager] Channel error for ${symbol}:`, err);
          }
        });

      this.quoteChannels.set(symbol, channel);
    }
  }

  private updateExchangeSubscription() {
    if (this.exchangeStatusChannel) {
      this.exchangeStatusChannel.unsubscribe();
      this.exchangeStatusChannel = null;
    }

    if (this.subscribedExchanges.size === 0) return;

    const exchanges = Array.from(this.subscribedExchanges);
    const exchangesSet = new Set(exchanges); // For fast lookup
    const channelName = `exchange-status-for-workspace`;

    this.exchangeStatusChannel = this.supabase.channel(channelName, {
      config: { broadcast: { ack: true } },
    });

    // Subscribe to all exchange status updates
    // Note: Supabase Realtime doesn't support 'in' filter syntax,
    // so we subscribe to all updates and filter client-side
    this.exchangeStatusChannel
      .on<ExchangeStatus>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exchange_market_status",
          // No filter - we'll filter client-side since 'in' syntax isn't supported
        },
        (payload) => {
          const exchangeCode = payload.new && 'exchange_code' in payload.new ? payload.new.exchange_code : null;

          // Filter client-side: only emit if exchange is in our subscribed list
          if (!exchangeCode || !exchangesSet.has(exchangeCode)) {
            return;
          }

          if (payload.new) {
            this.emit("exchange_status", payload.new);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && err) {
          console.error(
            "[RealtimeStockManager] Exchange status channel error:",
            err
          );
        }
      });
  }

  private resubscribe() {
    // Unsubscribe all quote channels and re-subscribe
    for (const channel of this.quoteChannels.values()) {
      channel.unsubscribe();
    }
    this.quoteChannels.clear();

    if (this.subscribedSymbols.size > 0) {
      this.updateSubscription();
    }
    if (this.subscribedExchanges.size > 0) {
      this.updateExchangeSubscription();
    }
  }

  public isSubscribed(symbol: string): boolean {
    return this.subscribedSymbols.has(symbol);
  }

  public destroy() {
    // Unsubscribe all quote channels
    for (const channel of this.quoteChannels.values()) {
      channel.unsubscribe();
    }
    this.quoteChannels.clear();

    if (this.exchangeStatusChannel) {
      this.exchangeStatusChannel.unsubscribe();
      this.exchangeStatusChannel = null;
    }
    if (typeof window !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    this.subscribedSymbols.clear();
    this.subscribedExchanges.clear();
    RealtimeStockManager.instance = null;
    // Cleanup complete
  }
}