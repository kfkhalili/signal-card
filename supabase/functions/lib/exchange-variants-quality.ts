import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataQualityFinding } from "../_shared/data-quality-validation.ts";
import { syncDataQualityFindings } from "../_shared/data-quality-persistence.ts";
import type { QueueJob } from "./types.ts";

const FMP_ENDPOINT_URL =
  "https://financialmodelingprep.com/stable/search-exchange-variants";

interface ExistingExchangeVariant {
  symbol_variant: string;
  exchange_short_name: string;
  is_actively_trading: boolean | null;
}

interface OwnedExchangeVariant {
  symbol: string;
  symbol_variant: string;
  exchange_short_name: string;
}

interface ExchangeVariantQualityContext {
  symbol: string;
  response: unknown[];
  profileExchange: string | null;
  profileExists: boolean;
  knownExchanges: string[];
  existingVariants: ExistingExchangeVariant[];
  variantOwners: OwnedExchangeVariant[];
}

function normalized(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : null;
}

function canonicalExchange(value: unknown): string | null {
  const exchange = normalized(value);
  if (exchange === "PNK" || exchange === "OTCQX" || exchange === "OTCQB") {
    return "OTC";
  }
  return exchange;
}

function variantKey(symbol: unknown, exchange: unknown): string | null {
  const normalizedSymbol = normalized(symbol);
  const normalizedExchange = normalized(exchange);
  return normalizedSymbol && normalizedExchange
    ? `${normalizedSymbol}|${normalizedExchange}`
    : null;
}

export function validateExchangeVariantsResponse(
  context: ExchangeVariantQualityContext,
): DataQualityFinding[] {
  const baseSymbol = normalized(context.symbol) ?? context.symbol;

  if (context.response.length === 0) {
    return [{
      checkCode: "empty_exchange_variants_response",
      fieldName: "symbol_variant",
      severity: "critical",
      message:
        "FMP returned an empty exchange-variants array for a listed symbol.",
      evidence: { responseCount: 0 },
      sourceReference: "empty-response",
    }];
  }

  const findings: DataQualityFinding[] = [];
  const malformedIndexes: number[] = [];
  const incomingKeys = new Set<string>();
  const duplicateKeys = new Set<string>();
  const responseEntries: Array<Record<string, unknown>> = [];

  context.response.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      malformedIndexes.push(index);
      return;
    }
    const record = entry as Record<string, unknown>;
    const key = variantKey(record.symbol, record.exchangeShortName);
    if (!key) {
      malformedIndexes.push(index);
      return;
    }
    if (incomingKeys.has(key)) duplicateKeys.add(key);
    incomingKeys.add(key);
    responseEntries.push(record);
  });

  if (malformedIndexes.length > 0) {
    findings.push({
      checkCode: "exchange_variants_payload_integrity",
      fieldName: "symbol_variant",
      severity: "critical",
      message:
        "FMP returned exchange-variant records without a usable symbol and exchange code.",
      evidence: { malformedIndexes, responseCount: context.response.length },
      sourceReference: "malformed-records",
    });
  }

  if (duplicateKeys.size > 0) {
    findings.push({
      checkCode: "exchange_variants_payload_integrity",
      fieldName: "symbol_variant",
      severity: "critical",
      message: "FMP returned duplicate exchange-variant records.",
      evidence: { duplicateKeys: [...duplicateKeys].sort() },
      sourceReference: "duplicate-records",
    });
  }

  const ownershipConflicts = context.variantOwners
    .map((variant) => ({
      key: variantKey(
        variant.symbol_variant,
        variant.exchange_short_name,
      ),
      existingOwner: normalized(variant.symbol),
    }))
    .filter(
      (conflict): conflict is { key: string; existingOwner: string } =>
        conflict.key !== null &&
        conflict.existingOwner !== null &&
        conflict.existingOwner !== baseSymbol &&
        incomingKeys.has(conflict.key),
    )
    .sort((left, right) => left.key.localeCompare(right.key));
  if (ownershipConflicts.length > 0) {
    findings.push({
      checkCode: "exchange_variant_ownership_conflict",
      fieldName: "symbol_variant",
      severity: "critical",
      message:
        "FMP returned exchange variants already assigned to a different base symbol.",
      evidence: { ownershipConflicts },
      sourceReference: "cross-symbol-ownership-conflict",
    });
  }

  const knownExchanges = new Set(
    context.knownExchanges.map(canonicalExchange).filter(
      (exchange): exchange is string => exchange !== null,
    ),
  );
  const unknownExchanges = new Set(
    responseEntries
      .map((entry) => canonicalExchange(entry.exchangeShortName))
      .filter(
        (exchange): exchange is string =>
          exchange !== null && !knownExchanges.has(exchange),
      ),
  );
  if (unknownExchanges.size > 0) {
    findings.push({
      checkCode: "exchange_variants_exchange_code",
      fieldName: "exchange_short_name",
      severity: "warning",
      message:
        "FMP returned exchange codes absent from the available-exchanges registry.",
      evidence: { unknownExchanges: [...unknownExchanges].sort() },
      sourceReference: "unknown-exchange-codes",
    });
  }

  const baseEntries = responseEntries.filter(
    (entry) => normalized(entry.symbol) === baseSymbol,
  );
  if (baseEntries.length !== 1) {
    findings.push({
      checkCode: "exchange_variants_base_listing",
      fieldName: "symbol_variant",
      severity: "critical",
      message: baseEntries.length === 0
        ? "FMP exchange variants omitted the requested symbol's base listing."
        : "FMP exchange variants returned multiple base listings for the requested symbol.",
      evidence: {
        baseSymbol,
        baseEntryCount: baseEntries.length,
        baseExchanges: baseEntries.map((entry) => entry.exchangeShortName),
      },
      sourceReference: baseEntries.length === 0
        ? "missing-base-listing"
        : "multiple-base-listings",
    });
  }

  if (!context.profileExists) {
    findings.push({
      checkCode: "exchange_variants_primary_exchange",
      fieldName: "symbol",
      severity: "critical",
      message:
        "The exchange-variants response cannot be validated because the symbol profile is missing.",
      evidence: { baseSymbol },
      sourceReference: "missing-profile",
    });
  } else if (!context.profileExchange) {
    findings.push({
      checkCode: "exchange_variants_primary_exchange",
      fieldName: "exchange_short_name",
      severity: "critical",
      message:
        "The exchange-variants response cannot be validated because the profile exchange is missing.",
      evidence: { baseSymbol },
      sourceReference: "missing-profile-exchange",
    });
  } else if (baseEntries.length === 1 && context.profileExchange) {
    const responseExchange = canonicalExchange(
      baseEntries[0].exchangeShortName,
    );
    const profileExchange = canonicalExchange(context.profileExchange);
    if (responseExchange !== profileExchange) {
      findings.push({
        checkCode: "exchange_variants_primary_exchange",
        fieldName: "exchange_short_name",
        severity: "warning",
        message:
          "The base exchange in FMP exchange variants disagrees with the current profile exchange.",
        evidence: { responseExchange, profileExchange },
        sourceReference: "profile-exchange-mismatch",
      });
    }
  }

  const missingExistingActiveVariants = context.existingVariants
    .filter((variant) => variant.is_actively_trading === true)
    .map((variant) =>
      variantKey(variant.symbol_variant, variant.exchange_short_name)
    )
    .filter(
      (key): key is string => key !== null && !incomingKeys.has(key),
    )
    .sort();
  if (missingExistingActiveVariants.length > 0) {
    findings.push({
      checkCode: "exchange_variant_set_regression",
      fieldName: "symbol_variant",
      severity: "warning",
      message:
        "FMP omitted one or more previously known active exchange variants.",
      evidence: {
        missingExistingActiveVariants,
        incomingVariantKeys: [...incomingKeys].sort(),
      },
      sourceReference: "missing-previously-active-variants",
    });
  }

  return findings;
}

export async function syncExchangeVariantQualityFindings(
  supabase: SupabaseClient,
  job: QueueJob,
  findings: DataQualityFinding[],
  responseSizeBytes: number,
): Promise<void> {
  const endpointUrl = `${FMP_ENDPOINT_URL}?symbol=${
    encodeURIComponent(job.symbol)
  }`;
  const enrichedFindings = findings.map((finding) => ({
    ...finding,
    evidence: {
      ...finding.evidence,
      responseSizeBytes,
      endpointUrl,
      queueJobId: job.id,
      retryCount: job.retry_count,
      maxRetries: job.max_retries,
    },
  }));
  const persisted = await syncDataQualityFindings(
    supabase,
    { symbol: job.symbol, provider: "fmp", endpoint: "exchange-variants" },
    enrichedFindings,
  );
  if (!persisted) {
    throw new Error(
      `Failed to synchronize exchange-variant quality findings for ${job.symbol}`,
    );
  }
}
