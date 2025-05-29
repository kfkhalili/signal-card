// src/components/game/cards/key-ratios-card/KeyRatiosCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  KeyRatiosCardData,
  KeyRatiosCardInteractions,
} from "./key-ratios-card.types";
import { KeyRatiosCardContent } from "./KeyRatiosCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface KeyRatiosCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard;
  onGenericInteraction: OnGenericInteraction;
  specificInteractions?: KeyRatiosCardInteractions; // Likely unused but kept for consistency
}

export const KeyRatiosCardContainer: React.FC<KeyRatiosCardContainerProps> =
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
      if (cardData.type !== "keyratios") {
        console.error(
          "[KeyRatiosCardContainer] Received incorrect card type:",
          cardData.type
        );
        return null;
      }
      const specificCardData = cardData as KeyRatiosCardData;

      const contentProps = {
        cardData: specificCardData,
        onGenericInteraction,
      };

      const faceContentForBaseCard = (
        <KeyRatiosCardContent {...contentProps} isBackFace={false} />
      );
      const backContentForBaseCard = (
        <KeyRatiosCardContent {...contentProps} isBackFace={true} />
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

KeyRatiosCardContainer.displayName = "KeyRatiosCardContainer";
