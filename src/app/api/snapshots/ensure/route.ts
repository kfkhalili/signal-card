// This function will reside within /api/snapshots/ensure/route.ts initially
// Or can be moved to a shared lib/utils file if used elsewhere.
// src/app/api/snapshots/ensure/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import crypto from "crypto";
import type { CardType } from "@/components/game/cards/base-card/base-card.types"; // Adjust path as needed
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types"; // Adjust path as needed
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
} from "@/components/game/cards/profile-card/profile-card.types"; // Adjust path as needed

// Define the union type for card data snapshots more clearly for the hash function
type CardDataForHashing = PriceCardData | ProfileCardData;

function generateStateHash(
  cardType: CardType,
  symbol: string, // Explicitly pass symbol
  snapshotData: CardDataForHashing, // This is the ConcreteCardData part
  rarityLevel?: string | null,
  rarityReason?: string | null
): string {
  // Start with type and symbol for base uniqueness
  let keyDataString = `${cardType}:${symbol.toUpperCase()}`;

  // Add rarity info if present, as it's part of the distinct state
  if (rarityLevel) keyDataString += `:rarityL-${rarityLevel}`;
  if (rarityReason) keyDataString += `:rarityR-${rarityReason}`;

  // Add specific fields from the snapshotData
  if (snapshotData.type === "price") {
    const priceCard = snapshotData as PriceCardData;
    keyDataString += `:P-p${priceCard.faceData.price?.toFixed(4)}`;
    keyDataString += `:P-cp${priceCard.faceData.changePercentage?.toFixed(4)}`;
    keyDataString += `:P-v${priceCard.faceData.volume}`;
    keyDataString += `:P-dh${priceCard.faceData.dayHigh?.toFixed(4)}`;
    keyDataString += `:P-dl${priceCard.faceData.dayLow?.toFixed(4)}`;
    keyDataString += `:P-s50${priceCard.backData.sma50d?.toFixed(4)}`;
    keyDataString += `:P-s200${priceCard.backData.sma200d?.toFixed(4)}`;
    keyDataString += `:P-yh${priceCard.faceData.yearHigh?.toFixed(4)}`;
    keyDataString += `:P-yl${priceCard.faceData.yearLow?.toFixed(4)}`;
    keyDataString += `:P-mc${priceCard.backData.marketCap}`;
    // Consider all fields that define the uniqueness of a PriceCard snapshot state
  } else if (snapshotData.type === "profile") {
    const profileCard = snapshotData as ProfileCardData;
    const staticD = profileCard.staticData as ProfileCardStaticData;
    keyDataString += `:Pr-ind${staticD.industry}`;
    keyDataString += `:Pr-sec${staticD.sector}`;
    keyDataString += `:Pr-cou${staticD.country}`;
    keyDataString += `:Pr-ceo${staticD.ceo}`;
    keyDataString += `:Pr-ipo${staticD.formatted_ipo_date}`;
    keyDataString += `:Pr-emp${staticD.formatted_full_time_employees}`;
    // Hash live data for profile if it contributes to its unique state for snapshotting
    if (profileCard.liveData) {
      const liveD = profileCard.liveData as ProfileCardLiveData;
      keyDataString += `:PrL-p${liveD.price?.toFixed(4)}`;
      keyDataString += `:PrL-v${liveD.volume}`;
    }
    // Consider all fields from staticData and liveData that define a ProfileCard snapshot state
  }
  // Add other card type specific fields here

  return crypto.createHash("md5").update(keyDataString).digest("hex");
}

interface EnsureSnapshotRequestBody {
  cardType: CardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: CardDataForHashing; // This is the ConcreteCardData
  rarityLevel?: string | null;
  rarityReason?: string | null;
  // sourceCardId is removed as it's less relevant for a global snapshot
}

export async function POST(request: Request) {
  const supabase = await createClient();
  // User authentication might not be strictly necessary for *ensuring* a global snapshot,
  // but it's good for audit trails or if there are user-specific limits in the future.
  // For now, let's keep it simple and assume this can be called by an authenticated user
  // who is triggering an action that needs a snapshot ID.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Or allow anonymous creation of snapshots if truly global and not tied to user actions yet.
    // For now, require auth for any write-like operation.
    return NextResponse.json(
      { error: "User not authenticated." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as EnsureSnapshotRequestBody;
    const {
      cardType,
      symbol,
      companyName,
      logoUrl,
      cardDataSnapshot,
      rarityLevel,
      rarityReason,
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
      rarityLevel,
      rarityReason
    );

    // Check if snapshot already exists
    const { data: existingSnapshot, error: findError } = await supabase
      .from("card_snapshots")
      .select("*")
      .eq("state_hash", stateHash)
      .maybeSingle();

    if (findError) {
      console.error("Error finding existing snapshot by hash:", findError);
      return NextResponse.json(
        { error: `Database error: ${findError.message}` },
        { status: 500 }
      );
    }

    if (existingSnapshot) {
      return NextResponse.json(
        { snapshot: existingSnapshot, isNew: false },
        { status: 200 }
      );
    }

    // Snapshot doesn't exist, create it
    const newSnapshotData = {
      state_hash: stateHash,
      card_type: cardType,
      symbol: symbol,
      company_name: companyName,
      logo_url: logoUrl,
      card_data_snapshot: cardDataSnapshot, // The ConcreteCardData
      rarity_level: rarityLevel,
      rarity_reason: rarityReason,
      // first_seen_at is handled by DB default
    };

    const { data: insertedSnapshot, error: insertError } = await supabase
      .from("card_snapshots")
      .insert(newSnapshotData)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting new snapshot:", insertError);
      // Handle potential race condition if another request created it just now
      if (insertError.code === "23505") {
        // unique_violation for state_hash
        const { data: raceSnapshot, error: raceFindError } = await supabase
          .from("card_snapshots")
          .select("*")
          .eq("state_hash", stateHash)
          .single(); // Should exist now
        if (raceSnapshot) {
          return NextResponse.json(
            { snapshot: raceSnapshot, isNew: false, raceCondition: true },
            { status: 200 }
          );
        }
        return NextResponse.json(
          {
            error: `Database error after race condition: ${
              raceFindError?.message || insertError.message
            }`,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { snapshot: insertedSnapshot, isNew: true },
      { status: 201 } // 201 Created
    );
  } catch (error: any) {
    console.error("Error processing ensure snapshot request:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
