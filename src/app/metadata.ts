import type { Metadata } from "next";

export const homeMetadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ),
  title: "Tickered - Discover Overlooked Companies",
  description:
    "Find financially sound companies the market may be overlooking, compare their strengths, and inspect the evidence with Tickered's investment research tools.",
  category: "finance",
  keywords: [
    "financial data visualization",
    "stock market analysis",
    "investment platform",
    "stock discovery",
    "financial analysis tools",
    "stock market insights",
    "investment research",
    "fundamental analysis",
    "financial technology",
    "company valuation",
    "financial health",
    "growth analysis",
    "self-directed investing",
    "overlooked companies",
    "company research",
  ],
  openGraph: {
    title: "Tickered - Discover Overlooked Companies",
    description:
      "Find financially sound companies the market may be overlooking, then inspect the evidence yourself.",
    type: "website",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com",
    siteName: "Tickered",
    images: [
      {
        url: "/images/tickered-og-image.png",
        width: 1200,
        height: 630,
        alt: "Tickered investment research platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tickered - Discover Overlooked Companies",
    description:
      "Find financially sound companies the market may be overlooking, then inspect the evidence yourself.",
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
