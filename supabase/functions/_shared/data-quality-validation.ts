export type DataQualitySeverity = "info" | "warning" | "critical";

export interface DataQualityFinding {
  checkCode: string;
  fieldName?: string;
  severity: DataQualitySeverity;
  message: string;
  evidence: Record<string, unknown>;
  sourceDate?: string;
  sourcePeriod?: string;
  sourceReference?: string;
}

export interface FinancialStatementForValidation {
  date?: unknown;
  period?: unknown;
  fiscal_year?: unknown;
  filing_date?: unknown;
  accepted_date?: unknown;
  balance_sheet_payload?: unknown;
}

export interface MarketCapForValidation {
  price?: unknown;
  marketCap?: unknown;
  sharesOutstanding?: unknown;
  timestamp?: unknown;
}

const BALANCE_WARNING_THRESHOLD = 0.01;
const BALANCE_CRITICAL_THRESHOLD = 0.05;
const MARKET_CAP_WARNING_THRESHOLD = 0.05;
const MARKET_CAP_CRITICAL_THRESHOLD = 0.20;
const FUTURE_PERIOD_GRACE_DAYS = 7;

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ? date
    : null;
}

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateBalanceSheetReconciliation(
  statement: FinancialStatementForValidation
): DataQualityFinding[] {
  const sourceDate = stringValue(statement.date);
  const sourcePeriod = stringValue(statement.period);
  const payload =
    statement.balance_sheet_payload &&
    typeof statement.balance_sheet_payload === "object"
      ? statement.balance_sheet_payload as Record<string, unknown>
      : null;

  if (!payload) {
    return [{
      checkCode: "balance_sheet_reconciliation",
      fieldName: "balance_sheet_payload",
      severity: "info",
      message: "Balance sheet reconciliation could not be evaluated because the payload is missing.",
      evidence: { missingFields: ["balance_sheet_payload"] },
      sourceDate,
      sourcePeriod,
      sourceReference: "missing-inputs",
    }];
  }

  const totalAssets = finiteNumber(payload.totalAssets);
  const totalLiabilities = finiteNumber(payload.totalLiabilities);
  const totalEquity = finiteNumber(payload.totalEquity);
  const missingFields = [
    totalAssets === null ? "totalAssets" : null,
    totalLiabilities === null ? "totalLiabilities" : null,
    totalEquity === null ? "totalEquity" : null,
  ].filter((field): field is string => field !== null);

  if (
    totalAssets === null ||
    totalLiabilities === null ||
    totalEquity === null
  ) {
    return [{
      checkCode: "balance_sheet_reconciliation",
      fieldName: "balance_sheet_payload",
      severity: "info",
      message: "Balance sheet reconciliation could not be fully evaluated because required fields are missing.",
      evidence: { missingFields },
      sourceDate,
      sourcePeriod,
      sourceReference: "missing-inputs",
    }];
  }

  if (totalAssets <= 0) {
    return [{
      checkCode: "balance_sheet_reconciliation",
      fieldName: "totalAssets",
      severity: "critical",
      message: "Reported total assets are not positive.",
      evidence: { totalAssets, totalLiabilities, totalEquity },
      sourceDate,
      sourcePeriod,
      sourceReference: "non-positive-assets",
    }];
  }

  const liabilitiesAndEquity = totalLiabilities + totalEquity;
  const absoluteDifference = Math.abs(totalAssets - liabilitiesAndEquity);
  const relativeDifference = absoluteDifference / Math.abs(totalAssets);

  if (relativeDifference <= BALANCE_WARNING_THRESHOLD) {
    return [];
  }

  return [{
    checkCode: "balance_sheet_reconciliation",
    fieldName: "totalAssets",
    severity:
      relativeDifference > BALANCE_CRITICAL_THRESHOLD ? "critical" : "warning",
    message: "Total assets do not reconcile with total liabilities plus total equity.",
    evidence: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      liabilitiesAndEquity,
      absoluteDifference,
      relativeDifference,
      warningThreshold: BALANCE_WARNING_THRESHOLD,
    },
    sourceDate,
    sourcePeriod,
    sourceReference: "accounting-equation",
  }];
}

export function validateMarketCapReconciliation(
  quote: MarketCapForValidation
): DataQualityFinding[] {
  const price = finiteNumber(quote.price);
  const marketCap = finiteNumber(quote.marketCap);
  const sharesOutstanding = finiteNumber(quote.sharesOutstanding);
  const missingFields = [
    price === null ? "price" : null,
    marketCap === null ? "marketCap" : null,
    sharesOutstanding === null ? "sharesOutstanding" : null,
  ].filter((field): field is string => field !== null);

  if (
    price === null ||
    marketCap === null ||
    sharesOutstanding === null
  ) {
    return [{
      checkCode: "market_cap_reconciliation",
      fieldName: "marketCap",
      severity: "info",
      message: "Market-cap reconciliation could not be fully evaluated because required fields are missing.",
      evidence: { missingFields },
      sourceReference: "missing-inputs",
    }];
  }

  const expectedMarketCap = price * sharesOutstanding;
  if (price <= 0 || marketCap <= 0 || sharesOutstanding <= 0 || expectedMarketCap <= 0) {
    return [{
      checkCode: "market_cap_reconciliation",
      fieldName: "marketCap",
      severity: "warning",
      message: "Market-cap reconciliation received a non-positive input.",
      evidence: { price, marketCap, sharesOutstanding, expectedMarketCap },
      sourceReference: "non-positive-input",
    }];
  }

  const absoluteDifference = Math.abs(marketCap - expectedMarketCap);
  const relativeDifference = absoluteDifference / expectedMarketCap;

  if (relativeDifference <= MARKET_CAP_WARNING_THRESHOLD) {
    return [];
  }

  return [{
    checkCode: "market_cap_reconciliation",
    fieldName: "marketCap",
    severity:
      relativeDifference > MARKET_CAP_CRITICAL_THRESHOLD ? "critical" : "warning",
    message: "Reported market cap does not reconcile with price multiplied by shares outstanding.",
    evidence: {
      price,
      marketCap,
      sharesOutstanding,
      expectedMarketCap,
      absoluteDifference,
      relativeDifference,
      warningThreshold: MARKET_CAP_WARNING_THRESHOLD,
    },
    sourceReference: "price-times-shares",
  }];
}

export function validateReportingPeriodIntegrity(
  statements: FinancialStatementForValidation[],
  now = new Date()
): DataQualityFinding[] {
  const findings: DataQualityFinding[] = [];
  const canonicalPeriods = new Map<string, Set<string>>();
  const futureBoundary = new Date(now.getTime() + FUTURE_PERIOD_GRACE_DAYS * 86_400_000);

  statements.forEach((statement, index) => {
    const sourceDate = stringValue(statement.date);
    const sourcePeriod = stringValue(statement.period);
    const fiscalYear = stringValue(statement.fiscal_year);
    const periodDate = parseIsoDate(statement.date);

    if (!sourceDate || !periodDate) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "date",
        severity: "critical",
        message: "Financial statement has a missing or invalid reporting date.",
        evidence: { observedDate: statement.date ?? null, rowIndex: index },
        sourcePeriod,
        sourceReference: `row-${index}-invalid-date`,
      });
      return;
    }

    if (!sourcePeriod) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "period",
        severity: "critical",
        message: "Financial statement has a missing reporting period.",
        evidence: { sourceDate, rowIndex: index },
        sourceDate,
        sourceReference: `row-${index}-missing-period`,
      });
    }

    if (periodDate > futureBoundary) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "date",
        severity: "critical",
        message: "Financial statement reporting date is unexpectedly in the future.",
        evidence: {
          sourceDate,
          checkedAt: now.toISOString(),
          graceDays: FUTURE_PERIOD_GRACE_DAYS,
        },
        sourceDate,
        sourcePeriod,
        sourceReference: "future-period",
      });
    }

    const filingDate = parseIsoDate(statement.filing_date);
    if (statement.filing_date && !filingDate) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "filing_date",
        severity: "warning",
        message: "Financial statement has an invalid filing date.",
        evidence: { filingDate: statement.filing_date },
        sourceDate,
        sourcePeriod,
        sourceReference: "invalid-filing-date",
      });
    } else if (filingDate && filingDate < periodDate) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "filing_date",
        severity: "warning",
        message: "Financial statement filing date precedes its reporting-period end date.",
        evidence: { sourceDate, filingDate: statement.filing_date },
        sourceDate,
        sourcePeriod,
        sourceReference: "filing-before-period",
      });
    }

    const acceptedDate = parseTimestamp(statement.accepted_date);
    if (statement.accepted_date && !acceptedDate) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "accepted_date",
        severity: "warning",
        message: "Financial statement has an invalid accepted timestamp.",
        evidence: { acceptedDate: statement.accepted_date },
        sourceDate,
        sourcePeriod,
        sourceReference: "invalid-accepted-date",
      });
    } else if (acceptedDate && filingDate && acceptedDate < filingDate) {
      findings.push({
        checkCode: "reporting_period_integrity",
        fieldName: "accepted_date",
        severity: "warning",
        message: "Financial statement acceptance timestamp precedes its filing date.",
        evidence: {
          filingDate: statement.filing_date,
          acceptedDate: statement.accepted_date,
        },
        sourceDate,
        sourcePeriod,
        sourceReference: "accepted-before-filing",
      });
    }

    if (sourcePeriod) {
      const canonicalKey = `${fiscalYear ?? periodDate.getUTCFullYear()}:${sourcePeriod}`;
      const dates = canonicalPeriods.get(canonicalKey) ?? new Set<string>();
      dates.add(sourceDate);
      canonicalPeriods.set(canonicalKey, dates);
    }
  });

  canonicalPeriods.forEach((dates, canonicalPeriod) => {
    if (dates.size <= 1) return;
    const observedDates = [...dates].sort();
    findings.push({
      checkCode: "reporting_period_integrity",
      fieldName: "fiscal_year",
      severity: "warning",
      message: "Multiple reporting dates map to the same fiscal year and period.",
      evidence: { canonicalPeriod, observedDates },
      sourceReference: `duplicate-${canonicalPeriod}`,
    });
  });

  return findings;
}
