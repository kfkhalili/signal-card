import { readFileSync } from "node:fs";
import path from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

const PUBLIC_POSITIONING_FILES = [
  "src/app/page.tsx",
  "src/app/metadata.ts",
  "src/components/layout/Footer.tsx",
  "src/app/not-found.tsx",
];

describe("public positioning contract", () => {
  it("uses the approved research-product position on primary public surfaces", () => {
    const landing = readSource("src/app/page.tsx");
    const metadata = readSource("src/app/metadata.ts");
    const footer = readSource("src/components/layout/Footer.tsx");

    expect(landing).toContain("Find Overlooked Companies");
    expect(landing).toContain("Inspect the Evidence");
    expect(metadata).toContain("Discover Overlooked Companies");
    expect(footer).toContain("not investment advice");
  });

  it("does not advertise unsupported product claims on those surfaces", () => {
    const publicPositioning = PUBLIC_POSITIONING_FILES.map(readSource).join("\n");
    const unsupportedClaims = [
      /institutional[- ]grade/i,
      /real[- ]time market/i,
      /market data api/i,
      /enterprise market/i,
      /api integration/i,
    ];

    unsupportedClaims.forEach((claim) => {
      expect(publicPositioning).not.toMatch(claim);
    });
  });
});
