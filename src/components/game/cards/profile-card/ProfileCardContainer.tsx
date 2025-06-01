// src/components/game/cards/profile-card/ProfileCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type { ProfileCardData } from "./profile-card.types";
// ProfileCardInteractions is removed
import { ProfileCardContent } from "./ProfileCardContent";
import type { DisplayableCard } from "../../types";
import type { RegisteredCardRendererProps } from "../../cardRenderers";
import type { OnGenericInteraction } from "../base-card/base-card.types";

interface ProfileCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions" // Ensure all specific interaction props are omitted
  > {
  cardData: DisplayableCard; // This will be cast to ProfileCardData inside
  onGenericInteraction: OnGenericInteraction;
  // No specificInteractions prop
}

export const ProfileCardContainer = React.memo<ProfileCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    onDeleteRequest,
    className,
    innerCardClassName,
    children,
    onGenericInteraction, // This is the key prop
  }) => {
    if (cardData.type !== "profile") {
      console.error(
        "[ProfileCardContainer] Received incorrect card type:",
        cardData.type
      );
      return null;
    }
    const specificCardData = cardData as ProfileCardData;

    const contentProps = {
      cardData: specificCardData,
      onGenericInteraction,
    };

    const faceContentForBaseCard = (
      <ProfileCardContent {...contentProps} isBackFace={false} />
    );
    const backContentForBaseCard = (
      <ProfileCardContent {...contentProps} isBackFace={true} />
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

ProfileCardContainer.displayName = "ProfileCardContainer";
