// src/hooks/useCardActions.ts
import React, { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToastFunctionType } from "@/hooks/use-toast"; // Correct import
import type { DisplayableCard } from "@/components/game/types";
import type { CardActionContext } from "@/components/game/cards/base-card/base-card.types";
import type { ProfileDBRow } from "./useStockData";
import { createDisplayableProfileCardFromDB } from "@/components/game/cards/profile-card/profileCardUtils";

interface UseCardActionsProps {
  activeCards: DisplayableCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
  toast: ToastFunctionType; // Use the correct type
  supabase: SupabaseClient;
}

export function useCardActions({
  activeCards,
  setActiveCards,
  toast,
  supabase,
}: UseCardActionsProps) {
  const addProfileCardFromContext = useCallback(
    async (context: CardActionContext): Promise<void> => {
      const existingProfileCard = activeCards.find(
        (card) => card.type === "profile" && card.symbol === context.symbol
      );

      if (existingProfileCard) {
        toast({
          title: "Profile Card Active",
          description: `Profile card for ${context.symbol} is already displayed. Moving it next to source.`,
        });
        setActiveCards((prevCards) => {
          const currentCards = [...prevCards];
          const sourceCardIndex = currentCards.findIndex(
            (card) => card.id === context.id
          );
          const profileCardCurrentIndex = currentCards.findIndex(
            (card) => card.id === existingProfileCard.id
          );

          if (
            sourceCardIndex !== -1 &&
            profileCardCurrentIndex !== -1 &&
            profileCardCurrentIndex !== sourceCardIndex + 1
          ) {
            const [profileToMove] = currentCards.splice(
              profileCardCurrentIndex,
              1
            );
            const targetInsertIndex =
              profileCardCurrentIndex < sourceCardIndex
                ? sourceCardIndex
                : sourceCardIndex + 1;
            currentCards.splice(targetInsertIndex, 0, profileToMove);
            return currentCards;
          }
          return prevCards;
        });
        return;
      }

      toast({
        title: "Fetching Profile...",
        description: `Loading profile for ${context.symbol}.`,
      });
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("symbol", context.symbol)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const profileDBData = data as ProfileDBRow;
          const newProfileCard =
            createDisplayableProfileCardFromDB(profileDBData);

          setActiveCards((prevCards) => {
            const cards = [...prevCards];
            const sourceCardIndex = cards.findIndex(
              (card) => card.id === context.id
            );
            if (sourceCardIndex !== -1) {
              cards.splice(sourceCardIndex + 1, 0, newProfileCard);
            } else {
              cards.unshift(newProfileCard);
            }
            return cards as DisplayableCard[];
          });
          toast({
            title: "Profile Loaded!",
            description: `Profile for ${context.symbol} is now active.`,
          });
        } else {
          toast({
            title: "Profile Not Found",
            description: `No profile data found for ${context.symbol}.`,
            variant: "destructive",
          });
        }
      } catch (err: unknown) {
        console.error("Error fetching profile for new card:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        toast({
          title: "Error Loading Profile",
          description: `Could not load profile for ${context.symbol}: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
    [activeCards, setActiveCards, supabase, toast]
  );

  return { addProfileCardFromContext };
}
