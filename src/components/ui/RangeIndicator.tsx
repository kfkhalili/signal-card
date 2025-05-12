// src/components/ui/RangeIndicator.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { ClickableDataItem } from "@/components/ui/ClickableDataItem";

interface RangeBarStyling {
  bgColorClass: string;
  animationClass?: string;
}

function getRangeBarStyling(
  percentage: number,
  isAtHigh: boolean,
  isAtLow: boolean
): RangeBarStyling {
  if (isAtLow && percentage < 1) return { bgColorClass: "bg-slate-600" };
  if (isAtHigh && percentage > 99)
    return { bgColorClass: "bg-emerald-500", animationClass: "animate-pulse" };
  if (percentage <= 20) return { bgColorClass: "bg-slate-500" };
  if (percentage <= 40) return { bgColorClass: "bg-cyan-600" };
  if (percentage <= 60) return { bgColorClass: "bg-teal-500" };
  if (percentage <= 80) return { bgColorClass: "bg-emerald-400" };
  return { bgColorClass: "bg-emerald-500" };
}

export interface RangeIndicatorProps {
  currentValue: number | null | undefined;
  lowValue: number | null | undefined;
  highValue: number | null | undefined;
  lowLabel: string;
  highLabel: string;
  onLowLabelClick?: (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  onHighLabelClick?: (
    event:
      | React.MouseEvent<HTMLDivElement>
      | React.KeyboardEvent<HTMLDivElement>
  ) => void;
  lowValueForTitle?: number | null | undefined;
  highValueForTitle?: number | null | undefined;
  barHeightClassName?: string;
  labelClassName?: string;
  containerClassName?: string;
}

export const RangeIndicator: React.FC<RangeIndicatorProps> = ({
  currentValue,
  lowValue,
  highValue,
  lowLabel,
  highLabel,
  onLowLabelClick,
  onHighLabelClick,
  lowValueForTitle,
  highValueForTitle,
  barHeightClassName = "h-1.5",
  labelClassName = "text-xs text-muted-foreground",
  containerClassName,
}) => {
  let percentage = 0;
  let styling: RangeBarStyling = { bgColorClass: "bg-muted" }; // Default to muted if range is invalid
  let isAtHigh = false;
  let isAtLow = false;

  if (
    highValue != null &&
    lowValue != null &&
    currentValue != null &&
    highValue > lowValue
  ) {
    const range = highValue - lowValue;
    const position = currentValue - lowValue;
    percentage = Math.max(0, Math.min(100, (position / range) * 100));
    isAtHigh = currentValue >= highValue;
    isAtLow = currentValue <= lowValue;
    styling = getRangeBarStyling(percentage, isAtHigh, isAtLow);
  } else if (
    lowValue != null &&
    highValue != null &&
    currentValue != null &&
    lowValue >= highValue
  ) {
    // Handle invalid range where low >= high
    if (currentValue <= highValue) {
      // If current is at or below "high" (which is the lower bound in this invalid case)
      percentage = 0;
      isAtLow = true;
    } else if (currentValue >= lowValue) {
      // If current is at or above "low" (higher bound)
      percentage = 100;
      isAtHigh = true;
    } else {
      // current is between highValue and lowValue in an inverted range
      percentage = 50; // Or some other default, visually indicates issue
    }
    styling = getRangeBarStyling(percentage, isAtHigh, isAtLow);
  } else if (currentValue == null && lowValue != null && highValue != null) {
    // If current value is null but range exists, show empty bar
    percentage = 0;
    styling = { bgColorClass: "bg-muted" };
  }

  // Do not render the component if essential boundary values are missing
  if (lowValue == null || highValue == null) {
    return null;
  }

  return (
    <div className={cn(containerClassName)}>
      <div className={cn("flex justify-between mb-1", labelClassName)}>
        <ClickableDataItem
          title={lowValueForTitle != null ? lowValueForTitle.toFixed(2) : "N/A"}
          isInteractive={!!onLowLabelClick}
          onClickHandler={onLowLabelClick}
          baseClassName="p-0.5 rounded-sm relative"
          data-testid={`${lowLabel
            .toLowerCase()
            .replace(/\s+/g, "-")}-clickable`}
          aria-label={onLowLabelClick ? `Interact with ${lowLabel}` : undefined}
          data-interactive-child={!!onLowLabelClick}>
          {lowLabel}
        </ClickableDataItem>
        <ClickableDataItem
          title={
            highValueForTitle != null ? highValueForTitle.toFixed(2) : "N/A"
          }
          isInteractive={!!onHighLabelClick}
          onClickHandler={onHighLabelClick}
          baseClassName="p-0.5 rounded-sm relative"
          data-testid={`${highLabel
            .toLowerCase()
            .replace(/\s+/g, "-")}-clickable`}
          aria-label={
            onHighLabelClick ? `Interact with ${highLabel}` : undefined
          }
          data-interactive-child={!!onHighLabelClick}>
          {highLabel}
        </ClickableDataItem>
      </div>
      <div
        className={cn(
          "w-full bg-muted rounded-full pointer-events-none",
          barHeightClassName
        )}>
        <div
          className={cn(
            "rounded-full",
            barHeightClassName,
            styling.bgColorClass,
            styling.animationClass
          )}
          style={{ width: `${percentage}%` }}
          data-testid="range-indicator-bar-filled"
        />
      </div>
    </div>
  );
};
