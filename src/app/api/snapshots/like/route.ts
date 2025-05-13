// src/app/api/snapshots/like/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface LikeSnapshotRequestBody {
  snapshotId: string; // UUID of the card_snapshots record
}

export async function POST(request: Request): Promise<NextResponse> {
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
    const body = (await request.json()) as LikeSnapshotRequestBody;
    const { snapshotId } = body;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "Missing snapshotId." },
        { status: 400 }
      );
    }

    // Verify snapshotId exists in card_snapshots (optional, FK constraint handles it)
    const { data: snapshotExists, error: snapshotCheckError } = await supabase
      .from("card_snapshots")
      .select("id")
      .eq("id", snapshotId)
      .maybeSingle();

    if (snapshotCheckError) {
      console.error("Error checking snapshot for like:", snapshotCheckError);
      return NextResponse.json(
        { error: `Database error: ${snapshotCheckError.message}` },
        { status: 500 }
      );
    }
    if (!snapshotExists) {
      return NextResponse.json(
        { error: "Snapshot to like not found." },
        { status: 404 }
      );
    }

    const { data: newLike, error: insertError } = await supabase
      .from("snapshot_likes")
      .insert({
        user_id: user.id,
        snapshot_id: snapshotId,
        // liked_at is handled by DB default
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // unique_violation for (user_id, snapshot_id)
        return NextResponse.json(
          {
            message: "Snapshot already liked by this user.",
            isAlreadyLiked: true,
          },
          { status: 200 } // 200 OK
        );
      }
      console.error("Error inserting like:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { like: newLike, message: "Snapshot liked successfully!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error processing like snapshot request:", error);
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
