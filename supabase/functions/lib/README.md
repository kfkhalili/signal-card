# Queue Processor Library Functions

This directory contains exportable TypeScript functions that implement the logic for fetching data from the FMP API.

## Architecture

**CRITICAL:** These functions are imported directly by the `queue-processor-v2` Edge Function (monofunction architecture). They are **NOT** separate Edge Functions. This prevents connection pool exhaustion from FaaS-to-FaaS invocations.

## Function Pattern

Each function in this directory must follow this pattern:

```typescript
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export interface ProcessJobResult {
  success: boolean;
  dataSizeBytes: number;
  error?: string;
}

export async function fetchProfileLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // 1. CRITICAL VALIDATION #1: Data Type Check
  if (job.data_type !== 'profile') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchProfileLogic was called for job type ${job.data_type}. Expected 'profile'.`
    };
  }

  try {
    // 2. CRITICAL: Aggressive internal timeout (10 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${job.symbol}?apikey=${FMP_API_KEY}`,
        { signal: controller.signal }
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('FMP API request timed out after 10 seconds.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }

    // 3. CRITICAL: Get Content-Length header (not JSON.stringify().length)
    const contentLength = response.headers.get('Content-Length');
    let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
    if (actualSizeBytes === 0) {
      console.warn(`[fetchProfileLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 50000; // Conservative fallback
    }

    const data = await response.json();

    // 4. CRITICAL VALIDATION #2: Strict Schema Validation (Zod)
    const ProfileSchema = z.object({
      symbol: z.string().min(1),
      companyName: z.string().min(1),
      price: z.number().gt(0).lt(10000),
      // ... all required fields
    });

    const profile = ProfileSchema.parse(data[0]);

    // 5. CRITICAL VALIDATION #3: Source Timestamp Check (if available)
    // (Implementation depends on registry configuration)

    // 6. Upsert to database
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        symbol: profile.symbol,
        company_name: profile.companyName,
        // ... other fields
        modified_at: new Date().toISOString(),
      });

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
    };
  } catch (error) {
    return {
      success: false,
      dataSizeBytes: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Required Validations

All functions **must** implement:

1. **Data Type Validation** - Reject jobs with wrong `data_type`
2. **Aggressive Internal Timeout** - 10-second timeout on API calls
3. **Content-Length Tracking** - Use `Content-Length` header for quota tracking
4. **Strict Schema Validation** - Use Zod to parse entire response
5. **Source Timestamp Check** - Compare timestamps if `source_timestamp_column` is defined
6. **Data Sanity Checks** - Validate logical correctness (e.g., `price > 0`)

## Migration Strategy

Functions will be migrated from existing Edge Functions (`fetch-fmp-*`) to this library:

1. Extract core logic from Edge Function
2. Convert to exportable function following the pattern above
3. Add all required validations
4. Update `queue-processor-v2` to import and use the function
5. Keep original Edge Function for backward compatibility (until Phase 5 migration)

