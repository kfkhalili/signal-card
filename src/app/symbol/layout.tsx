import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Analysis - Tickered Financial Data Platform",
  description:
    "Search and analyze stocks with Tickered's comprehensive financial data platform. Access institutional-grade market data, real-time quotes, and detailed financial analysis for any stock symbol.",
  alternates: {
    canonical: "/symbol",
  },
  openGraph: {
    title: "Stock Analysis - Tickered Financial Data Platform",
    description:
      "Search and analyze stocks with Tickered's comprehensive financial data platform. Access institutional-grade market data and real-time quotes.",
    type: "website",
    url: "/symbol",
  },
  twitter: {
    card: "summary",
    title: "Stock Analysis - Tickered",
    description:
      "Search and analyze stocks with Tickered's comprehensive financial data platform. Access institutional-grade market data and real-time quotes.",
  },
};

export default function SymbolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

