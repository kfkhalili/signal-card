// src/app/api/snapshots/comments/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface CreateCommentRequestBody {
  snapshotId: string; // UUID of the card_snapshots record
  commentText: string;
  parentCommentId?: string | null; // For threaded replies
}

// Define a more specific type for the comment with author details for the response
interface CommentWithAuthor {
  id: string;
  user_id: string;
  snapshot_id: string;
  parent_comment_id: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
  author: {
    // Assuming 'profiles' table linked to auth.users has these
    id: string; // user_id from profiles table
    username?: string | null; // or display_name, full_name
    avatar_url?: string | null;
  } | null; // Author could be null if profile not found or not selected
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
    const body = (await request.json()) as CreateCommentRequestBody;
    const { snapshotId, commentText, parentCommentId } = body;

    if (!snapshotId || !commentText || commentText.trim() === "") {
      return NextResponse.json(
        { error: "Missing snapshotId or commentText." },
        { status: 400 }
      );
    }

    if (commentText.length > 1000) {
      // Example limit
      return NextResponse.json(
        { error: "Comment text is too long (max 1000 characters)." },
        { status: 400 }
      );
    }

    // Verify snapshotId exists in card_snapshots
    const { data: snapshotExists, error: snapshotCheckError } = await supabase
      .from("card_snapshots")
      .select("id")
      .eq("id", snapshotId)
      .maybeSingle();

    if (snapshotCheckError) {
      console.error("Error checking snapshot for comment:", snapshotCheckError);
      return NextResponse.json(
        { error: `Database error: ${snapshotCheckError.message}` },
        { status: 500 }
      );
    }
    if (!snapshotExists) {
      return NextResponse.json(
        { error: "Snapshot to comment on not found." },
        { status: 404 }
      );
    }

    // Verify parentCommentId exists and belongs to the same snapshot if provided
    if (parentCommentId) {
      const { data: parentCommentExists, error: parentCheckError } =
        await supabase
          .from("snapshot_comments")
          .select("id")
          .eq("id", parentCommentId)
          .eq("snapshot_id", snapshotId) // Ensure parent is for the same snapshot
          .maybeSingle();
      if (parentCheckError) {
        console.error("Error checking parent comment:", parentCheckError);
        return NextResponse.json(
          {
            error: `Database error checking parent: ${parentCheckError.message}`,
          },
          { status: 500 }
        );
      }
      if (!parentCommentExists) {
        return NextResponse.json(
          {
            error:
              "Parent comment not found or does not belong to this snapshot.",
          },
          { status: 404 }
        );
      }
    }

    const { data: newCommentData, error: insertError } = await supabase
      .from("snapshot_comments")
      .insert({
        user_id: user.id,
        snapshot_id: snapshotId,
        comment_text: commentText.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select(
        `
        id,
        user_id,
        snapshot_id,
        parent_comment_id,
        comment_text,
        created_at,
        updated_at,
        author: user_profiles (
            id,
            username,
            avatar_url
        )
      `
      )
      .single();
    // Note on `profiles!inner`: This assumes a 'profiles' table with a FK relationship
    // from snapshot_comments.user_id to profiles.id (which is auth.users.id).
    // And that 'profiles' table has 'username' and 'avatar_url'.
    // If your user profile table is named differently or if the join is optional (LEFT JOIN),
    // adjust the select statement. Using `!inner` ensures a profile must exist.
    // If `profiles` might not exist for a user, use `author: profiles ( ... )` (outer join).

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Explicitly cast to our desired response type for the comment
    const typedNewComment = newCommentData as unknown as CommentWithAuthor;

    return NextResponse.json(
      { comment: typedNewComment, message: "Comment posted successfully!" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error processing comment request:", error);
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
