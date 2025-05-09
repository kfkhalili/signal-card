// supabase/functions/fetch-fmp-quote-indicators/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or restrict to your specific domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Interface for FMP /quote response
interface FmpQuoteData {
  symbol: string;
  name: string;
  price: number;
  changePercentage: number;
  change: number;
  volume: number;
  dayLow: number;
  dayHigh: number;
  marketCap: number;
  open: number;
  previousClose: number;
  timestamp: number; // Unix timestamp (seconds)
}

// Interface for FMP /technical-indicators/sma response item
interface FmpSmaData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    sma: number;
}

console.log(`Function "fetch-fmp-quote-indicators" up and running!`);

// Helper to fetch and get latest SMA value
async function getLatestSma(symbol: string, period: number, timeframe: string, apiKey: string): Promise<number | null> {
    const url = `https://financialmodelingprep.com/stable/technical-indicator/SMA?symbol=${symbol}&periodLength=${period}timeframe=${timeframe}&apikey=${apiKey}`;
    console.log(`Fetching SMA (${period} ${timeframe}) from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`SMA fetch failed for ${period} ${timeframe}: ${response.status} ${response.statusText}`);
            return null;
        }
        const data: FmpSmaData[] = await response.json();
        if (data && data.length > 0) {
            console.log(`Latest SMA (${period} ${timeframe}) found: ${data[0].sma}`);
            return data[0].sma;
        }
        console.warn(`No SMA data found for ${period} ${timeframe}.`);
        return null;
    } catch (error) {
        console.error(`Error fetching SMA for ${period} ${timeframe}:`, error);
        return null;
    }
}


Deno.serve(async (req) => {
  // --- Optional: Handle CORS preflight ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // --- End Optional CORS ---

  try {
    const fmpApiKey = Deno.env.get('FMP_API_KEY');
    if (!fmpApiKey) {
      throw new Error('Missing FMP_API_KEY environment variable.');
    }

    const symbol = 'AAPL'; // Hardcoded for now

    // --- Fetch Quote and SMAs Concurrently ---
    const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${fmpApiKey}`; // Corrected URL
    console.log(`Fetching quote from: ${quoteUrl}`);

    const results = await Promise.allSettled([
        fetch(quoteUrl),
        getLatestSma(symbol, 50, '1day', fmpApiKey),
        getLatestSma(symbol, 200, '1day', fmpApiKey)
    ]);

    // --- Process Quote Result ---
    const quoteResult = results[0];
    if (quoteResult.status === 'rejected' || !quoteResult.value.ok) {
        const reason = quoteResult.status === 'rejected' ? quoteResult.reason : `${quoteResult.value.status} ${quoteResult.value.statusText}`;
        throw new Error(`Failed to fetch quote data: ${reason}`);
    }
    const fmpQuoteArray: FmpQuoteData[] = await quoteResult.value.json();
    if (!fmpQuoteArray || fmpQuoteArray.length === 0) {
        throw new Error(`No quote data received from FMP API for ${symbol}.`);
    }
    const quoteData = fmpQuoteArray[0];
    console.log(`Received quote for ${symbol}: Price=${quoteData.price}, Timestamp=${quoteData.timestamp}`);

     if (typeof quoteData.timestamp !== 'number' || quoteData.timestamp <= 0) {
        throw new Error(`Invalid quote timestamp received from FMP: ${quoteData.timestamp}.`);
     }

    // --- Process SMA Results ---
    let sma50d: number | null = null;
    if (results[1].status === 'fulfilled') sma50d = results[1].value;
    else console.warn("Failed to get 50-day SMA:", results[1].reason);

    let sma200d: number | null = null;
    if (results[2].status === 'fulfilled') sma200d = results[2].value;
    else console.warn("Failed to get 200-day SMA:", results[2].reason);

    // --- Prepare data for Supabase upsert ---
    const recordToUpsert = {
      symbol: quoteData.symbol,
      current_price: quoteData.price,
      change_percentage: quoteData.changePercentage,
      day_change: quoteData.change,
      day_low: quoteData.dayLow,
      day_high: quoteData.dayHigh,
      market_cap: quoteData.marketCap,
      day_open: quoteData.open,
      previous_close: quoteData.previousClose,
      api_timestamp: quoteData.timestamp,
      volume: quoteData.volume,
      sma_50d: sma50d,
      sma_200d: sma200d,
      fetched_at: new Date().toISOString()
    };

    // --- Upsert into Supabase ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Attempting to upsert combined data for ${symbol} into NEW table...`);

    const { error: upsertError } = await supabaseAdmin
      .from('live_quote_indicators') // <-- TARGET THE NEW TABLE HERE
      .upsert(recordToUpsert, {
        onConflict: 'symbol',
      });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    } else {
      console.log(`Successfully upserted data for ${symbol} into live_quote_indicators.`);
    }

    return new Response(JSON.stringify({ message: `Quote and SMA data processed for ${symbol}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
