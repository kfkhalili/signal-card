// src/components/game/GameCard.tsx
import React from "react";
import type {
  DisplayableCard,
  DisplayableCardState,
  // ConcreteCardData, // Not directly used here
} from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks as ProfileCardSpecificInteractions, // Renamed for clarity
} from "./cards/profile-card/profile-card.types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "./cards/base-card/base-card.types";

import { PriceCardContainer } from "./cards/price-card/PriceCardContainer";
import { ProfileCardContainer } from "@/components/game/cards/profile-card/ProfileCardContainer";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Aliases for more specific displayable card types
type DisplayableLivePriceCardWithState = PriceCardData & DisplayableCardState;
type DisplayableUserProfileCardWithState = ProfileCardData &
  DisplayableCardState;

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface GameCardProps {
  readonly card: DisplayableCard; // This is ConcreteCardData & DisplayableCardState
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
  readonly socialInteractions?: BaseCardSocialInteractions;
  readonly priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  readonly profileSpecificInteractions?: ProfileCardSpecificInteractions; // Use renamed type
  readonly onHeaderIdentityClick?: (context: CardActionContext) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  socialInteractions,
  priceSpecificInteractions,
  profileSpecificInteractions,
  onHeaderIdentityClick,
}) => {
  const handleFlip = () => onToggleFlip(card.id);

  const handleDeleteAction = (context: CardActionContext) => {
    onDeleteCardRequest(context.id);
  };

  const {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual,
    companyName: cardCompanyName,
    logoUrl: cardLogoUrl,
    currentRarity: cardCurrentRarity,
    rarityReason: cardRarityReason,
  } = card;

  // Determine websiteUrl based on card type
  let websiteUrlForContext: string | null | undefined = null;
  if (card.type === "profile") {
    // Access staticData if it's a ProfileCard
    const profileCardData = card as ProfileCardData; // Cast to access staticData
    websiteUrlForContext = profileCardData.staticData?.website;
  }
  // For PriceCard, websiteUrlForContext will remain null/undefined unless populated otherwise

  const cardContextForBaseCard: CardActionContext = {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual as CardType,
    companyName: cardCompanyName ?? null,
    logoUrl: cardLogoUrl ?? null,
    websiteUrl: websiteUrlForContext ?? null, // <<< POPULATE websiteUrl
  };

  const cardWrapperClassName = "w-full aspect-[63/88] relative";

  switch (card.type) {
    case "price":
      const priceCard = card as DisplayableLivePriceCardWithState;
      return (
        <PriceCardContainer
          cardData={priceCard}
          isFlipped={priceCard.isFlipped}
          onFlip={handleFlip}
          cardContext={cardContextForBaseCard} // Pass the enriched context
          currentRarity={priceCard.currentRarity}
          rarityReason={priceCard.rarityReason}
          socialInteractions={socialInteractions}
          onDeleteRequest={handleDeleteAction}
          priceSpecificInteractions={priceSpecificInteractions}
          onHeaderIdentityClick={onHeaderIdentityClick}
          className={cardWrapperClassName}
        />
      );
    case "profile":
      const profileCard = card as DisplayableUserProfileCardWithState;
      return (
        <ProfileCardContainer
          cardData={profileCard}
          isFlipped={profileCard.isFlipped}
          onFlip={handleFlip}
          cardContext={cardContextForBaseCard} // Pass the enriched context
          currentRarity={profileCard.currentRarity}
          rarityReason={profileCard.rarityReason}
          socialInteractions={socialInteractions}
          onDeleteRequest={handleDeleteAction}
          specificInteractions={profileSpecificInteractions}
          onHeaderIdentityClick={onHeaderIdentityClick}
          className={cardWrapperClassName}
        />
      );
    default:
      console.warn(
        "Rendering fallback for unhandled card type:",
        cardTypeActual,
        card
      );
      return (
        <div
          className={cn(
            cardWrapperClassName,
            "p-4 border border-dashed border-muted-foreground/50 rounded-2xl bg-muted/20 text-muted-foreground",
            "flex flex-col items-center justify-center shadow-lg relative"
          )}>
          <button
            onClick={() => handleDeleteAction(cardContextForBaseCard)}
            title="Delete Card"
            aria-label={`Delete ${
              cardContextForBaseCard.symbol || "unknown"
            } card`}
            className={cn(/* ... styles ... */)}
            data-interactive-child="true">
            <XIcon size={16} strokeWidth={2.5} />
          </button>
          <p className="font-semibold text-sm text-foreground">
            Unsupported Card
          </p>
          <p className="text-xs mt-1">ID: {cardId}</p>
          <p className="text-xs">Type: {cardTypeActual}</p>
          <p className="text-xs">Symbol: {cardSymbol}</p>
          {cardCurrentRarity && cardCurrentRarity !== "Common" && (
            <div className="mt-2 text-center border-t border-muted-foreground/20 pt-2 w-full">
              <Badge variant="outline" className="text-xs">
                {cardCurrentRarity}
              </Badge>
              {cardRarityReason && (
                <p className="text-xs mt-0.5 text-muted-foreground/80">
                  {cardRarityReason}
                </p>
              )}
            </div>
          )}
        </div>
      );
  }
};

export default GameCard;
