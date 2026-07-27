/**
 * Exchange rates are stored as target-currency units per US dollar.
 * For example, { EUR: 0.85 } means 1 USD = 0.85 EUR.
 */
export type ExchangeRates = Record<string, number>;

export type CurrencyCode = string | null | undefined;

export const DISPLAY_CURRENCY = "USD";

/**
 * Returns a normalized ISO-style currency code, or null when the source
 * metadata is absent or malformed.
 */
export function normalizeCurrencyCode(currency: CurrencyCode): string | null {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

/**
 * Converts a monetary value between currencies using USD as the bridge.
 * Missing metadata or rates intentionally produce null so callers do not mix
 * currencies in a ratio or chart.
 */
export function convertCurrency(
  value: number | null | undefined,
  sourceCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  rates: ExchangeRates
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const source = normalizeCurrencyCode(sourceCurrency);
  const target = normalizeCurrencyCode(targetCurrency);

  if (!source || !target) {
    return null;
  }

  if (source === target) {
    return value;
  }

  const sourceRate = source === DISPLAY_CURRENCY ? 1 : rates[source];
  const targetRate = target === DISPLAY_CURRENCY ? 1 : rates[target];

  if (
    !Number.isFinite(sourceRate) ||
    sourceRate <= 0 ||
    !Number.isFinite(targetRate) ||
    targetRate <= 0
  ) {
    return null;
  }

  const valueInUsd = value / sourceRate;
  const convertedValue = valueInUsd * targetRate;

  return Number.isFinite(convertedValue) ? convertedValue : null;
}
