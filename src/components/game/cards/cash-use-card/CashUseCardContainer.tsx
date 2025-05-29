// src/components/game/cards/cash-use-card/CashUseCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  CashUseCardData,
  CashUseCardInteractions,
} from "./cash-use-card.types";
import { CashUseCardContent } from "./CashUseCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface CashUseCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard; // Will be cast to CashUseCardData
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: CashUseCardInteractions; // Keep for consistency, though likely unused
}

export const CashUseCardContainer: React.FC<CashUseCardContainerProps> =
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
      // specificInteractions, // Can be omitted if not used
    }) => {
      if (cardData.type !== "cashuse") {
        console.error(
          "[CashUseCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as CashUseCardData;

      const contentProps = {
        cardData: specificCardData,
        onGenericInteraction,
      };

      const faceContentForBaseCard = (
        <CashUseCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <CashUseCardContent {...contentProps} isBackFace={true} />
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

CashUseCardContainer.displayName = "CashUseCardContainer";
