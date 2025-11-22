// src/lib/feature-flags.ts
// Feature flag utilities for client-side feature toggling

import { createSupabaseBrowserClient } from './supabase/client';
import { fromPromise, ok, Result } from 'neverthrow';

/**
 * Check if a feature flag is enabled
 *
 * @param flagName - The name of the feature flag
 * @returns Promise<Result<boolean, Error>> - Ok(true) if enabled, Ok(false) if disabled, Err if query fails
 */
export async function checkFeatureFlag(flagName: string): Promise<Result<boolean, Error>> {
  const supabase = createSupabaseBrowserClient(false);
  if (!supabase) {
    // Client unavailable - return Ok(false) as fail-safe default
    // This is not an error condition, just unavailable service
    return ok(false);
  }

  const queryResult = await fromPromise(
    supabase
      .from('feature_flags' as never)
      .select('enabled')
      .eq('flag_name', flagName)
      .maybeSingle(),
    (e) => new Error(`Failed to check feature flag ${flagName}: ${(e as Error).message}`)
  );

  if (queryResult.isErr()) {
    console.warn(`[feature-flags] Error checking flag ${flagName}:`, queryResult.error);
    // Return Ok(false) as fail-safe default instead of error
    // This maintains backward compatibility - errors default to disabled
    return ok(false);
  }

  const { data, error } = queryResult.value as {
    data: { enabled: boolean } | null;
    error: { message: string; code?: string } | null
  };

  if (error) {
    console.warn(`[feature-flags] Database error checking flag ${flagName}:`, error);
    // Return Ok(false) as fail-safe default
    return ok(false);
  }

  // Return Ok with the enabled value (or false if data is null)
  return ok(data?.enabled ?? false);
}

/**
 * Synchronous check using cached value (for hooks)
 * This requires a context/provider to cache flags
 * For now, returns false (disabled) - can be enhanced later
 */
export function isFeatureEnabled(flagName: string): boolean {
  // TODO: Implement caching via React Context if needed
  // For now, always return false (disabled) to be safe
  // The async checkFeatureFlag should be used in useEffect
  // Parameter is kept for API consistency, even though not used yet
  void flagName; // Explicitly mark as intentionally unused
  return false;
}

