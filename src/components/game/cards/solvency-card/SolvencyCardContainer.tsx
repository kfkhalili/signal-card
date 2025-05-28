// src/components/game/cards/solvency-card/SolvencyCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  SolvencyCardData,
  SolvencyCardInteractions, // Although likely empty for now
} from "./solvency-card.types";
import { SolvencyCardContent } from "./SolvencyCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface SolvencyCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions" // Ensure all specific interaction props are omitted
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: SolvencyCardInteractions; // Keep for consistency, though might be unused
}

export const SolvencyCardContainer: React.FC<SolvencyCardContainerProps> =
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
      if (cardData.type !== "solvency") {
        console.error(
          "[SolvencyCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as SolvencyCardData;

      const contentProps = {
        cardData: specificCardData,
        onGenericInteraction,
      };

      const faceContentForBaseCard = (
        <SolvencyCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <SolvencyCardContent {...contentProps} isBackFace={true} />
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

SolvencyCardContainer.displayName = "SolvencyCardContainer";
