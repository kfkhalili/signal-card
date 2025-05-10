// src/app/components/game/cards/price-card/PriceCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "../base-card/base-card.types";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";
import { cn } from "@/lib/utils";

type PriceSpecificInteractions = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface PriceCardContainerProps {
  cardData: PriceCardData;
  isFlipped: boolean;
  onFlip: () => void;

  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void; // New prop for delete

  priceSpecificInteractions?: PriceSpecificInteractions;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // This children is for BaseCard's top-level overlays
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    socialInteractions,
    onDeleteRequest, // Receive delete request handler
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children,
  }) => {
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

    const backContentForBaseCard = (
      <PriceCardContent
        cardData={cardData}
        isBackFace={true}
        onSmaClick={priceSpecificInteractions?.onPriceCardSmaClick}
        onRangeContextClick={
          priceSpecificInteractions?.onPriceCardRangeContextClick
        }
        onOpenPriceClick={priceSpecificInteractions?.onPriceCardOpenPriceClick}
      />
    );

    // Clickable wrappers for the entire card face/back to trigger flip
    const wrappedFaceContent = (
      <div
        className="h-full w-full cursor-pointer"
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
        className="h-full w-full cursor-pointer"
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
        onDeleteRequest={onDeleteRequest} // Pass delete request handler to BaseCard
        className={className}
        innerCardClassName={innerCardClassName}
      >
        {children} {/* Pass through overlays */}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
