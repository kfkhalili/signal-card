// src/app/layout.tsx
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";

// Use TTF file directly since WOFF2 is missing from package installation
// Path is relative to this file (src/app/layout.tsx)
const GeistMono = localFont({
  src: "../../public/fonts/geist-mono/GeistMono-Variable.ttf",
  variable: "--font-geist-mono",
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Roboto Mono",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
  weight: "100 900",
});
import { homeMetadata, generateStructuredData } from "./metadata";
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
        <link rel="manifest" href="/manifest.json" />
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
          </RealtimeStockProvider>
        </AuthProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
