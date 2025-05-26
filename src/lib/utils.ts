// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a 2-letter ISO 3166-1 alpha-2 country code to its flag emoji.
 * Example: "US" -> "🇺🇸"
 * @param countryCode The 2-letter country code (e.g., "US", "DE", "JP").
 * @returns The flag emoji string, or a default flag/empty string if conversion fails.
 */
export function getFlagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) {
    return "🏳️"; // Default: white flag or return empty/placeholder
  }
  // Ensure countryCode is uppercase for correct regional indicator symbol calculation
  const upperCountryCode = countryCode.toUpperCase();
  const codePoints = Array.from(upperCountryCode).map(
    (char) => 0x1f1e6 + (char.charCodeAt(0) - "A".charCodeAt(0))
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Converts a 2-letter ISO 3166-1 alpha-2 country code to its full name.
 * Example: "US" -> "United States"
 * @param countryCode The 2-letter country code (e.g., "US", "DE", "JP").
 * @param locale The locale for the country name (defaults to "en").
 * @returns The full country name, or the original code if conversion fails or code is invalid.
 */
export function getCountryName(
  countryCode: string | null | undefined,
  locale = "en"
): string {
  if (!countryCode || countryCode.length !== 2) {
    return countryCode || "N/A"; // Return original code or N/A if invalid
  }
  try {
    const upperCountryCode = countryCode.toUpperCase(); // Ensure correct casing for the API
    const displayName = new Intl.DisplayNames([locale], { type: "region" });
    return displayName.of(upperCountryCode) || upperCountryCode; // Fallback to code if name not found
  } catch (error) {
    console.warn(
      `Could not get country name for code "${countryCode}":`,
      error
    );
    return countryCode; // Fallback to the original code on error
  }
}
