// src/app/api/snapshots/comments/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface CreateCommentRequestBody {
  snapshotId: string; // UUID of the card_snapshots record
  commentText: string;
  parentCommentId?: string | null; // For threaded replies
}

// Updated: Simplified response structure for a newly created comment
interface NewCommentResponse {
  id: string;
  user_id: string;
  snapshot_id: string;
  parent_comment_id: string | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
  // Author details are removed from immediate POST response for simplicity
  // The client can use the user_id and existing auth context for the new comment,
  // or the GET endpoint will provide full author details on subsequent fetches.
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
      return NextResponse.json(
        { error: "Comment text is too long (max 1000 characters)." },
        { status: 400 }
      );
    }

    // Verify snapshotId exists (optional, FK constraint should handle it but good for early error)
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

    // Parent comment validation (if applicable) remains the same...
    if (parentCommentId) {
      const { data: parentCommentExists, error: parentCheckError } =
        await supabase
          .from("snapshot_comments")
          .select("id")
          .eq("id", parentCommentId)
          .eq("snapshot_id", snapshotId)
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

    // Insert the new comment
    const { data: newCommentData, error: insertError } = await supabase
      .from("snapshot_comments")
      .insert({
        user_id: user.id,
        snapshot_id: snapshotId,
        comment_text: commentText.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select(
        // Select only fields from snapshot_comments table
        `
        id,
        user_id,
        snapshot_id,
        parent_comment_id,
        comment_text,
        created_at,
        updated_at
      `
      )
      .single();

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    // The newCommentData will now be of NewCommentResponse type (or very close)
    const typedNewComment = newCommentData as NewCommentResponse;

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
