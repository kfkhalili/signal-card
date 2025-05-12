// src/components/game/cards/price-card/PriceCardContainer.tsx
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

type PriceSpecificInteractions = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface PriceCardContainerProps {
  cardData: PriceCardData; // This now includes currentRarity and rarityReason
  isFlipped: boolean;
  onFlip: () => void;

  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  priceSpecificInteractions?: PriceSpecificInteractions;

  // Pass through rarity to BaseCard
  currentRarity?: string | null;
  rarityReason?: string | null;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    currentRarity, // Receive prop
    rarityReason, // Receive prop
    socialInteractions,
    onDeleteRequest,
    onHeaderIdentityClick,
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children,
  }) => {
    const faceContentForBaseCard = (
      <PriceCardContent
        cardData={cardData} // PriceCardContent will now NOT render rarity itself
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
        faceContent={faceContentForBaseCard}
        backContent={backContentForBaseCard}
        onFlip={onFlip}
        cardContext={cardContext}
        currentRarity={currentRarity} // Pass to BaseCard
        rarityReason={rarityReason} // Pass to BaseCard
        socialInteractions={socialInteractions}
        onDeleteRequest={onDeleteRequest}
        onHeaderClick={onHeaderIdentityClick}
        className={className}
        innerCardClassName={innerCardClassName}>
        {children}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
