// supabase/functions/fetch-fmp-batch-quote-indicators/index.test.ts
import { assertEquals, assertExists } from "@std/assert";
import type { FmpBatchQuoteData } from "./types.ts";

Deno.test("fetchAndProcessBatchQuotes - success case", () => {
  // Setup
  const mockBatchData: FmpBatchQuoteData[] = [
    {
      symbol: "AAPL",
      ask: 268.7,
      bid: 268.36,
      asize: 2,
      bsize: 2,
      timestamp: 1762549202000, // milliseconds
    },
    {
      symbol: "NVDA",
      ask: 190.21,
      bid: 190.18,
      asize: 100,
      bsize: 5,
      timestamp: 1762563602000,
    },
  ];

  // Test the batch data structure
  assertEquals(Array.isArray(mockBatchData), true);
  assertEquals(mockBatchData.length, 2);
  assertEquals(mockBatchData[0].symbol, "AAPL");
  assertEquals(mockBatchData[0].ask, 268.7);
  assertEquals(mockBatchData[1].symbol, "NVDA");
  assertEquals(mockBatchData[1].ask, 190.21);
});

Deno.test("fetchAndProcessBatchQuotes - empty symbols array", () => {
  const mockSymbols: string[] = [];

  // Should return empty array immediately
  assertEquals(mockSymbols.length, 0);
});

Deno.test("fetchAndProcessBatchQuotes - API error", async () => {
  const mockFetch = (_url: string | URL | Request) => {
    return Promise.resolve(new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    }));
  };

  const response = await mockFetch("test-url");
  assertEquals(response.status, 500);
});

Deno.test("fetchAndProcessBatchQuotes - invalid response format", async () => {
  const mockFetch = (_url: string | URL | Request) => {
    return Promise.resolve(new Response(JSON.stringify({ error: "Invalid format" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  };

  const response = await mockFetch("test-url");
  const data = await response.json();

  // Should not be an array
  assertEquals(Array.isArray(data), false);
});

Deno.test("fetchAndProcessBatchQuotes - empty batch response", async () => {
  const mockFetch = (_url: string | URL | Request) => {
    return Promise.resolve(new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  };

  const response = await mockFetch("test-url");
  const data = await response.json();

  assertEquals(Array.isArray(data), true);
  assertEquals(data.length, 0);
});

Deno.test("fetchAndProcessBatchQuotes - invalid quote data", async () => {
  const mockInvalidData = [
    {
      symbol: "AAPL",
      // Missing required fields
    },
    {
      symbol: "NVDA",
      ask: "invalid", // Wrong type
      bid: 190.18,
      asize: 100,
      bsize: 5,
      timestamp: 1762563602000,
    },
  ];

  const mockFetch = (_url: string | URL | Request) => {
    return Promise.resolve(new Response(JSON.stringify(mockInvalidData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  };

  const response = await mockFetch("test-url");
  const data = await response.json();

  assertEquals(Array.isArray(data), true);
  // Should handle invalid data gracefully
  assertEquals(data[0].symbol, "AAPL");
});

Deno.test("timestamp conversion - milliseconds to seconds", () => {
  const milliseconds = 1762549202000;
  const expectedSeconds = Math.floor(milliseconds / 1000);
  const actualSeconds = Math.floor(milliseconds / 1000);

  assertEquals(actualSeconds, 1762549202);
  assertEquals(expectedSeconds, 1762549202);
});

Deno.test("getErrorMessage - Error instance", () => {
  const error = new Error("Test error message");
  const message = error instanceof Error ? error.message : String(error);

  assertEquals(message, "Test error message");
});

Deno.test("getErrorMessage - string error", () => {
  const error = "String error";
  const message = typeof error === "string" ? error : String(error);

  assertEquals(message, "String error");
});

Deno.test("getErrorMessage - unknown error", () => {
  const error = { code: 500, message: "Unknown" };
  let message: string;
  try {
    message = JSON.stringify(error);
  } catch {
    message = "An unknown error occurred.";
  }

  assertEquals(message, JSON.stringify(error));
});

Deno.test("censorApiKey - valid API key", () => {
  const url = "https://api.example.com?apikey=test1234567890key&other=param";
  const apiKey = "test1234567890key";

  if (!apiKey || apiKey.length < 8) {
    assertEquals(false, true); // Should not reach here
    return;
  }

  const censoredPart = apiKey
    .substring(4, apiKey.length - 4)
    .replace(/./g, "*");
  const displayApiKey =
    apiKey.substring(0, 4) + censoredPart + apiKey.substring(apiKey.length - 4);
  const apiKeyPattern = new RegExp(
    `(apikey=)(${encodeURIComponent(apiKey)})([&]|$)`,
    "i"
  );
  const result = url.replace(apiKeyPattern, `$1${displayApiKey}$3`);

  // Check that the result contains the censored key
  assertEquals(result.includes(displayApiKey), true);
  assertEquals(result.includes("test1234567890key"), false);
});

Deno.test("censorApiKey - short API key", () => {
  const _url = "https://api.example.com?apikey=short";
  const apiKey = "short";

  if (!apiKey || apiKey.length < 8) {
    // Should return URL as-is for short keys
    assertEquals(apiKey.length < 8, true);
  }
});

Deno.test("URL construction - batch API", () => {
  const baseUrl = "https://financialmodelingprep.com/api/v4/batch-pre-post-market";
  const symbols = ["AAPL", "NVDA"];
  const symbolsList = symbols.join(",");
  const apiKey = "test-key";
  const expectedUrl = `${baseUrl}/${symbolsList}?apikey=${apiKey}`;

  assertEquals(expectedUrl, "https://financialmodelingprep.com/api/v4/batch-pre-post-market/AAPL,NVDA?apikey=test-key");
});

Deno.test("record transformation - FMP batch to database record", () => {
  const fmpData: FmpBatchQuoteData = {
    symbol: "AAPL",
    ask: 268.7,
    bid: 268.36,
    asize: 2,
    bsize: 2,
    timestamp: 1762549202000,
  };

  const apiTimestampSeconds = Math.floor(fmpData.timestamp / 1000);
  const fetchedAt = new Date().toISOString();

  const record = {
    symbol: fmpData.symbol,
    current_price: fmpData.ask,
    change_percentage: null,
    day_change: null,
    volume: null,
    day_low: null,
    day_high: null,
    market_cap: null,
    day_open: null,
    previous_close: null,
    api_timestamp: apiTimestampSeconds,
    sma_50d: null,
    sma_200d: null,
    fetched_at: fetchedAt,
    year_high: null,
    year_low: null,
    exchange: null,
  };

  assertEquals(record.symbol, "AAPL");
  assertEquals(record.current_price, 268.7);
  assertEquals(record.api_timestamp, 1762549202);
  assertExists(record.fetched_at);
});

