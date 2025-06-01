// src/components/game/cards/analyst-grades-card/AnalystGradesCardContent.tsx
import React from "react";
import { CardContent as ShadCardContent } from "@/components/ui/card";
import type {
  AnalystGradesCardData,
  AnalystRatingDetail,
} from "./analyst-grades-card.types";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, MinusCircle } from "lucide-react";

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
}

const RatingDetailRow: React.FC<RatingDetailRowProps> = ({
  detail,
  totalAnalysts,
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
    <div className="flex items-center justify-between text-xs py-0.5">
      <div className="flex items-center">
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
  // onGenericInteraction: OnGenericInteraction; // Add if needed for interactions
}

export const AnalystGradesCardContent: React.FC<AnalystGradesCardContentProps> =
  React.memo(({ cardData, isBackFace }) => {
    const { staticData, liveData, symbol } = cardData;

    if (isBackFace) {
      return (
        <div
          data-testid={`analystgrades-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className={cn("p-0 flex-grow text-xs")}>
            <div className="space-y-1 pt-1.5">
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Current Period:
                  </span>
                  <span className="font-semibold text-foreground">
                    {staticData.currentPeriodDate}
                  </span>
                </div>
                {staticData.previousPeriodDate && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">
                      Previous Period:
                    </span>
                    <span className="font-semibold text-foreground">
                      {staticData.previousPeriodDate}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">
                    Total Analysts (Current):
                  </span>
                  <span className="font-semibold text-foreground">
                    {liveData.totalAnalystsCurrent}
                  </span>
                </div>
                {liveData.totalAnalystsPrevious !== null && (
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">
                      Total Analysts (Previous):
                    </span>
                    <span className="font-semibold text-foreground">
                      {liveData.totalAnalystsPrevious}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </ShadCardContent>
        </div>
      );
    }

    // Front Face
    const { ratingsDistribution, totalAnalystsCurrent, consensusLabelCurrent } =
      liveData;
    const barHeight = "h-5 sm:h-6";

    return (
      <div
        data-testid={`analystgrades-card-front-${symbol}`}
        className="pointer-events-auto flex flex-col h-full">
        <ShadCardContent className={cn("p-0 flex-grow flex flex-col")}>
          <div className="space-y-1">
            <div className="text-center mt-0.5 mb-1.5">
              <p className="text-xs text-muted-foreground">
                {staticData.currentPeriodDate}
              </p>
              <p className="text-base font-semibold">{consensusLabelCurrent}</p>
              <p className="text-xs text-muted-foreground">
                Based on {totalAnalystsCurrent} Analysts
              </p>
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
            <div className="space-y-0.5 flex-grow overflow-y-auto">
              {ratingsDistribution.map((detail) => (
                <RatingDetailRow
                  key={detail.category}
                  detail={detail}
                  totalAnalysts={totalAnalystsCurrent}
                />
              ))}
            </div>
          </div>
        </ShadCardContent>
      </div>
    );
  });

AnalystGradesCardContent.displayName = "AnalystGradesCardContent";
