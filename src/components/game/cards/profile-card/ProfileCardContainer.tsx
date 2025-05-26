// src/components/game/cards/profile-card/ProfileCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  ProfileCardData,
  ProfileCardInteractions,
} from "./profile-card.types";
import { ProfileCardContent } from "./ProfileCardContent";
import type { DisplayableCard } from "../../types"; // Import DisplayableCard
import type { RegisteredCardRendererProps } from "../../cardRenderers"; // Import the generic props
import { CardType, OnGenericInteraction } from "../base-card/base-card.types";
interface ProfileCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard; // Accept generic DisplayableCard
  onGenericInteraction: OnGenericInteraction;
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
  specificInteractions?: ProfileCardInteractions;
}

export const ProfileCardContainer = React.memo<ProfileCardContainerProps>(
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
    if (cardData.type !== "profile") {
      console.error(
        "[ProfileCardContainer] Received incorrect card type:",
        cardData.type
      );
      // Optionally render an error message or null
      return null;
    }
    const specificCardData = cardData as ProfileCardData;

    const contentProps = {
      cardData: specificCardData,
      onGenericInteraction,
      sourceCardId,
      sourceCardSymbol,
      sourceCardType,
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
        onHeaderClick={onHeaderIdentityClick}
        className={className}
        innerCardClassName={innerCardClassName}
        onGenericInteraction={onGenericInteraction}>
        {children}
      </BaseCard>
    );
  }
);

ProfileCardContainer.displayName = "ProfileCardContainer";
