// src/components/game/GameCard.tsx
import React from "react";
import type { DisplayableCard } from "@/components/game/types";
import type { ProfileCardData } from "./cards/profile-card/profile-card.types";
import type {
  CardActionContext,
  OnGenericInteraction, // Ensure this is imported
} from "./cards/base-card/base-card.types";
import { cn } from "@/lib/utils";
import {
  getCardRenderer,
  type RegisteredCardRendererProps,
} from "@/components/game/cardRenderers"; // Import RegisteredCardRendererProps for type safety
import "@/components/game/cards/rendererRegistryInitializer";

// Removed PriceSpecificInteractionsForContainer if not used

// Update GameCardProps to align with what it needs to pass to RegisteredCardRendererProps
// It should expect onGenericInteraction and other common props.
interface GameCardProps {
  readonly card: DisplayableCard;
  readonly onToggleFlip: (id: string) => void;
  readonly onDeleteCardRequest: (id: string) => void; // Handler in GameCard's parent
  readonly onHeaderIdentityClick?: (context: CardActionContext) => void; // Could also use onGenericInteraction

  // The crucial generic interaction handler
  readonly onGenericInteraction: OnGenericInteraction;

  // Optional styling passthrough
  readonly className?: string;
  readonly innerCardClassName?: string;
}

const GameCard: React.FC<GameCardProps> = ({
  card,
  onToggleFlip,
  onDeleteCardRequest,
  onHeaderIdentityClick,
  onGenericInteraction,
  className,
  innerCardClassName,
}) => {
  const handleFlip = React.useCallback(() => {
    onToggleFlip(card.id);
  }, [onToggleFlip, card.id]);

  const cardActionContextValue: CardActionContext = React.useMemo(() => {
    let websiteUrlForContext: string | null | undefined = undefined;
    if (card.type === "profile") {
      const profileCardData = card as ProfileCardData;
      websiteUrlForContext = profileCardData.staticData?.website;
    }
    return {
      id: card.id,
      symbol: card.symbol,
      type: card.type,
      companyName: card.companyName ?? null,
      logoUrl: card.logoUrl ?? null,
      websiteUrl: websiteUrlForContext ?? null,
    };
  }, [card]);

  // This adapter is for BaseCard's onDeleteRequest, which expects a CardActionContext
  const handleDeleteRequestWithContextAdapter = React.useCallback(
    (context: CardActionContext) => {
      onDeleteCardRequest(context.id);
    },
    [onDeleteCardRequest]
  );

  const cardWrapperClassName = cn("w-full aspect-[63/88] relative", className);

  const CardRenderer = getCardRenderer(card.type);

  if (!CardRenderer) {
    const unknownType = card.type;
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[GameCard] No renderer registered for card type: ${unknownType}. Card ID: ${card.id}`
      );
    }
    return (
      <div
        className={cn(
          cardWrapperClassName,
          "p-4 border border-dashed rounded-lg flex items-center justify-center text-destructive bg-destructive/10"
        )}>
        <p className="text-center text-xs">
          <strong>Unsupported Card Type</strong>
          <br />
          Type: {unknownType || "Unknown"}
          <br />
          ID: {card.id}
        </p>
      </div>
    );
  }

  // Construct props that match RegisteredCardRendererProps
  const rendererProps: RegisteredCardRendererProps = {
    cardData: card, // Pass the full DisplayableCard object
    isFlipped: card.isFlipped,
    onFlip: handleFlip,
    cardContext: cardActionContextValue,
    onDeleteRequest: handleDeleteRequestWithContextAdapter,
    onHeaderIdentityClick: onHeaderIdentityClick, // This could also be refactored to use onGenericInteraction if BaseCard handles it
    className: cardWrapperClassName, // Or pass undefined if GameCard is the one using this className
    innerCardClassName: innerCardClassName,

    // Ensure these are passed FORWARD to the renderer
    onGenericInteraction: onGenericInteraction,
    sourceCardId: card.id,
    sourceCardSymbol: card.symbol,
    sourceCardType: card.type,
  };

  return <CardRenderer {...rendererProps} />;
};

export default React.memo(GameCard);
