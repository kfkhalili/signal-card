// src/components/ui/Histogram.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";

interface HistogramBarProps {
  label: string;
  value: number;
  maxValue: number;
  currencySymbol: string;
  isEstimate?: boolean;
}

const HistogramBar: React.FC<HistogramBarProps> = ({
  label,
  value,
  maxValue,
  currencySymbol,
  isEstimate = false,
}) => {
  const barHeightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const barColor = isEstimate ? "bg-primary/50" : "bg-primary";

  return (
    <div
      className="flex flex-col items-center w-full px-1"
      title={`${label}: ${currencySymbol}${formatNumberWithAbbreviations(
        value,
        1
      )}`}>
      <span className="text-[10px] font-semibold text-foreground">
        {currencySymbol}
        {formatNumberWithAbbreviations(value, 1)}
      </span>
      <div
        className={cn(
          "w-full h-10 bg-muted rounded flex items-end mt-1",
          isEstimate && "border-2 border-primary/50 border-dashed"
        )}>
        <div
          className={cn("w-full rounded-t", barColor)}
          style={{ height: `${barHeightPercentage}%` }}
        />
      </div>
      <span className="text-xs mt-1 text-muted-foreground">{label}</span>
    </div>
  );
};

export interface HistogramDataPoint {
  label: string;
  value: number;
  isEstimate?: boolean;
}

interface HistogramProps {
  data: readonly HistogramDataPoint[];
  currencySymbol?: string | null;
  className?: string;
}

export const Histogram: React.FC<HistogramProps> = ({
  data,
  currencySymbol,
  className,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-4">
        No historical data available.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const displayCurrencySymbol = currencySymbol ?? "$";

  return (
    <div className={cn("flex justify-around items-end h-16", className)}>
      {data.map((item) => (
        <HistogramBar
          key={item.label}
          label={item.label}
          value={item.value}
          maxValue={maxValue}
          currencySymbol={displayCurrencySymbol}
          isEstimate={item.isEstimate}
        />
      ))}
    </div>
  );
};
