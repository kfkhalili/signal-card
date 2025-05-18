// src/app/collection/CollectionClientPage.tsx
"use client";

import React, { useState, useCallback } from "react";
import type { ServerFetchedCollectedCard } from "./page";
import GameCard from "@/components/game/GameCard";
import type { DisplayableCard } from "@/components/game/types";
import type {
  BaseCardSocialInteractions,
  CardType,
} from "@/components/game/cards/base-card/base-card.types";
import { useToast } from "@/hooks/use-toast";
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

function adaptServerToDisplayable(
  serverCard: ServerFetchedCollectedCard,
  isFlipped: boolean
): DisplayableCard {
  const snapshot = serverCard.card_snapshot_data;
  const capturedAtTimestamp = new Date(serverCard.captured_at).getTime();

  const commonData = {
    id: snapshot.id,
    symbol: snapshot.symbol,
    createdAt: capturedAtTimestamp,
    isFlipped: isFlipped,
    currentRarity: snapshot.rarity_level,
    rarityReason: snapshot.rarity_reason,
    companyName: snapshot.company_name,
    logoUrl: snapshot.logo_url,
  };

  const concreteCardDataFromSnapshot = snapshot.card_data_snapshot;

  switch (snapshot.card_type) {
    case "price": {
      const priceSpecificData = concreteCardDataFromSnapshot as PriceCardData;
      const card: DisplayableCard = {
        ...priceSpecificData,
        ...commonData,
        type: "price",
      };
      return card;
    }
    case "profile": {
      const profileSpecificData =
        concreteCardDataFromSnapshot as ProfileCardData;
      const card: DisplayableCard = {
        ...profileSpecificData,
        ...commonData,
        type: "profile",
      };
      return card;
    }
    default: {
      console.error(
        "Unhandled card type in adaptServerToDisplayable:",
        snapshot.card_type,
        serverCard
      );
      const fallbackCard = {
        ...(concreteCardDataFromSnapshot ?? {}),
        ...commonData,
        type: snapshot.card_type as CardType, // Assert CardType
        backData: (
          concreteCardDataFromSnapshot as { backData?: { description: string } }
        )?.backData ?? {
          description: `Unknown Card Type: ${snapshot.card_type}`,
        },
      };
      return fallbackCard as unknown as DisplayableCard; // Final assertion for safety
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

  const handleToggleFlipCard = useCallback((displayableCardId: string) => {
    setCollectedCards((prev) =>
      prev.map((cc) =>
        cc.snapshot_id === displayableCardId
          ? { ...cc, isFlipped: !cc.isFlipped }
          : cc
      )
    );
  }, []);

  const requestDeleteCard = useCallback((card: ClientCollectedCard) => {
    setCardToConfirmDelete(card);
  }, []);

  const confirmDeletion = useCallback(async () => {
    if (!cardToConfirmDelete) return;

    try {
      const response = await fetch(
        `/api/collections/remove/${cardToConfirmDelete.user_collection_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.error ||
            `Failed to remove card (status ${response.status})`
        );
      }

      setCollectedCards((prev) =>
        prev.filter(
          (cc) =>
            cc.user_collection_id !== cardToConfirmDelete.user_collection_id
        )
      );
      toast({
        title: "Card Removed",
        description: `${
          cardToConfirmDelete.card_snapshot_data.company_name ||
          cardToConfirmDelete.card_snapshot_data.symbol
        } removed from your collection.`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "unknown error occurred";
      toast({
        title: "Removal Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCardToConfirmDelete(null);
    }
  }, [cardToConfirmDelete, toast]);

  const cancelDeletion = useCallback(() => {
    setCardToConfirmDelete(null);
  }, []);

  const collectedCardSocialInteractions = useCallback(():
    | BaseCardSocialInteractions
    | undefined => {
    // Removed _unusedClientCard
    return {
      onLike: async () => {
        toast({ title: "Liked from collection!" });
      },
    };
  }, [toast]);

  if (collectedCards.length === 0) {
    return (
      <p className="text-center text-muted-foreground mt-10">
        Your card collection is empty. Go capture some cards from the workspace!
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

          if (
            !displayableCardForGameCard ||
            (displayableCardForGameCard.type !== "price" &&
              displayableCardForGameCard.type !== "profile")
          ) {
            return (
              <div
                key={clientCard.user_collection_id}
                className="p-4 border border-dashed rounded-lg text-xs text-muted-foreground">
                Unsupported Card Type: {clientCard.card_snapshot_data.card_type}
                <br />
                Collection ID: {clientCard.user_collection_id}
              </div>
            );
          }

          return (
            <div
              key={clientCard.user_collection_id}
              className="flex flex-col items-center space-y-2">
              <GameCard
                card={displayableCardForGameCard}
                onToggleFlip={() =>
                  handleToggleFlipCard(displayableCardForGameCard.id)
                }
                onDeleteCardRequest={() => {
                  /* Deletion handled by button below */
                }}
                socialInteractions={collectedCardSocialInteractions()} // Invoked without argument
              />
              <div className="text-center w-full px-1">
                <p className="text-xs text-muted-foreground">
                  Collected:
                  {format(new Date(clientCard.captured_at), "MMM d, yy HH:mm")}
                </p>
                {clientCard.user_notes && (
                  <p
                    className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2"
                    title={clientCard.user_notes}>
                    Notes: {clientCard.user_notes}
                  </p>
                )}
                <div className="flex justify-center space-x-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => requestDeleteCard(clientCard)}
                    title="Remove from Collection">
                    <Trash2 size={14} />
                    <span className="ml-1 hidden sm:inline">Remove</span>
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
              <AlertDialogTitle>Remove From Collection?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this card (
                {cardToConfirmDelete.card_snapshot_data.company_name ||
                  cardToConfirmDelete.card_snapshot_data.symbol}
                ) from your collection? This will not delete likes or comments
                on the underlying snapshot made by others.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeletion}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletion}
                className="bg-destructive hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
