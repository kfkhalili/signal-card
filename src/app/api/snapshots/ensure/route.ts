// src/app/api/snapshots/ensure/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { generateStateHash } from "@/lib/cardUtils";
import type { ConcreteCardData } from "@/components/game/types";
import type { Json } from "@/lib/supabase/database.types"; // Import the Json type

interface EnsureSnapshotRequestBody {
  cardType: CardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: ConcreteCardData;
  rarityLevel?: string | null;
  rarityReason?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
      cardDataSnapshot, // This is ConcreteCardData
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

    const newSnapshotData = {
      state_hash: stateHash,
      card_type: cardType,
      symbol: symbol,
      company_name: companyName,
      logo_url: logoUrl,
      // Cast ConcreteCardData to unknown, then to Json for Supabase
      card_data_snapshot: cardDataSnapshot as unknown as Json,
      rarity_level: rarityLevel,
      rarity_reason: rarityReason,
      // first_seen_at is handled by DB default
    };

    const { data: insertedSnapshot, error: insertError } = await supabase
      .from("card_snapshots")
      .insert(newSnapshotData) // newSnapshotData now has card_data_snapshot correctly typed for insert
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting new snapshot:", insertError);
      if (insertError.code === "23505") {
        const { data: raceSnapshot, error: raceFindError } = await supabase
          .from("card_snapshots")
          .select("*")
          .eq("state_hash", stateHash)
          .single();
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
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error processing ensure snapshot request:", errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage || "Unknown error"}` },
      { status: 500 }
    );
  }
}
