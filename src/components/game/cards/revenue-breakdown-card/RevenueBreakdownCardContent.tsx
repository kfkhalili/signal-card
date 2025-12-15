// src/components/game/cards/revenue-breakdown-card/RevenueBreakdownCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type {
  RevenueBreakdownCardData,
  SegmentRevenueDataItem,
} from "./revenue-breakdown-card.types";
import { cn } from "@/lib/utils";
import { formatNumberWithAbbreviations } from "@/lib/formatters";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import {
  CheckboxCheckedIcon,
  CheckboxUncheckedIcon,
} from "@/components/ui/CheckboxIcons";

interface SegmentRowProps {
  segmentName: string;
  currentRevenue: number;
  yoyChange: number | null;
  currencySymbol: string;
  onClick?: () => void;
  isInteractive?: boolean;
  // NEW PROPS
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const SegmentRow: React.FC<SegmentRowProps> = ({
  segmentName,
  currentRevenue,
  yoyChange,
  currencySymbol,
  onClick,
  isInteractive,
  // NEW PROPS
  isSelectionMode = false,
  isSelected = false,
  onSelect,
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
      yoyColorClass = "text-muted-foreground";
      IconComponent = Minus;
      yoyDisplay = `0.0%`;
    }
  } else if (currentRevenue > 0) {
    yoyDisplay = <span className="text-blue-600 dark:text-blue-500">New</span>;
    IconComponent = null;
    yoyColorClass = "text-blue-600 dark:text-blue-500";
  }

  const effectiveClickHandler = isSelectionMode ? onSelect : onClick;
  const effectiveIsInteractive = isSelectionMode || isInteractive;

  return (
    <div
      className={cn(
        "flex justify-between items-center py-1 border-b border-border/50 last:border-b-0 px-1 rounded-md transition-colors",
        effectiveIsInteractive &&
          "hover:bg-primary/10 data-[interactive-child=true]:hover:bg-primary/10",
        isSelected && "bg-primary/20"
      )}
      onClick={effectiveIsInteractive ? effectiveClickHandler : undefined}
      onKeyDown={
        effectiveIsInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.click();
              }
            }
          : undefined
      }
      role={effectiveIsInteractive ? "button" : undefined}
      tabIndex={effectiveIsInteractive ? 0 : undefined}
      title={`${segmentName}: ${currencySymbol}${formatNumberWithAbbreviations(
        currentRevenue,
        2
      )} (YoY: ${
        yoyChange !== null ? (yoyChange * 100).toFixed(1) + "%" : "N/A"
      })`}>
      <div className="flex items-center min-w-0">
        {isSelectionMode && (
          <div className="mr-2 shrink-0">
            {isSelected ? (
              <CheckboxCheckedIcon className="text-primary" />
            ) : (
              <CheckboxUncheckedIcon className="text-muted-foreground" />
            )}
          </div>
        )}
        <span className="text-sm font-medium text-muted-foreground truncate pr-2">
          {segmentName}
        </span>
      </div>
      <div className="flex items-baseline space-x-2 sm:space-x-3">
        <span
          className={`text-sm font-semibold ${yoyColorClass} flex items-center min-w-[60px] justify-end`}>
          {IconComponent && <IconComponent className="h-3.5 w-3.5 mr-0.5" />}
          {yoyDisplay}
        </span>
        <span className="text-sm font-semibold text-foreground min-w-[80px] text-right">
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
  // onGenericInteraction: OnGenericInteraction; // Keep for future use
  // NEW PROPS
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const RevenueBreakdownCardContent: React.FC<RevenueBreakdownCardContentProps> =
  React.memo(
    ({
      cardData,
      isBackFace,
      isSelectionMode,
      selectedDataItems,
      onToggleItemSelection,
    }) => {
      const { staticData, liveData, symbol, id } = cardData;

      const generateItemId = (label: string) =>
        `${id}-${label.toLowerCase().replace(/\s|\//g, "-")}`;

      const isSelected = (itemId: string) =>
        selectedDataItems.some((item) => item.id === itemId);

      const onSelect = (item: Omit<SelectedDataItem, "id">) => {
        const fullItem: SelectedDataItem = {
          id: generateItemId(item.label),
          ...item,
        };
        onToggleItemSelection(fullItem);
      };

      if (isBackFace) {
        return (
          <div
            data-testid={`revenuebreakdown-card-back-${symbol}`}
            className="pointer-events-auto flex flex-col h-full">
            <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
              <div className="space-y-1 pt-1.5">
                {staticData.latestPeriodLabel && staticData.latestPeriodLabel !== "N/A" && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">
                      Latest Period:
                    </span>
                    <span className="font-semibold text-foreground">
                      {staticData.latestPeriodLabel}
                    </span>
                  </div>
                )}
                {staticData.previousPeriodLabel && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">
                      Comparison Period:
                    </span>
                    <span className="font-semibold text-foreground">
                      {staticData.previousPeriodLabel}
                    </span>
                  </div>
                )}
                {liveData.lastUpdated && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">
                      Last Updated:
                    </span>
                    <span className="font-semibold text-foreground">
                      {new Date(liveData.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
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
        const previousRevenueExistsForOthers = otherSegments.some(
          (seg) => seg.previousRevenue !== null
        );

        let yoyChangeForOthers: number | null = null;
        if (previousRevenueExistsForOthers && othersPreviousRevenueSum > 0) {
          yoyChangeForOthers =
            (othersCurrentRevenue - othersPreviousRevenueSum) /
            othersPreviousRevenueSum;
        }

        othersData = {
          segmentName: "Others",
          currentRevenue: othersCurrentRevenue,
          previousRevenue: previousRevenueExistsForOthers
            ? othersPreviousRevenueSum
            : null,
          yoyChange: yoyChangeForOthers,
        };
      }

      const displayItems = [...top5Segments];
      if (othersData && othersData.currentRevenue > 0) {
        displayItems.push(othersData);
      }

      return (
        <div
          data-testid={`revenuebreakdown-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1.5">
              <div
                className={cn(
                  "flex justify-between items-baseline mb-1.5 p-1 rounded-md transition-colors",
                  isSelectionMode && "hover:bg-primary/10 cursor-pointer",
                  isSelected(
                    generateItemId(
                      `Total Revenue (${staticData.latestPeriodLabel})`
                    )
                  ) && "bg-primary/20"
                )}
                onClick={
                  isSelectionMode
                    ? () =>
                        onSelect({
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: `Total Revenue (${staticData.latestPeriodLabel})`,
                          value: liveData.totalRevenueLatestPeriod,
                          isMonetary: true,
                          currency: staticData.currencySymbol,
                        })
                    : undefined
                }
                onKeyDown={isSelectionMode ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect({
                      sourceCardId: id,
                      sourceCardSymbol: symbol,
                      label: `Total Revenue (${staticData.latestPeriodLabel})`,
                      value: liveData.totalRevenueLatestPeriod,
                      isMonetary: true,
                      currency: staticData.currencySymbol,
                    });
                  }
                } : undefined}
                role={isSelectionMode ? "button" : undefined}
                tabIndex={isSelectionMode ? 0 : undefined}>
                <span className="text-sm font-medium text-muted-foreground block">
                  Total Revenue
                </span>
                {liveData.totalRevenueLatestPeriod != null && (
                  <div className="text-right">
                    <span className="text-xl font-bold sm:text-2xl text-foreground">
                      {staticData.currencySymbol}
                      {formatNumberWithAbbreviations(
                        liveData.totalRevenueLatestPeriod,
                        2
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-grow space-y-0.5 overflow-y-auto pr-0.5">
                {displayItems.length > 0 ? (
                  displayItems.map((item) => {
                    const itemLabel = `${item.segmentName} Revenue`;
                    const itemId = generateItemId(itemLabel);
                    return (
                      <SegmentRow
                        key={item.segmentName}
                        segmentName={item.segmentName}
                        currentRevenue={item.currentRevenue}
                        yoyChange={item.yoyChange}
                        currencySymbol={staticData.currencySymbol}
                        isInteractive={isSelectionMode} // A segment row is only interactive in selection mode
                        isSelectionMode={isSelectionMode}
                        isSelected={isSelected(itemId)}
                        onSelect={() =>
                          onSelect({
                            sourceCardId: id,
                            sourceCardSymbol: symbol,
                            label: itemLabel,
                            value: item.currentRevenue,
                            isMonetary: true,
                            currency: staticData.currencySymbol,
                          })
                        }
                      />
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No breakdown data available.
                  </p>
                )}
              </div>
            </div>
          </ShadCardContent>
        </div>
      );
    }
  );

RevenueBreakdownCardContent.displayName = "RevenueBreakdownCardContent";