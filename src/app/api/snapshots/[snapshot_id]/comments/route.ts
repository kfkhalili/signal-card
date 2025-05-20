// src/app/api/snapshots/[snapshot_id]/comments/route.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Tables } from "@/lib/supabase/database.types";
import { SharedCommentWithAuthor } from "@/types/comment.types";

interface RouteParams {
  params: Promise<{
    snapshot_id: string; // This is the card_snapshots.id (UUID)
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const supabase = await createSupabaseServerClient();
  const { snapshot_id: snapshotId } = await params;

  if (!snapshotId) {
    return NextResponse.json(
      { error: "Missing snapshot_id." },
      { status: 400 }
    );
  }

  try {
    // Query the new view 'snapshot_comments_with_author_details'
    const { data: rowsFromView, error } = await supabase
      .from("snapshot_comments_with_author_details") // Querying the VIEW
      .select(
        `
        id,
        user_id,
        snapshot_id,
        parent_comment_id,
        comment_text,
        created_at,
        updated_at,
        author_profile_id,
        author_username,
        author_avatar_url
      `
      )
      .eq("snapshot_id", snapshotId)
      .is("parent_comment_id", null) // Still fetching top-level comments
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments from view:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform the flat data from the view into the desired nested author structure
    const comments: SharedCommentWithAuthor[] = (
      (rowsFromView || []) as Tables<"snapshot_comments_with_author_details">[]
    ).map((row) => ({
      id: row.id!,
      user_id: row.user_id!, // This is the original commenter's user_id
      snapshot_id: row.snapshot_id!,
      parent_comment_id: row.parent_comment_id!,
      comment_text: row.comment_text!,
      created_at: row.created_at!,
      updated_at: row.updated_at!,
      author: row.author_profile_id // Check if author_profile_id exists (due to LEFT JOIN in view)
        ? {
            id: row.author_profile_id, // This is user_profiles.id
            username: row.author_username,
            avatar_url: row.author_avatar_url,
          }
        : null, // If no matching user_profile, author is null
    }));

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error(
      "Error processing get comments request (with view):",
      errorMessage
    );
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
