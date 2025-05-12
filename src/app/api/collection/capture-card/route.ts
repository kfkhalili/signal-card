// src/app/api/collection/capture-card/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type {
  PriceCardData,
  PriceCardFaceData,
} from "@/components/game/cards/price-card/price-card.types";
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
  cardDataSnapshot: CardDataSnapshot; // Use the union type
  sourceCardId?: string;
  // isMarketOpen?: boolean; // Client can send this if available from the card's data source
}

// Function to generate a consistent hash for a card's key state
function generateStateHash(
  cardType: CardType,
  snapshot: CardDataSnapshot
): string {
  let keyDataString = `${cardType}:${snapshot.symbol}`;

  if (snapshot.type === "price") {
    const priceCard = snapshot as PriceCardData;
    // Hash based on actual financial data.
    // Using toFixed for consistent float string representation.
    keyDataString += `:${priceCard.faceData.price?.toFixed(4)}`;
    keyDataString += `:${priceCard.faceData.changePercentage?.toFixed(4)}`;
    keyDataString += `:${priceCard.faceData.volume}`;
    keyDataString += `:${priceCard.faceData.dayHigh?.toFixed(4)}`;
    keyDataString += `:${priceCard.faceData.dayLow?.toFixed(4)}`;
    // Optionally include SMAs if they are key to the "state"
    keyDataString += `:${priceCard.backData.sma50d?.toFixed(4)}`;
    keyDataString += `:${priceCard.backData.sma200d?.toFixed(4)}`;
    // Optionally include market status if it defines a distinct state and is part of snapshot
    // This assumes 'is_market_open' is part of your PriceCardData structure if you want to hash it.
    // For example, if PriceCardData was augmented: const augmentedSnapshot = snapshot as PriceCardData & { is_market_open?: boolean };
    // if (typeof augmentedSnapshot.is_market_open === 'boolean') {
    //   keyDataString += `:${augmentedSnapshot.is_market_open}`;
    // }
  } else if (snapshot.type === "profile") {
    const profileCard = snapshot as ProfileCardData;
    // Hash key static data and potentially key live data points shown on the profile card.
    // Avoid volatile timestamps for liveData if they behave like FMP's api_timestamp.
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
    }`; // If this changes, it's a new state
    if (profileCard.liveData) {
      const liveData = profileCard.liveData as ProfileCardLiveData;
      keyDataString += `:${liveData.price?.toFixed(4)}`;
      keyDataString += `:${liveData.volume}`;
    }
  }
  // Add more conditions for other card types as they are introduced

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
      // isMarketOpen, // This would come from body if sent by client
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

    // Check for existing card with the same state hash
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
      // Depending on policy, you might still allow insertion or return an error.
      // For now, we'll let it proceed to insertion if this check errors, but log it.
    }

    if (existingByHash) {
      return NextResponse.json(
        {
          error: "This exact card data state has already been collected.",
          message: "Duplicate card state.",
          existingCardId: existingByHash.id,
        },
        { status: 409 }
      ); // 409 Conflict
    }

    // If we reached here, it's not a hash-based duplicate, or the check failed.
    // The FMP api_timestamp based duplicate check was removed due to its unreliability.
    // The strength of the duplicate check now relies on a good state_hash definition.

    const newCollectedCard = {
      user_id: user.id,
      card_type: cardType,
      symbol: symbol,
      company_name: companyName,
      logo_url: logoUrl,
      card_data_snapshot: cardDataSnapshot,
      source_card_id: sourceCardId,
      state_hash: stateHash,
      // captured_at uses DB default
      // rarity_level and user_notes will be null/default
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
      // Handle JSON parsing errors
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
