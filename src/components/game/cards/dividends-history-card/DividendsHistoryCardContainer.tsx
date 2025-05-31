// src/components/game/cards/dividends-history-card/DividendsHistoryCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  DividendsHistoryCardData,
  DividendsHistoryCardInteractions,
} from "./dividends-history-card.types";
import { DividendsHistoryCardContent } from "./DividendsHistoryCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface DividendsHistoryCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: DividendsHistoryCardInteractions;
}

export const DividendsHistoryCardContainer: React.FC<DividendsHistoryCardContainerProps> =
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
      if (cardData.type !== "dividendshistory") {
        console.error(
          "[DividendsHistoryCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as DividendsHistoryCardData;

      const contentProps = {
        cardData: specificCardData,
        onGenericInteraction,
      };

      const faceContentForBaseCard = (
        <DividendsHistoryCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <DividendsHistoryCardContent {...contentProps} isBackFace={true} />
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

DividendsHistoryCardContainer.displayName = "DividendsHistoryCardContainer";
