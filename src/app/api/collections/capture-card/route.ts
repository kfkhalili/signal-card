// src/app/api/collection/capture-card/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
} from "@/components/game/cards/profile-card/profile-card.types";
import crypto from "crypto";

// Define the union type for card data snapshots more clearly
type CardDataSnapshot = PriceCardData | ProfileCardData;

interface CaptureCardRequestBody {
  cardType: CardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: CardDataSnapshot; // This is the ConcreteCardData
  sourceCardId?: string;
  // Rarity information determined by the client for the live state
  currentRarity?: string | null;
  rarityReason?: string | null;
}

// Function to generate a consistent hash for a card's key state
function generateStateHash(
  cardType: CardType,
  snapshot: CardDataSnapshot
): string {
  let keyDataString = `${cardType}:${snapshot.symbol}`;

  if (snapshot.type === "price") {
    const priceCard = snapshot as PriceCardData;
    keyDataString += `:${priceCard.faceData.price?.toFixed(4)}`;
    keyDataString += `:${priceCard.faceData.changePercentage?.toFixed(4)}`;
    keyDataString += `:${priceCard.faceData.volume}`;
    keyDataString += `:${priceCard.faceData.dayHigh?.toFixed(4)}`;
    keyDataString += `:${priceCard.faceData.dayLow?.toFixed(4)}`;
    keyDataString += `:${priceCard.backData.sma50d?.toFixed(4)}`;
    keyDataString += `:${priceCard.backData.sma200d?.toFixed(4)}`;
  } else if (snapshot.type === "profile") {
    const profileCard = snapshot as ProfileCardData;
    keyDataString += `:${
      (profileCard.staticData as ProfileCardStaticData).industry
    }`;
    keyDataString += `:${
      (profileCard.staticData as ProfileCardStaticData).sector
    }`;
    keyDataString += `:${
      (profileCard.staticData as ProfileCardStaticData).country
    }`;
    keyDataString += `:${
      (profileCard.staticData as ProfileCardStaticData).profile_last_updated
    }`;
    if (profileCard.liveData) {
      const liveData = profileCard.liveData as ProfileCardLiveData;
      keyDataString += `:${liveData.price?.toFixed(4)}`;
      keyDataString += `:${liveData.volume}`;
    }
  }
  return crypto.createHash("md5").update(keyDataString).digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: User not authenticated." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as CaptureCardRequestBody;
    const {
      cardType,
      symbol,
      companyName,
      logoUrl,
      cardDataSnapshot,
      sourceCardId,
      currentRarity, // Directly use this from the body
      rarityReason, // Directly use this from the body
    } = body;

    if (
      !cardType ||
      !symbol ||
      !cardDataSnapshot ||
      cardType !== cardDataSnapshot.type
    ) {
      return NextResponse.json(
        { error: "Missing required fields or card type mismatch." },
        { status: 400 }
      );
    }

    const stateHash = generateStateHash(cardType, cardDataSnapshot);

    const { data: existingByHash, error: hashCheckError } = await supabase
      .from("user_collected_cards")
      .select("id, captured_at")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .eq("card_type", cardType)
      .eq("state_hash", stateHash)
      .maybeSingle();

    if (hashCheckError) {
      console.error(
        "Error checking for existing card by hash:",
        hashCheckError
      );
    }

    if (existingByHash) {
      return NextResponse.json(
        {
          error: "This exact card data state has already been collected.",
          message: "Duplicate card state.",
          existingCardId: existingByHash.id,
        },
        { status: 409 }
      );
    }

    const newCollectedCard = {
      user_id: user.id,
      card_type: cardType,
      symbol: symbol,
      company_name: companyName,
      logo_url: logoUrl,
      card_data_snapshot: cardDataSnapshot, // This is the ConcreteCardData
      source_card_id: sourceCardId,
      state_hash: stateHash,
      rarity_level: currentRarity, // Directly use from request body
      rarity_reason: rarityReason, // Directly use from request body
    };

    const { data: insertedCard, error: insertError } = await supabase
      .from("user_collected_cards")
      .insert(newCollectedCard)
      .select()
      .single();

    if (insertError) {
      console.error(
        "Error inserting collected card into Supabase:",
        insertError
      );
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Card captured successfully!", collectedCard: insertedCard },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error processing capture card request:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
