// src/app/collection/CollectionClientPage.tsx
"use client";

import React, { useState, useCallback } from "react";
import type { DisplayableCollectedCard } from "./page"; // Import from the server component
import GameCard from "@/components/game/GameCard"; // We'll adapt GameCard or create a new one
import type {
  DisplayableCard,
  ConcreteCardData,
} from "@/components/game/types";
import type {
  CardActionContext,
  BaseCardSocialInteractions,
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
import { Trash2, Edit3, Info } from "lucide-react"; // Icons for actions
import { format } from "date-fns";

interface CollectionClientPageProps {
  initialCollectedCards: DisplayableCollectedCard[];
}

// Function to adapt DisplayableCollectedCard to what GameCard expects (DisplayableCard)
function adaptCollectedToDisplayable(
  collectedCard: DisplayableCollectedCard
): DisplayableCard {
  // The core data is in card_data_snapshot. We need to ensure it aligns with ConcreteCardData
  // and add the UI state (isFlipped).
  // The 'type' field should be correctly within collectedCard.card_data_snapshot

  const concreteData = collectedCard.card_data_snapshot as ConcreteCardData;

  return {
    // Use properties from the ConcreteCardData part for GameCard compatibility
    id: concreteData.id || collectedCard.id, // Prefer ID from snapshot if it exists, else collection ID
    type: concreteData.type,
    symbol: concreteData.symbol,
    createdAt: new Date(collectedCard.captured_at).getTime(), // Use captured_at as a sort of "createdAt" for this view
    companyName: concreteData.companyName,
    logoUrl: concreteData.logoUrl,

    // Add specific data based on type, directly from the snapshot
    ...(concreteData.type === "price" && {
      faceData: concreteData.faceData,
      backData: concreteData.backData,
    }),
    ...(concreteData.type === "profile" && {
      staticData: concreteData.staticData,
      liveData: concreteData.liveData,
      backData: concreteData.backData,
    }),

    // UI state
    isFlipped: collectedCard.isFlipped,
  } as DisplayableCard; // Assert as DisplayableCard
}

export default function CollectionClientPage({
  initialCollectedCards,
}: CollectionClientPageProps) {
  const [collectedCards, setCollectedCards] = useState<
    DisplayableCollectedCard[]
  >(initialCollectedCards);
  const [cardToConfirmDelete, setCardToConfirmDelete] =
    useState<DisplayableCollectedCard | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const handleToggleFlipCard = useCallback((collectedCardId: string) => {
    setCollectedCards((prev) =>
      prev.map((cc) =>
        cc.id === collectedCardId ? { ...cc, isFlipped: !cc.isFlipped } : cc
      )
    );
  }, []);

  const requestDeleteCard = useCallback((card: DisplayableCollectedCard) => {
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

  // Social interactions for collected cards (likely simplified - e.g., no "save" again)
  const collectedCardSocialInteractions = useCallback(
    (collectedCard: DisplayableCollectedCard): BaseCardSocialInteractions => ({
      // onLike: () => toast({ title: "TODO", description: "Like collected card?" }),
      // onComment: () => toast({ title: "TODO", description: "Comment on collected card?" }),
      // No onSave for already collected cards
      // onShare: () => toast({ title: "TODO", description: "Share collected card?" }),
    }),
    [toast]
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
        {collectedCards.map((collectedCard) => {
          const displayableCardForGameCard =
            adaptCollectedToDisplayable(collectedCard);

          // Context for actions targeting the *collected card entry*
          const collectedCardActionContext: CardActionContext = {
            id: collectedCard.id, // Use the DB row ID for actions like delete
            symbol: collectedCard.symbol,
            type: collectedCard.card_type,
            companyName: collectedCard.company_name,
            logoUrl: collectedCard.logo_url,
          };

          return (
            <div
              key={collectedCard.id}
              className="flex flex-col items-center space-y-2">
              {/* Displaying captured card using GameCard */}
              {/* GameCard expects a DisplayableCard. We need to adapt collectedCard.card_data_snapshot */}
              <GameCard
                card={displayableCardForGameCard}
                onToggleFlip={() => handleToggleFlipCard(collectedCard.id)}
                // onDeleteCardRequest is more for dashboard cards. Here we use direct delete.
                // For collected cards, we might want different actions.
                // Let's make onDeleteCardRequest do nothing here or adapt GameCard.
                onDeleteCardRequest={() => {
                  // This onDeleteCardRequest on GameCard might not be what we want directly.
                  // We have requestDeleteCard(collectedCard) below.
                  // For now, let's pass a no-op or remove it if GameCard allows.
                  // Or, GameCard's onDeleteCardRequest could be made optional.
                }}
                socialInteractions={collectedCardSocialInteractions(
                  collectedCard
                )}
                // Price/Profile specific interactions might not be relevant for static collected cards,
                // or they would operate on the snapshot data. For now, passing undefined.
                priceSpecificInteractions={undefined}
                profileSpecificInteractions={undefined}
                // Header click might not be needed or could link to a detailed view of the collected card.
                onHeaderIdentityClick={undefined}
              />
              <div className="text-center w-full px-1">
                <p className="text-xs text-muted-foreground">
                  Captured:{" "}
                  {format(
                    new Date(collectedCard.captured_at),
                    "MMM d, yyyy HH:mm"
                  )}
                </p>
                {collectedCard.rarity_level && (
                  <p className="text-xs font-semibold text-primary">
                    {collectedCard.rarity_level}
                  </p>
                )}
                {/* Add action buttons for collection items */}
                <div className="flex justify-center space-x-2 mt-1">
                  {/* <Button variant="outline" size="xs" onClick={() => alert(`Notes for ${collectedCard.id}`)} title="View/Edit Notes">
                        <Edit3 size={14} /> <span className="ml-1 hidden sm:inline">Notes</span>
                    </Button> */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => requestDeleteCard(collectedCard)}
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
