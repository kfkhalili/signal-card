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
import type {
  PriceCardData,
  // PriceCardStaticData, // Not directly used here
  // PriceCardLiveData, // Not directly used here
} from "@/components/game/cards/price-card/price-card.types";
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
  const snapshot = serverCard.card_snapshot_data; // This is CardSnapshotFromDB, now with counts
  const capturedAtTimestamp = new Date(serverCard.captured_at).getTime();

  const commonData = {
    symbol: snapshot.symbol,
    createdAt: capturedAtTimestamp,
    isFlipped: isFlipped,
    currentRarity: snapshot.rarity_level,
    rarityReason: snapshot.rarity_reason,
    companyName: snapshot.company_name,
    logoUrl: snapshot.logo_url,
    likeCount: snapshot.like_count,
    commentCount: snapshot.comment_count,
    collectionCount: snapshot.collection_count,
    // isLikedByCurrentUser and isSavedByCurrentUser are part of DisplayableCardState.
    // They need to be fetched and populated here if they are to be accurate for the current user.
    // For now, they will be undefined if not explicitly set.
    // Example: isLikedByCurrentUser: checkUserLikeStatus(snapshot.id),
  };

  const concreteCardDataFromSnapshot = snapshot.card_data_snapshot;
  const displayId = snapshot.id;

  switch (snapshot.card_type) {
    case "price": {
      const priceSpecificData = concreteCardDataFromSnapshot as PriceCardData;
      const card: DisplayableCard = {
        ...priceSpecificData,
        id: displayId,
        ...commonData, // commonData includes counts, but not user-specific like/save status yet
        type: "price",
        // Ensure DisplayableCardState properties are considered; they might be undefined if not in commonData
        isLikedByCurrentUser: undefined, // Placeholder: fetch or determine actual status
        isSavedByCurrentUser: undefined, // Placeholder: fetch or determine actual status
      };
      return card;
    }
    case "profile": {
      const profileSpecificData =
        concreteCardDataFromSnapshot as ProfileCardData;
      const card: DisplayableCard = {
        ...profileSpecificData,
        id: displayId,
        ...commonData,
        type: "profile",
        isLikedByCurrentUser: undefined, // Placeholder
        isSavedByCurrentUser: undefined, // Placeholder
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
        id: displayId,
        ...commonData,
        type: snapshot.card_type as CardType,
        backData: (concreteCardDataFromSnapshot as any)?.backData || {
          description: `Unknown Card Type: ${snapshot.card_type}`,
        },
        isLikedByCurrentUser: undefined, // Placeholder
        isSavedByCurrentUser: undefined, // Placeholder
      };
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

  const handleToggleFlipCard = useCallback((displayableCardId: string) => {
    setCollectedCards((prev) =>
      prev.map((cc) =>
        cc.card_snapshot_data.id === displayableCardId
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
    return {
      onLike: async () => {
        toast({
          title: "Like action on collected card triggered (snapshot like TBD).",
        });
      },
      onComment: async () => {
        toast({
          title:
            "Comment action on collected card triggered (snapshot comments TBD).",
        });
      },
      onShare: async () => {
        toast({
          title:
            "Share action on collected card triggered (snapshot share TBD).",
        });
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
                card={displayableCardForGameCard} // This object now contains all necessary states
                onToggleFlip={() =>
                  handleToggleFlipCard(displayableCardForGameCard.id)
                }
                onDeleteCardRequest={() => {
                  /* Deletion handled by button below */
                }}
                socialInteractions={collectedCardSocialInteractions()}
                onGenericInteraction={() => {
                  toast({
                    title: "Interaction Disabled",
                    description:
                      "Card creation from collection items is not supported.",
                  });
                }}
                isSaveDisabled={true}
                // GameCard will derive likeCount, commentCount, collectionCount,
                // isLikedByCurrentUser, and isSavedByCurrentUser from the `card` prop.
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
