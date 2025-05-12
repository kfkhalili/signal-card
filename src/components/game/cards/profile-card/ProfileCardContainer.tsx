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
  cardData: ProfileCardData; // This now includes currentRarity and rarityReason
  isFlipped: boolean;
  onFlip: () => void;

  cardContext: CardActionContext;
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void;
  specificInteractions?: ProfileCardInteractionCallbacks;

  // Pass through rarity to BaseCard
  currentRarity?: string | null;
  rarityReason?: string | null;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode;
}

export const ProfileCardContainer: React.FC<ProfileCardContainerProps> =
  React.memo(
    ({
      cardData,
      isFlipped,
      onFlip,
      cardContext,
      currentRarity, // Receive prop
      rarityReason, // Receive prop
      socialInteractions,
      onDeleteRequest,
      onHeaderIdentityClick,
      specificInteractions,
      className,
      innerCardClassName,
      children,
    }) => {
      const faceContentForBaseCard = (
        <ProfileCardContent
          cardData={cardData} // ProfileCardContent will now NOT render rarity itself
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
          currentRarity={currentRarity} // Pass to BaseCard
          rarityReason={rarityReason} // Pass to BaseCard
          socialInteractions={socialInteractions}
          onDeleteRequest={onDeleteRequest}
          onHeaderClick={onHeaderIdentityClick}
          className={className}
          innerCardClassName={innerCardClassName}>
          {children}
        </BaseCard>
      );
    }
  );

ProfileCardContainer.displayName = "ProfileCardContainer";
