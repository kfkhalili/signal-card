import type { Metadata } from "next";

export const homeMetadata: Metadata = {
  title: "Tickered - Financial Data Visualization & Analysis Platform",
  description:
    "Transform complex financial data into interactive, digestible experiences. Spot trends, see moves, and build your unique collection of market insights with our innovative card-based system.",
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
  ],
  openGraph: {
    title: "Tickered - Financial Data Visualization & Analysis Platform",
    description:
      "Transform complex financial data into interactive, digestible experiences. Spot trends, see moves, and build your unique collection of market insights.",
    type: "website",
    url: "https://www.tickered.com",
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
      "Transform complex financial data into interactive, digestible experiences. Spot trends, see moves, and build your unique collection of market insights.",
    creator: "@TickeredApp",
    images: ["/images/tickered-twitter-image.png"],
  },
  other: {
    "application-name": "Tickered",
    "msapplication-TileColor": "#ffffff",
    "theme-color": "#ffffff",
  },
};

export function generateStructuredData(metadata: Metadata): string {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: metadata.title,
    description: metadata.description,
    url: "https://www.tickered.com",
    applicationCategory: "Finance",
    operatingSystem: "All",
    browserRequirements: "Requires modern browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: "Tickered",
      logo: {
        "@type": "ImageObject",
        url: "https://www.tickered.com/images/tickered.png",
      },
    },
  };
  return JSON.stringify(structuredData);
}
