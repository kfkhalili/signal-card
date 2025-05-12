// src/lib/formatters.ts

/**
 * Formats a number into a string with abbreviations (K, M, B, T) for thousands, millions, billions, trillions.
 * Returns 'N/A' for null or undefined inputs.
 * @param num The number to format.
 * @param decimals The number of decimal places for abbreviations. Default is 2.
 * @returns Formatted string or 'N/A'.
 */
export function formatNumberWithAbbreviations(
  num: number | null | undefined,
  decimals: number = 2
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
  // For numbers less than 1000, display with appropriate decimals if needed, or as integer
  // Check if the number has decimals relevant up to 'fixedDecimals' places
  const numAsString = num.toString();
  const decimalPointIndex = numAsString.indexOf(".");
  if (
    decimalPointIndex !== -1 &&
    numAsString.length - decimalPointIndex - 1 > 0
  ) {
    return num.toFixed(fixedDecimals); // Apply decimals if the original number has them
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 }); // Format as integer if no decimals
}

/**
 * Formats a number as a percentage string.
 * Returns 'N/A' for null or undefined inputs.
 * @param num The number to format (e.g., 5.2 for 5.2%).
 * @param decimals The number of decimal places. Default is 2.
 * @returns Formatted percentage string or 'N/A'.
 */
export function formatPercentage(
  num: number | null | undefined,
  decimals: number = 2
): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "N/A";
  }
  return `${num.toFixed(Math.max(0, decimals))}%`;
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
