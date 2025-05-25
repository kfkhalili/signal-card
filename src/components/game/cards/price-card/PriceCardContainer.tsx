// src/components/game/cards/price-card/PriceCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  PriceCardData, // Still useful for internal casting
  PriceCardInteractions,
} from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";
import type { DisplayableCard } from "../../types"; // Import DisplayableCard
import type { RegisteredCardRendererProps } from "../../cardRenderers"; // Import the generic props
import { CardType, OnGenericInteraction } from "../base-card/base-card.types";

// Props should align with RegisteredCardRendererProps for cardData,
// then add any specific interaction props.
export interface PriceCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard; // Accept generic DisplayableCard
  onGenericInteraction: OnGenericInteraction;
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
  priceSpecificInteractions?: Pick<
    PriceCardInteractions,
    | "onPriceCardSmaClick"
    | "onPriceCardRangeContextClick"
    | "onPriceCardOpenPriceClick"
    | "onPriceCardGenerateDailyPerformanceSignal"
  >;
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
    className,
    innerCardClassName,
    children,
    isLikedByCurrentUser,
    isSavedByCurrentUser,
    likeCount,
    commentCount,
    collectionCount,
    isSaveDisabled,
    onGenericInteraction,
    sourceCardId,
    sourceCardSymbol,
    sourceCardType,
  }) => {
    // Type guard and assertion
    if (cardData.type !== "price") {
      console.error(
        "[PriceCardContainer] Received incorrect card type:",
        cardData.type
      );
      // Optionally render an error message or null
      return null;
    }
    // Now we can safely use cardData as PriceCardData
    const specificCardData = cardData as PriceCardData;

    const contentProps = {
      cardData: specificCardData,
      // Remove specific click handlers like onSmaClick, onRangeContextClick if they now use onGenericInteraction
      onGenericInteraction, // Pass down
      sourceCardId,
      sourceCardSymbol,
      sourceCardType,
    };

    const faceContentForBaseCard = (
      <PriceCardContent {...contentProps} isBackFace={false} />
    );
    const backContentForBaseCard = (
      <PriceCardContent {...contentProps} isBackFace={true} />
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
        isSavedByCurrentUser={isSavedByCurrentUser}
        likeCount={likeCount}
        commentCount={commentCount}
        collectionCount={collectionCount}
        isSaveDisabled={isSaveDisabled}>
        {children}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
