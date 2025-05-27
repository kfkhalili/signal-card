// src/components/game/cards/revenue-card/RevenueCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  RevenueCardData,
  RevenueCardInteractions,
} from "./revenue-card.types";
import { RevenueCardContent } from "./RevenueCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface RevenueCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: RevenueCardInteractions;
}

export const RevenueCardContainer: React.FC<RevenueCardContainerProps> =
  React.memo(
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
      // sourceCardId, // These are available via cardData or cardContext if needed by BaseCard directly
      // sourceCardSymbol,
      // sourceCardType,
      // specificInteractions, // Not used for now
    }) => {
      if (cardData.type !== "revenue") {
        // This check is more for type safety during development.
        // The renderer registry should prevent this from happening at runtime.
        console.error(
          "[RevenueCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as RevenueCardData;

      const contentProps = {
        cardData: specificCardData,
        onGenericInteraction,
        // sourceCardId, sourceCardSymbol, sourceCardType are implicitly available via cardData for payload creation
      };

      const faceContentForBaseCard = (
        <RevenueCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <RevenueCardContent {...contentProps} isBackFace={true} />
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
          innerCardClassName={innerCardClassName}
          onGenericInteraction={onGenericInteraction}>
          {children}
        </BaseCard>
      );
    }
  );

RevenueCardContainer.displayName = "RevenueCardContainer";
