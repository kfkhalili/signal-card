// src/app/api/collection/capture-card/route.ts
import { NextResponse, type NextRequest } from "next/server";
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import { DisplayableCard } from "@/components/game/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CaptureCardRequestBody {
  userId: string;
  cardData: DisplayableCard;
  cardType: CardType;
  symbol: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError) {
    console.error("Error getting session:", sessionError);
    return NextResponse.json(
      { message: `Session error: ${sessionError.message}` },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let requestBody: CaptureCardRequestBody;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  const { userId, cardData, cardType, symbol } = requestBody;

  if (user.id !== userId) {
    return NextResponse.json({ message: "User ID mismatch" }, { status: 403 });
  }

  if (!cardData || !cardType || !symbol || !userId) {
    return NextResponse.json(
      { message: "Missing required fields in request body" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Ensure the snapshot exists or create it
    // We'll use an RPC call for this to encapsulate the logic in the database
    // or call the existing /api/snapshots/ensure endpoint if preferred.
    // For simplicity here, let's assume an RPC `ensure_snapshot`
    // which returns the snapshot_id.

    // For now, let's call the ensure snapshot API route internally.
    // This is not ideal for production (direct DB call or RPC is better)
    // but demonstrates the flow.
    const ensureSnapshotResponse = await fetch(
      new URL("/api/snapshots/ensure", request.url).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("Cookie") || "", // Forward cookies for auth
        },
        body: JSON.stringify({
          card_type: cardType,
          symbol: symbol,
          card_data: cardData,
          rarity: cardData.currentRarity,
        }),
      }
    );

    if (!ensureSnapshotResponse.ok) {
      const errorData = await ensureSnapshotResponse.json();
      console.error("Error ensuring snapshot:", errorData);
      return NextResponse.json(
        { message: "Failed to ensure snapshot", details: errorData.message },
        { status: ensureSnapshotResponse.status }
      );
    }

    const { snapshot_id } = await ensureSnapshotResponse.json();

    if (!snapshot_id) {
      return NextResponse.json(
        { message: "Failed to retrieve snapshot ID after ensuring." },
        { status: 500 }
      );
    }

    // Step 2: Add the snapshot to the user's collection
    const { data: collectionEntry, error: collectionError } = await supabase
      .from("user_collections")
      .insert({
        user_id: userId,
        snapshot_id: snapshot_id,
      })
      .select()
      .single();

    if (collectionError) {
      // Handle potential duplicate error if the user already collected this exact snapshot
      if (collectionError.code === "23505") {
        // Unique violation
        // Fetch the existing entry to return it
        const { data: existingEntry, error: fetchError } = await supabase
          .from("user_collections")
          .select("*")
          .eq("user_id", userId)
          .eq("snapshot_id", snapshot_id)
          .single();

        if (fetchError) {
          console.error(
            "Error fetching existing collection entry:",
            fetchError
          );
          return NextResponse.json(
            { message: `Database error: ${fetchError.message}` },
            { status: 500 }
          );
        }
        return NextResponse.json(
          {
            message: "Card already in collection.",
            entry: existingEntry,
          },
          { status: 200 }
        );
      }
      console.error("Error adding to collection:", collectionError);
      return NextResponse.json(
        { message: `Database error: ${collectionError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Card captured and added to collection successfully",
        entry: collectionEntry,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/collections/capture-card:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Server error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
