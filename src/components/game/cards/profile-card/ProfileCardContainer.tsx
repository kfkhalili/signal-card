// src/components/game/cards/profile-card/ProfileCardContainer.tsx
import React from "react";
import BaseCard from "../base-card/BaseCard";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
} from "../base-card/base-card.types";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks,
} from "./profile-card.types";
import { ProfileCardContent } from "./ProfileCardContent";

interface ProfileCardContainerProps {
  cardData: ProfileCardData;
  isFlipped: boolean;
  onFlip: () => void;
  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  specificInteractions?: ProfileCardInteractionCallbacks;
  currentRarity?: string | null;
  rarityReason?: string | null;
  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean; // New prop
  likeCount?: number;
  commentCount?: number;
  collectionCount?: number;
}

export const ProfileCardContainer: React.FC<ProfileCardContainerProps> =
  React.memo(
    ({
      cardData,
      isFlipped,
      onFlip,
      cardContext,
      currentRarity,
      rarityReason,
      socialInteractions,
      onDeleteRequest,
      onHeaderIdentityClick,
      specificInteractions,
      className,
      innerCardClassName,
      children,
      isLikedByCurrentUser,
      isSavedByCurrentUser, // Destructure
      likeCount,
      commentCount,
      collectionCount,
    }) => {
      const faceContentForBaseCard = (
        <ProfileCardContent
          cardData={cardData}
          isBackFace={false}
          interactionCallbacks={specificInteractions}
        />
      );

      const backContentForBaseCard = (
        <ProfileCardContent
          cardData={cardData}
          isBackFace={true}
          interactionCallbacks={specificInteractions}
        />
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
          isSavedByCurrentUser={isSavedByCurrentUser} // Pass down
          likeCount={likeCount}
          commentCount={commentCount}
          collectionCount={collectionCount}>
          {children}
        </BaseCard>
      );
    }
  );

ProfileCardContainer.displayName = "ProfileCardContainer";
