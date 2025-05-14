// src/app/api/snapshots/like/route.ts
// We can add the DELETE handler to the existing like route file.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface LikeSnapshotRequestBody {
  snapshotId: string; // UUID of the card_snapshots record
}

// POST handler (existing - for Liking)
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
      .select("id, snapshot_id, user_id, liked_at") // Return the created like record
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // Fetch the existing like to return its ID
        const { data: existingLike, error: fetchExistingError } = await supabase
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
        // If fetching existing like fails after unique violation, it's an issue
        console.error(
          "Error fetching existing like after unique violation:",
          fetchExistingError
        );
        return NextResponse.json(
          {
            error: `Database error: ${
              fetchExistingError?.message || insertError.message
            }`,
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

// DELETE handler (New - for Unliking)
export async function DELETE(request: Request): Promise<NextResponse> {
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
    // Assuming snapshotId comes in the request body for consistency with POST
    // Alternatively, it could be a query parameter: const { searchParams } = new URL(request.url); const snapshotId = searchParams.get('snapshotId');
    const body = (await request.json()) as LikeSnapshotRequestBody; // Reusing the interface for simplicity
    const { snapshotId } = body;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "Missing snapshotId." },
        { status: 400 }
      );
    }

    const { error: deleteError, count } = await supabase
      .from("snapshot_likes")
      .delete({ count: "exact" }) // Get the count of deleted rows
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
      // This means the user hadn't liked this snapshot, or it was already unliked.
      // Not necessarily an error, could be a "not found to delete".
      return NextResponse.json(
        { message: "Like not found or already removed." },
        { status: 404 } // Or 200 with a specific message
      );
    }

    return NextResponse.json(
      { message: "Snapshot unliked successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing unlike snapshot request:", error);
    if (
      error instanceof SyntaxError &&
      request.method === "DELETE" &&
      !request.headers.get("content-type")?.includes("application/json")
    ) {
      // DELETE with no body is fine, but if body is expected and not JSON, it's an issue.
      // For now, we assume body is sent for DELETE for snapshotId.
      return NextResponse.json(
        { error: "Invalid JSON in request body for DELETE, or body missing." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
