// src/app/components/active-cards-section.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayableCard } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./active-cards";
import { useToast } from "@/hooks/use-toast";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types";

// Define which specific interaction callbacks PriceCardContent needs
// This should match the type expected by ActiveCardsPresentational and GameCard
type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface ActiveCardsSectionProps {
  activeCards: DisplayableCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
  onTakeSnapshot: (cardId?: string) => void;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  onTakeSnapshot,
}) => {
  const { toast } = useToast();
  const setActiveCardsRef = useRef(setActiveCards);

  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  const handleToggleFlipCard = useCallback((cardId: string) => {
    setActiveCardsRef.current((prevCards) =>
      prevCards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c
      )
    );
  }, []);

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);

  const handleDeleteRequest = useCallback((cardId: string) => {
    setCardIdToConfirmDelete(cardId);
  }, []);

  const confirmDeletion = useCallback(() => {
    if (cardIdToConfirmDelete) {
      setActiveCardsRef.current((prevCards) =>
        prevCards.filter((card) => card.id !== cardIdToConfirmDelete)
      );
      toast({
        title: "Card Removed",
        description: "The card has been removed.",
      });
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast]);

  const cancelDeletion = useCallback(() => {
    setCardIdToConfirmDelete(null);
  }, []);

  const handleLikeCard = useCallback(
    (context: CardActionContext) => {
      console.log("Like clicked for:", context.symbol, context.id);
      toast({ title: "Liked!", description: `You liked ${context.symbol}.` });
    },
    [toast]
  );

  const handleCommentCard = useCallback(
    (context: CardActionContext) => {
      console.log("Comment clicked for:", context.symbol, context.id);
      toast({ title: "Comment", description: `Comment on ${context.symbol}.` });
    },
    [toast]
  );

  const handleSaveCard = useCallback(
    (context: CardActionContext) => {
      console.log(
        "Save (Snapshot) clicked for card:",
        context.symbol,
        context.id
      );
      onTakeSnapshot(context.id);
    },
    [onTakeSnapshot]
  );

  const handleShareCard = useCallback(
    (context: CardActionContext) => {
      console.log("Share clicked for:", context.symbol, context.id);
      toast({ title: "Shared!", description: `Shared ${context.symbol}.` });
    },
    [toast]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = {
    onLike: handleLikeCard,
    onComment: handleCommentCard,
    onSave: handleSaveCard,
    onShare: handleShareCard,
  };

  // These are the handlers for price-specific interactions
  // Ensure the keys match what PriceSpecificInteractionsForContainer expects
  const priceSpecificInteractionHandlers: PriceSpecificInteractionsForContainer =
    {
      onPriceCardSmaClick: useCallback(
        (card: PriceCardData, smaPeriod: 50 | 200, smaValue: number) => {
          console.log("SMA Click:", card.symbol, smaPeriod, smaValue);
          toast({
            title: "SMA Interaction",
            description: `${smaPeriod}D SMA of ${smaValue.toFixed(
              2
            )} clicked on ${card.symbol}.`,
          });
        },
        [toast]
      ),
      onPriceCardRangeContextClick: useCallback(
        (
          card: PriceCardData,
          levelType: "High" | "Low",
          levelValue: number
        ) => {
          console.log(
            "Range Context Click:",
            card.symbol,
            levelType,
            levelValue
          );
          toast({
            title: "Range Interaction",
            description: `Day ${levelType} of ${levelValue.toFixed(
              2
            )} clicked on ${card.symbol}.`,
          });
        },
        [toast]
      ),
      onPriceCardOpenPriceClick: useCallback(
        (card: PriceCardData) => {
          console.log("Open Price Click:", card.symbol);
          toast({
            title: "Open Price Interaction",
            description: `Open price clicked on ${card.symbol}.`,
          });
        },
        [toast]
      ),
      onPriceCardGenerateDailyPerformanceSignal: useCallback(
        (card: PriceCardData) => {
          console.log("Generate Daily Perf Signal:", card.symbol);
          toast({
            title: "Daily Perf Signal Gen",
            description: `Signal generated for ${card.symbol}.`,
          });
        },
        [toast]
      ),
    };

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onToggleFlipCard={handleToggleFlipCard}
      onDeleteCardRequest={handleDeleteRequest}
      socialInteractions={socialInteractionsForCards}
      // Corrected prop name here:
      priceSpecificInteractions={priceSpecificInteractionHandlers}
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
