/**
 * src/app/components/game/cards/price-card/PriceCardContainer.tsx
 */
import React from "react";
import BaseCard from "../base-card/BaseCard";
// 1. CRITICAL IMPORT: Make sure this path is correct and imports the interface
import type {
  PriceCardData,
  PriceCardInteractionCallbacks, // This interface must be imported
} from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";

// 2. CRITICAL DEFINITION: Ensure PriceCardContainerProps EXTENDS PriceCardInteractionCallbacks
interface PriceCardContainerProps extends PriceCardInteractionCallbacks {
  cardData: PriceCardData;
  isFlipped: boolean;
  onFlip: () => void;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For overlays passed from GameCard
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    className,
    innerCardClassName,
    children,
    // 3. DESTRUCTURE THE CALLBACKS: These come from PriceCardInteractionCallbacks
    onPriceCardSmaClick,
    onPriceCardRangeContextClick,
    onPriceCardOpenPriceClick,
    onPriceCardGenerateDailyPerformanceSignal,
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
          // 4. PASS THE CALLBACKS: These are now correctly typed
          onSmaClick={onPriceCardSmaClick}
          onRangeContextClick={onPriceCardRangeContextClick}
          onOpenPriceClick={onPriceCardOpenPriceClick}
          onGenerateDailyPerformanceSignal={
            onPriceCardGenerateDailyPerformanceSignal
          }
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
          onSmaClick={onPriceCardSmaClick}
          onRangeContextClick={onPriceCardRangeContextClick}
          onOpenPriceClick={onPriceCardOpenPriceClick}
          // onGenerateDailyPerformanceSignal is often front-face only
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
      >
        {children}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
