import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifestContent = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error reading manifest.json:", error);
    return NextResponse.json(
      { error: "Manifest not found" },
      { status: 404 }
    );
  }
}

