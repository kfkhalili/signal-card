// src/components/symbol-analysis/SymbolHeroSection.tsx
"use client";

import Image from "next/image";
import { Option } from "effect";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Shield, Activity, Users } from "lucide-react";
import { cn, createSecureImageUrl } from "@/lib/utils";
import { formatFinancialValue } from "@/lib/formatters";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type { Database } from "@/lib/supabase/database.types";
import { ScorecardItem } from "./ScorecardItem";

interface SymbolHeroSectionProps {
  ticker: string;
  profile: Option.Option<ProfileDBRow>;
  quote: Option.Option<Database["public"]["Tables"]["live_quote_indicators"]["Row"]>;
  exchangeRates: Record<string, number>;
  valuationStatus: { status: string; color: string; borderColor: string };
  safetyStatus: { status: string; color: string; borderColor: string };
  qualityStatus: { status: string; color: string; borderColor: string };
  analystConsensus: Option.Option<string>;
}

export function SymbolHeroSection({
  ticker,
  profile,
  quote,
  exchangeRates,
  valuationStatus,
  safetyStatus,
  qualityStatus,
  analystConsensus,
}: SymbolHeroSectionProps) {
  const companyName = Option.match(profile, {
    onNone: () => "Loading...",
    onSome: (p) => p.company_name || ticker,
  });

  const logoUrl = Option.match(profile, {
    onNone: () => null,
    onSome: (p) => p.image || null,
  });

  const currentPrice = Option.match(quote, {
    onNone: () => null,
    onSome: (q) => q.current_price || null,
  });

  const priceChange = Option.match(quote, {
    onNone: () => null,
    onSome: (q) => q.change_percentage || null,
  });

  return (
    <Card className="bg-card">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
          {/* A1. Identity & Price */}
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-primary shrink-0 relative overflow-hidden">
              {logoUrl ? (
                <>
                  <Image
                    src={createSecureImageUrl(logoUrl)}
                    alt={`${companyName} logo`}
                    fill
                    sizes="64px"
                    className="object-contain p-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      // Show fallback when image fails
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector(".logo-fallback") as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }
                    }}
                    priority={false}
                  />
                  <span className="logo-fallback hidden absolute inset-0 items-center justify-center">
                    {ticker.charAt(0)}
                  </span>
                </>
              ) : (
                <span>{ticker.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                {companyName} <span className="text-muted-foreground font-normal text-xl">({ticker})</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {currentPrice !== null ? (
                  <>
                    <span className="text-2xl font-semibold">
                      {formatFinancialValue(currentPrice, "USD", 2, exchangeRates)}
                    </span>
                    {priceChange !== null && (
                      <Badge
                        variant="default"
                        className={cn(
                          priceChange >= 0
                            ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200"
                            : "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-200"
                        )}
                      >
                        {priceChange >= 0 ? (
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 inline mr-1" />
                        )}
                        {priceChange >= 0 ? "+" : ""}
                        {priceChange.toFixed(2)}%
                      </Badge>
                    )}
                  </>
                ) : (
                  <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                )}
                <span className="text-sm text-muted-foreground">Realtime</span>
              </div>
              <div className="flex gap-2 mt-3">
                {Option.match(profile, {
                  onNone: () => null,
                  onSome: (p) => (
                    <>
                      {p.sector && <Badge variant="outline">{p.sector}</Badge>}
                      {p.exchange && <Badge variant="outline">{p.exchange}</Badge>}
                    </>
                  ),
                })}
              </div>
            </div>
          </div>

          {/* A2. The "Intelligent" Scorecard */}
          <div className="flex-1 w-full lg:w-auto grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            {valuationStatus.status !== "Unknown" && (
              <ScorecardItem
                icon={<DollarSign className="h-4 w-4" />}
                label="Valuation"
                status={valuationStatus.status}
                statusColor={valuationStatus.color}
              />
            )}
            <ScorecardItem
              icon={<Shield className="h-4 w-4" />}
              label="Health"
              status={safetyStatus.status}
              statusColor={safetyStatus.color}
            />
            <ScorecardItem
              icon={<Activity className="h-4 w-4" />}
              label="Quality (ROIC)"
              status={qualityStatus.status}
              statusColor={qualityStatus.color}
            />
            <ScorecardItem
              icon={<Users className="h-4 w-4" />}
              label="Sentiment"
              status={Option.match(analystConsensus, {
                onNone: () => "Unknown",
                onSome: (s) => s,
              })}
              statusColor={Option.match(analystConsensus, {
                onNone: () => "text-muted-foreground",
                onSome: (s) => {
                  if (s === "Strong Buy" || s === "Buy") return "text-green-600";
                  if (s === "Hold") return "text-yellow-600";
                  return "text-red-600";
                },
              })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
