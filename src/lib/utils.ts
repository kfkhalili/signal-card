// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ok, err, Result } from "neverthrow";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFlagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) {
    return "🏳️";
  }
  const upperCountryCode = countryCode.toUpperCase();
  const codePoints = Array.from(upperCountryCode).map(
    (char) => 0x1f1e6 + (char.charCodeAt(0) - "A".charCodeAt(0))
  );
  return String.fromCodePoint(...codePoints);
}

export function getCountryName(
  countryCode: string | null | undefined,
  locale = "en"
): Result<string, Error> {
  if (!countryCode || countryCode.length !== 2) {
    return err(new Error("Invalid country code provided."));
  }
  try {
    const upperCountryCode = countryCode.toUpperCase();
    const displayName = new Intl.DisplayNames([locale], { type: "region" });
    const name = displayName.of(upperCountryCode);
    if (!name) {
      return err(
        new Error(`Could not find name for country code "${upperCountryCode}".`)
      );
    }
    return ok(name);
  } catch (error) {
    return err(error as Error);
  }
}

export function safeJsonParse<T>(text: string): Result<T, Error> {
  try {
    return ok(JSON.parse(text));
  } catch (error) {
    return err(error as Error);
  }
}

export const createSecureImageUrl = (
  storageUrl: string | null | undefined
): string => {
  if (!storageUrl) {
    return "/images/default-logo.png";
  }
  try {
    const url = new URL(storageUrl);
    const pathSegments = url.pathname.split("/");
    const profileImagesIndex = pathSegments.indexOf("profile-images");

    if (
      profileImagesIndex === -1 ||
      profileImagesIndex + 1 >= pathSegments.length
    ) {
      return "/images/default-logo.png";
    }

    const imagePath = pathSegments.slice(profileImagesIndex + 1).join("/");
    return `/api/images/${imagePath}`;
  } catch {
    return "/images/default-logo.png";
  }
};
