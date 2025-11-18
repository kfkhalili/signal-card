// src/components/game/cards/analyst-grades-card/AnalystGradesCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type {
  AnalystGradesCardData,
  AnalystRatingDetail,
} from "./analyst-grades-card.types";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, MinusCircle } from "lucide-react";
import type { SelectedDataItem } from "@/hooks/useWorkspaceManager";
import {
  CheckboxCheckedIcon,
  CheckboxUncheckedIcon,
} from "@/components/ui/CheckboxIcons";

interface RatingBarSegmentProps {
  percentage: number;
  colorClass: string;
  label: string;
}
const RatingBarSegment: React.FC<RatingBarSegmentProps> = ({
  percentage,
  colorClass,
  label,
}) => (
  <div
    style={{ width: `${percentage}%` }}
    className={cn(
      "h-full flex items-center justify-center overflow-hidden",
      colorClass
    )}
    title={label}></div>
);

interface RatingDetailRowProps {
  detail: AnalystRatingDetail;
  totalAnalysts: number;
  // NEW PROPS
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const RatingDetailRow: React.FC<RatingDetailRowProps> = ({
  detail,
  totalAnalysts,
  // NEW PROPS
  isSelectionMode,
  isSelected,
  onSelect,
}) => {
  const percentage =
    totalAnalysts > 0 ? (detail.currentValue / totalAnalysts) * 100 : 0;
  let ChangeIcon = MinusCircle;
  let changeColorClass = "text-muted-foreground";
  let changeText = "None";

  if (detail.change !== null && detail.change !== 0) {
    if (detail.change > 0) {
      ChangeIcon = ArrowUp;
      changeColorClass = "text-green-600 dark:text-green-500";
      changeText = `+${detail.change}`;
    } else {
      ChangeIcon = ArrowDown;
      changeColorClass = "text-red-600 dark:text-red-500";
      changeText = `${detail.change}`;
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between text-xs py-0.5 px-1 rounded-md transition-colors",
        isSelectionMode && "hover:bg-primary/10 cursor-pointer",
        isSelected && "bg-primary/20"
      )}
      onClick={isSelectionMode ? onSelect : undefined}
      role={isSelectionMode ? "button" : undefined}
      tabIndex={isSelectionMode ? 0 : undefined}>
      <div className="flex items-center">
        {isSelectionMode && (
          <div className="mr-2 shrink-0">
            {isSelected ? (
              <CheckboxCheckedIcon className="text-primary" />
            ) : (
              <CheckboxUncheckedIcon className="text-muted-foreground" />
            )}
          </div>
        )}
        <div
          className={cn(
            "w-2 h-2 rounded-full mr-1.5 shrink-0",
            detail.colorClass
          )}
        />
        <span className="text-xs font-medium text-muted-foreground min-w-[70px] sm:min-w-[80px]">
          {detail.label}:
        </span>
        <span className="text-xs font-semibold text-foreground mx-1">
          {detail.currentValue}
        </span>
        <span className="text-xs text-muted-foreground">
          ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div
        className={cn(
          "flex items-center min-w-[45px] justify-end",
          changeColorClass
        )}>
        <ChangeIcon className="w-3 h-3 mr-0.5 shrink-0" />
        <span className="font-medium text-[11px]">{changeText}</span>
      </div>
    </div>
  );
};

interface AnalystGradesCardContentProps {
  cardData: AnalystGradesCardData;
  isBackFace: boolean;
  isSelectionMode: boolean;
  selectedDataItems: SelectedDataItem[];
  onToggleItemSelection: (item: SelectedDataItem) => void;
}

export const AnalystGradesCardContent: React.FC<AnalystGradesCardContentProps> =
  React.memo(
    ({
      cardData,
      isBackFace,
      isSelectionMode,
      selectedDataItems,
      onToggleItemSelection,
    }) => {
      const { staticData, liveData, symbol, id } = cardData;

      const isSelected = (itemId: string) =>
        selectedDataItems.some((item) => item.id === itemId);

      const onSelect = (item: Omit<SelectedDataItem, "id">) => {
        const fullItem: SelectedDataItem = {
          id: `${id}-${item.label.toLowerCase().replace(/\s/g, "-")}`,
          ...item,
        };
        onToggleItemSelection(fullItem);
      };

      if (isBackFace) {
        // For this card, the back face has informational text that can be selected as a whole.
        const backItems = [
          {
            label: "Current Period",
            value: staticData.currentPeriodDate,
          },
          {
            label: "Previous Period",
            value: staticData.previousPeriodDate,
          },
          {
            label: "Total Analysts (Current)",
            value: liveData.totalAnalystsCurrent,
          },
          {
            label: "Total Analysts (Previous)",
            value: liveData.totalAnalystsPrevious,
          },
        ];

        return (
          <div
            data-testid={`analystgrades-card-back-${symbol}`}
            className="pointer-events-auto flex flex-col h-full">
            <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
              <div className="space-y-1 pt-1.5">
                {backItems.map(
                  (item) =>
                    item.value != null && (
                      <div
                        key={item.label}
                        className={cn(
                          "flex justify-between p-1 rounded-md transition-colors",
                          isSelectionMode &&
                            "hover:bg-primary/10 cursor-pointer",
                          isSelected(`${id}-${item.label}`) && "bg-primary/20"
                        )}
                        onClick={
                          isSelectionMode
                            ? () =>
                                onSelect({
                                  ...item,
                                  sourceCardId: id,
                                  sourceCardSymbol: symbol,
                                })
                            : undefined
                        }>
                        <span className="font-medium text-muted-foreground">
                          {item.label}:
                        </span>
                        <span className="font-semibold text-foreground">
                          {item.value}
                        </span>
                      </div>
                    )
                )}
              </div>
            </ShadCardContent>
          </div>
        );
      }

      // Front Face
      const {
        ratingsDistribution,
        totalAnalystsCurrent,
        consensusLabelCurrent,
      } = liveData;
      const barHeight = "h-5 sm:h-6";

      // Don't render if there's no data
      if (totalAnalystsCurrent === 0 || !staticData.currentPeriodDate || staticData.currentPeriodDate === "N/A") {
        return (
          <div
            data-testid={`analystgrades-card-front-${symbol}`}
            className="pointer-events-auto flex flex-col h-full">
            <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
              <p className="text-sm text-muted-foreground text-center py-4">
                No analyst grades data available.
              </p>
            </ShadCardContent>
          </div>
        );
      }

      return (
        <div
          data-testid={`analystgrades-card-front-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
            <div className="space-y-1">
              <div
                className={cn(
                  "text-center mt-0.5 mb-1.5 p-1 rounded-md transition-colors",
                  isSelectionMode && "hover:bg-primary/10 cursor-pointer",
                  isSelected(`${id}-consensus`) && "bg-primary/20"
                )}
                onClick={
                  isSelectionMode
                    ? () =>
                        onSelect({
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: "Analyst Consensus",
                          value: consensusLabelCurrent,
                        })
                    : undefined
                }>
                {staticData.currentPeriodDate && staticData.currentPeriodDate !== "N/A" && (
                  <p className="text-xs text-muted-foreground">
                    {staticData.currentPeriodDate}
                  </p>
                )}
                {consensusLabelCurrent && consensusLabelCurrent !== "N/A" && (
                  <p className="text-base font-semibold">
                    {consensusLabelCurrent}
                  </p>
                )}
                {totalAnalystsCurrent > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Based on {totalAnalystsCurrent} Analysts
                  </p>
                )}
              </div>
              {totalAnalystsCurrent > 0 && (
                <div
                  className={cn(
                    "flex w-full rounded-full overflow-hidden shadow my-1.5",
                    barHeight
                  )}>
                  {ratingsDistribution.toReversed().map((detail) => {
                    const percentage =
                      (detail.currentValue / totalAnalystsCurrent) * 100;
                    if (percentage === 0) return null;
                    return (
                      <RatingBarSegment
                        key={detail.category}
                        percentage={percentage}
                        colorClass={detail.colorClass}
                        label={`${detail.label}: ${
                          detail.currentValue
                        } (${percentage.toFixed(0)}%)`}
                      />
                    );
                  })}
                </div>
              )}
              {totalAnalystsCurrent > 0 && (
                <div className="space-y-0.5 flex-grow overflow-y-auto">
                  {ratingsDistribution.map((detail) => (
                    <RatingDetailRow
                      key={detail.category}
                      detail={detail}
                      totalAnalysts={totalAnalystsCurrent}
                      isSelectionMode={isSelectionMode}
                      isSelected={isSelected(`${id}-${detail.label}`)}
                      onSelect={() =>
                        onSelect({
                          sourceCardId: id,
                          sourceCardSymbol: symbol,
                          label: `${detail.label} Ratings`,
                          value: detail.currentValue,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </ShadCardContent>
        </div>
      );
    }
  );

AnalystGradesCardContent.displayName = "AnalystGradesCardContent";
