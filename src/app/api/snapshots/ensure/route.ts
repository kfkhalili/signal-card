// This function will reside within /api/snapshots/ensure/route.ts initially
// Or can be moved to a shared lib/utils file if used elsewhere.
// src/app/api/snapshots/ensure/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { generateStateHash } from "@/lib/cardUtils";
import { ConcreteCardData } from "@/components/game/types";

interface EnsureSnapshotRequestBody {
  cardType: CardType;
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
  cardDataSnapshot: ConcreteCardData;
  rarityLevel?: string | null;
  rarityReason?: string | null;
  // sourceCardId is removed as it's less relevant for a global snapshot
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
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
