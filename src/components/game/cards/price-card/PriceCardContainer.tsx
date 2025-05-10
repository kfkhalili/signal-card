/**
 * src/app/components/game/cards/price-card/PriceCardContainer.tsx
 */
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type { PriceCardData, PriceCardFaceData } from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";

interface PriceCardInteractionProps {
  onSmaClick?: (
    smaPeriod: 50 | 200,
    smaValue: number,
    faceData: PriceCardFaceData
  ) => void;
  onRangeContextClick?: (
    levelType: "High" | "Low",
    levelValue: number,
    faceData: PriceCardFaceData
  ) => void;
  onOpenPriceClick?: (faceData: PriceCardFaceData) => void;
  onGenerateDailyPerformanceSignal?: (faceData: PriceCardFaceData) => void;
}

interface PriceCardContainerProps extends PriceCardInteractionProps {
  cardData: PriceCardData;
  isFlipped: boolean;
  onFlip: () => void;
  className?: string;
  innerCardClassName?: string;
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    className,
    innerCardClassName,
    onSmaClick,
    onRangeContextClick,
    onOpenPriceClick,
    onGenerateDailyPerformanceSignal,
  }) => {
    const faceContent = (
      <div
        className="h-full w-full cursor-pointer"
        onClick={onFlip}
        role="button"
        aria-label={`Flip ${cardData.symbol} card to see details`}
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" || e.key === " " ? onFlip() : null
        }
      >
        <PriceCardContent
          cardData={cardData}
          isBackFace={false}
          onSmaClick={onSmaClick}
          onRangeContextClick={onRangeContextClick}
          onOpenPriceClick={onOpenPriceClick}
          onGenerateDailyPerformanceSignal={onGenerateDailyPerformanceSignal}
        />
      </div>
    );

    const backContent = (
      <div
        className="h-full w-full cursor-pointer"
        onClick={onFlip}
        role="button"
        aria-label={`Flip ${cardData.symbol} card to see quote`}
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" || e.key === " " ? onFlip() : null
        }
      >
        <PriceCardContent
          cardData={cardData}
          isBackFace={true}
          onSmaClick={onSmaClick}
          onRangeContextClick={onRangeContextClick}
          onOpenPriceClick={onOpenPriceClick}
          // onGenerateDailyPerformanceSignal is typically a front-face only action
        />
      </div>
    );

    return (
      <BaseCard
        isFlipped={isFlipped}
        faceContent={faceContent}
        backContent={backContent}
        className={className}
        innerCardClassName={innerCardClassName}
      />
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer"; // Good practice for React.memo components
