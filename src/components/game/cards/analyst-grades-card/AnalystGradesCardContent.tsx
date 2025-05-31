// src/components/game/cards/analyst-grades-card/AnalystGradesCardContent.tsx
import React from "react";
import {
  CardDescription,
  CardContent as ShadCardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    title={label}>
    {/* Content inside segment if needed, e.g., for very large segments */}
  </div>
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
        <span className="text-muted-foreground min-w-[60px]">
          {detail.label}:
        </span>
        <span className="font-semibold text-foreground mx-1">
          {detail.currentValue}
        </span>
        <span className="text-muted-foreground text-[10px]">
          ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div
        className={cn(
          "flex items-center min-w-[40px] justify-end",
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
    const { staticData, liveData, symbol, companyName, backData } = cardData;

    if (isBackFace) {
      return (
        <div
          data-testid={`analystgrades-card-back-${symbol}`}
          className="pointer-events-auto flex flex-col h-full">
          <ShadCardContent className="pt-1 pb-2 px-0 space-y-1.5 flex-grow">
            <CardDescription className="text-xs text-center text-muted-foreground/90 mb-2 px-1 leading-relaxed">
              {backData.description ||
                `Analyst grade details for ${companyName || symbol}.`}
            </CardDescription>
            <div className="text-xs text-muted-foreground px-1 space-y-1">
              <p>
                <strong>Current Period:</strong> {staticData.currentPeriodDate}
              </p>
              {staticData.previousPeriodDate && (
                <p>
                  <strong>Previous Period:</strong>{" "}
                  {staticData.previousPeriodDate}
                </p>
              )}
              <p>
                <strong>Total Analysts (Current):</strong>{" "}
                {liveData.totalAnalystsCurrent}
              </p>
              {liveData.totalAnalystsPrevious !== null && (
                <p>
                  <strong>Total Analysts (Previous):</strong>{" "}
                  {liveData.totalAnalystsPrevious}
                </p>
              )}
              <p className="mt-2 pt-1 border-t">
                <strong>Ratings Breakdown (Current vs Previous):</strong>
              </p>
              {liveData.ratingsDistribution.map((detail) => (
                <div
                  key={detail.category}
                  className="flex justify-between items-center text-[11px]">
                  <span>{detail.label}:</span>
                  <span>
                    {detail.currentValue}
                    {detail.previousValue !== null
                      ? ` (Prev: ${detail.previousValue})`
                      : " (Prev: N/A)"}
                    {detail.change !== null
                      ? `, Change: ${detail.change > 0 ? "+" : ""}${
                          detail.change
                        }`
                      : ""}
                  </span>
                </div>
              ))}
              <p className="mt-1">
                <strong>Last Updated:</strong>{" "}
                {liveData.lastUpdated
                  ? new Date(liveData.lastUpdated).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </ShadCardContent>
        </div>
      );
    }

    // Front Face
    const { ratingsDistribution, totalAnalystsCurrent, consensusLabelCurrent } =
      liveData;
    const barHeight = "h-5 sm:h-6"; // Height of the segmented bar

    return (
      <div
        data-testid={`analystgrades-card-front-${symbol}`}
        className="pointer-events-auto flex flex-col h-full">
        <ShadCardContent className="pt-1 pb-1 px-0 flex-grow flex flex-col">
          <div className="text-center mb-2">
            <Badge variant="outline" className="text-xs sm:text-sm px-2 py-0.5">
              Analyst Grades
            </Badge>
          </div>

          <div className="px-1 mb-2 text-center">
            <p className="text-xs text-muted-foreground">
              {staticData.currentPeriodDate}
            </p>
            <p className="text-sm sm:text-base font-semibold text-primary">
              {consensusLabelCurrent}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Based on {totalAnalystsCurrent} Analysts
            </p>
          </div>

          {/* Segmented Bar */}
          {totalAnalystsCurrent > 0 && (
            <div
              className={cn(
                "flex w-full rounded-full overflow-hidden shadow my-2",
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

          {/* Details with changes */}
          <div className="space-y-0.5 px-1 mt-1 flex-grow overflow-y-auto text-xs">
            {ratingsDistribution.map((detail) => (
              <RatingDetailRow
                key={detail.category}
                detail={detail}
                totalAnalysts={totalAnalystsCurrent}
              />
            ))}
          </div>
        </ShadCardContent>
      </div>
    );
  });

AnalystGradesCardContent.displayName = "AnalystGradesCardContent";
