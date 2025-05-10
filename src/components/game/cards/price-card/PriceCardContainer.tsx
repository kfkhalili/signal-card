// src/app/components/game/cards/price-card/PriceCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "../base-card/base-card.types"; // For BaseCard props
import type {
  PriceCardData,
  PriceCardInteractionCallbacks, // This type might need adjustment if it previously held social callbacks
} from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";

// Define which specific interaction callbacks PriceCardContent needs
// These are data-point specific interactions for the PriceCard.
type PriceSpecificInteractions = Pick<
  PriceCardInteractionCallbacks, // Assuming this type now ONLY contains these specific callbacks
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface PriceCardContainerProps {
  cardData: PriceCardData;
  isFlipped: boolean;
  onFlip: () => void; // Callback to toggle flip state in parent

  // Props for BaseCard's social bar
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;

  // Callbacks specific to PriceCardContent's data points
  priceSpecificInteractions?: PriceSpecificInteractions;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // Overlays from GameCard (e.g., delete button)
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    socialInteractions,
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children, // Overlays like delete button
  }) => {
    // Content for the face (no social bar here, BaseCard adds it)
    const faceContentForBaseCard = (
      <PriceCardContent
        cardData={cardData}
        isBackFace={false}
        onSmaClick={priceSpecificInteractions?.onPriceCardSmaClick}
        onRangeContextClick={
          priceSpecificInteractions?.onPriceCardRangeContextClick
        }
        onOpenPriceClick={priceSpecificInteractions?.onPriceCardOpenPriceClick}
        onGenerateDailyPerformanceSignal={
          priceSpecificInteractions?.onPriceCardGenerateDailyPerformanceSignal
        }
      />
    );

    // Content for the back (no social bar here, BaseCard adds it)
    const backContentForBaseCard = (
      <PriceCardContent
        cardData={cardData}
        isBackFace={true}
        onSmaClick={priceSpecificInteractions?.onPriceCardSmaClick}
        onRangeContextClick={
          priceSpecificInteractions?.onPriceCardRangeContextClick
        }
        onOpenPriceClick={priceSpecificInteractions?.onPriceCardOpenPriceClick}
        // onGenerateDailyPerformanceSignal is typically front-face only
      />
    );

    // These divs handle the click-to-flip for the entire card area
    const wrappedFaceContent = (
      <div
        className="h-full w-full cursor-pointer" // Ensure full coverage for click
        onClick={onFlip}
        role="button"
        aria-label={`Flip ${cardData.symbol} card to see details`}
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" || e.key === " " ? onFlip() : undefined
        }
      >
        {faceContentForBaseCard}
      </div>
    );

    const wrappedBackContent = (
      <div
        className="h-full w-full cursor-pointer" // Ensure full coverage for click
        onClick={onFlip}
        role="button"
        aria-label={`Flip ${cardData.symbol} card to see quote`}
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" || e.key === " " ? onFlip() : undefined
        }
      >
        {backContentForBaseCard}
      </div>
    );

    return (
      <BaseCard
        isFlipped={isFlipped}
        faceContent={wrappedFaceContent}
        backContent={wrappedBackContent}
        cardContext={cardContext}
        socialInteractions={socialInteractions}
        className={className}
        innerCardClassName={innerCardClassName}
      >
        {children} {/* Overlays like delete button from GameCard */}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
