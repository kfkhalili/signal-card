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
// cn utility might be used for additional styling on the container itself if needed
// import { cn } from "@/lib/utils";

interface ProfileCardContainerProps {
  cardData: ProfileCardData;
  isFlipped: boolean;
  onFlip: () => void;

  cardContext: CardActionContext; // Already contains symbol, companyName, logoUrl
  socialInteractions?: BaseCardSocialInteractions;
  onDeleteRequest?: (context: CardActionContext) => void;
  onHeaderIdentityClick?: (context: CardActionContext) => void; // For PriceCard -> ProfileCard

  // Specific interactions for the content of the ProfileCard
  specificInteractions?: ProfileCardInteractionCallbacks;

  className?: string;
  innerCardClassName?: string;
  children?: React.ReactNode; // For overlays, passed to BaseCard
}

export const ProfileCardContainer: React.FC<ProfileCardContainerProps> =
  React.memo(
    ({
      cardData,
      isFlipped,
      onFlip,
      cardContext,
      socialInteractions,
      onDeleteRequest,
      onHeaderIdentityClick, // Received from GameCard (originating from PriceCard's header click)
      specificInteractions,
      className,
      innerCardClassName,
      children,
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
          cardContext={cardContext} // Pass the comprehensive context
          socialInteractions={socialInteractions}
          onDeleteRequest={onDeleteRequest}
          // If ProfileCard's header should also trigger profile view (e.g. for consistency, though redundant here)
          // onHeaderClick={onHeaderIdentityClick}
          // For ProfileCard, the header itself is just identity, not a trigger to show *another* profile card.
          // The onHeaderIdentityClick is primarily for PriceCard -> ProfileCard.
          // If ProfileCard's header needs to do something else, a new callback would be needed.
          className={className}
          innerCardClassName={innerCardClassName}>
          {children} {/* Overlays */}
        </BaseCard>
      );
    }
  );

ProfileCardContainer.displayName = "ProfileCardContainer";
