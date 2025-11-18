// src/lib/feature-flags.ts
// Feature flag utilities for client-side feature toggling

import { createSupabaseBrowserClient } from './supabase/client';

/**
 * Check if a feature flag is enabled
 *
 * @param flagName - The name of the feature flag
 * @returns Promise<boolean> - true if enabled, false if disabled or error
 */
export async function checkFeatureFlag(flagName: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient(false);
  if (!supabase) {
    return false; // If client unavailable, default to disabled
  }

  try {
    const response = await supabase
      .from('feature_flags' as never)
      .select('enabled')
      .eq('flag_name', flagName)
      .maybeSingle();

    // Type assertion: feature_flags table exists but isn't in generated types
    const { data, error } = response as { data: { enabled: boolean } | null; error: { message: string; code?: string } | null };

    if (error) {
      console.warn(`[feature-flags] Error checking flag ${flagName}:`, error);
      return false; // Default to disabled on error
    }

    return data?.enabled ?? false;
  } catch (error) {
    console.warn(`[feature-flags] Exception checking flag ${flagName}:`, error);
    return false; // Default to disabled on exception
  }
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

