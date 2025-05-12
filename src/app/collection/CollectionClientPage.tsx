// src/app/collection/CollectionClientPage.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react"; // Added useEffect for one-time log
import type { DisplayableCollectedCard } from "./page";
import GameCard from "@/components/game/GameCard";
import type {
  DisplayableCard,
  ConcreteCardData,
  DisplayableCardState,
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

interface CollectionClientPageProps {
  initialCollectedCards: DisplayableCollectedCard[];
}

function adaptCollectedToDisplayable(
  collectedCard: DisplayableCollectedCard
): DisplayableCard {
  const concreteDataFromSnapshot =
    collectedCard.card_data_snapshot as ConcreteCardData;

  // Log the incoming collectedCard, specifically its rarity_reason
  console.log(
    `[CollectionClientPage - adaptCollectedToDisplayable] INPUT for ${collectedCard.symbol}:`,
    `collectedCard.rarity_level = '${collectedCard.rarity_level}'`,
    `collectedCard.rarity_reason = '${
      collectedCard.rarity_reason
    }' (Type: ${typeof collectedCard.rarity_reason})`
  );

  const uiState: DisplayableCardState = {
    isFlipped: collectedCard.isFlipped,
    currentRarity: collectedCard.rarity_level,
    rarityReason: collectedCard.rarity_reason, // This is the critical mapping
  };

  let adaptedCardBase: ConcreteCardData;

  switch (concreteDataFromSnapshot.type) {
    case "price":
      adaptedCardBase = {
        ...(concreteDataFromSnapshot as PriceCardData),
        id: collectedCard.id,
        createdAt: new Date(collectedCard.captured_at).getTime(),
        companyName:
          collectedCard.company_name || concreteDataFromSnapshot.companyName,
        logoUrl: collectedCard.logo_url || concreteDataFromSnapshot.logoUrl,
      };
      break;
    case "profile":
      adaptedCardBase = {
        ...(concreteDataFromSnapshot as ProfileCardData),
        id: collectedCard.id,
        createdAt: new Date(collectedCard.captured_at).getTime(),
        companyName:
          collectedCard.company_name || concreteDataFromSnapshot.companyName,
        logoUrl: collectedCard.logo_url || concreteDataFromSnapshot.logoUrl,
      };
      break;
    default:
      const unknownBase = concreteDataFromSnapshot as any;
      console.error(
        "Unhandled card type in adaptCollectedToDisplayable:",
        unknownBase?.type
      );
      adaptedCardBase = {
        id: collectedCard.id,
        type: collectedCard.card_type,
        symbol: collectedCard.symbol,
        createdAt: new Date(collectedCard.captured_at).getTime(),
        companyName: collectedCard.company_name,
        logoUrl: collectedCard.logo_url,
        backData: {
          description: `Data for ${collectedCard.symbol} of type ${collectedCard.card_type}`,
        },
      } as ConcreteCardData;
  }

  const finalDisplayableCard = {
    ...adaptedCardBase,
    ...uiState,
  } as DisplayableCard;

  // Log the output that GameCard will receive
  console.log(
    `[CollectionClientPage - adaptCollectedToDisplayable] OUTPUT for ${finalDisplayableCard.symbol}:`,
    `finalDisplayableCard.currentRarity = '${finalDisplayableCard.currentRarity}'`,
    `finalDisplayableCard.rarityReason = '${
      finalDisplayableCard.rarityReason
    }' (Type: ${typeof finalDisplayableCard.rarityReason})`
  );

  return finalDisplayableCard;
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

  // Log initial props once
  useEffect(() => {
    console.log(
      "[CollectionClientPage] Initial collected cards received:",
      initialCollectedCards
    );
  }, [initialCollectedCards]);

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

  const collectedCardSocialInteractions = useCallback(
    (_collectedCard: DisplayableCollectedCard): BaseCardSocialInteractions => ({
      // Minimal social interactions for collected cards view
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
        {collectedCards.map((collectedCard) => {
          const displayableCardForGameCard =
            adaptCollectedToDisplayable(collectedCard);

          const collectedCardActionContext: CardActionContext = {
            id: collectedCard.id,
            symbol: collectedCard.symbol,
            type: collectedCard.card_type,
            companyName: collectedCard.company_name,
            logoUrl: collectedCard.logo_url,
          };

          // Log what GameCard is receiving
          //   console.log(`[CollectionClientPage - map] Passing to GameCard for ${displayableCardForGameCard.symbol}:`,
          //     `currentRarity: '${displayableCardForGameCard.currentRarity}',`,
          //     `rarityReason: '${displayableCardForGameCard.rarityReason}'`
          //   );

          return (
            <div
              key={collectedCard.id}
              className="flex flex-col items-center space-y-2">
              <GameCard
                card={displayableCardForGameCard}
                onToggleFlip={() => handleToggleFlipCard(collectedCard.id)}
                onDeleteCardRequest={() => {
                  /* Deletion handled by button below */
                }}
                socialInteractions={collectedCardSocialInteractions(
                  collectedCard
                )}
                priceSpecificInteractions={undefined}
                profileSpecificInteractions={undefined}
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
                <div className="flex justify-center space-x-2 mt-1">
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
