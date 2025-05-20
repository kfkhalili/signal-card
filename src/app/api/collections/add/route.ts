// src/app/api/collections/add/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TablesInsert } from "@/lib/supabase/database.types";

interface AddToCollectionRequestBody
  extends Pick<TablesInsert<"user_collections">, "snapshot_id" | "user_id"> {}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const body: AddToCollectionRequestBody = await request.json();

  const { snapshot_id, user_id } = body;

  if (!snapshot_id || !user_id) {
    return NextResponse.json(
      { message: "Missing snapshot_id or user_id" },
      { status: 400 }
    );
  }

  // First, check if the user is authenticated
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting session:", sessionError);
    return NextResponse.json(
      { message: `Session error: ${sessionError.message}` },
      { status: 500 }
    );
  }

  if (!session || session.user.id !== user_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if the entry already exists
    const { data: existingEntry, error: selectError } = await supabase
      .from("user_collections")
      .select("id")
      .eq("user_id", user_id)
      .eq("snapshot_id", snapshot_id)
      .maybeSingle();

    if (selectError) {
      console.error("Error checking existing collection entry:", selectError);
      return NextResponse.json(
        { message: `Database error: ${selectError.message}` },
        { status: 500 }
      );
    }

    if (existingEntry) {
      return NextResponse.json(
        {
          message: "Card snapshot already in collection for this user.",
          entry: existingEntry,
        },
        { status: 200 }
      );
    }

    // If not, insert the new entry
    const { data: newEntry, error: insertError } = await supabase
      .from("user_collections")
      .insert({ user_id, snapshot_id })
      .select()
      .single();

    if (insertError) {
      console.error("Error adding to collection:", insertError);
      return NextResponse.json(
        { message: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Successfully added to collection", entry: newEntry },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error in POST /api/collections/add:", error);
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
