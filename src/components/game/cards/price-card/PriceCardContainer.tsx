// src/components/game/cards/price-card/PriceCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type { PriceCardData } from "./price-card.types";
import { PriceCardContent } from "./PriceCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface PriceCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions" // Ensure all specific interaction props are omitted
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
}

export const PriceCardContainer = React.memo<PriceCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    onDeleteRequest,
    className,
    innerCardClassName,
    children,
    onGenericInteraction,
  }) => {
    if (cardData.type !== "price") {
      console.error(
        "[PriceCardContainer] Received incorrect card type:",
        cardData.type
      );
      return null;
    }
    // Cast to specific card data type for PriceCardContent
    const specificCardData = cardData as PriceCardData;

    const contentProps = {
      cardData: specificCardData,
      onGenericInteraction,
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
        className={className}
        innerCardClassName={innerCardClassName}
        onGenericInteraction={onGenericInteraction} // Pass down to BaseCard
      >
        {children}
      </BaseCard>
    );
  }
);

PriceCardContainer.displayName = "PriceCardContainer";
