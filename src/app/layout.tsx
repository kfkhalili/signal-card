// src/app/layout.tsx
import type { Metadata } from "next";
import { geistSansLocal, geistMonoLocal } from "./fonts"; // Adjust path if your fonts.ts is elsewhere

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import HeaderComponent from "@/components/layout/header";
import { cn } from "../lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSansClassName = geistSansLocal.variable;
const geistMonoClassName = geistMonoLocal.variable;

export const metadata: Metadata = {
  title: "MarketEcho",
  description: "Financial Signal Card Game MVP Prototype",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          geistSansClassName,
          geistMonoClassName,
          "antialiased font-sans"
        )}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <HeaderComponent />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
