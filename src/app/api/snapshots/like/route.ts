// src/app/api/snapshots/like/route.ts
import { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface LikeApiResponse {
  like: Tables<"snapshot_likes">;
  message: string;
  isAlreadyLiked?: boolean;
}

// Interface for the expected body of a DELETE request for unliking
interface UnlikeRequestBody {
  snapshotId: string;
}

// POST handler (existing - for Liking)
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
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
    // For POST, the body is expected to contain the 'like' object with snapshot_id
    const body: { like: { snapshot_id: string } } = await request.json();
    const { snapshot_id: snapshotId } = body.like;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "Missing snapshotId." },
        { status: 400 }
      );
    }

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
      })
      .select("id, snapshot_id, user_id, liked_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingLike } = await supabase
          .from("snapshot_likes")
          .select("id, snapshot_id, user_id, liked_at")
          .eq("user_id", user.id)
          .eq("snapshot_id", snapshotId)
          .single();
        if (existingLike) {
          return NextResponse.json(
            {
              like: existingLike,
              message: "Snapshot already liked by this user.",
              isAlreadyLiked: true,
            },
            { status: 200 }
          );
        }
        console.error(
          "Error fetching existing like after unique violation:",
          insertError // Log the original insert error which might have more context
        );
        return NextResponse.json(
          {
            error: `Database error: ${insertError.message}`,
          },
          { status: 500 }
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    console.error("Error processing like snapshot request:", errorMessage);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: `Internal server error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

// DELETE handler (Updated - for Unliking)
export async function DELETE(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
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
    // Expecting a body like { snapshotId: "..." }
    const body: UnlikeRequestBody = await request.json();
    const { snapshotId } = body; // Directly access snapshotId

    if (!snapshotId) {
      return NextResponse.json(
        { error: "Missing snapshotId." },
        { status: 400 }
      );
    }

    const { error: deleteError, count } = await supabase
      .from("snapshot_likes")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("snapshot_id", snapshotId);

    if (deleteError) {
      console.error("Error deleting like:", deleteError);
      return NextResponse.json(
        { error: `Database error: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { message: "Like not found or already removed." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Snapshot unliked successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error processing unlike snapshot request:", errorMessage);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body for DELETE, or body missing." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
