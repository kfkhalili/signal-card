// src/app/api/demo-cards/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fromPromise } from "neverthrow";
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
  "exchangevariants",
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

    const symbolsResult = await fromPromise(
      supabase
        .from("supported_symbols")
        .select("symbol")
        .eq("is_active", true),
      (e) => new Error(`Failed to fetch supported symbols: ${(e as Error).message}`)
    );

    const symbolsData = symbolsResult.match(
      (response) => {
        const { data, error } = response;
        if (error) {
          return null;
        }
        if (!data || data.length < GRID_SIZE) {
          return null;
        }
        return data;
      },
      () => null
    );

    if (!symbolsData) {
      return NextResponse.json(
        { error: "Failed to generate demo cards.", details: "Could not fetch enough supported symbols." },
        { status: 500 }
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
