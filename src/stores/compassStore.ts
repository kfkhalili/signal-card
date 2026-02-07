// src/stores/leaderboardStore.ts
import { create } from "zustand";
import { fromPromise } from "neverthrow";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Pillar = "value" | "growth" | "profitability" | "income" | "health" | "revenue" | "sentiment" | "buyback";

// This interface must match the structure of the data returned by the SQL function.
export interface LeaderboardEntry {
  rank: number;
  symbol: string;
  composite_score: number | null; // Can be null if calculation fails or data is missing
}

interface LeaderboardState {
  weights: Record<Pillar, number>;
  leaderboardData: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  actions: {
    setWeights: (newWeights: Record<Pillar, number>) => void;
    fetchLeaderboard: (
      supabase: SupabaseClient<Database>
    ) => Promise<void>;
  };
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
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
  leaderboardData: [],
  isLoading: false,
  error: null,
  actions: {
    setWeights: (newWeights) => set({ weights: newWeights }),
    fetchLeaderboard: async (supabase) => {
      set({ isLoading: true, error: null });

      const weightsPayload = get().weights;

      const rpcResult = await fromPromise(
        supabase.rpc("get_weighted_leaderboard", {
          weights: weightsPayload,
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

          set({ leaderboardData: data ?? [], isLoading: false });
        },
        (err) => {
          // Handle Result error (network/exception errors)
          const errorMessage = err.message || "An unknown error occurred";
          set({ error: errorMessage, isLoading: false });
        }
      );
    },
  },
}));