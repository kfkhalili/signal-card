// app/api/images/[...path]/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL or Service Key environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join("/");

  if (!filePath) {
    return new Response("File path is required", { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from("profile-images")
      .download(filePath);

    if (error) {
      const errorAsRecord = error as unknown as Record<string, unknown>;
      let status = 500;

      if (typeof errorAsRecord.statusCode === "string") {
        const parsedStatus = parseInt(errorAsRecord.statusCode, 10);
        if (!isNaN(parsedStatus)) {
          status = parsedStatus;
        }
      }
      // --- END: DEFINITIVE ERROR HANDLING ---

      return new Response(`Error fetching file: ${error.message}`, {
        status,
      });
    }

    if (!data) {
      return new Response("File not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", data.type);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(data.stream(), { status: 200, headers });
  } catch (e) {
    if (e instanceof Error) {
      return new Response(e.message, { status: 500 });
    }
    return new Response("An unknown error occurred.", { status: 500 });
  }
}
