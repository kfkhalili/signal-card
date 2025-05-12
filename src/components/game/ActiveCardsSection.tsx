// src/components/game/ActiveCardsSection.tsx
import React, { useCallback, useState, useMemo } from "react";
import type { DisplayableCard, ConcreteCardData } from "./types";
import { ActiveCards as ActiveCardsPresentational } from "./ActiveCards";
import { useToast as useAppToast } from "@/hooks/use-toast";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types";
import { getPriceCardInteractionHandlers } from "./cards/price-card/priceCardInteractions";
import { getProfileCardInteractionHandlers } from "./cards/profile-card/profileCardInteractions";
import type {
  ProfileCardInteractionCallbacks,
  ProfileCardData,
} from "./cards/profile-card/profile-card.types";
import type {
  PriceCardInteractionCallbacks,
  PriceCardData,
} from "./cards/price-card/price-card.types";

import { createClient as createSupabaseFrontendClient } from "@/lib/supabase/client";
import { useCardActions } from "@/hooks/useCardActions";
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
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
}) => {
  const { toast } = useAppToast();
  const supabaseFrontendClient = createSupabaseFrontendClient();
  const { user, isLoading: isLoadingAuth } = useAuth();

  const { addProfileCardFromContext } = useCardActions({
    activeCards,
    setActiveCards,
    toast,
    supabase: supabaseFrontendClient,
  });

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
      toast({
        title: "Card Removed",
        description: "The card has been removed from view.",
      });
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast, setActiveCards]);

  const cancelDeletion = useCallback((): void => {
    setCardIdToConfirmDelete(null);
  }, []);

  const handleCaptureCardToCollection = useCallback(
    async (context: CardActionContext) => {
      if (isLoadingAuth) {
        toast({
          title: "Please wait",
          description: "Verifying authentication state...",
        });
        return;
      }
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save cards to your collection.",
          variant: "destructive",
        });
        return;
      }

      const cardToCapture = activeCards.find((c) => c.id === context.id);
      if (!cardToCapture) {
        toast({
          title: "Error",
          description: "Card not found to capture.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Capturing Card...",
        description: `Saving ${
          cardToCapture.companyName || cardToCapture.symbol
        } to your collection.`,
      });

      let concreteDataForSnapshot: ConcreteCardData;

      switch (
        cardToCapture.type // Switch on cardToCapture.type
      ) {
        case "price":
          const priceCard = cardToCapture as PriceCardData;
          concreteDataForSnapshot = {
            id: priceCard.id,
            type: priceCard.type,
            symbol: priceCard.symbol,
            createdAt: priceCard.createdAt,
            companyName: priceCard.companyName,
            logoUrl: priceCard.logoUrl,
            faceData: priceCard.faceData,
            backData: priceCard.backData,
          };
          break;
        case "profile":
          const profileCard = cardToCapture as ProfileCardData;
          concreteDataForSnapshot = {
            id: profileCard.id,
            type: profileCard.type,
            symbol: profileCard.symbol,
            createdAt: profileCard.createdAt,
            companyName: profileCard.companyName,
            logoUrl: profileCard.logoUrl,
            staticData: profileCard.staticData,
            liveData: profileCard.liveData,
            backData: profileCard.backData,
          };
          break;
        // Add cases for other ConcreteCardData types if they exist
        // case 'price_snapshot':
        //     const priceSnapshotCard = cardToCapture as PriceCardSnapshotData;
        //     concreteDataForSnapshot = { /* ... */ };
        //     break;
        default:
          // Use `context.type` for logging/toast message as `cardToCapture.type`
          // would be problematic if `cardToCapture` is narrowed to `never` here.
          // `context` is from the function argument and its type is stable.
          console.error(
            "Cannot capture card of unknown type (from context):",
            context.type
          );
          toast({
            title: "Capture Error",
            description: `Cannot capture card of type: ${context.type}.`,
            variant: "destructive",
          });
          return;
      }

      try {
        const requestBody = {
          cardType: cardToCapture.type,
          symbol: cardToCapture.symbol,
          companyName: cardToCapture.companyName,
          logoUrl: cardToCapture.logoUrl,
          cardDataSnapshot: concreteDataForSnapshot,
          sourceCardId: cardToCapture.id,
          currentRarity: cardToCapture.currentRarity,
          rarityReason: cardToCapture.rarityReason,
        };

        const response = await fetch("/api/collection/capture-card", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            toast({
              title: "Already Collected",
              description:
                result.error ||
                "You've already collected a card with this state.",
              variant: "default",
            });
          } else {
            throw new Error(
              result.error ||
                `Failed to capture card (status: ${response.status})`
            );
          }
        } else {
          toast({
            title: "Card Captured!",
            description: `${
              cardToCapture.companyName || cardToCapture.symbol
            } added to your collection.`,
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error("Failed to capture card to collection:", error);
        toast({
          title: "Capture Failed",
          description:
            error.message || "Could not save card to your collection.",
          variant: "destructive",
        });
      }
    },
    [user, isLoadingAuth, activeCards, toast]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = useMemo(
    () => ({
      onLike: (ctx) =>
        toast({
          title: "Liked!",
          description: `You liked ${ctx.symbol}. (Not implemented)`,
        }),
      onComment: (ctx) =>
        toast({
          title: "Comment Action",
          description: `Comment on ${ctx.symbol}. (Not implemented)`,
        }),
      onSave: handleCaptureCardToCollection,
      onShare: (ctx) =>
        toast({
          title: "Share Action",
          description: `Shared ${ctx.symbol}. (Not implemented)`,
        }),
    }),
    [toast, handleCaptureCardToCollection]
  );

  const priceSpecificInteractionHandlers: PriceSpecificInteractionsForContainer =
    useMemo(() => getPriceCardInteractionHandlers(toast), [toast]);

  const profileSpecificInteractionHandlers: ProfileCardInteractionCallbacks =
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
      priceSpecificInteractions={priceSpecificInteractionHandlers}
      profileSpecificInteractions={profileSpecificInteractionHandlers}
      onHeaderIdentityClick={addProfileCardFromContext}
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
