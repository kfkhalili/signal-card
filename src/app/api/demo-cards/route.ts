// src/app/api/demo-cards/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  getCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { DisplayableCard } from "@/components/game/types";
import "@/components/game/cards/initializers";

const DEMO_CARD_TYPES: CardType[] = [
  "profile",
  "price",
  "revenue",
  "solvency",
  "cashuse",
  "keyratios",
  "revenuebreakdown",
  "analystgrades",
];
const GRID_SIZE = 8;

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: symbolsData, error: symbolsError } = await supabase
      .from("supported_symbols")
      .select("symbol")
      .eq("is_active", true);

    if (symbolsError || !symbolsData || symbolsData.length < GRID_SIZE) {
      throw new Error(
        `Could not fetch enough supported symbols. Need ${GRID_SIZE}, got ${
          symbolsData?.length || 0
        }.`
      );
    }

    const allSymbols = symbolsData.map((s) => s.symbol);
    const shuffledSymbols = shuffleArray(allSymbols).slice(0, GRID_SIZE);
    const shuffledCardTypes = shuffleArray(DEMO_CARD_TYPES).slice(0, GRID_SIZE);

    const cardPromises = shuffledSymbols.map(async (symbol, index) => {
      const cardType = shuffledCardTypes[index];
      const initializer = getCardInitializer(cardType);

      if (!initializer) return null;

      const context: CardInitializationContext = {
        symbol,
        supabase,
        toast: () => ({
          id: "",
          dismiss: () => {
            // No-op for background demo card generation.
          },
          update: () => {
            // No-op for background demo card generation.
          },
        }),
        activeCards: [],
      };
      const result = await initializer(context);
      return result.isOk() ? result.value : null;
    });

    const results = await Promise.allSettled(cardPromises);
    const successfulCards = results
      .map((res) => (res.status === "fulfilled" ? res.value : null))
      .filter((card): card is DisplayableCard => card !== null);

    return NextResponse.json(successfulCards);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("[API/demo-cards] Error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to generate demo cards.", details: errorMessage },
      { status: 500 }
    );
  }
}
