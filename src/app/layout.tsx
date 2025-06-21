// src/app/layout.tsx
import type { Metadata } from "next";
import { geistSansLocal, geistMonoLocal } from "./fonts";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { cn } from "../lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieBanner } from "@/components/layout/CookieBanner";

const geistSansClassName = geistSansLocal.variable;
const geistMonoClassName = geistMonoLocal.variable;

const siteDescription =
  "Tickered is a web application for financial data visualization and analysis. Dive into dynamic financial data, capture key market events, and build your unique collection of stock market insights.";

export const metadata: Metadata = {
  title: "Tickered - Financial Analysis & Stock Data",
  description: siteDescription,
  keywords: [
    "Tickered",
    "finance",
    "stock market",
    "financial analysis",
    "stock data",
    "investment research",
    "trading signals",
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tickered",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com",
    logo: `${
      process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com"
    }/images/tickered.png`,
    description: siteDescription,
    mainEntityOfPage: {
      "@type": "WebApplication",
      name: "Tickered",
      applicationCategory: "FinancialApplication",
      operatingSystem: "Web",
      description: siteDescription,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free sign-up with core features available.",
      },
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={cn(
          geistSansClassName,
          geistMonoClassName,
          "antialiased font-sans"
        )}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </AuthProvider>
        <CookieBanner />
      </body>
    </html>
  );
};

export default RootLayout;
