import { NextResponse } from "next/server";

// Manifest data - moved from public/manifest.json to route handler
// This ensures it's served with the correct content-type
const manifest = {
  name: "Tickered - Financial Data Platform",
  short_name: "Tickered",
  description:
    "Institutional-grade financial data API with real-time market feeds and enterprise market services",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#ffffff",
  orientation: "portrait-primary",
  icons: [
    {
      src: "/images/tickered.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/images/tickered.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
  categories: ["finance", "business", "productivity"],
  lang: "en",
  dir: "ltr",
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

