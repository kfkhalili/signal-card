// src/app/api/collections/remove/[id]/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string; // This is the user_collections.id (UUID)
  }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

  const { id: userCollectionsEntryId } = await params;

  if (!userCollectionsEntryId) {
    return NextResponse.json(
      { error: "Missing collection entry ID." },
      { status: 400 }
    );
  }

  try {
    // Ensure the user owns this collection entry before deleting
    const { error: deleteError, count } = await supabase
      .from("user_collections")
      .delete({ count: "exact" }) // Ensure we know if something was deleted
      .eq("id", userCollectionsEntryId)
      .eq("user_id", user.id); // Crucial ownership check

    if (deleteError) {
      console.error("Error deleting from user_collections:", deleteError);
      return NextResponse.json(
        { error: `Database error: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        {
          error: "Collection entry not found or user does not have permission.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Successfully removed from collection." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing remove from collection request:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
