import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { validateFmpSymbolUniverse } from "../lib/fmp-symbol-universe.ts";

function validPayloads() {
  const activeSymbols = Array.from({ length: 10_000 }, (_, index) => ({
    symbol: ` qa${index.toString().padStart(5, "0")} `,
    name: `Active ${index}`,
  }));
  const stockSymbols = [
    ...activeSymbols.map((row, index) => ({
      symbol: row.symbol,
      companyName: `Active ${index}`,
    })),
    { symbol: "OLD", companyName: "Old Company" },
  ];
  return {
    activeSymbols,
    stockSymbols,
    symbolChanges: [{
      date: "2026-07-28",
      companyName: "Renamed Company",
      oldSymbol: "old",
      newSymbol: "new",
    }],
    delistedCompanies: [{
      symbol: "gone",
      companyName: "Gone Company",
      exchange: "nasdaq",
      ipoDate: null,
      delistedDate: "2026-07-30",
    }],
  };
}

Deno.test("validates and normalizes a complete FMP symbol universe", () => {
  const result = validateFmpSymbolUniverse(validPayloads());

  assertEquals(result.activeSymbols.length, 10_000);
  assertEquals(result.stockSymbols.length, 10_001);
  assertEquals(result.activeSymbols[0].symbol, "QA00000");
  assertEquals(result.symbolChanges[0].oldSymbol, "OLD");
  assertEquals(result.symbolChanges[0].newSymbol, "NEW");
  assertEquals(result.delistedCompanies[0].symbol, "GONE");
  assertEquals(result.delistedCompanies[0].exchange, "NASDAQ");
});

Deno.test("rejects a suspiciously small active snapshot", () => {
  const payloads = validPayloads();
  payloads.activeSymbols = payloads.activeSymbols.slice(0, 100);

  assertThrows(
    () => validateFmpSymbolUniverse(payloads),
    Error,
    "returned only 100 rows",
  );
});

Deno.test("rejects duplicate active symbols", () => {
  const payloads = validPayloads();
  payloads.activeSymbols[1].symbol = payloads.activeSymbols[0].symbol;

  assertThrows(
    () => validateFmpSymbolUniverse(payloads),
    Error,
    "duplicate symbol QA00000",
  );
});

Deno.test("rejects an active symbol absent from stock-list", () => {
  const payloads = validPayloads();
  payloads.activeSymbols[0].symbol = "ACTIVE_ONLY";

  assertThrows(
    () => validateFmpSymbolUniverse(payloads),
    Error,
    "absent from stock-list",
  );
});

Deno.test("rejects malformed change dates", () => {
  const payloads = validPayloads();
  payloads.symbolChanges[0].date = "July 28";

  assertThrows(
    () => validateFmpSymbolUniverse(payloads),
    Error,
    "must be an ISO date",
  );
});
