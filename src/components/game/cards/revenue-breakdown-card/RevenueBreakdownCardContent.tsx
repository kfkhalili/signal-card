// src/components/game/cards/revenue-breakdown-card/RevenueBreakdownCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  RevenueBreakdownCardData,
  SegmentRevenueDataItem,
} from "./revenue-breakdown-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface SegmentRowProps {
  segmentName: string;
  currentRevenue: number;
  yoyChange: number | null;
  currencySymbol: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

const SegmentRow: React.FC<SegmentRowProps> = ({
  segmentName,
  currentRevenue,
  yoyChange,
  currencySymbol,
  onClick,
  isInteractive,
}) => {
  let yoyDisplay: React.ReactNode = (
    <span className="text-muted-foreground">N/A</span>
  );
  let yoyColorClass = "text-muted-foreground";
  let IconComponent: React.ElementType | null = Minus;

  if (yoyChange !== null) {
    const yoyPercent = yoyChange * 100;
    if (yoyChange > 0) {
      yoyColorClass = "text-green-600 dark:text-green-500";
      IconComponent = ArrowUp;
      yoyDisplay = `+${yoyPercent.toFixed(1)}%`;
    } else if (yoyChange < 0) {
      yoyColorClass = "text-red-600 dark:text-red-500";
      IconComponent = ArrowDown;
      yoyDisplay = `${yoyPercent.toFixed(1)}%`;
    } else {
      // yoyChange === 0
      yoyColorClass = "text-muted-foreground";
      IconComponent = Minus; // Or null if no icon for 0%
      yoyDisplay = `0.0%`;
    }
  } else if (currentRevenue > 0) {
    yoyDisplay = <span className="text-blue-600 dark:text-blue-500">New</span>;
    IconComponent = null;
    yoyColorClass = "text-blue-600 dark:text-blue-500";
  }

  return (
    <div
      className={cn(
        "flex justify-between items-center py-1.5 border-b border-border/50 last:border-b-0",
        isInteractive && onClick
          ? "cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20"
          : ""
      )}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
            }
          : undefined
      }
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      title={`${segmentName}: ${currencySymbol}${formatNumberWithAbbreviations(
        currentRevenue,
        2
      )} (YoY: ${
        yoyChange !== null ? (yoyChange * 100).toFixed(1) + "%" : "N/A"
      })`}>
      <span className="text-xs sm:text-sm font-medium text-foreground truncate pr-2">
        {segmentName}
      </span>
      <div className="flex items-baseline space-x-2 sm:space-x-3">
        <span
          className={`text-xs sm:text-sm font-semibold ${yoyColorClass} flex items-center min-w-[50px] justify-end`}>
          {IconComponent && <IconComponent className="h-3 w-3 mr-0.5" />}
          {yoyDisplay}
        </span>
        <span className="text-xs sm:text-sm font-bold text-foreground min-w-[70px] text-right">
          {currencySymbol}
          {formatNumberWithAbbreviations(currentRevenue, 2)}
        </span>
      </div>
    </div>
  );
};

interface RevenueBreakdownCardContentProps {
  cardData: RevenueBreakdownCardData;
  isBackFace: boolean;
  // onGenericInteraction: OnGenericInteraction;
}

export const RevenueBreakdownCardContent: React.FC<RevenueBreakdownCardContentProps> =
  React.memo(({ cardData, isBackFace }) => {
    const { staticData, liveData, symbol, companyName, backData } = cardData;

    if (isBackFace) {
      return (
        <div
          data-testid={`revenuebreakdown-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2 px-1 leading-relaxed">
              {backData.description ||
                `Revenue breakdown details for ${companyName || symbol}.`}
            </CardDescription>
            <div className="text-xs text-muted-foreground px-1 space-y-0.5">
              <p>
                <strong>Latest Period:</strong> {staticData.latestPeriodLabel}
              </p>
              {staticData.previousPeriodLabel && (
                <p>
                  <strong>Comparison Period:</strong>{" "}
                  {staticData.previousPeriodLabel}
                </p>
              )}
              <p>
                <strong>Currency:</strong> {staticData.currencySymbol}
              </p>
              <p>
                <strong>Last Updated:</strong>{" "}
                {liveData.lastUpdated
                  ? new Date(liveData.lastUpdated).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            {/* Optionally, list ALL segments here if desired for the back face */}
          </ShadCardContent>
        </div>
      );
    }

    // Front Face
    const allSegments = liveData.breakdown || [];
    const top5Segments = allSegments.slice(0, 5);
    const otherSegments = allSegments.slice(5);

    let othersData: SegmentRevenueDataItem | null = null;
    if (otherSegments.length > 0) {
      const othersCurrentRevenue = otherSegments.reduce(
        (sum, seg) => sum + seg.currentRevenue,
        0
      );
      const othersPreviousRevenueSum = otherSegments.reduce(
        (sum, seg) => sum + (seg.previousRevenue ?? 0),
        0
      );
      // Check if there were any previous revenues at all for the "Others" category
      const anyPreviousRevenueExistsForOthers = otherSegments.some(
        (seg) => seg.previousRevenue !== null
      );

      let yoyChangeForOthers: number | null = null;
      if (anyPreviousRevenueExistsForOthers && othersPreviousRevenueSum > 0) {
        yoyChangeForOthers =
          (othersCurrentRevenue - othersPreviousRevenueSum) /
          othersPreviousRevenueSum;
      } else if (
        anyPreviousRevenueExistsForOthers &&
        othersPreviousRevenueSum === 0 &&
        othersCurrentRevenue > 0
      ) {
        yoyChangeForOthers = null; // Will be treated as "New" by SegmentRow if current is > 0
      } else if (
        !anyPreviousRevenueExistsForOthers &&
        othersCurrentRevenue > 0
      ) {
        yoyChangeForOthers = null; // All underlying segments are new, so "Others" is new.
      }

      othersData = {
        segmentName: "Others",
        currentRevenue: othersCurrentRevenue,
        previousRevenue: anyPreviousRevenueExistsForOthers
          ? othersPreviousRevenueSum
          : null,
        yoyChange: yoyChangeForOthers,
      };
    }

    const displayItems = [...top5Segments];
    if (othersData && othersData.currentRevenue > 0) {
      // Only add "Others" if it has revenue
      displayItems.push(othersData);
    }

    return (
      <div
        data-testid={`revenuebreakdown-card-front-${symbol}`}
        className="pointer-events-auto flex flex-col h-full">
        <ShadCardContent className="pt-1 pb-1 px-0 flex-grow flex flex-col">
          <div className="text-center mb-2">
            <Badge variant="outline" className="text-xs sm:text-sm px-2 py-0.5">
              Revenue Breakdown
            </Badge>
          </div>
          <div className="flex justify-between items-baseline mb-2 px-0.5">
            <span className="text-xs text-muted-foreground">
              {staticData.latestPeriodLabel}
            </span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">
                Total Revenue
              </span>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                {staticData.currencySymbol}
                {liveData.totalRevenueLatestPeriod !== null
                  ? formatNumberWithAbbreviations(
                      liveData.totalRevenueLatestPeriod,
                      2
                    )
                  : "N/A"}
              </span>
            </div>
          </div>
          <div className="flex-grow space-y-0 overflow-y-auto pr-1">
            {displayItems.length > 0 ? (
              displayItems.map((item) => (
                <SegmentRow
                  key={item.segmentName}
                  segmentName={item.segmentName}
                  currentRevenue={item.currentRevenue}
                  yoyChange={item.yoyChange}
                  currencySymbol={staticData.currencySymbol}
                  isInteractive={false}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No breakdown data available.
              </p>
            )}
          </div>
        </ShadCardContent>
      </div>
    );
  });

RevenueBreakdownCardContent.displayName = "RevenueBreakdownCardContent";
