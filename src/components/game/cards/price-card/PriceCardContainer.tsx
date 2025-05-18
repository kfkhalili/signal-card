// src/components/game/cards/price-card/PriceCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  PriceCardData, // Still useful for internal casting
  PriceCardInteractionCallbacks,
} from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";
import type { DisplayableCard } from "../../types"; // Import DisplayableCard
import type { RegisteredCardRendererProps } from "../../cardRenderers"; // Import the generic props

// Props should align with RegisteredCardRendererProps for cardData,
// then add any specific interaction props.
export interface PriceCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard; // Accept generic DisplayableCard
  priceSpecificInteractions?: Pick<
    PriceCardInteractionCallbacks,
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
    priceSpecificInteractions,
    className,
    innerCardClassName,
    children,
    isLikedByCurrentUser,
    isSavedByCurrentUser,
    likeCount,
    commentCount,
    collectionCount,
    isSaveDisabled,
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

    const faceContentForBaseCard = (
      <PriceCardContent
        cardData={specificCardData}
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
        cardData={specificCardData}
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
