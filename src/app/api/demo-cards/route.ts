import { NextResponse } from "next/server";

import {
  SYNTHETIC_DEMO_CARDS,
  SYNTHETIC_DEMO_DATA_ORIGIN,
} from "@/lib/demo/syntheticDemoCards";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(SYNTHETIC_DEMO_CARDS, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "X-Tickered-Data-Origin": SYNTHETIC_DEMO_DATA_ORIGIN,
    },
  });
}
