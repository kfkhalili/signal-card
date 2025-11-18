import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { EventEmitter } from "events";

type LiveQuote = Database["public"]["Tables"]["live_quote_indicators"]["Row"];
type ExchangeStatus =
  Database["public"]["Tables"]["exchange_market_status"]["Row"];

export class RealtimeStockManager extends EventEmitter {
  private supabase: SupabaseClient<Database>;
  private quoteChannel: RealtimeChannel | null = null;
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
    if (this.quoteChannel) {
      this.quoteChannel.unsubscribe();
      this.quoteChannel = null;
    }

    if (this.subscribedSymbols.size === 0) return;

    const symbols = Array.from(this.subscribedSymbols);
    const channelName = `live-quotes-for-workspace`;

    this.quoteChannel = this.supabase.channel(channelName, {
      config: { broadcast: { ack: true } },
    });

    // Subscribe to both INSERT and UPDATE events
    // New records might be inserted, existing ones updated
    this.quoteChannel
      .on<LiveQuote>(
        "postgres_changes",
        {
          event: "*", // Listen to both INSERT and UPDATE
          schema: "public",
          table: "live_quote_indicators",
          filter: `symbol=in.(${symbols.join(",")})`,
        },
        (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[RealtimeStockManager] Received quote ${payload.eventType} for ${payload.new?.symbol}`,
              payload
            );
          }
          // Use payload.new for both INSERT and UPDATE
          if (payload.new) {
            this.emit("quote", payload.new);
          } else if (payload.old && payload.eventType === "UPDATE") {
            // Fallback: if new is missing, try old (shouldn't happen but be safe)
            console.warn(
              `[RealtimeStockManager] UPDATE event missing payload.new, using payload.old`,
              payload
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `[RealtimeStockManager] Subscribed to ${symbols.length} symbols: ${symbols.join(", ")}`
          );
        } else if (status === "CHANNEL_ERROR" && err) {
          console.error("[RealtimeStockManager] Channel error:", err);
        } else {
          console.log(`[RealtimeStockManager] Channel status: ${status}`, err || "");
        }
      });
  }

  private updateExchangeSubscription() {
    if (this.exchangeStatusChannel) {
      this.exchangeStatusChannel.unsubscribe();
      this.exchangeStatusChannel = null;
    }

    if (this.subscribedExchanges.size === 0) return;

    const exchanges = Array.from(this.subscribedExchanges);
    const channelName = `exchange-status-for-workspace`;

    this.exchangeStatusChannel = this.supabase.channel(channelName, {
      config: { broadcast: { ack: true } },
    });

    this.exchangeStatusChannel
      .on<ExchangeStatus>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exchange_market_status",
          filter: `exchange_code=in.(${exchanges.join(",")})`,
        },
        (payload) => {
          this.emit("exchange_status", payload.new);
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(
            `[RealtimeStockManager] Subscribed to ${exchanges.length} exchange statuses`
          );
        } else if (status === "CHANNEL_ERROR" && err) {
          console.error(
            "[RealtimeStockManager] Exchange status channel error:",
            err
          );
        }
      });
  }

  private resubscribe() {
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
    if (this.quoteChannel) {
      this.quoteChannel.unsubscribe();
      this.quoteChannel = null;
    }
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
    console.log("[RealtimeStockManager] Destroyed.");
  }
}