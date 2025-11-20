// supabase/functions/lib/fetch-fmp-profile.ts
// Library function for processing profile jobs from the queue
// CRITICAL: This function is imported directly by queue-processor-v2 (monofunction architecture)

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { QueueJob, ProcessJobResult } from './types.ts';

const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
const FMP_PROFILE_BASE_URL = 'https://financialmodelingprep.com/stable/profile';
const STORAGE_BUCKET_NAME = 'profile-images';

// Zod schema for FMP Profile API response
// CRITICAL: Strict schema validation - all required fields must be present and correct type
const FmpProfileSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().gt(0).lt(100000), // Sanity check: price must be positive and reasonable
  marketCap: z.number().nonnegative().optional(),
  beta: z.number().optional(),
  lastDividend: z.number().optional(),
  range: z.string().optional(),
  change: z.number().optional(),
  changePercentage: z.number().optional(),
  volume: z.number().nonnegative().optional(),
  averageVolume: z.number().nonnegative().optional(),
  companyName: z.string().min(1), // Required - will fail if undefined or empty
  currency: z.string().length(3).nullable().optional(),
  cik: z.string().nullable().optional(), // FMP can return null
  isin: z.string().nullable().optional(),
  cusip: z.string().nullable().optional(), // FMP can return null
  exchangeFullName: z.string().nullable().optional(),
  exchange: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.union([z.string().url(), z.literal(''), z.null()]).optional(), // FMP can return null, empty string, or valid URL
  description: z.string().nullable().optional(), // FMP can return null
  ceo: z.string().nullable().optional(), // FMP can return null
  sector: z.string().nullable().optional(),
  country: z.string().length(2).nullable().optional(), // FMP can return null
  fullTimeEmployees: z.string().nullable().optional(), // FMP provides as string or null
  phone: z.string().nullable().optional(), // FMP can return null
  address: z.string().nullable().optional(), // FMP can return null
  city: z.string().nullable().optional(), // FMP can return null
  state: z.string().nullable().optional(), // FMP can return null
  zip: z.string().nullable().optional(), // FMP can return null
  image: z.string().url().optional().or(z.literal('')),
  ipoDate: z.string().optional(), // "YYYY-MM-DD"
  defaultImage: z.boolean().optional(),
  isEtf: z.boolean().optional(),
  isActivelyTrading: z.boolean().optional(),
  isAdr: z.boolean().optional(),
  isFund: z.boolean().optional(),
});

function parseFmpFullTimeEmployees(employeesStr: string | undefined): number | null {
  if (!employeesStr) return null;
  const num = parseInt(employeesStr.replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
}

export async function fetchProfileLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // CRITICAL VALIDATION #1: Data Type Check (Prevents Misconfiguration)
  if (job.data_type !== 'profile') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchProfileLogic was called for job type ${job.data_type}. Expected 'profile'.`,
    };
  }

  try {
    // CRITICAL: Aggressive internal timeout (prevents "Slow API" throughput collapse)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    let response: Response;
    try {
      const profileUrl = `${FMP_PROFILE_BASE_URL}?symbol=${job.symbol}&apikey=${FMP_API_KEY}`;
      response = await fetch(profileUrl, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FMP API request timed out after 10 seconds. This indicates API brownout or network issue.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }

    // CRITICAL: Get the ACTUAL data transfer size (what FMP bills for)
    // Do NOT use JSON.stringify().length - that measures the parsed object, not the HTTP payload
    const contentLength = response.headers.get('Content-Length');
    let actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 0;
    if (actualSizeBytes === 0) {
      console.warn(`[fetchProfileLogic] Content-Length header missing for ${job.symbol}. Using fallback estimate.`);
      actualSizeBytes = 50000; // 50 KB conservative estimate
    }

    const data = await response.json();

    // CRITICAL VALIDATION #2: Strict Schema Validation (Prevents "Schema Drift" Data Corruption)
    // Manual "spot-checks" are insufficient - APIs can change field names without versioning
    // This causes undefined values to be written as NULL, corrupting the database
    // MUST use strict, holistic schema parsing (Zod) to validate the ENTIRE response
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`FMP API returned empty array or invalid response for ${job.symbol}`);
    }

    // Parse the data - this IS the validation
    // If parsing fails (missing field, wrong type, invalid value), it throws
    const profile = FmpProfileSchema.parse(data[0]);

    // CRITICAL VALIDATION #3: Source Timestamp Check (if available in registry)
    // TODO: Implement source timestamp checking when registry has source_timestamp_column
    // For now, profiles don't have a source timestamp column, so we skip this

    // Handle image upload (if needed)
    let finalImageUrl: string | null = profile.image || null;

    if (profile.image && !profile.defaultImage) {
      const imageFileName = `${profile.symbol}.png`;

      try {
        const { data: existingFiles, error: listError } = await supabase.storage
          .from(STORAGE_BUCKET_NAME)
          .list(undefined, { limit: 1, search: imageFileName });

        if (listError) {
          console.warn(`[fetchProfileLogic] Storage list error for ${job.symbol}: ${listError.message}`);
        } else if (!existingFiles || existingFiles.length === 0) {
          const imageResponse = await fetch(profile.image);
          if (!imageResponse.ok) {
            console.warn(`[fetchProfileLogic] Failed to download image for ${job.symbol}`);
          } else {
            const imageBlob = await imageResponse.blob();
            const { error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET_NAME)
              .upload(imageFileName, imageBlob, {
                contentType: 'image/png',
                upsert: false,
              });

            if (uploadError) {
              console.warn(`[fetchProfileLogic] Upload error for ${job.symbol}: ${uploadError.message}`);
            } else {
              const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET_NAME)
                .getPublicUrl(imageFileName);
              finalImageUrl = urlData.publicUrl;
            }
          }
        } else {
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .getPublicUrl(imageFileName);
          finalImageUrl = urlData.publicUrl;
        }
      } catch (imageError) {
        console.warn(`[fetchProfileLogic] Image processing failed for ${job.symbol}: ${imageError}`);
        finalImageUrl = profile.image || null;
      }
    }

    // Prepare record for upsert
    // CRITICAL: Truncate bigint values (volume, market_cap, average_volume) to integers
    // FMP API sometimes returns decimals like "3955124346827.0005" which breaks bigint columns
    const recordToUpsert = {
      symbol: profile.symbol,
      price: profile.price,
      beta: profile.beta ?? null,
      average_volume: profile.averageVolume ? Math.trunc(profile.averageVolume) : null,
      market_cap: profile.marketCap ? Math.trunc(profile.marketCap) : null,
      last_dividend: profile.lastDividend ?? null,
      range: profile.range ?? null,
      change: profile.change ?? null,
      change_percentage: profile.changePercentage ?? null,
      company_name: profile.companyName,
      currency: profile.currency ?? null,
      cik: profile.cik ?? null,
      isin: profile.isin ?? null,
      cusip: profile.cusip ?? null,
      exchange: profile.exchange ?? null,
      exchange_full_name: profile.exchangeFullName ?? null,
      industry: profile.industry ?? null,
      website: profile.website || null,
      description: profile.description ?? null,
      ceo: profile.ceo ?? null,
      sector: profile.sector ?? null,
      country: profile.country ?? null,
      full_time_employees: parseFmpFullTimeEmployees(profile.fullTimeEmployees),
      phone: profile.phone ?? null,
      address: profile.address ?? null,
      city: profile.city ?? null,
      state: profile.state ?? null,
      zip: profile.zip ?? null,
      image: finalImageUrl,
      ipo_date: profile.ipoDate || null,
      default_image: profile.defaultImage ?? false,
      is_etf: profile.isEtf ?? false,
      is_actively_trading: profile.isActivelyTrading ?? true,
      is_adr: profile.isAdr ?? false,
      is_fund: profile.isFund ?? false,
      volume: profile.volume ? Math.trunc(profile.volume) : null,
    };

    // Upsert to database using RPC function
    const { error: rpcError } = await supabase.rpc('upsert_profile', {
      profile_data: recordToUpsert,
    });

    if (rpcError) {
      throw new Error(`Database upsert failed: ${rpcError.message}`);
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

