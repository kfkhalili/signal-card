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
const MAX_RETRIES = 5; // Maximum number of attempts to get enough cards with valid logos

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Checks if a logo URL is from Supabase storage (not FMP default).
 * Returns true if the URL contains the Supabase storage path pattern.
 */
const hasValidSupabaseLogo = (logoUrl: string | null | undefined): boolean => {
  if (!logoUrl) return false;
  // Check if URL contains Supabase storage path for profile images
  return logoUrl.includes("supabase.co/storage/v1/object/public/profile-images/");
};

export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const symbolsResult = await fromPromise(
      supabase
        .from("listed_symbols")
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
    const shuffledAllSymbols = shuffleArray(allSymbols);
    const shuffledAllCardTypes = shuffleArray(DEMO_CARD_TYPES);

    let validCards: DisplayableCard[] = [];
    const symbolsUsed = new Set<string>();
    let attempts = 0;

    // Keep trying until we have enough cards with valid Supabase logos
    while (validCards.length < GRID_SIZE && attempts < MAX_RETRIES) {
      attempts++;

      // Get a batch of symbols we haven't tried yet
      const availableSymbols = shuffledAllSymbols.filter(
        (s) => !symbolsUsed.has(s)
      );

      if (availableSymbols.length === 0) {
        // No more symbols to try
        break;
      }

      // Take a batch of symbols (try more than GRID_SIZE to increase chances)
      const batchSize = Math.min(GRID_SIZE * 2, availableSymbols.length);
      const symbolBatch = availableSymbols.slice(0, batchSize);
      const cardTypeBatch = shuffledAllCardTypes.slice(0, batchSize);

      // Mark these symbols as used
      symbolBatch.forEach((s) => symbolsUsed.add(s));

      const cardPromises = symbolBatch.map(async (symbol, index) => {
        const cardType = cardTypeBatch[index] || shuffledAllCardTypes[index % shuffledAllCardTypes.length];
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
        .filter((card): card is DisplayableCard => card !== null)
        .filter((card) => hasValidSupabaseLogo(card.logoUrl));

      validCards = [...validCards, ...successfulCards];

      // If we have enough cards, trim to GRID_SIZE
      if (validCards.length >= GRID_SIZE) {
        validCards = validCards.slice(0, GRID_SIZE);
        break;
      }
    }

    // If we still don't have enough cards, return what we have (better than nothing)
    // But log a warning
    if (validCards.length < GRID_SIZE) {
      console.warn(
        `[API/demo-cards] Only found ${validCards.length} cards with valid Supabase logos (requested ${GRID_SIZE})`
      );
    }

    return NextResponse.json(validCards);
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
