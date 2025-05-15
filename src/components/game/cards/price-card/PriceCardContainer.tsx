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
  cardData: PriceCardData;
  isFlipped: boolean;
  onFlip: () => void;
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  priceSpecificInteractions?: PriceSpecificInteractions;
  currentRarity?: string | null;
  rarityReason?: string | null;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean; // New prop
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    currentRarity,
    rarityReason,
    socialInteractions,
    onDeleteRequest,
    onHeaderIdentityClick,
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children,
    isLikedByCurrentUser,
    isSavedByCurrentUser, // Destructure
    likeCount,
    commentCount,
    collectionCount,
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

    return (
      <BaseCard
        isFlipped={isFlipped}
        faceContent={faceContentForBaseCard}
        backContent={backContentForBaseCard}
        onFlip={onFlip}
        cardContext={cardContext}
        currentRarity={currentRarity}
        rarityReason={rarityReason}
        socialInteractions={socialInteractions}
        onDeleteRequest={onDeleteRequest}
        onHeaderClick={onHeaderIdentityClick}
        className={className}
        innerCardClassName={innerCardClassName}
        isLikedByCurrentUser={isLikedByCurrentUser}
        isSavedByCurrentUser={isSavedByCurrentUser} // Pass down
        likeCount={likeCount}
        commentCount={commentCount}
        collectionCount={collectionCount}>
        {children}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
