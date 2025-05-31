// src/components/game/cards/analyst-grades-card/AnalystGradesCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  AnalystGradesCardData,
  AnalystGradesCardInteractions,
} from "./analyst-grades-card.types";
import { AnalystGradesCardContent } from "./AnalystGradesCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface AnalystGradesCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: AnalystGradesCardInteractions;
}

export const AnalystGradesCardContainer: React.FC<AnalystGradesCardContainerProps> =
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
      if (cardData.type !== "analystgrades") {
        console.error(
          "[AnalystGradesCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as AnalystGradesCardData;

      const contentProps = {
        cardData: specificCardData,
        // onGenericInteraction, // Pass if AnalystGradesCardContent uses it
      };

      const faceContentForBaseCard = (
        <AnalystGradesCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <AnalystGradesCardContent {...contentProps} isBackFace={true} />
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

AnalystGradesCardContainer.displayName = "AnalystGradesCardContainer";
