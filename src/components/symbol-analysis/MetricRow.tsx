// src/components/symbol-analysis/MetricRow.tsx
"use client";

import { cn } from "@/lib/utils";

interface MetricRowProps {
  label: string;
  value: string | null;
  subtext?: string;
  highlight?: boolean;
}

export function MetricRow({ label, value, subtext, highlight }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {subtext && <div className="text-xs text-muted-foreground/70">{subtext}</div>}
      </div>
      <div className={cn("text-base font-medium", highlight && "text-xl font-bold text-primary")}>
        {value || <div className="h-4 w-16 bg-muted animate-pulse rounded" />}
      </div>
    </div>
  );
}
