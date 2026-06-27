// src/stores/leaderboardStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fromPromise } from "neverthrow";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Pillar = "value" | "growth" | "profitability" | "income" | "health" | "revenue" | "sentiment" | "buyback";

// This interface must match the structure of the data returned by the SQL function.
export interface LeaderboardEntry {
  rank: number;
  symbol: string;
  composite_score: number | null; // Can be null if calculation fails or data is missing
  market_cap: number | null;
  revenue: number | null;
  ps_rank: number | null;
  evm_rank: number | null;
  sentiment_rank: number | null;
  profitability_rank: number | null;
  buyback_rank: number | null;
  peg_rank: number | null;
  div_yield_rank: number | null;
  health_rank: number | null;
  industry: string | null;
}

interface LeaderboardState {
  weights: Record<Pillar, number>;
  industryFilters: string[];
  exchangeFilters: string[];
  leaderboardData: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  actions: {
    setWeights: (newWeights: Record<Pillar, number>) => void;
    setIndustryFilters: (industries: string[]) => void;
    setExchangeFilters: (exchanges: string[]) => void;
    fetchLeaderboard: (
      supabase: SupabaseClient<Database>
    ) => Promise<void>;
  };
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      weights: {
    value: 0.12,
    growth: 0.12,
    profitability: 0.12,
    income: 0.12,
    health: 0.13,
    revenue: 0.13,
    sentiment: 0.13,
    buyback: 0.13
  },
  industryFilters: [],
  exchangeFilters: [],
  leaderboardData: [],
  isLoading: false,
  error: null,
  actions: {
    setWeights: (newWeights) => set({ weights: newWeights }),
    setIndustryFilters: (industries) => set({ industryFilters: industries }),
    setExchangeFilters: (exchanges) => set({ exchangeFilters: exchanges }),
    fetchLeaderboard: async (supabase) => {
      set({ isLoading: true, error: null });

      const weightsPayload = get().weights;
      const industryPayload = get().industryFilters;
      const exchangePayload = get().exchangeFilters;

      const rpcResult = await fromPromise(
        supabase.rpc("get_weighted_leaderboard", {
          weights: weightsPayload,
          p_industries: industryPayload.length > 0 ? industryPayload : null,
          p_exchanges: exchangePayload.length > 0 ? exchangePayload : null,
        }),
        (e) => new Error(`Failed to fetch leaderboard: ${(e as Error).message}`)
      );

      rpcResult.match(
        (response) => {
          const { data, error } = response;

          if (error) {
            // --- ADD THIS LOG TO SEE THE SERVER's RESPONSE ---
            console.error("Error from Supabase RPC:", error);
            const errorMessage = error.message || "An unknown error occurred";
            set({ error: errorMessage, isLoading: false });
            return;
          }

          set({ leaderboardData: (data as unknown as LeaderboardEntry[]) ?? [], isLoading: false });
        },
        (err) => {
          // Handle Result error (network/exception errors)
          const errorMessage = err.message || "An unknown error occurred";
          set({ error: errorMessage, isLoading: false });
        }
      );
    },
  },
  }),
  {
    name: "compass-storage",
    partialize: (state) => ({
      weights: state.weights,
      industryFilters: state.industryFilters,
      exchangeFilters: state.exchangeFilters,
    }),
  }
));