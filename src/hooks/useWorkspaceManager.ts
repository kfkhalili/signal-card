// src/hooks/useWorkspaceManager.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";

// Types and Utils
import type {
  DisplayableCard,
  ConcreteCardData,
  DisplayableLivePriceCard,
} from "@/components/game/types";
import type { AddCardFormValues } from "@/components/workspace/AddCardForm"; // Ensure this path is correct
import type { CardType } from "@/components/game/cards/base-card/base-card.types";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardLiveData,
  ProfileCardStaticData,
} from "@/components/game/cards/profile-card/profile-card.types";
import { createDisplayableProfileCardFromDB } from "@/components/game/cards/profile-card/profileCardUtils";
import {
  createPriceCardFaceDataFromQuote,
  createPriceCardBackDataFromQuote,
  createDisplayablePriceCard,
} from "@/components/game/cards/price-card/priceCardUtils";
import { createProfileCardLiveDataFromQuote } from "@/components/game/cards/profile-card/profileCardUtils";
import { calculateDynamicCardRarity } from "@/components/game/rarityCalculator";
import { rehydrateCardFromStorage } from "@/components/game/cardRehydration";
import type { CombinedQuoteData, ProfileDBRow } from "@/hooks/useStockData"; // Ensure types are exported from useStockData or a shared types file
import { format, parseISO } from "date-fns";
import { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

interface UseWorkspaceManagerProps {
  supabase: SupabaseClient;
  isPremiumUser: boolean;
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

  const updateOrAddCardInternal = useCallback(
    <SpecificConcreteCardData extends ConcreteCardData, NewExternalDataType>(
      prevCards: DisplayableCard[],
      symbolToUpdate: string,
      cardType: SpecificConcreteCardData["type"],
      newExternalData: NewExternalDataType,
      updateConcreteLogic: (
        existingConcreteData: SpecificConcreteCardData | undefined,
        externalData: NewExternalDataType,
        existingDisplayableCard?: DisplayableCard
      ) => SpecificConcreteCardData,
      newDisplayableCardCreator?: (
        concreteData: SpecificConcreteCardData
      ) => DisplayableCard
    ): {
      updatedCards: DisplayableCard[];
      cardChangedOrAdded: boolean;
      finalCard?: DisplayableCard;
    } => {
      let cardChangedOrAdded = false;
      const newCardsArray = [...prevCards];
      const existingCardIndex = newCardsArray.findIndex(
        (c) => c.symbol === symbolToUpdate && c.type === cardType
      );
      const existingDisplayableCard =
        existingCardIndex !== -1 ? newCardsArray[existingCardIndex] : undefined;

      const existingConcreteCardData = existingDisplayableCard as
        | SpecificConcreteCardData
        | undefined;

      const updatedConcreteCardData = updateConcreteLogic(
        existingConcreteCardData,
        newExternalData,
        existingDisplayableCard
      );

      const { rarity: newRarity, reason: newRarityReason } =
        calculateDynamicCardRarity({
          ...updatedConcreteCardData,
          isFlipped: existingDisplayableCard?.isFlipped || false,
        } as DisplayableCard);

      let finalDisplayableCard: DisplayableCard;

      if (existingDisplayableCard) {
        const oldDataStringForCompare = JSON.stringify(
          existingConcreteCardData
        );
        const newDataStringForCompare = JSON.stringify(updatedConcreteCardData);

        if (
          oldDataStringForCompare !== newDataStringForCompare ||
          existingDisplayableCard.currentRarity !== newRarity ||
          existingDisplayableCard.rarityReason !== newRarityReason
        ) {
          cardChangedOrAdded = true;
          finalDisplayableCard = {
            ...existingDisplayableCard,
            ...updatedConcreteCardData,
            currentRarity: newRarity,
            rarityReason: newRarityReason,
          };
          newCardsArray[existingCardIndex] = finalDisplayableCard;
        } else {
          finalDisplayableCard = existingDisplayableCard;
        }
      } else if (newDisplayableCardCreator) {
        const newBaseDisplayable = newDisplayableCardCreator(
          updatedConcreteCardData
        );
        finalDisplayableCard = {
          ...newBaseDisplayable,
          currentRarity: newRarity,
          rarityReason: newRarityReason,
        };
        newCardsArray.push(finalDisplayableCard);
        cardChangedOrAdded = true;
      } else {
        return { updatedCards: prevCards, cardChangedOrAdded: false };
      }

      return {
        updatedCards: newCardsArray,
        cardChangedOrAdded,
        finalCard: finalDisplayableCard,
      };
    },
    []
  );

  const transformProfileDBRowToStaticData = useCallback(
    (dbData: ProfileDBRow): ProfileCardStaticData => {
      return {
        db_id: dbData.id,
        sector: dbData.sector,
        industry: dbData.industry,
        country: dbData.country,
        exchange_full_name: dbData.exchange_full_name,
        website: dbData.website,
        description: dbData.description,
        ceo: dbData.ceo,
        full_address: [
          dbData.address,
          dbData.city,
          dbData.state,
          dbData.zip,
          dbData.country,
        ]
          .filter(Boolean)
          .join(", "),
        phone: dbData.phone,
        formatted_full_time_employees:
          dbData.full_time_employees?.toLocaleString(),
        profile_last_updated: dbData.modified_at
          ? format(parseISO(dbData.modified_at), "MMM d, yy")
          : undefined,
        currency: dbData.currency,
        formatted_ipo_date: dbData.ipo_date
          ? format(parseISO(dbData.ipo_date), "MMMM d, yy")
          : undefined,
        is_etf: dbData.is_etf,
        is_adr: dbData.is_adr,
        is_fund: dbData.is_fund,
      };
    },
    []
  );

  const addCardToWorkspace = useCallback(
    async (values: AddCardFormValues) => {
      setIsAddingCardInProgress(true);
      let { symbol, cardType } = values;

      if (!isPremiumUser && workspaceSymbolForRegularUser) {
        symbol = workspaceSymbolForRegularUser;
      }
      if (!isPremiumUser) {
        cardType = "profile";
      }

      const cardExists = activeCards.some(
        (card) => card.symbol === symbol && card.type === cardType
      );
      if (cardExists) {
        toast({
          title: "Card Exists",
          description: `A ${cardType} card for ${symbol} is already in your workspace.`,
          variant: "default",
        });
        setIsAddingCardInProgress(false);
        return;
      }

      toast({ title: `Adding ${symbol} ${cardType} card...` });
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
            toast({
              title: "Profile Not Found",
              description: `No profile data for ${symbol}. Card not added.`,
              variant: "destructive",
            });
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
            // PGRST116: RLS error or no rows found
            throw quoteError;
          }
          if (quoteData) {
            const profileCardForSymbol = activeCards.find(
              (c) => c.symbol === symbol && c.type === "profile"
            );
            const combinedQuote: CombinedQuoteData = {
              ...(quoteData as LiveQuoteIndicatorDBRow), // Cast to ensure all fields from DB are present
              companyName: profileCardForSymbol?.companyName ?? null,
              logoUrl: profileCardForSymbol?.logoUrl ?? null,
            };
            newCardToAdd = createDisplayablePriceCard(
              combinedQuote,
              combinedQuote.api_timestamp * 1000
            ) as DisplayableCard;
          } else {
            // Create a shell price card if no initial quote data from DB
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
              companyName: profileCardForSymbol?.companyName ?? symbol, // Fallback to symbol for companyName
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
            } as DisplayableLivePriceCard; // Explicitly type as DisplayableLivePriceCard
            toast({
              title: "Price Card Added (Shell)",
              description: `Awaiting live data for ${symbol}.`,
              variant: "default",
            });
          }
        }

        if (newCardToAdd) {
          const { rarity, reason } = calculateDynamicCardRarity(newCardToAdd);
          newCardToAdd.currentRarity = rarity;
          newCardToAdd.rarityReason = reason;
          setActiveCards((prev) => [...prev, newCardToAdd!]);
          toast({
            title: "Card Added!",
            description: `${symbol} ${cardType} card added to workspace.`,
          });
        }
      } catch (err: any) {
        console.error(`Error adding ${cardType} card for ${symbol}:`, err);
        toast({
          title: "Error Adding Card",
          description: err.message || "Could not add card.",
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
        console.warn(
          `processLiveQuote (${quoteData.symbol}): Invalid API timestamp received.`
        );
        return;
      }

      setActiveCards((prevActiveCards) => {
        let cardsOverallNeedUpdate = false;
        let currentCardsState = [...prevActiveCards];

        const priceResult = updateOrAddCardInternal<
          PriceCardData,
          CombinedQuoteData
        >(
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
          },
          undefined // IMPORTANT: No creator function passed here
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
                  }) ${
                    finalPriceCard.currentRarity &&
                    finalPriceCard.currentRarity !== "Common"
                      ? `Rarity: ${finalPriceCard.currentRarity}`
                      : ""
                  }`,
                }),
              100
            );
          }
        }

        const existingProfileCardIndex = currentCardsState.findIndex(
          (c) => c.symbol === quoteData.symbol && c.type === "profile"
        );
        if (existingProfileCardIndex !== -1) {
          const newProfileLiveData = createProfileCardLiveDataFromQuote(
            quoteData,
            apiTimestampMillis
          );
          const profileResult = updateOrAddCardInternal<
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
              return { ...typedExistingConcrete, liveData: newLiveData };
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
    [setActiveCards, updateOrAddCardInternal, toast]
  );

  const processStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      setActiveCards((prevActiveCards) => {
        const result = updateOrAddCardInternal<ProfileCardData, ProfileDBRow>(
          prevActiveCards,
          updatedProfileDBRow.symbol,
          "profile",
          updatedProfileDBRow,
          (existingConcrete, newProfileDBData, existingDisplayable) => {
            const typedExistingConcrete = existingConcrete as
              | ProfileCardData
              | undefined;
            if (!typedExistingConcrete) {
              console.warn(
                `Profile card for ${newProfileDBData.symbol} not found for static update.`
              );
              return existingConcrete || ({} as ProfileCardData);
            }
            const newStaticData =
              transformProfileDBRowToStaticData(newProfileDBData);
            return {
              ...typedExistingConcrete,
              companyName: newProfileDBData.company_name,
              logoUrl: newProfileDBData.image,
              staticData: newStaticData,
              backData: {
                ...typedExistingConcrete.backData,
                description:
                  newProfileDBData.description ||
                  existingDisplayable?.backData.description ||
                  `Profile for ${
                    newProfileDBData.company_name || newProfileDBData.symbol
                  }.`,
              },
            };
          }
        );
        if (result.cardChangedOrAdded) {
          toast({
            title: `Profile Updated: ${updatedProfileDBRow.symbol}`,
            description: "Company details have been refreshed.",
          });
        }
        return result.cardChangedOrAdded
          ? result.updatedCards
          : prevActiveCards;
      });
    },
    [
      setActiveCards,
      updateOrAddCardInternal,
      transformProfileDBRowToStaticData,
      toast,
    ]
  );

  const clearWorkspace = useCallback(() => {
    setActiveCards(INITIAL_ACTIVE_CARDS);
    setWorkspaceSymbolForRegularUser(null);
    setCardsInLocalStorage(INITIAL_ACTIVE_CARDS);
    toast({
      title: "Workspace Cleared",
      description: "You can now start fresh with any symbol.",
    });
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
