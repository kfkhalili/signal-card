// src/components/symbol-analysis/InsiderActivityCard.tsx
"use client";

import { Option } from "effect";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatFinancialValue } from "@/lib/formatters";
import type { InsiderActivity } from "@/lib/symbol-analysis/types";

interface InsiderActivityCardProps {
  insiderActivity: InsiderActivity;
  exchangeRates: Record<string, number>;
}

export function InsiderActivityCard({
  insiderActivity,
  exchangeRates,
}: InsiderActivityCardProps) {
  return (
    <Card className={cn(
      "border-l-4",
      insiderActivity.netSentiment > 0
        ? "border-l-green-500"
        : insiderActivity.netSentiment < 0
        ? "border-l-red-500"
        : "border-l-border"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Insider Activity
            </CardTitle>
            <CardDescription>Last 6 Months</CardDescription>
          </div>
          <div className="flex items-center">
            {insiderActivity.netSentiment > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Net Accumulation
              </Badge>
            )}
            {insiderActivity.netSentiment < 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                Net Distribution
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Buying</span>
            <span className="text-green-600 font-bold">
              {Option.match(insiderActivity.netBuyVolume, {
                onNone: () => <div className="h-4 w-16 bg-muted animate-pulse rounded" />,
                onSome: (v) => formatFinancialValue(v, "USD", 1, exchangeRates),
              })}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Selling</span>
            <span className="text-red-600 font-bold">
              {Option.match(insiderActivity.netSellVolume, {
                onNone: () => <div className="h-4 w-16 bg-muted animate-pulse rounded" />,
                onSome: (v) => formatFinancialValue(v, "USD", 1, exchangeRates),
              })}
            </span>
          </div>
          <Separator />
          <div className="text-xs text-muted-foreground">
            Latest:{" "}
            {Option.match(insiderActivity.latestTrade, {
              onNone: () => <span className="text-muted-foreground">No recent trades</span>,
              onSome: (t) => (
                <span className="text-foreground">
                  {t.name} {t.action} {t.shares.toLocaleString()} shares ({t.date})
                </span>
              ),
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
