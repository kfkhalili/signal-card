import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface TickerPageProps {
  params: Promise<{
    ticker: string;
  }>;
}

// Dynamic metadata generation for individual stock symbol pages
export async function generateMetadata({
  params,
}: TickerPageProps): Promise<Metadata> {
  const supabase = await createSupabaseServerClient();
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  // Fetch company profile data for metadata
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, symbol")
    .eq("symbol", symbol)
    .single();

  const companyName = profile?.company_name || symbol;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com";

  // Fetch current price for description
  const { data: quote } = await supabase
    .from("live_quote_indicators")
    .select("current_price, change_percentage")
    .eq("symbol", symbol)
    .single();

  const price = quote?.current_price;
  const changePercent = quote?.change_percentage;
  const priceText = price
    ? `Current price: $${price.toFixed(2)}${changePercent ? ` (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%)` : ""}`
    : "";

  const title = `${companyName} (${symbol}) Stock Analysis - Tickered`;
  const description = `Comprehensive stock analysis for ${companyName} (${symbol}). View financial metrics, valuation, quality indicators, insider trading, and analyst ratings. ${priceText} Access institutional-grade financial data and real-time market feeds.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/symbol/${symbol}`,
    },
    openGraph: {
      title: `${companyName} (${symbol}) Stock Analysis - Tickered`,
      description: `Comprehensive stock analysis for ${companyName} (${symbol}). View financial metrics, valuation, quality indicators, and analyst ratings.`,
      type: "website",
      url: `${baseUrl}/symbol/${symbol}`,
      images: [
        {
          url: "/images/tickered-og-image.png",
          width: 1200,
          height: 630,
          alt: `${companyName} (${symbol}) Stock Analysis on Tickered`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${companyName} (${symbol}) Stock Analysis - Tickered`,
      description: `Comprehensive stock analysis for ${companyName} (${symbol}). View financial metrics, valuation, and analyst ratings.`,
      images: ["/images/tickered-og-image.png"],
    },
    other: {
      // Add stock symbol for potential structured data
      "stock:symbol": symbol,
      "stock:company": companyName,
    },
  };
}

export default function TickerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

