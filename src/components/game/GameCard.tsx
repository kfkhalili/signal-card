// src/components/game/GameCard.tsx
import React from "react";
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardInteractionCallbacks,
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

type DisplayableLivePriceCard = PriceCardData & DisplayableCardState;
type DisplayableUserProfileCard = ProfileCardData & DisplayableCardState;

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void;
  readonly socialInteractions?: BaseCardSocialInteractions;
  readonly priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  readonly profileSpecificInteractions?: ProfileCardInteractionCallbacks;
  readonly onHeaderIdentityClick?: (context: CardActionContext) => void;
}

const GameCard: React.FC<GameCardProps> = ({
  card, // card is DisplayableCard
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

  // Destructure properties from 'card' that are needed both inside and outside the switch,
  // especially for the default case to avoid 'never' type issues.
  const {
    id: cardId, // Renamed to avoid conflict if 'id' is used elsewhere
    symbol: cardSymbol,
    type: cardTypeActual, // This is the actual type string from the card data
    companyName: cardCompanyName,
    logoUrl: cardLogoUrl,
    currentRarity: cardCurrentRarity, // From DisplayableCardState
    rarityReason: cardRarityReason, // From DisplayableCardState
  } = card;

  const cardContextForBaseCard: CardActionContext = {
    id: cardId,
    symbol: cardSymbol,
    type: cardTypeActual as CardType, // Assert that the string is one of the known CardType literals
    companyName: cardCompanyName ?? null,
    logoUrl: cardLogoUrl ?? null,
  };

  const cardWrapperClassName = "w-full aspect-[63/88] relative";

  switch (
    card.type // Switch on card.type (which is the same as cardTypeActual)
  ) {
    case "price":
      const priceCard = card as DisplayableLivePriceCard;
      return (
        <PriceCardContainer
          cardData={priceCard}
          isFlipped={priceCard.isFlipped}
          onFlip={handleFlip}
          cardContext={cardContextForBaseCard}
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
      const profileCard = card as DisplayableUserProfileCard;
      return (
        <ProfileCardContainer
          cardData={profileCard}
          isFlipped={profileCard.isFlipped}
          onFlip={handleFlip}
          cardContext={cardContextForBaseCard}
          currentRarity={profileCard.currentRarity}
          rarityReason={profileCard.rarityReason}
          socialInteractions={socialInteractions}
          onDeleteRequest={handleDeleteAction}
          specificInteractions={profileSpecificInteractions}
          onHeaderIdentityClick={onHeaderIdentityClick}
          className={cardWrapperClassName}
        />
      );
    // Add other cases for known card types here

    default:
      // Use the destructured variables from the outer scope for display
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
            className={cn(
              "absolute top-1.5 right-1.5 z-20 p-1.5 flex items-center justify-center transition-colors",
              "text-muted-foreground/70 hover:text-destructive rounded-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            )}
            data-interactive-child="true">
            <XIcon size={16} strokeWidth={2.5} />
          </button>
          <p className="font-semibold text-sm text-foreground">
            Unsupported Card
          </p>
          {/* Use destructured variables that are not narrowed to 'never' */}
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
