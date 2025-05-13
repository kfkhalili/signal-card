// src/components/game/ActiveCardsSection.tsx
import React, { useCallback, useState, useMemo } from "react";
import type { DisplayableCard } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types";
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions";
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions";
import type { ProfileCardInteractionCallbacks } from "./cards/profile-card/profile-card.types";
import type { PriceCardInteractionCallbacks } from "./cards/price-card/price-card.types";

// createClient and useCardActions are not directly used here anymore for adding profile cards
// as that logic is now passed via onHeaderIdentityClick from WorkspacePage.
// import { createClient as createSupabaseFrontendClient } from "@/lib/supabase/client";
// import { useCardActions } from "@/hooks/useCardActions";
import { useAuth } from "@/contexts/AuthContext";

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
  profileSpecificInteractions?: ProfileCardInteractionCallbacks;
  priceSpecificInteractions?: PriceSpecificInteractionsForContainer;
  onHeaderIdentityClick?: (context: CardActionContext) => void; // <<< ADDED THIS PROP
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  profileSpecificInteractions,
  priceSpecificInteractions,
  onHeaderIdentityClick, // Destructure the new prop
}) => {
  const { toast } = useAppToast();
  // const supabaseFrontendClient = createSupabaseFrontendClient(); // Not directly used here
  const { user, isLoading: isLoadingAuth } = useAuth();

  // The addProfileCardFromContext logic is now handled by WorkspacePage via onHeaderIdentityClick
  // const { addProfileCardFromContext } = useCardActions({ ... });

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);

  const handleDeleteRequest = useCallback((cardId: string): void => {
    setCardIdToConfirmDelete(cardId);
  }, []);

  const confirmDeletion = useCallback((): void => {
    if (cardIdToConfirmDelete) {
      setActiveCards((prevCards) =>
        prevCards.filter((card) => card.id !== cardIdToConfirmDelete)
      );
      setTimeout(
        () =>
          toast({
            title: "Card Removed",
            description: "The card has been removed from view.",
          }),
        0
      );
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast, setActiveCards]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  const handleCaptureCardToCollection = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth) {
        /* ... */ return;
      }
      if (!user) {
        /* ... */ return;
      }
      const cardToCapture = activeCards.find((c) => c.id === context.id);
      if (!cardToCapture) {
        /* ... */ return;
      }
      setTimeout(
        () =>
          toast({
            /* ... */
          }),
        0
      );
      // ... (rest of capture logic)
    },
    [user, isLoadingAuth, activeCards, toast]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: (ctx) =>
        setTimeout(
          () =>
            toast({
              title: "Liked!",
              description: `You liked ${ctx.symbol}. (Not implemented)`,
            }),
          0
        ),
      onComment: (ctx) =>
        setTimeout(
          () =>
            toast({
              title: "Comment Action",
              description: `Comment on ${ctx.symbol}. (Not implemented)`,
            }),
          0
        ),
      onSave: handleCaptureCardToCollection,
      onShare: (ctx) =>
        setTimeout(
          () =>
            toast({
              title: "Share Action",
              description: `Shared ${ctx.symbol}. (Not implemented)`,
            }),
          0
        ),
    }),
    [toast, handleCaptureCardToCollection]
  );

  const finalPriceSpecificInteractions =
    priceSpecificInteractions ||
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);
  const finalProfileSpecificInteractions =
    profileSpecificInteractions ||
    useMemo(() => getProfileCardInteractionHandlers(toast), [toast]);

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onToggleFlipCard={(id: string) =>
        setActiveCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isFlipped: !c.isFlipped } : c))
        )
      }
      onDeleteCardRequest={handleDeleteRequest}
      socialInteractions={socialInteractionsForCards}
      priceSpecificInteractions={finalPriceSpecificInteractions}
      profileSpecificInteractions={finalProfileSpecificInteractions}
      onHeaderIdentityClick={onHeaderIdentityClick} // <<< PASSING IT DOWN
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
