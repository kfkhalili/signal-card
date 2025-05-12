// src/app/collection/CollectionClientPage.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import type { ServerFetchedCollectedCard } from "./page";
import GameCard from "@/components/game/GameCard";
import type {
  DisplayableCard,
  DisplayableLivePriceCard,
  DisplayableProfileCard,
  ConcreteCardData,
} from "@/components/game/types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
  CardType,
} from "@/components/game/cards/base-card/base-card.types";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

interface ClientCollectedCard extends ServerFetchedCollectedCard {
  isFlipped: boolean;
}

interface CollectionClientPageProps {
  initialCollectedCards: ServerFetchedCollectedCard[];
}

// Refactored adapter function - DRYer and respects readonly
function adaptServerToDisplayable(
  serverCard: ServerFetchedCollectedCard,
  isFlipped: boolean
): DisplayableCard {
  const capturedAtTimestamp = new Date(serverCard.captured_at).getTime();

  // Prepare common display state and base data properties
  // These will be merged with the specific card data from the snapshot
  const commonData = {
    id: serverCard.id, // Use DB collection ID
    symbol: serverCard.symbol,
    // We will handle potential override/fallback for companyName/logoUrl below
    createdAt: capturedAtTimestamp,
    isFlipped: isFlipped,
    currentRarity: serverCard.rarity_level,
    rarityReason: serverCard.rarity_reason,
  };

  switch (serverCard.card_type) {
    case "price": {
      const snapshot = serverCard.card_data_snapshot as PriceCardData;
      // Construct the object directly, spreading snapshot first, then common data
      const card: DisplayableLivePriceCard = {
        ...snapshot, // Includes snapshot's type, faceData, backData, etc.
        ...commonData, // Overrides id, symbol, createdAt, state
        type: "price", // **Crucially override type to the specific literal**
        // Apply fallback logic for potentially readonly fields during construction
        companyName: serverCard.company_name ?? snapshot.companyName,
        logoUrl: serverCard.logo_url ?? snapshot.logoUrl,
      };
      return card;
    }
    case "profile": {
      const snapshot = serverCard.card_data_snapshot as ProfileCardData;
      // Construct the object directly
      const card: DisplayableProfileCard = {
        ...snapshot, // Includes snapshot's type, staticData, liveData, etc.
        ...commonData, // Overrides id, symbol, createdAt, state
        type: "profile", // **Crucially override type to the specific literal**
        // Apply fallback logic for potentially readonly fields during construction
        companyName: serverCard.company_name ?? snapshot.companyName,
        logoUrl: serverCard.logo_url ?? snapshot.logoUrl,
      };
      return card;
    }
    default: {
      // Handle unexpected card types - log error and provide a minimal fallback
      console.error(
        "Unhandled card type in adaptServerToDisplayable:",
        serverCard.card_type,
        serverCard
      );
      const snapshot = serverCard.card_data_snapshot;
      const fallbackCard = {
        ...(snapshot ?? {}), // Spread snapshot if exists, otherwise empty object
        ...commonData, // Add common fields
        type: serverCard.card_type, // Keep original type string
        // Apply fallback logic
        companyName: serverCard.company_name ?? snapshot?.companyName,
        logoUrl: serverCard.logo_url ?? snapshot?.logoUrl,
        // Ensure minimal required fields exist to avoid runtime errors downstream
        backData: snapshot?.backData ?? {
          description: `Unknown Card Type: ${serverCard.card_type}`,
        },
      };
      // This cast is necessary because we cannot guarantee conformance
      return fallbackCard as unknown as DisplayableCard;
    }
  }
}

export default function CollectionClientPage({
  initialCollectedCards,
}: CollectionClientPageProps) {
  const [collectedCards, setCollectedCards] = useState<ClientCollectedCard[]>(
    initialCollectedCards.map((card) => ({ ...card, isFlipped: false }))
  );
  const [cardToConfirmDelete, setCardToConfirmDelete] =
    useState<ClientCollectedCard | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    // console.log(
    //   "[CollectionClientPage] Initial server cards received:",
    //   initialCollectedCards
    // );
  }, [initialCollectedCards]);

  const handleToggleFlipCard = useCallback((collectedCardId: string) => {
    setCollectedCards((prev) =>
      prev.map((cc) =>
        cc.id === collectedCardId ? { ...cc, isFlipped: !cc.isFlipped } : cc
      )
    );
  }, []);

  const requestDeleteCard = useCallback((card: ClientCollectedCard) => {
    setCardToConfirmDelete(card);
  }, []);

  const confirmDeletion = useCallback(async () => {
    if (!cardToConfirmDelete) return;
    const { error } = await supabase
      .from("user_collected_cards")
      .delete()
      .eq("id", cardToConfirmDelete.id);

    if (error) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCollectedCards((prev) =>
        prev.filter((cc) => cc.id !== cardToConfirmDelete.id)
      );
      toast({
        title: "Card Deleted",
        description: `${
          cardToConfirmDelete.company_name || cardToConfirmDelete.symbol
        } removed from your collection.`,
      });
    }
    setCardToConfirmDelete(null);
  }, [cardToConfirmDelete, supabase, toast]);

  const cancelDeletion = useCallback(() => {
    setCardToConfirmDelete(null);
  }, []);

  const collectedCardSocialInteractions = useCallback(
    (collectedCard: ClientCollectedCard): BaseCardSocialInteractions => ({
      // Define interactions if needed
    }),
    []
  );

  if (collectedCards.length === 0) {
    return (
      <p className="text-center text-muted-foreground mt-10">
        Your card collection is empty. Go capture some cards!
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {collectedCards.map((clientCard) => {
          const displayableCardForGameCard = adaptServerToDisplayable(
            clientCard,
            clientCard.isFlipped
          );

          const collectedCardActionContext: CardActionContext = {
            id: clientCard.id,
            symbol: clientCard.symbol,
            type: clientCard.card_type,
            companyName: clientCard.company_name,
            logoUrl: clientCard.logo_url,
          };

          // Add a check for the fallback case from adaptServerToDisplayable
          // to prevent rendering potentially broken cards fully.
          if (
            !displayableCardForGameCard ||
            (displayableCardForGameCard.type !== "price" &&
              displayableCardForGameCard.type !== "profile")
          ) {
            console.warn(
              "Skipping render for card with unhandled or fallback type:",
              clientCard
            );
            // Optionally render a placeholder or skip entirely
            return (
              <div
                key={clientCard.id}
                className="p-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                Unsupported Card Type: {clientCard.card_type} <br />
                ID: {clientCard.id}
              </div>
            );
          }

          return (
            <div
              key={clientCard.id}
              className="flex flex-col items-center space-y-2">
              <GameCard
                card={displayableCardForGameCard}
                onToggleFlip={() => handleToggleFlipCard(clientCard.id)}
                onDeleteCardRequest={() => {
                  /* Deletion handled by button below */
                }}
                socialInteractions={collectedCardSocialInteractions(clientCard)}
                priceSpecificInteractions={undefined}
                profileSpecificInteractions={undefined}
                onHeaderIdentityClick={undefined}
              />
              <div className="text-center w-full px-1">
                <p className="text-xs text-muted-foreground">
                  Captured:{" "}
                  {format(new Date(clientCard.captured_at), "MMM d, yy HH:mm")}
                </p>
                <div className="flex justify-center space-x-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => requestDeleteCard(clientCard)}
                    title="Delete from Collection">
                    <Trash2 size={14} />{" "}
                    <span className="ml-1 hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cardToConfirmDelete && (
        <AlertDialog
          open={!!cardToConfirmDelete}
          onOpenChange={(open) => !open && cancelDeletion()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Collected Card?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this card (
                {cardToConfirmDelete.company_name || cardToConfirmDelete.symbol}
                ) from your collection? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeletion}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletion}
                className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
