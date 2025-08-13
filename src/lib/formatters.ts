// src/lib/formatters.ts
import { convertToUsd } from "./utils";

/**
 * Formats a number into a string with abbreviations (K, M, B, T) for thousands, millions, billions, trillions.
 * Returns 'N/A' for null or undefined inputs.
 * @param num The number to format.
 * @param decimals The number of decimal places for abbreviations. Default is 2.
 * @returns Formatted string or 'N/A'.
 */
export function formatNumberWithAbbreviations(
  num: number | null | undefined,
  decimals = 2
): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "N/A";
  }

  const fixedDecimals = Math.max(0, decimals); // Ensure decimals is not negative

  if (Math.abs(num) >= 1e12) {
    return `${(num / 1e12).toFixed(fixedDecimals)}T`;
  }
  if (Math.abs(num) >= 1e9) {
    return `${(num / 1e9).toFixed(fixedDecimals)}B`;
  }
  if (Math.abs(num) >= 1e6) {
    return `${(num / 1e6).toFixed(fixedDecimals)}M`;
  }
  if (Math.abs(num) >= 1e3) {
    return `${(num / 1e3).toFixed(fixedDecimals)}K`;
  }
  // For numbers less than 1000
  const numAsString = num.toString();
  const decimalPointIndex = numAsString.indexOf(".");
  if (
    decimalPointIndex !== -1 &&
    numAsString.length - decimalPointIndex - 1 > 0 && // Has actual decimal digits
    fixedDecimals > 0 // And we want to show decimals
  ) {
    return num.toFixed(fixedDecimals);
  }
  // For integers or numbers effectively integers after rounding for display (or if fixedDecimals is 0)
  return num.toLocaleString(undefined, {
    maximumFractionDigits: fixedDecimals,
  });
}

/**
 * Safely parses a value (string or number) into a Unix timestamp (milliseconds).
 * Returns null if the input is invalid or represents a non-positive timestamp.
 * @param timestamp The value to parse.
 * @returns A positive number representing milliseconds since epoch, or null.
 */
export function parseTimestampSafe(timestamp: unknown): number | null {
  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp).getTime();
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }
  if (typeof timestamp === "number" && !isNaN(timestamp) && timestamp > 0) {
    return timestamp;
  }
  return null;
}

/**
 * Gets the currency symbol for a given ISO 4217 currency code.
 * @param currencyCode The ISO 4217 currency code (e.g., "USD", "EUR").
 * @returns The currency symbol (e.g., "$", "€") or the code itself if no symbol is found. Returns an empty string if code is null/undefined.
 */
export function getCurrencySymbol(
  currencyCode: string | null | undefined
): string {
  if (!currencyCode) return "";
  const upperCode = currencyCode.toUpperCase();
  switch (upperCode) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "CAD":
      return "CA$";
    case "AUD":
      return "A$";
    case "CHF":
      return "CHF";
    default:
      try {
        // Attempt to use Intl for less common symbols
        const parts = new Intl.NumberFormat("en-US", {
          // Locale choice here is less critical for just the symbol
          style: "currency",
          currency: upperCode,
          currencyDisplay: "narrowSymbol", // 'symbol' or 'narrowSymbol'
        }).formatToParts(0);
        return (
          parts.find((part) => part.type === "currency")?.value || upperCode
        );
      } catch {
        // Fallback to the currency code itself if Intl API fails (e.g., unsupported code)
        return upperCode;
      }
  }
}

/**
 * Formats a financial value with appropriate currency symbol and abbreviations.
 * @param value The numeric value to format.
 * @param currencyCode The ISO 4217 currency code.
 * @param decimals The number of decimal places for abbreviations. Default is 2.
 * @param rates Optional exchange rates map for conversion to USD.
 * @returns Formatted financial string (e.g., "$1.23M", "€100K") or 'N/A'.
 */
export function formatFinancialValue(
  value: number | null | undefined,
  currencyCode: string | null | undefined,
  decimals = 2,
  rates?: Record<string, number>
): string {
  if (value === null || typeof value === "undefined" || isNaN(value)) {
    return "N/A";
  }

  const convertedValue = rates ? convertToUsd(value, currencyCode, rates) : value;
  const symbol = "$"; // Always USD
  const abbreviatedValue = formatNumberWithAbbreviations(convertedValue, decimals);

  if (abbreviatedValue === "N/A") return "N/A";

  // Prevent double symbols if formatNumberWithAbbreviations already added one (though it shouldn't for plain numbers)
  if (symbol && abbreviatedValue.startsWith(symbol)) {
    return abbreviatedValue;
  }

  return `${symbol}${abbreviatedValue}`;
}
