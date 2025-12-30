// src/components/symbol-analysis/SafetyCard.tsx
"use client";

import { Option } from "effect";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SafetyMetrics } from "@/lib/symbol-analysis/types";

interface SafetyCardProps {
  safetyMetrics: SafetyMetrics;
  safetyStatus: { status: string; color: string; borderColor: string };
}

export function SafetyCard({
  safetyMetrics,
  safetyStatus,
}: SafetyCardProps) {
  return (
    <Card className={cn("border-l-4", safetyStatus.borderColor)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Is it Safe? (Balance Sheet)
          </CardTitle>
          {safetyStatus.status !== "Unknown" && (
            <Badge variant="outline" className={safetyStatus.color}>
              {safetyStatus.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex justify-between gap-4">
        <div className="flex-1 text-center p-4 border rounded">
          <div className="text-muted-foreground text-sm mb-1">Net Debt / EBITDA</div>
          {Option.match(safetyMetrics.netDebtToEbitda, {
            onNone: () => (
              <div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto mb-1" />
            ),
            onSome: (v) => (
              <div className={cn(
                "text-2xl font-bold",
                v < 3 ? "text-green-600" : v < 5 ? "text-yellow-600" : "text-red-600"
              )}>
                {v.toFixed(1)}x
              </div>
            ),
          })}
          <div className="text-xs text-muted-foreground">Safe (&lt; 3.0x)</div>
        </div>
        <div className="flex-1 text-center p-4 border rounded">
          <div className="text-muted-foreground text-sm mb-1">Altman Z-Score</div>
          {Option.match(safetyMetrics.altmanZScore, {
            onNone: () => (
              <div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto mb-1" />
            ),
            onSome: (v) => (
              <div className={cn(
                "text-2xl font-bold",
                v > 3 ? "text-green-600" : v > 2.7 ? "text-yellow-600" : "text-red-600"
              )}>
                {v.toFixed(1)}
              </div>
            ),
          })}
          <div className="text-xs text-muted-foreground">Safe Zone</div>
        </div>
        <div className="flex-1 text-center p-4 border rounded">
          <div className="text-muted-foreground text-sm mb-1">Interest Coverage</div>
          {Option.match(safetyMetrics.interestCoverage, {
            onNone: () => (
              <div className="h-8 w-20 bg-muted animate-pulse rounded mx-auto mb-1" />
            ),
            onSome: (v) => (
              <div className={cn(
                "text-2xl font-bold",
                v >= 999 ? "text-green-600" : v > 10 ? "text-green-600" : v > 5 ? "text-yellow-600" : "text-red-600"
              )}>
                {v >= 999 ? "∞" : v.toFixed(0) + "x"}
              </div>
            ),
          })}
          <div className="text-xs text-muted-foreground">
            {Option.match(safetyMetrics.interestCoverage, {
              onNone: () => "Can pay debts",
              onSome: (v) => v >= 999 ? "No interest expense" : "Can pay debts",
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
