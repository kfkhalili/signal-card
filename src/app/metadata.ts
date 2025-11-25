import type { Metadata } from "next";

export const homeMetadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  title: "Tickered - Financial Data Visualization & Analysis Platform",
  description:
    "Institutional-grade financial data API with real-time market feeds and enterprise market services. Transform complex financial data into interactive, digestible experiences through API integration. Spot trends, see moves, and build your unique collection of market insights with our innovative card-based system. Professional financial analytics platform for real-time market data delivery.",
  category: "finance",
  keywords: [
    "financial data visualization",
    "stock market analysis",
    "investment platform",
    "market data",
    "financial analysis tools",
    "stock market insights",
    "investment research",
    "trading signals",
    "financial technology",
    "market trends",
    "Financial Data API",
    "Enterprise Market Services",
    "Real-time Analytics",
    "financial data API",
    "enterprise market services",
    "real-time financial analytics",
    "market data API",
    "financial services platform",
    "enterprise financial solutions",
    "real-time market data",
    "institutional-grade data",
    "real-time market feeds",
    "API integration",
    "financial services",
    "market data feeds",
    "institutional financial data",
    "enterprise financial API",
    "real-time financial data",
    "financial market analytics",
    "professional financial platform",
  ],
  openGraph: {
    title: "Tickered - Financial Data Visualization & Analysis Platform",
    description:
      "Institutional-grade financial data API with real-time market feeds and enterprise market services. Transform complex financial data into interactive experiences through API integration. Professional financial analytics platform.",
    type: "website",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com",
    siteName: "Tickered",
    images: [
      {
        url: "/images/tickered-og-image.png",
        width: 1200,
        height: 630,
        alt: "Tickered - Financial Data Visualization & Analysis Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tickered - Financial Data Visualization & Analysis Platform",
    description:
      "Institutional-grade financial data API with real-time market feeds and enterprise market services. Transform complex financial data into interactive experiences through API integration. Professional financial analytics platform.",
    creator: "@TickeredApp",
    images: ["/images/tickered-og-image.png"],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/images/tickered.png", type: "image/png" },
    ],
    apple: [
      { url: "/images/tickered.png", sizes: "180x180", type: "image/png" },
    ],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5, // Allow zooming up to 5x for accessibility
  },
  other: {
    "application-name": "Tickered",
    "msapplication-TileColor": "#ffffff",
    "theme-color": "#ffffff",
  },
};

export function generateStructuredData(metadata: Metadata): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: metadata.title,
    description: metadata.description,
    url: baseUrl,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires modern browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: "Tickered",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/images/tickered.png`,
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "DE",
      },
      sameAs: [
        "https://www.reddit.com/r/tickered/",
      ],
    },
  };
  return JSON.stringify(structuredData);
}
