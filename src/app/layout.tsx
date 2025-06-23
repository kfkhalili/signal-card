// src/app/layout.tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { homeMetadata, generateStructuredData } from "./metadata";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { RealtimeStockProvider } from "@/contexts/RealtimeStockContext";

import "./globals.css";

export const metadata = homeMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = generateStructuredData(homeMetadata);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <AuthProvider>
          <RealtimeStockProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8">
                {children}
              </main>
              <Footer />
            </div>
            <Toaster />
          </RealtimeStockProvider>
        </AuthProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
