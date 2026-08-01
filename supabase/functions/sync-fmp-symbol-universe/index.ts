import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, ensureInternalAuth } from "../_shared/auth.ts";
import { validateFmpSymbolUniverse } from "../lib/fmp-symbol-universe.ts";

const ACTIVE_ENDPOINT =
  "https://financialmodelingprep.com/stable/actively-trading-list";
const STOCK_ENDPOINT = "https://financialmodelingprep.com/stable/stock-list";
const CHANGES_ENDPOINT =
  "https://financialmodelingprep.com/stable/symbol-change?page=0&limit=1000";
const DELISTED_ENDPOINT =
  "https://financialmodelingprep.com/stable/delisted-companies?page=0&limit=1000";
const QUALITY_SYMBOL = "__FMP_SYMBOL_UNIVERSE__";
const DATA_TYPE = "symbol-universe";
const REQUEST_TIMEOUT_MS = 30_000;

interface EndpointResult {
  endpoint: string;
  payload: unknown;
  responseBytes: number;
  sha256: string;
}

class EndpointError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly responseBytes: number,
  ) {
    super(message);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hashInput = Uint8Array.from(bytes);
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", hashInput.buffer),
  );
  return [...hash].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function recordUsage(
  supabase: SupabaseClient,
  responseBytes: number,
  outcome: "success" | "failure",
): Promise<void> {
  const { error } = await supabase.from("api_data_usage_v2").insert({
    data_size_bytes: Math.max(responseBytes, 0),
    data_type: DATA_TYPE,
    outcome,
  });
  if (error) {
    throw new Error(`Unable to record FMP bandwidth: ${error.message}`);
  }
}

async function fetchEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
  apiKey: string,
): Promise<EndpointResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let responseBytes = 0;

  try {
    const response = await fetch(endpoint, {
      headers: { apikey: apiKey },
      signal: controller.signal,
    });
    const body = new Uint8Array(await response.arrayBuffer());
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    responseBytes = Number.isFinite(contentLength) && contentLength > 0
      ? contentLength
      : body.byteLength;

    if (!response.ok) {
      throw new EndpointError(
        `${endpoint} returned HTTP ${response.status}`,
        endpoint,
        responseBytes,
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(body));
    } catch {
      throw new EndpointError(
        `${endpoint} returned invalid JSON`,
        endpoint,
        responseBytes,
      );
    }

    await recordUsage(supabase, responseBytes, "success");
    return {
      endpoint,
      payload,
      responseBytes,
      sha256: await sha256Hex(body),
    };
  } catch (error) {
    try {
      await recordUsage(supabase, responseBytes, "failure");
    } catch (usageError) {
      throw new EndpointError(
        `${errorMessage(error)}; ${errorMessage(usageError)}`,
        endpoint,
        responseBytes,
      );
    }
    if (error instanceof EndpointError) throw error;
    throw new EndpointError(
      error instanceof Error && error.name === "AbortError"
        ? `${endpoint} timed out after ${REQUEST_TIMEOUT_MS}ms`
        : `${endpoint} request failed: ${errorMessage(error)}`,
      endpoint,
      responseBytes,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function syncQualityIssue(
  supabase: SupabaseClient,
  message: string | null,
): Promise<void> {
  const findings = message === null ? [] : [{
    check_code: "invalid_symbol_universe_snapshot",
    severity: "critical",
    message,
    evidence: {
      endpointUrl: ACTIVE_ENDPOINT,
      failClosed: true,
    },
    source_reference: "daily-snapshot",
  }];
  const { error } = await supabase.rpc("sync_data_quality_issues", {
    p_symbol: QUALITY_SYMBOL,
    p_provider: "fmp",
    p_endpoint: ACTIVE_ENDPOINT,
    p_findings: findings,
  });
  if (error) {
    throw new Error(
      `Unable to synchronize data-quality issue: ${error.message}`,
    );
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authError = await ensureInternalAuth(request);
  if (authError) return authError;

  const fmpApiKey = Deno.env.get("FMP_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!fmpApiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing server configuration" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: quotaExceeded, error: quotaError } = await supabase.rpc(
      "is_quota_exceeded_v2",
    );
    if (quotaError) {
      throw new Error(`Quota check failed: ${quotaError.message}`);
    }
    if (quotaExceeded === true) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "quota_guard" }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const endpoints = [
      ACTIVE_ENDPOINT,
      STOCK_ENDPOINT,
      CHANGES_ENDPOINT,
      DELISTED_ENDPOINT,
    ];
    const { data: reserved, error: reservationError } = await supabase.rpc(
      "reserve_api_calls",
      { p_api_calls_to_reserve: endpoints.length },
    );
    if (reservationError) {
      throw new Error(
        `API-call reservation failed: ${reservationError.message}`,
      );
    }
    if (reserved !== true) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "rate_limit" }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const settled = await Promise.allSettled(
      endpoints.map((endpoint) => fetchEndpoint(supabase, endpoint, fmpApiKey)),
    );
    const failures = settled
      .filter((result): result is PromiseRejectedResult =>
        result.status === "rejected"
      )
      .map((result) => errorMessage(result.reason));
    if (failures.length > 0) {
      const message = `FMP symbol-universe fetch failed: ${
        failures.join("; ")
      }`;
      await syncQualityIssue(supabase, message);
      throw new Error(message);
    }

    const results = settled.map((result) =>
      (result as PromiseFulfilledResult<EndpointResult>).value
    );
    const [active, stock, changes, delisted] = results;

    let validated;
    try {
      validated = validateFmpSymbolUniverse({
        activeSymbols: active.payload,
        stockSymbols: stock.payload,
        symbolChanges: changes.payload,
        delistedCompanies: delisted.payload,
      });
    } catch (error) {
      const message = `FMP symbol-universe validation failed: ${
        errorMessage(error)
      }`;
      await syncQualityIssue(supabase, message);
      throw new Error(message);
    }

    const capturedAt = new Date().toISOString();
    const { data: applied, error: applyError } = await supabase.rpc(
      "apply_fmp_symbol_universe_snapshot_v2",
      {
        p_active_symbols: validated.activeSymbols,
        p_stock_symbols: validated.stockSymbols,
        p_symbol_changes: validated.symbolChanges,
        p_delisted_companies: validated.delistedCompanies,
        p_captured_at: capturedAt,
        p_response_bytes: {
          actively_trading_list: active.responseBytes,
          stock_list: stock.responseBytes,
          symbol_change: changes.responseBytes,
          delisted_companies: delisted.responseBytes,
        },
        p_response_sha256: {
          actively_trading_list: active.sha256,
          stock_list: stock.sha256,
          symbol_change: changes.sha256,
          delisted_companies: delisted.sha256,
        },
      },
    );
    if (applyError) {
      const message =
        `FMP symbol-universe snapshot was not applied: ${applyError.message}`;
      await syncQualityIssue(supabase, message);
      throw new Error(message);
    }

    await syncQualityIssue(supabase, null);
    return new Response(JSON.stringify({ success: true, ...applied }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sync-fmp-symbol-universe]", error);
    return new Response(JSON.stringify({ error: errorMessage(error) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
