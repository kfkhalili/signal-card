// src/components/symbol-analysis/ContrarianIndicatorsCard.tsx
"use client";

import { Option } from "effect";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatFinancialValue } from "@/lib/formatters";
import type { ContrarianIndicators, ValuationMetrics } from "@/lib/symbol-analysis/types";
import { MetricRow } from "./MetricRow";

interface ContrarianIndicatorsCardProps {
  contrarianIndicators: ContrarianIndicators;
  contrarianStatus: { status: string; color: string; borderColor: string };
  valuationMetrics: ValuationMetrics;
  exchangeRates: Record<string, number>;
}

export function ContrarianIndicatorsCard({
  contrarianIndicators,
  contrarianStatus,
  valuationMetrics,
  exchangeRates,
}: ContrarianIndicatorsCardProps) {
  return (
    <Card className={cn("border-l-4", contrarianStatus.borderColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Contrarian Indicators
            </CardTitle>
          </div>
          {contrarianStatus.status !== "Unknown" && (
            <Badge
              variant="outline"
              className={cn(
                contrarianStatus.status.includes("Bullish")
                  ? "bg-green-50 text-green-700 border-green-300"
                  : contrarianStatus.status.includes("Bearish")
                  ? "bg-red-50 text-red-700 border-red-300"
                  : "bg-yellow-50 text-yellow-700 border-yellow-300"
              )}
            >
              {contrarianStatus.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricRow
          label="Analyst Consensus"
          value={Option.match(contrarianIndicators.analystConsensus, {
            onNone: () => null,
            onSome: (s) => s,
          })}
        />
        <MetricRow
          label="Price Target"
          value={Option.match(contrarianIndicators.priceTarget, {
            onNone: () => null,
            onSome: (v) => formatFinancialValue(v, "USD", 2, exchangeRates),
          })}
          subtext={Option.match(contrarianIndicators.priceTarget, {
            onNone: () => "",
            onSome: (target) => {
              const current = Option.match(valuationMetrics.currentPrice, {
                onNone: () => 0,
                onSome: (p) => p,
              });
              if (current === 0) return "";
              const upside = ((target - current) / current) * 100;
              return `${upside >= 0 ? "+" : ""}${upside.toFixed(0)}% Upside`;
            },
          })}
        />
      </CardContent>
    </Card>
  );
}
