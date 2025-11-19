// app/api/images/[...path]/route.ts

import { createClient } from "@supabase/supabase-js";
import { fromPromise } from "neverthrow";
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
    const downloadResult = await fromPromise(
      supabaseAdmin.storage
        .from("profile-images")
        .download(filePath),
      (e) => e as Error
    );

    const downloadData = downloadResult.match(
      (response) => {
        const { data, error } = response;
        if (error) {
          const errorAsRecord = error as unknown as Record<string, unknown>;
          let status = 500;

          if (typeof errorAsRecord.statusCode === "string") {
            const parsedStatus = parseInt(errorAsRecord.statusCode, 10);
            if (!isNaN(parsedStatus)) {
              status = parsedStatus;
            }
          }

          return { data: null, status, errorMessage: error.message };
        }

        if (!data) {
          return { data: null, status: 404, errorMessage: "File not found" };
        }

        return { data, status: 200, errorMessage: undefined };
      },
      (err) => {
        // Handle Result error (network/exception errors)
        return { data: null, status: 500, errorMessage: err.message };
      }
    );

    if (!downloadData.data) {
      return new Response(
        downloadData.errorMessage || "File not found",
        { status: downloadData.status }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", downloadData.data.type);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(downloadData.data.stream(), { status: 200, headers });
  } catch (e) {
    if (e instanceof Error) {
      return new Response(e.message, { status: 500 });
    }
    return new Response("An unknown error occurred.", { status: 500 });
  }
}
