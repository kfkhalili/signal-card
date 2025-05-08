// supabase/functions/fetch-fmp-price/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or restrict to your specific domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the structure of the FMP /quote API response item
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
  timestamp: number;
}

console.log(`Function "fetch-fmp-price" up and running!`);

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
    // USING THE URL FORMAT PROVIDED BY USER
    const fmpUrl = `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${fmpApiKey}`;

    console.log(`Fetching quote from: ${fmpUrl}`);
    const response = await fetch(fmpUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`FMP API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const fmpDataArray: FmpQuoteData[] = await response.json();

    if (!fmpDataArray || fmpDataArray.length === 0) {
      console.log(`No quote data received from FMP API for ${symbol}.`);
      return new Response(JSON.stringify({ message: `No quote data found from FMP API for ${symbol}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const quoteData = fmpDataArray[0];

    // Basic validation for the raw timestamp
    if (typeof quoteData.timestamp !== 'number' || quoteData.timestamp <= 0) {
       console.warn(`Invalid raw timestamp received from FMP: ${quoteData.timestamp}. Skipping record.`);
         return new Response(JSON.stringify({ message: 'Invalid timestamp received from FMP API.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
    }

    console.log(`Received quote for ${symbol}: Price=${quoteData.price}, Raw Timestamp=${quoteData.timestamp}`);

    // --- Prepare data for Supabase upsert ---
    // Corrected mapping based on FmpQuoteData interface and DDL assumptions
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
      fetched_at: new Date().toISOString()
    };

    // --- Upsert into Supabase ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Attempting to upsert quote for ${symbol}...`);

    // Assuming 'live_prices' table exists with columns matching 'recordToUpsert' keys
    const { error: upsertError } = await supabaseAdmin
      .from('live_prices')
      .upsert(recordToUpsert, {
        onConflict: 'symbol',
      });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return new Response(JSON.stringify({ error: `Supabase upsert failed: ${upsertError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
    } else {
      console.log(`Successfully upserted quote for ${symbol}.`);
    }

    return new Response(JSON.stringify({ message: `Quote processed for ${symbol}.` }), {
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
