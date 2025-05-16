// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Ensure this import

import type {
  DisplayableCard,
  ConcreteCardData, // Keep for updateOrAddCard
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
} from "@/components/game/cards/price-card/priceCardUtils";

import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { CombinedQuoteData, ProfileDBRow } from "@/hooks/useStockData";

// Import the initializer registry and getter
import {
  getCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
// Import to execute registrations (MUST BE DONE ONCE, e.g. here or in a top-level app file)
import "@/components/game/cards/initializers";

// Import the extracted utility for updating/adding cards
import { updateOrAddCard } from "@/lib/workspaceUtils";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

interface UseWorkspaceManagerProps {
  // Supabase client can be created within the hook if not passed
  // supabase: SupabaseClient;
  isPremiumUser: boolean;
}

interface AddCardOptions {
  requestingCardId?: string;
}

export function useWorkspaceManager({
  isPremiumUser,
}: UseWorkspaceManagerProps) {
  const { toast } = useToast();
  // Create Supabase client instance within the hook if not passed as prop
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
      let determinedSymbol = values.symbol; // Use a different variable name
      const cardType = values.cardType;
      const requestingCardId = options?.requestingCardId;

      if (!isPremiumUser && workspaceSymbolForRegularUser) {
        determinedSymbol = workspaceSymbolForRegularUser;
      }

      const existingCardIndex = activeCards.findIndex(
        (card) => card.symbol === determinedSymbol && card.type === cardType
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
                description: `A ${cardType} card for ${determinedSymbol} is already in your workspace.`,
              }),
            0
          );
        }
        setIsAddingCardInProgress(false);
        return;
      }

      const initializer = getCardInitializer(cardType);
      if (!initializer) {
        if (process.env.NODE_ENV === "development") {
          console.error(`No initializer found for card type: ${cardType}`);
        }
        toast({
          title: "System Error",
          description: `Unsupported card type requested: ${cardType}`,
          variant: "destructive",
        });
        setIsAddingCardInProgress(false);
        return;
      }

      setTimeout(
        () =>
          toast({ title: `Adding ${determinedSymbol} ${cardType} card...` }),
        0
      );

      let newCardToAdd: DisplayableCard | null = null;
      try {
        const initContext: CardInitializationContext = {
          symbol: determinedSymbol,
          supabase,
          toast,
          activeCards, // Pass current activeCards for context if needed by initializers
        };
        newCardToAdd = await initializer(initContext);

        if (newCardToAdd) {
          const { rarity, reason } = calculateDynamicCardRarity(newCardToAdd);
          // Ensure newCardToAdd is a new object before modifying
          newCardToAdd = {
            ...newCardToAdd,
            currentRarity: rarity,
            rarityReason: reason,
          };

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

          // Generic success toast, if not handled by specific initializers already (e.g. price shell)
          // Price card shell initializer already shows a toast.
          const isPriceCard = newCardToAdd.type === "price";
          const isPriceCardShell =
            isPriceCard && !(newCardToAdd as PriceCardData).faceData.price;

          if (!isPriceCardShell) {
            setTimeout(
              () =>
                toast({
                  title: "Card Added!",
                  description: `${determinedSymbol} ${cardType} card added to workspace.`,
                }),
              0
            );
          }
        }
        // If newCardToAdd is null, the specific initializer should have shown a toast.
      } catch (err: any) {
        // This catch is for unexpected errors during initializer execution or subsequent logic
        if (process.env.NODE_ENV === "development") {
          console.error(
            `Error in addCardToWorkspace for ${cardType} - ${determinedSymbol}:`,
            err
          );
        }
        toast({
          title: "Error Adding Card",
          description:
            err.message ||
            `Could not add ${cardType} card due to an unexpected issue.`,
          variant: "destructive",
        });
      } finally {
        setIsAddingCardInProgress(false);
      }
    },
    [
      activeCards,
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
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `processLiveQuote (${quoteData.symbol}): Invalid API timestamp received.`
          );
        }
        return;
      }

      setActiveCards((prevActiveCards) => {
        let cardsOverallNeedUpdate = false;
        let currentCardsState = [...prevActiveCards];

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
              return typedExistingConcrete;
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
        );

        if (priceResult.cardChangedOrAdded) {
          currentCardsState = priceResult.updatedCards;
          cardsOverallNeedUpdate = true;
          const finalPriceCard = priceResult.finalCard as
            | DisplayableLivePriceCard
            | undefined;
          if (
            finalPriceCard &&
            prevActiveCards.find((c) => c.id === finalPriceCard.id) &&
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

        const existingProfileCardIndex = currentCardsState.findIndex(
          (c) => c.symbol === quoteData.symbol && c.type === "profile"
        );
        if (existingProfileCardIndex !== -1) {
          const newProfileLiveData = createPriceCardFaceDataFromQuote(
            quoteData,
            apiTimestampMillis
          ) as ProfileCardLiveData;

          const profileResult = updateOrAddCard<
            ProfileCardData,
            ProfileCardLiveData
          >(
            currentCardsState,
            quoteData.symbol,
            "profile",
            newProfileLiveData,
            (existingConcrete, newLiveData) => {
              const typedExistingConcrete = existingConcrete as ProfileCardData;
              if (
                source === "realtime" &&
                typedExistingConcrete.liveData.timestamp &&
                apiTimestampMillis < typedExistingConcrete.liveData.timestamp
              ) {
                return typedExistingConcrete;
              }
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
    [setActiveCards, toast, supabase] // Added supabase dependency
  );

  const processStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      setActiveCards((prevActiveCards) => {
        const result = updateOrAddCard<ProfileCardData, ProfileDBRow>(
          prevActiveCards,
          updatedProfileDBRow.symbol,
          "profile",
          updatedProfileDBRow,
          (existingConcrete, newProfileDBData) => {
            const typedExistingConcrete = existingConcrete as
              | ProfileCardData
              | undefined;
            if (!typedExistingConcrete) {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `Profile card for ${newProfileDBData.symbol} not found for static update. Creating new one.`
                );
              }
              // If a profile card is being updated, it should ideally exist.
              // If it doesn't, createDisplayableProfileCardFromDB will make a new one.
              return createDisplayableProfileCardFromDB(
                newProfileDBData
              ) as ProfileCardData;
            }
            const newStaticData =
              transformProfileDBRowToStaticData(newProfileDBData);
            return {
              ...typedExistingConcrete,
              companyName: newProfileDBData.company_name,
              logoUrl: newProfileDBData.image,
              staticData: newStaticData,
              backData: {
                // Make sure backData is handled correctly
                description:
                  typedExistingConcrete.backData?.description ||
                  `Profile overview for ${
                    newProfileDBData.company_name || newProfileDBData.symbol
                  }`,
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
    [setActiveCards, toast, supabase] // Added supabase dependency
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
