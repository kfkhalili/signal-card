// src/app/api/collections/add/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface AddToCollectionRequestBody {
  snapshotId: string; // UUID of the card_snapshots record
  userNotes?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
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
    const body = (await request.json()) as AddToCollectionRequestBody;
    const { snapshotId, userNotes } = body;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "Missing snapshotId." },
        { status: 400 }
      );
    }

    // Optionally, verify snapshotId exists in card_snapshots (though FK constraint handles it)

    const { data: newCollectionEntry, error: insertError } = await supabase
      .from("user_collections")
      .insert({
        user_id: user.id,
        snapshot_id: snapshotId,
        user_notes: userNotes,
        // captured_at is handled by DB default
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // unique_violation for (user_id, snapshot_id)
        // User has already collected this snapshot. This is not necessarily an error.
        // We can fetch the existing entry to return it.
        const { data: existingEntry, error: fetchError } = await supabase
          .from("user_collections")
          .select("*")
          .eq("user_id", user.id)
          .eq("snapshot_id", snapshotId)
          .single();

        if (existingEntry) {
          return NextResponse.json(
            {
              collectionEntry: existingEntry,
              message: "Snapshot already in collection.",
            },
            { status: 200 } // 200 OK as it's already there
          );
        }
        return NextResponse.json(
          {
            error: `Database error: ${
              fetchError?.message || insertError.message
            }`,
          },
          { status: 500 }
        );
      }
      console.error("Error adding to user_collections:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        collectionEntry: newCollectionEntry,
        message: "Added to collection successfully!",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error processing add to collection request:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
