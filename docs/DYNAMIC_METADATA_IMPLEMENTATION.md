# Dynamic Metadata for Individual Ticker Pages

## Overview

Dynamic metadata allows each stock symbol page (e.g., `/symbol/AAPL`) to have unique, SEO-optimized metadata including:
- Page title: "Apple Inc. (AAPL) Stock Analysis - Tickered"
- Description with current price and change percentage
- Canonical URL specific to the symbol
- OpenGraph and Twitter card metadata
- Stock-specific structured data

## Implementation

### How It Works

In Next.js 15, even if a page is a client component (`"use client"`), you can add dynamic metadata by creating a `layout.tsx` file in the dynamic route directory.

**File Structure:**
```
src/app/symbol/
  ├── layout.tsx              # Static metadata for /symbol
  ├── page.tsx                # Client component for /symbol
  └── [ticker]/
      ├── layout.tsx          # ✅ Dynamic metadata for /symbol/[ticker]
      └── page.tsx            # Client component for /symbol/[ticker]
```

### The `generateMetadata` Function

The `layout.tsx` file in `[ticker]` exports an async `generateMetadata` function that:

1. **Receives route parameters** - Gets the `ticker` from the URL
2. **Fetches data from Supabase** - Gets company name and current price
3. **Generates dynamic metadata** - Creates title, description, and OpenGraph tags

### Code Example

```typescript
// src/app/symbol/[ticker]/layout.tsx
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface TickerPageProps {
  params: Promise<{
    ticker: string;
  }>;
}

export async function generateMetadata({
  params,
}: TickerPageProps): Promise<Metadata> {
  const supabase = await createSupabaseServerClient();
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  // Fetch company data
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, symbol")
    .eq("symbol", symbol)
    .single();

  const companyName = profile?.company_name || symbol;

  // Fetch current price
  const { data: quote } = await supabase
    .from("live_quote_indicators")
    .select("price, change_percent")
    .eq("symbol", symbol)
    .single();

  const title = `${companyName} (${symbol}) Stock Analysis - Tickered`;
  const description = `Comprehensive stock analysis for ${companyName}...`;

  return {
    title,
    description,
    alternates: {
      canonical: `/symbol/${symbol}`,
    },
    // ... OpenGraph, Twitter, etc.
  };
}
```

## Key Features

### 1. Dynamic Titles
- **Format**: `{Company Name} ({Symbol}) Stock Analysis - Tickered`
- **Example**: `Apple Inc. (AAPL) Stock Analysis - Tickered`

### 2. Rich Descriptions
- Includes company name and symbol
- Optionally includes current price and change percentage
- Mentions key features (financial metrics, valuation, etc.)

### 3. Canonical URLs
- Each symbol page has its own canonical URL
- Prevents duplicate content issues
- Format: `/symbol/{SYMBOL}`

### 4. OpenGraph & Twitter Cards
- Dynamic images (currently using logo, can be enhanced)
- Stock-specific titles and descriptions
- Proper URL structure

### 5. Stock-Specific Metadata
- Custom `stock:symbol` and `stock:company` meta tags
- Can be used for future structured data enhancements

## Benefits

### SEO Benefits
1. **Unique Titles** - Each stock page has a unique, descriptive title
2. **Rich Snippets** - Better chance of rich snippets in search results
3. **Social Sharing** - Proper preview cards when shared on social media
4. **Indexing** - Search engines can better understand and index each page

### User Experience
1. **Browser Tabs** - Clear identification of which stock is being viewed
2. **Bookmarks** - Meaningful bookmark names
3. **History** - Clear browser history entries

## Data Fetching

The metadata function fetches:
- **Company Profile** - From `profiles` table (company_name, symbol)
- **Current Quote** - From `live_quote_indicators` table (price, change_percent)

### Error Handling

If data is missing:
- Falls back to symbol name if company name not found
- Gracefully handles missing price data
- Still generates valid metadata

## Performance Considerations

### Caching
- Next.js automatically caches metadata generation
- Metadata is generated at build time for static pages
- For dynamic routes, metadata is generated on-demand but cached

### Database Queries
- Only fetches minimal data needed for metadata
- Uses `.single()` for efficient queries
- Consider adding indexes on `symbol` column if not already present

## Future Enhancements

### 1. Structured Data (JSON-LD)
Add stock-specific structured data:
```typescript
const stockStructuredData = {
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  name: companyName,
  tickerSymbol: symbol,
  price: price,
  // ... more fields
};
```

### 2. Dynamic OG Images
Generate or fetch stock-specific OG images:
- Company logo
- Stock chart thumbnail
- Price indicator

### 3. Breadcrumbs
Add breadcrumb structured data:
```typescript
{
  "@type": "BreadcrumbList",
  itemListElement: [
    { name: "Home", position: 1 },
    { name: "Stock Analysis", position: 2 },
    { name: `${companyName} (${symbol})`, position: 3 }
  ]
}
```

### 4. Meta Tags for Trading
Add trading-specific meta tags:
- `stock:exchange`
- `stock:sector`
- `stock:industry`

## Testing

### Verify Metadata
1. **View Source** - Check `<head>` section for meta tags
2. **OpenGraph Debugger** - Use Facebook's debugger tool
3. **Twitter Card Validator** - Test Twitter card preview
4. **Google Rich Results Test** - Verify structured data

### Test Different Symbols
- Test with valid symbols (AAPL, MSFT, GOOGL)
- Test with invalid symbols (should handle gracefully)
- Test with symbols that have no data (should fallback)

## Troubleshooting

### Metadata Not Updating
- Clear Next.js cache: `.next` folder
- Restart dev server
- Check if data exists in database

### Missing Company Names
- Verify `profiles` table has data
- Check symbol matching (case-insensitive)
- Ensure database connection is working

### Performance Issues
- Add database indexes on `symbol` column
- Consider caching company names
- Use connection pooling

## Related Files

- `src/app/symbol/[ticker]/layout.tsx` - Dynamic metadata implementation
- `src/app/symbol/[ticker]/page.tsx` - Client component (unchanged)
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/app/metadata.ts` - Base metadata configuration

