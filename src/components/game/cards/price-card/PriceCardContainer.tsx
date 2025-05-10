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
  onFlip: () => void; // This is now passed to BaseCard

  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;

  priceSpecificInteractions?: PriceSpecificInteractions;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // Overlays from GameCard
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip, // Will be passed to BaseCard
    cardContext,
    socialInteractions,
    onDeleteRequest,
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children,
  }) => {
    // PriceCardContent is now the direct content for face/back, no extra wrappers here
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

    return (
      <BaseCard
        isFlipped={isFlipped}
        faceContent={faceContentForBaseCard} // Pass PriceCardContent directly
        backContent={backContentForBaseCard} // Pass PriceCardContent directly
        onFlip={onFlip} // Pass the onFlip handler to BaseCard
        cardContext={cardContext}
        socialInteractions={socialInteractions}
        onDeleteRequest={onDeleteRequest}
        className={className}
        innerCardClassName={innerCardClassName}
      >
        {children} {/* Overlays */}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
