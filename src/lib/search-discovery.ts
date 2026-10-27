export const INDEXABLE_PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

export const RETIRED_PUBLIC_PATHS = [
  "/about",
  "/api",
  "/blog",
  "/careers",
  "/contact",
  "/features",
  "/help",
  "/press",
  "/pricing",
  "/status",
] as const;

export const NON_INDEXABLE_PUBLIC_PATHS = [
  ...RETIRED_PUBLIC_PATHS,
] as const;

export const PROTECTED_PATH_PREFIXES = [
  "/auth",
  "/compass",
  "/workspace",
  "/symbol",
  "/profile",
  "/api/",
] as const;
