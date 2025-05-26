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
interface PriceCardContainerProps
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
    onDeleteRequest,
    onHeaderIdentityClick,
    className,
    innerCardClassName,
    children,
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
      return null;
    }
    const specificCardData = cardData as PriceCardData;

    const contentProps = {
      cardData: specificCardData,
      onGenericInteraction,
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
