// src/components/symbol-analysis/QualityCard.tsx
"use client";

import { Option } from "effect";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QualityMetrics } from "@/lib/symbol-analysis/types";
import { MetricRow } from "./MetricRow";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

interface QualityCardProps {
  qualityMetrics: QualityMetrics;
  qualityStatus: { status: string; color: string; borderColor: string };
}

export function QualityCard({
  qualityMetrics,
  qualityStatus,
}: QualityCardProps) {
  return (
    <Card className={cn("border-l-4", qualityStatus.borderColor)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Is the Business Good? (Quality)
          </CardTitle>
          {qualityStatus.status !== "Unknown" && (
            <Badge variant="outline" className={qualityStatus.color}>
              {qualityStatus.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <MetricRow
            label="ROIC"
            value={Option.match(qualityMetrics.roic, {
              onNone: () => null,
              onSome: (v) => (v * 100).toFixed(1) + "%",
            })}
            subtext="Return on Invested Capital"
            highlight
          />
          <MetricRow
            label="Gross Margin"
            value={Option.match(qualityMetrics.grossMargin, {
              onNone: () => null,
              onSome: (m) => (m * 100).toFixed(1) + "%",
            })}
            subtext="Pricing Power"
          />
          <MetricRow
            label="FCF Yield"
            value={Option.match(qualityMetrics.fcfYield, {
              onNone: () => null,
              onSome: (v) => (v * 100).toFixed(1) + "%",
            })}
            subtext="Cash generation"
          />
          <MetricRow
            label="WACC"
            value={Option.match(qualityMetrics.wacc, {
              onNone: () => null,
              onSome: (v) => (v * 100).toFixed(1) + "%",
            })}
            subtext="Cost of Capital (Equity-only)"
          />
        </div>
        {/* ROIC vs WACC Trend Chart */}
        <div className="h-48">
          {qualityMetrics.roicHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={qualityMetrics.roicHistory}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <XAxis
                  dataKey="dateLabel"
                  type="category"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => String(value)}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.toFixed(1) + "%"}
                />
                <Tooltip
                  formatter={(value: number) => value.toFixed(1) + "%"}
                  labelFormatter={(label, payload) => {
                    const dateStr = payload?.[0]?.payload?.date;
                    if (!dateStr) return String(label);

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
                <Line
                  type="monotone"
                  dataKey="roic"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="wacc"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full bg-muted/20 rounded flex items-center justify-center border border-dashed">
              {Option.isNone(qualityMetrics.roic) && Option.isNone(qualityMetrics.wacc) ? (
                <div className="space-y-2 w-full px-4">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">ROIC vs WACC Trend (Loading...)</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
