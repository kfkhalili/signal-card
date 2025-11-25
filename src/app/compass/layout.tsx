import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Compass - Tickered Financial Data Platform",
  description:
    "Navigate the markets with Tickered's Market Compass. Discover trending stocks, market signals, and investment opportunities using our institutional-grade financial data API and real-time market feeds.",
  alternates: {
    canonical: "/compass",
  },
  openGraph: {
    title: "Market Compass - Tickered Financial Data Platform",
    description:
      "Navigate the markets with Tickered's Market Compass. Discover trending stocks and market signals using institutional-grade financial data.",
    type: "website",
    url: "/compass",
  },
  twitter: {
    card: "summary",
    title: "Market Compass - Tickered",
    description:
      "Navigate the markets with Tickered's Market Compass. Discover trending stocks and market signals using institutional-grade financial data.",
  },
};

export default function CompassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

