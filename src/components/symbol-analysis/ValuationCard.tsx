// src/components/symbol-analysis/ValuationCard.tsx
"use client";

import { Option } from "effect";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatFinancialValue } from "@/lib/formatters";
import type { ValuationMetrics } from "@/lib/symbol-analysis/types";
import { MetricRow } from "./MetricRow";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
} from "recharts";

interface ValuationCardProps {
  valuationMetrics: ValuationMetrics;
  valuationStatus: { status: string; color: string; borderColor: string };
  exchangeRates: Record<string, number>;
}

export function ValuationCard({
  valuationMetrics,
  valuationStatus,
  exchangeRates,
}: ValuationCardProps) {
  return (
    <Card className={cn("border-l-4", valuationStatus.borderColor)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Is it Cheap? (Valuation)
          </CardTitle>
          {valuationStatus.status !== "Unknown" && (
            <Badge
              variant="outline"
              className={cn(
                valuationStatus.status === "Undervalued" && "bg-green-50 text-green-700 border-green-300",
                valuationStatus.status === "Overvalued" && "bg-red-50 text-red-700 border-red-300",
                valuationStatus.status === "Fair" && "bg-yellow-50 text-yellow-700 border-yellow-300"
              )}
            >
              {valuationStatus.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DCF vs Price Chart */}
        <div className="h-48">
          {valuationMetrics.priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={valuationMetrics.priceHistory}>
                <XAxis
                  dataKey="date"
                  type="category"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    // Parse date string (YYYY-MM-DD) explicitly to avoid timezone issues
                    let date: Date;
                    if (typeof value === 'string') {
                      const parts = value.split('-');
                      if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const day = parseInt(parts[2], 10);
                        date = new Date(year, month - 1, day);
                      } else {
                        date = new Date(value);
                      }
                    } else if (value instanceof Date) {
                      const year = value.getUTCFullYear();
                      const month = value.getUTCMonth();
                      const day = value.getUTCDate();
                      date = new Date(year, month, day);
                    } else {
                      date = new Date(value);
                    }

                    if (isNaN(date.getTime())) {
                      return String(value);
                    }

                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    const year = String(date.getFullYear()).slice(-2);
                    return `Q${quarter}/${year}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip
                  formatter={(value: number) => value.toFixed(1)}
                  labelFormatter={(label, payload) => {
                    const dateStr = payload?.[0]?.payload?.date || label;
                    let date: Date;
                    if (typeof dateStr === 'string') {
                      const parts = dateStr.split('-');
                      if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const day = parseInt(parts[2], 10);
                        date = new Date(year, month - 1, day);
                      } else {
                        date = new Date(dateStr);
                      }
                    } else if (dateStr instanceof Date) {
                      const year = dateStr.getUTCFullYear();
                      const month = dateStr.getUTCMonth();
                      const day = dateStr.getUTCDate();
                      date = new Date(year, month, day);
                    } else {
                      date = new Date(dateStr);
                    }

                    if (isNaN(date.getTime())) {
                      return String(label);
                    }

                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dcf"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  stroke="hsl(var(--primary))"
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full bg-muted/20 rounded flex items-center justify-center border border-dashed">
              {Option.isSome(valuationMetrics.dcfFairValue) || Option.isSome(valuationMetrics.currentPrice) ? (
                <span className="text-sm text-muted-foreground">DCF vs Price Chart (Loading...)</span>
              ) : (
                <div className="space-y-2 w-full px-4">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <MetricRow
            label="DCF Fair Value"
            value={Option.match(valuationMetrics.dcfFairValue, {
              onNone: () => null,
              onSome: (v) => formatFinancialValue(v, "USD", 2, exchangeRates),
            })}
            subtext={Option.match(valuationMetrics.currentPrice, {
              onNone: () => "Calculating...",
              onSome: (p) => {
                const dcf = Option.match(valuationMetrics.dcfFairValue, {
                  onNone: () => 0,
                  onSome: (d) => d,
                });
                const upside = ((dcf - p) / p) * 100;
                return `Upside: ${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`;
              },
            })}
            highlight
          />
          <MetricRow
            label="P/E (TTM)"
            value={Option.match(valuationMetrics.peRatio, {
              onNone: () => null,
              onSome: (r) => r.toFixed(1) + "x",
            })}
            subtext="5yr Avg: 28.0x"
          />
          <MetricRow
            label="PEG Ratio"
            value={Option.match(valuationMetrics.pegRatio, {
              onNone: () => null,
              onSome: (v) => v.toFixed(1),
            })}
            subtext="Growth adjusted"
          />
        </div>
      </CardContent>
    </Card>
  );
}
