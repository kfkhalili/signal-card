// src/components/symbol-analysis/ScorecardItem.tsx
"use client";

import { cn } from "@/lib/utils";

interface ScorecardItemProps {
  icon: React.ReactNode;
  label: string;
  status: string;
  statusColor: string;
}

export function ScorecardItem({ icon, label, status, statusColor }: ScorecardItemProps) {
  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className={cn("font-bold text-lg truncate", statusColor)}>
        {status}
      </div>
    </div>
  );
}
