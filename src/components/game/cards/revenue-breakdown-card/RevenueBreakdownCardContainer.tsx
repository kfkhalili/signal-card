// src/components/game/cards/revenue-breakdown-card/RevenueBreakdownCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  RevenueBreakdownCardData,
  RevenueBreakdownCardInteractions,
} from "./revenue-breakdown-card.types";
import { RevenueBreakdownCardContent } from "./RevenueBreakdownCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface RevenueBreakdownCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: RevenueBreakdownCardInteractions;
}

export const RevenueBreakdownCardContainer: React.FC<RevenueBreakdownCardContainerProps> =
  React.memo(
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
      if (cardData.type !== "revenuebreakdown") {
        console.error(
          "[RevenueBreakdownCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as RevenueBreakdownCardData;

      const contentProps = {
        cardData: specificCardData,
        onGenericInteraction, // Pass down even if not used by content directly for consistency
      };

      const faceContentForBaseCard = (
        <RevenueBreakdownCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <RevenueBreakdownCardContent {...contentProps} isBackFace={true} />
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
          onGenericInteraction={onGenericInteraction}>
          {children}
        </BaseCard>
      );
    }
  );

RevenueBreakdownCardContainer.displayName = "RevenueBreakdownCardContainer";
