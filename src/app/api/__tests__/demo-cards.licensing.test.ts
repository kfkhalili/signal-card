/** @jest-environment node */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "@jest/globals";

import { GET } from "../demo-cards/route";
import {
  SYNTHETIC_DEMO_CARDS,
  SYNTHETIC_DEMO_DATA_ORIGIN,
} from "@/lib/demo/syntheticDemoCards";

describe("public demo-card licensing boundary", () => {
  it("returns only the versioned synthetic fixture", async () => {
    const response = await GET();
    const cards = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Tickered-Data-Origin")).toBe(
      SYNTHETIC_DEMO_DATA_ORIGIN
    );
    expect(cards).toEqual(SYNTHETIC_DEMO_CARDS);
    expect(cards).toHaveLength(4);

    for (const card of cards) {
      expect(card.symbol).toBe("DEMO");
      expect(card.companyName).toContain("Synthetic");
      expect(card.logoUrl).toBeNull();
      expect(card.websiteUrl).toBeNull();
      expect(card.backData.description).toContain("Fictional company");
    }
  });

  it("cannot reconnect the public route to provider-backed data", () => {
    const routeSource = readFileSync(
      path.join(process.cwd(), "src/app/api/demo-cards/route.ts"),
      "utf8"
    );

    expect(routeSource).not.toMatch(/supabase/i);
    expect(routeSource).not.toMatch(/financialmodelingprep|\bfmp\b/i);
    expect(routeSource).not.toMatch(/listed_symbols|financial_statements/i);
    expect(routeSource).not.toMatch(/getCardInitializer|fromPromise/);
  });

  it("requires the landing page to verify the synthetic marker", () => {
    const componentSource = readFileSync(
      path.join(process.cwd(), "src/components/landing/DemoCardsGrid.tsx"),
      "utf8"
    );

    expect(componentSource).toContain("X-Tickered-Data-Origin");
    expect(componentSource).toContain("SYNTHETIC_DEMO_DATA_ORIGIN");
    expect(componentSource).toContain("Synthetic product preview");
  });
});
