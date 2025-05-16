// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";

// Types and Utils
import type {
  DisplayableCard,
  DisplayableLivePriceCard,
} from "@/components/game/types";
import type { AddCardFormValues } from "@/components/workspace/AddCardForm";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardLiveData,
} from "@/components/game/cards/profile-card/profile-card.types";

import {
  createDisplayableProfileCardFromDB,
  transformProfileDBRowToStaticData,
} from "@/components/game/cards/profile-card/profileCardUtils";
import {
  createPriceCardFaceDataFromQuote,
  createPriceCardBackDataFromQuote,
  createDisplayablePriceCard,
} from "@/components/game/cards/price-card/priceCardUtils";

import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { CombinedQuoteData, ProfileDBRow } from "@/hooks/useStockData";
import { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";
import { format, parseISO } from "date-fns";

// Import the extracted utility
import { updateOrAddCard } from "@/lib/workspaceUtils"; // Adjust path if needed

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

interface UseWorkspaceManagerProps {
  supabase: SupabaseClient;
  isPremiumUser: boolean;
}

interface AddCardOptions {
  requestingCardId?: string;
}

export function useWorkspaceManager({
  supabase,
  isPremiumUser,
}: UseWorkspaceManagerProps) {
  const { toast } = useToast();

  const [initialCardsFromStorage, setCardsInLocalStorage] = useLocalStorage<
    DisplayableCard[]
  >(WORKSPACE_LOCAL_STORAGE_KEY, INITIAL_ACTIVE_CARDS);

  const [activeCards, setActiveCards] = useState<DisplayableCard[]>(() =>
    Array.isArray(initialCardsFromStorage)
      ? (initialCardsFromStorage
          .map(rehydrateCardFromStorage)
          .filter(Boolean) as DisplayableCard[])
      : INITIAL_ACTIVE_CARDS
  );

  const [workspaceSymbolForRegularUser, setWorkspaceSymbolForRegularUser] =
    useState<string | null>(null);
  const [isAddingCardInProgress, setIsAddingCardInProgress] =
    useState<boolean>(false);

  useEffect(() => {
    if (!isPremiumUser && activeCards.length > 0) {
      setWorkspaceSymbolForRegularUser(activeCards[0].symbol);
    } else if (activeCards.length === 0) {
      setWorkspaceSymbolForRegularUser(null);
    }
  }, [activeCards, isPremiumUser]);

  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  const uniqueSymbolsInWorkspace = useMemo(() => {
    const symbols = new Set<string>();
    activeCards.forEach((card) => symbols.add(card.symbol));
    return Array.from(symbols);
  }, [activeCards]);

  // The local definition of updateOrAddCardInternal is removed.
  // We now use the imported `updateOrAddCard` function.

  const addCardToWorkspace = useCallback(
    async (values: AddCardFormValues, options?: AddCardOptions) => {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "[useWorkspaceManager] addCardToWorkspace called with values:",
          values,
          "and options:",
          options
        );
      }
      setIsAddingCardInProgress(true);
      let { symbol, cardType } = values;
      const requestingCardId = options?.requestingCardId;

      if (!isPremiumUser && workspaceSymbolForRegularUser) {
        symbol = workspaceSymbolForRegularUser;
      }

      const existingCardIndex = activeCards.findIndex(
        (card) => card.symbol === symbol && card.type === cardType
      );

      if (existingCardIndex !== -1) {
        const existingCard = activeCards[existingCardIndex];
        if (requestingCardId && existingCard.id !== requestingCardId) {
          setActiveCards((prevCards) => {
            const currentCards = [...prevCards];
            const sourceCardActualIndex = currentCards.findIndex(
              (c) => c.id === requestingCardId
            );
            const targetCardActualIndex = currentCards.findIndex(
              (c) => c.id === existingCard.id
            );

            if (
              sourceCardActualIndex !== -1 &&
              targetCardActualIndex !== -1 &&
              targetCardActualIndex !== sourceCardActualIndex + 1
            ) {
              const [cardToMove] = currentCards.splice(
                targetCardActualIndex,
                1
              );
              const insertAtIndex =
                targetCardActualIndex < sourceCardActualIndex
                  ? sourceCardActualIndex
                  : sourceCardActualIndex + 1;
              currentCards.splice(insertAtIndex, 0, cardToMove);
              setTimeout(
                () =>
                  toast({
                    title: "Card Reordered",
                    description: `${
                      existingCard.companyName || existingCard.symbol
                    } ${existingCard.type} card moved.`,
                  }),
                0
              );
              return currentCards;
            }
            return prevCards;
          });
        } else {
          setTimeout(
            () =>
              toast({
                title: "Card Exists",
                description: `A ${cardType} card for ${symbol} is already in your workspace.`,
                variant: "default",
              }),
            0
          );
        }
        setIsAddingCardInProgress(false);
        return;
      }

      setTimeout(
        () => toast({ title: `Adding ${symbol} ${cardType} card...` }),
        0
      );
      let newCardToAdd: DisplayableCard | null = null;

      try {
        if (cardType === "profile") {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("symbol", symbol)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            newCardToAdd = createDisplayableProfileCardFromDB(
              data as ProfileDBRow
            ) as DisplayableCard;
          } else {
            setTimeout(
              () =>
                toast({
                  title: "Profile Not Found",
                  description: `No profile data for ${symbol}. Card not added.`,
                  variant: "destructive",
                }),
              0
            );
          }
        } else if (cardType === "price") {
          const { data: quoteData, error: quoteError } = await supabase
            .from("live_quote_indicators")
            .select("*")
            .eq("symbol", symbol)
            .order("fetched_at", { ascending: false })
            .limit(1)
            .single();
          if (quoteError && quoteError.code !== "PGRST116") {
            throw quoteError;
          }
          if (quoteData) {
            const profileCardForSymbol = activeCards.find(
              (c) => c.symbol === symbol && c.type === "profile"
            );
            const combinedQuote: CombinedQuoteData = {
              ...(quoteData as LiveQuoteIndicatorDBRow),
              companyName: profileCardForSymbol?.companyName ?? null,
              logoUrl: profileCardForSymbol?.logoUrl ?? null,
            };
            newCardToAdd = createDisplayablePriceCard(
              combinedQuote,
              combinedQuote.api_timestamp * 1000
            ) as DisplayableCard;
          } else {
            const now = Date.now();
            const profileCardForSymbol = activeCards.find(
              (c) => c.symbol === symbol && c.type === "profile"
            );
            newCardToAdd = {
              id: `${symbol}-price-${now}`,
              type: "price",
              symbol: symbol,
              createdAt: now,
              isFlipped: false,
              companyName: profileCardForSymbol?.companyName ?? symbol,
              logoUrl: profileCardForSymbol?.logoUrl ?? null,
              faceData: {
                timestamp: now,
                price: null,
                dayChange: null,
                changePercentage: null,
                dayHigh: null,
                dayLow: null,
                dayOpen: null,
                previousClose: null,
                volume: null,
              },
              backData: {
                description: `Price data for ${symbol}`,
                marketCap: null,
                sma50d: null,
                sma200d: null,
              },
            } as DisplayableLivePriceCard;
            setTimeout(
              () =>
                toast({
                  title: "Price Card Added (Shell)",
                  description: `Awaiting live data for ${symbol}.`,
                  variant: "default",
                }),
              0
            );
          }
        }

        if (newCardToAdd) {
          const { rarity, reason } = calculateDynamicCardRarity(newCardToAdd);
          newCardToAdd.currentRarity = rarity;
          newCardToAdd.rarityReason = reason;

          setActiveCards((prev) => {
            let updatedCards = [...prev];
            if (requestingCardId) {
              const sourceIndex = updatedCards.findIndex(
                (c) => c.id === requestingCardId
              );
              if (sourceIndex !== -1) {
                updatedCards.splice(sourceIndex + 1, 0, newCardToAdd!);
              } else {
                updatedCards.push(newCardToAdd!);
              }
            } else {
              updatedCards.push(newCardToAdd!);
            }
            return updatedCards;
          });
          setTimeout(
            () =>
              toast({
                title: "Card Added!",
                description: `${symbol} ${cardType} card added to workspace.`,
              }),
            0
          );
        }
      } catch (err: any) {
        console.error(`Error adding ${cardType} card for ${symbol}:`, err);
        setTimeout(
          () =>
            toast({
              title: "Error Adding Card",
              description: err.message || "Could not add card.",
              variant: "destructive",
            }),
          0
        );
      } finally {
        setIsAddingCardInProgress(false);
      }
    },
    [
      activeCards, // Dependency because it's read for existingCardIndex and profileCardForSymbol
      supabase,
      toast,
      isPremiumUser,
      workspaceSymbolForRegularUser,
      setActiveCards,
    ]
  );

  const processLiveQuote = useCallback(
    (quoteData: CombinedQuoteData, source: "fetch" | "realtime") => {
      const apiTimestampMillis = quoteData.api_timestamp * 1000;
      if (isNaN(apiTimestampMillis)) {
        console.warn(
          `processLiveQuote (${quoteData.symbol}): Invalid API timestamp received.`
        );
        return;
      }

      setActiveCards((prevActiveCards) => {
        let cardsOverallNeedUpdate = false;
        let currentCardsState = [...prevActiveCards];

        // Use the imported updateOrAddCard for PriceCard
        const priceResult = updateOrAddCard<PriceCardData, CombinedQuoteData>(
          currentCardsState,
          quoteData.symbol,
          "price",
          quoteData,
          (existingConcrete, newQuoteData, existingDisplayable) => {
            const typedExistingConcrete = existingConcrete as
              | PriceCardData
              | undefined;
            if (
              source === "realtime" &&
              typedExistingConcrete?.faceData.timestamp &&
              apiTimestampMillis < typedExistingConcrete.faceData.timestamp
            ) {
              return typedExistingConcrete; // Stale data, keep existing
            }
            const newFaceData = createPriceCardFaceDataFromQuote(
              newQuoteData,
              apiTimestampMillis
            );
            const newBackSpecificData =
              createPriceCardBackDataFromQuote(newQuoteData);
            return {
              id:
                typedExistingConcrete?.id ||
                `${newQuoteData.symbol}-price-${Date.now()}`,
              type: "price",
              symbol: newQuoteData.symbol,
              createdAt: typedExistingConcrete?.createdAt || Date.now(),
              companyName:
                newQuoteData.companyName ??
                typedExistingConcrete?.companyName ??
                existingDisplayable?.companyName,
              logoUrl:
                newQuoteData.logoUrl ??
                typedExistingConcrete?.logoUrl ??
                existingDisplayable?.logoUrl,
              faceData: newFaceData,
              backData: {
                description:
                  typedExistingConcrete?.backData.description ||
                  existingDisplayable?.backData.description ||
                  `Price data for ${newQuoteData.symbol}`,
                ...newBackSpecificData,
              },
            };
          }
          // No newDisplayableCardCreator needed here as processLiveQuote only updates existing cards
          // or relies on addCardToWorkspace to have created a shell.
          // If it needs to *create* a price card from scratch if not present, then a creator would be needed.
          // For now, assuming it only updates.
        );

        if (priceResult.cardChangedOrAdded) {
          currentCardsState = priceResult.updatedCards;
          cardsOverallNeedUpdate = true;
          const finalPriceCard = priceResult.finalCard as
            | DisplayableLivePriceCard
            | undefined;
          if (
            finalPriceCard &&
            prevActiveCards.find((c) => c.id === finalPriceCard.id) && // Ensure it was an update to an existing card
            source === "realtime" &&
            finalPriceCard.faceData.price != null
          ) {
            setTimeout(
              () =>
                toast({
                  title: `Live Update: ${finalPriceCard.symbol}`,
                  description: `$${finalPriceCard.faceData.price?.toFixed(
                    2
                  )} (${
                    finalPriceCard.faceData.changePercentage?.toFixed(2) ??
                    "N/A"
                  }%) ${
                    finalPriceCard.currentRarity &&
                    finalPriceCard.currentRarity !== "Common"
                      ? `Rarity: ${finalPriceCard.currentRarity}`
                      : ""
                  }`,
                }),
              0
            );
          }
        }

        // Update ProfileCard's liveData part
        const existingProfileCardIndex = currentCardsState.findIndex(
          (c) => c.symbol === quoteData.symbol && c.type === "profile"
        );
        if (existingProfileCardIndex !== -1) {
          const newProfileLiveData = createPriceCardFaceDataFromQuote(
            quoteData,
            apiTimestampMillis
          ) as ProfileCardLiveData; // Cast needed parts

          // Use the imported updateOrAddCard for ProfileCard live data
          const profileResult = updateOrAddCard<
            ProfileCardData,
            ProfileCardLiveData
          >(
            currentCardsState,
            quoteData.symbol,
            "profile",
            newProfileLiveData,
            (existingConcrete, newLiveData, existingDisplayable) => {
              const typedExistingConcrete = existingConcrete as ProfileCardData; // Should always exist if index found
              if (
                source === "realtime" &&
                typedExistingConcrete.liveData.timestamp &&
                apiTimestampMillis < typedExistingConcrete.liveData.timestamp
              ) {
                return typedExistingConcrete; // Stale data
              }
              // Ensure we only update liveData and preserve staticData and other fields
              return {
                ...typedExistingConcrete,
                liveData: { ...typedExistingConcrete.liveData, ...newLiveData },
              };
            }
          );
          if (profileResult.cardChangedOrAdded) {
            currentCardsState = profileResult.updatedCards;
            cardsOverallNeedUpdate = true;
          }
        }
        return cardsOverallNeedUpdate ? currentCardsState : prevActiveCards;
      });
    },
    [setActiveCards, toast] // updateOrAddCard is a stable import, no longer from useCallback scope
  );

  const processStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      setActiveCards((prevActiveCards) => {
        // Use the imported updateOrAddCard
        const result = updateOrAddCard<ProfileCardData, ProfileDBRow>(
          prevActiveCards,
          updatedProfileDBRow.symbol,
          "profile",
          updatedProfileDBRow,
          (existingConcrete, newProfileDBData, existingDisplayable) => {
            const typedExistingConcrete = existingConcrete as
              | ProfileCardData
              | undefined;
            // This function expects to update an existing card.
            // If it's not found, it should have been added by addCardToWorkspace first.
            if (!typedExistingConcrete) {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `Profile card for ${newProfileDBData.symbol} not found for static update. This might indicate an issue if an update was expected.`
                );
              }
              // Attempt to create it from scratch if it's absolutely missing.
              // This mirrors logic in createDisplayableProfileCardFromDB but might need adjustment
              // if existingDisplayable state (like isFlipped) is crucial.
              return createDisplayableProfileCardFromDB(newProfileDBData);
            }
            const newStaticData =
              transformProfileDBRowToStaticData(newProfileDBData);
            return {
              ...typedExistingConcrete,
              companyName: newProfileDBData.company_name,
              logoUrl: newProfileDBData.image,
              staticData: newStaticData,
              // Ensure backData description is logical, e.g., generic for profile
              backData: {
                description: `Provides an overview of ${
                  newProfileDBData.company_name || newProfileDBData.symbol
                }'s company profile...`, // Or preserve existing if more specific
              },
            };
          }
        );
        if (result.cardChangedOrAdded) {
          setTimeout(() => {
            toast({
              title: `Profile Updated: ${updatedProfileDBRow.symbol}`,
              description: "Company details have been refreshed.",
            });
          }, 0);
        }
        return result.cardChangedOrAdded
          ? result.updatedCards
          : prevActiveCards;
      });
    },
    [setActiveCards, toast] // updateOrAddCard is a stable import
  );

  const clearWorkspace = useCallback(() => {
    setActiveCards(INITIAL_ACTIVE_CARDS);
    setWorkspaceSymbolForRegularUser(null);
    setCardsInLocalStorage(INITIAL_ACTIVE_CARDS);
    setTimeout(
      () =>
        toast({
          title: "Workspace Cleared",
          description: "You can now start fresh with any symbol.",
        }),
      0
    );
  }, [
    setActiveCards,
    setCardsInLocalStorage,
    toast,
    setWorkspaceSymbolForRegularUser,
  ]);

  return {
    activeCards,
    setActiveCards,
    workspaceSymbolForRegularUser,
    isAddingCardInProgress,
    addCardToWorkspace,
    clearWorkspace,
    processLiveQuote,
    processStaticProfileUpdate,
    uniqueSymbolsInWorkspace,
  };
}
