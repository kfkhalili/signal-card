// src/app/api/collection/capture-card/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { generateStateHash, type CardDataForHashing } from "@/lib/cardUtils";

interface CaptureCardRequestBody {
  cardType: CardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: CardDataForHashing; // This is the ConcreteCardData
  sourceCardId?: string;
  // Rarity information determined by the client for the live state
  currentRarity?: string | null;
  rarityReason?: string | null;
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
      currentRarity,
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

    const stateHash = generateStateHash(
      cardType,
      symbol,
      cardDataSnapshot,
      currentRarity,
      rarityReason
    );
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
