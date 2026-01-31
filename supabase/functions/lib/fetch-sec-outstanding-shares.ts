// functions/lib/fetch-sec-outstanding-shares.ts
import { z } from 'zod';
import { DOMParser } from 'deno_dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueueJob, ProcessJobResult } from './types.ts';

// Define the expected structure of the SEC Submissions JSON
const SecSubmissionSchema = z.object({
  cik: z.string(),
  entityType: z.string().optional(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  name: z.string().optional(),
  filings: z.object({
    recent: z.object({
      accessionNumber: z.array(z.string()),
      filingDate: z.array(z.string()),
      reportDate: z.array(z.string().nullable().optional()),
      acceptanceDateTime: z.array(z.string()),
      act: z.array(z.string().nullable().optional()),
      form: z.array(z.string()),
      fileNumber: z.array(z.string()),
      filmNumber: z.array(z.string()),
      items: z.array(z.string()),
      size: z.array(z.number().nullable().optional()),
      isXBRL: z.array(z.number().nullable().optional()),
      isInlineXBRL: z.array(z.number().nullable().optional()),
      primaryDocument: z.array(z.string()),
      primaryDocDescription: z.array(z.string().nullable().optional()),
    })
  })
});

// Schema for the Extracted Data
const ExtractedDataSchema = z.object({
  title: z.string().optional().default(''),
  outstandingShares: z.number().int().nonnegative().nullable(), 
  method: z.enum(['xbrl_tag', 'regex_text', 'none']),
}).refine((data) => {
  if (data.method !== 'none' && data.outstandingShares === null) {
    return false;
  }
  return true;
}, {
  message: "If a method is specified, outstandingShares cannot be null"
});

// Helper to pad CIK to 10 digits (SEC requirement)
function padCik(cik: string): string {
  return cik.padStart(10, '0');
}

// Helper: Parse number from string (handles commas)
function parseShareCount(value: string): number {
  return parseFloat(value.replace(/,/g, ''));
}

// Helper: Fetch and Parse Filing HTML (10-Q or 10-K)
async function parseFiling(url: string) {
  console.log(`[Parser] Fetching HTML from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'StockScreener/1.0 (support@tickered.com)', 
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch filing HTML: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const document = new DOMParser().parseFromString(html, 'text/html');

  if (!document) {
    throw new Error('Failed to parse HTML document');
  }

  let outstandingShares: number | null = null;
  let method = 'none';

  // STRATEGY 1: Inline XBRL (The "Gold Standard")
  const xbrlElement = document.querySelector('[name="dei:EntityCommonStockSharesOutstanding"]');
  
  if (xbrlElement) {
    const rawValue = xbrlElement.textContent;
    if (rawValue) {
      outstandingShares = parseShareCount(rawValue);
      method = 'xbrl_tag';
      console.log(`[Parser] Found XBRL tag: ${rawValue} -> ${outstandingShares}`);
    }
  }

  // STRATEGY 2: Fallback to Text Search (Regex) if XBRL fails
  if (!outstandingShares) {
    const bodyText = document.body?.textContent || '';
    // Limit search to first 20k chars (Cover Page)
    const textPreview = bodyText.substring(0, 20000).replace(/\s+/g, ' '); 

    // Regex: "As of [Date], there were [Number] shares"
    const regex = /As of\s+[A-Za-z]+\s+\d{1,2},\s+\d{4},?\s+(?:there were|the registrant had)\s+([\d,.]+)\s*(million|billion)?\s+shares/i;
    const match = textPreview.match(regex);
    
    if (match) {
      let num = parseShareCount(match[1]);
      const multiplier = match[2]?.toLowerCase();
      if (multiplier === 'million') num *= 1_000_000;
      if (multiplier === 'billion') num *= 1_000_000_000;
      
      outstandingShares = Math.round(num);
      method = 'regex_text';
      console.log(`[Parser] Found via Regex: ${outstandingShares}`);
    }
  }

  const result = {
    title: document.title,
    outstandingShares,
    method
  };

  try {
    return ExtractedDataSchema.parse(result);
  } catch (error) {
    console.error(`[Parser] Validation Failed for ${url}:`, error);
    return { title: document.title || 'Unknown', outstandingShares: null, method: 'none' };
  }
}

/**
 * Main Logic for fetching SEC Outstanding Shares
 * Renamed from fetchSecFilingsLogic to reflect specific intent
 */
export async function fetchSecOutstandingSharesLogic(
  job: QueueJob,
  supabase: SupabaseClient
): Promise<ProcessJobResult> {
  // 1. Validation - Updated Data Type Check
  if (job.data_type !== 'sec-outstanding-shares') {
    return {
      success: false,
      dataSizeBytes: 0,
      error: `Configuration Error: fetchSecOutstandingSharesLogic called for ${job.data_type}`,
    };
  }

  try {
    // 2. Get CIK from Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cik')
      .eq('symbol', job.symbol)
      .single();

    if (profileError || !profile?.cik) {
      return {
        success: false, 
        dataSizeBytes: 0,
        error: `Missing CIK for symbol ${job.symbol}. Cannot fetch SEC shares.`
      };
    }

    const paddedCik = padCik(profile.cik);

    // 3. Fetch Submissions from SEC
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); 

    const secUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
    
    let response: Response;
    try {
      response = await fetch(secUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'StockScreener/1.0 (support@tickered.com)',
          'Accept-Encoding': 'gzip, deflate',
          'Host': 'data.sec.gov'
        }
      });
    } catch (error) {
       if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('SEC API request timed out after 15 seconds.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`SEC API Error: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('Content-Length');
    const actualSizeBytes = contentLength ? parseInt(contentLength, 10) : 50000;
    
    const rawData = await response.json();

    let data;
    try {
      data = SecSubmissionSchema.parse(rawData);
    } catch (zodError) {
      console.error(`[SecShares] Schema Validation Failed for ${job.symbol}:`, zodError);
      throw new Error(`SEC API response did not match expected schema: ${zodError instanceof Error ? zodError.message : 'Unknown Zod error'}`);
    }

    // 4. Find Latest Financial Statement (10-Q or 10-K)
    const recent = data.filings.recent;
    
    if (recent.form.length === 0) {
       return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        message: 'Entity has no recent filings.'
      };
    }

    let latestFilingIndex = -1;
    let foundFormType = '';

    for (let i = 0; i < recent.form.length; i++) {
      const form = recent.form[i];
      if (form === '10-Q' || form === '10-K') {
        latestFilingIndex = i;
        foundFormType = form;
        break;
      }
    }

    if (latestFilingIndex === -1) {
      return {
        success: true,
        dataSizeBytes: actualSizeBytes,
        message: 'No 10-Q or 10-K filings found for this entity.'
      };
    }

    // 5. Extract Metadata
    const accessionNumber = recent.accessionNumber[latestFilingIndex];
    const filingDate = recent.filingDate[latestFilingIndex];
    const reportDate = recent.reportDate[latestFilingIndex];
    const acceptanceDate = recent.acceptanceDateTime[latestFilingIndex];
    const primaryDocument = recent.primaryDocument[latestFilingIndex];
    const description = recent.primaryDocDescription[latestFilingIndex];

    const accessionNoDashes = accessionNumber.replace(/-/g, '');
    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik, 10)}/${accessionNoDashes}/${primaryDocument}`;

    // 6. Check if already exists in Database
    // We check specifically if we have already processed this accession number
    const { data: existingFiling } = await supabase
      .from('sec_filings')
      .select('id')
      .eq('symbol', job.symbol)
      .eq('accession_number', accessionNumber)
      .maybeSingle();

    if (existingFiling) {
      return {
        success: true,
        dataSizeBytes: 0,
        message: `Filing ${accessionNumber} (${foundFormType}) already processed. Skipped parsing.`
      };
    }

    // 7. Parse Document for Shares
    let parsedData: { outstandingShares: number | null; method: string } | null = null;
    
    try {
      parsedData = await parseFiling(filingUrl);
    } catch (parseError) {
      console.error(`[Parser] Error parsing ${foundFormType}:`, parseError);
    }

    // 8. Upsert
    const { error: upsertError } = await supabase
      .from('sec_filings')
      .upsert({
        symbol: job.symbol,
        accession_number: accessionNumber,
        form_type: foundFormType,
        filing_date: filingDate,
        report_date: reportDate,
        acceptance_date: acceptanceDate,
        primary_document: primaryDocument,
        filing_url: filingUrl,
        description: description,
        outstanding_shares: parsedData?.outstandingShares ?? null,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'symbol, accession_number'
      });

    if (upsertError) {
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }

    const shares = parsedData?.outstandingShares;
    const sharesLog = shares
      ? ` | Shares: ${shares.toLocaleString()}` 
      : ' | Shares not found';

    return {
      success: true,
      dataSizeBytes: actualSizeBytes,
      message: `Processed ${foundFormType} from ${filingDate}${sharesLog}`
    };

  } catch (error) {
    return {
      success: false,
      dataSizeBytes: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}