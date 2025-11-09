# fetch-fmp-batch-quote-indicators Edge Function

This edge function fetches batch pre/post-market quote data from the FinancialModelingPrep API and stores it in the `live_quote_indicators` table.

## Testing

To run the unit tests for this function:

```bash
deno test --allow-env --allow-net supabase/functions/fetch-fmp-batch-quote-indicators/index.test.ts
```

Or from the project root:

```bash
cd supabase/functions/fetch-fmp-batch-quote-indicators
deno test --allow-env --allow-net index.test.ts
```

## Test Coverage

The tests cover:
- ✅ Success case with valid batch data
- ✅ Empty symbols array handling
- ✅ API error handling
- ✅ Invalid response format handling
- ✅ Empty batch response handling
- ✅ Invalid quote data handling
- ✅ Timestamp conversion (milliseconds to seconds)
- ✅ Error message formatting
- ✅ API key censoring
- ✅ URL construction
- ✅ Data transformation (FMP format to database format)

## Running Tests

The tests use Deno's built-in test framework. They test the core logic and data transformations without requiring actual API calls or database connections.

For integration testing, you would need to:
1. Set up a test Supabase project
2. Configure environment variables
3. Mock or use a test FMP API endpoint

