// src/components/game/cards/profile-card/ProfileCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  ProfileCardData, // Still useful for internal casting
  ProfileCardInteractionCallbacks,
} from "./profile-card.types";
import { ProfileCardContent } from "./ProfileCardContent";
import type { DisplayableCard } from "../../types"; // Import DisplayableCard
import type { RegisteredCardRendererProps } from "../../cardRenderers"; // Import the generic props
import { CardType, OnGenericInteraction } from "../base-card/base-card.types";

// Props should align with RegisteredCardRendererProps for cardData,
// then add any specific interaction props.
export interface ProfileCardContainerProps
  extends Omit<
    RegisteredCardRendererProps,
    "cardData" | "specificInteractions" | "priceSpecificInteractions"
  > {
  cardData: DisplayableCard; // Accept generic DisplayableCard
  onGenericInteraction: OnGenericInteraction;
  sourceCardId: string;
  sourceCardSymbol: string;
  sourceCardType: CardType;
  specificInteractions?: ProfileCardInteractionCallbacks;
}

// Changed from: export const ProfileCardContainer: React.FC<ProfileCardContainerProps> = React.memo(...)
export const ProfileCardContainer = React.memo<ProfileCardContainerProps>(
  ({
    cardData,
    isFlipped,
    onFlip,
    cardContext,
    currentRarity,
    rarityReason,
    socialInteractions,
    onDeleteRequest, // This is inherited as required from RegisteredCardRendererProps
    onHeaderIdentityClick,
    className,
    innerCardClassName,
    children,
    isLikedByCurrentUser,
    isSavedByCurrentUser,
    likeCount,
    commentCount,
    collectionCount,
    isSaveDisabled,
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
    // Now we can safely use cardData as ProfileCardData
    const specificCardData = cardData as ProfileCardData;

    const contentProps = {
      cardData: specificCardData,
      // Remove specific click handlers like onSmaClick, onRangeContextClick if they now use onGenericInteraction
      onGenericInteraction, // Pass down
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
        currentRarity={currentRarity}
        rarityReason={rarityReason}
        socialInteractions={socialInteractions}
        onDeleteRequest={onDeleteRequest}
        onHeaderClick={onHeaderIdentityClick}
        className={className}
        innerCardClassName={innerCardClassName}
        isLikedByCurrentUser={isLikedByCurrentUser}
        isSavedByCurrentUser={isSavedByCurrentUser}
        likeCount={likeCount}
        commentCount={commentCount}
        collectionCount={collectionCount}
        isSaveDisabled={isSaveDisabled}>
        {children}
      </BaseCard>
    );
  }
);

ProfileCardContainer.displayName = "ProfileCardContainer";
