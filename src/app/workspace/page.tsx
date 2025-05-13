// src/app/workspace/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/use-local-storage";
import { createClient } from "@/lib/supabase/client";

import {
  AddCardForm,
  type AddCardFormValues,
} from "@/components/workspace/AddCardForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw } from "lucide-react";
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

// Card and Game Logic
import "@/components/game/cards/rehydrators";
import type {
  DisplayableCard,
  ConcreteCardData,
  DisplayableLivePriceCard,
} from "@/components/game/types";
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
import ActiveCardsSection from "@/components/game/ActiveCardsSection";

// Data Fetching
import {
  useStockData,
  type CombinedQuoteData,
  type MarketStatusDisplayHook,
  type ProfileDBRow,
} from "@/hooks/useStockData";

import { type LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";

const INITIAL_ACTIVE_CARDS: DisplayableCard[] = [];
const WORKSPACE_LOCAL_STORAGE_KEY = "finSignal-mainWorkspace-v1";

// StockDataHandler Component
interface StockDataHandlerProps {
  symbol: string;
  onQuoteReceived: (
    quoteData: CombinedQuoteData,
    source: "fetch" | "realtime"
  ) => void;
  onStaticProfileUpdate: (updatedProfile: ProfileDBRow) => void;
  onMarketStatusChange?: (
    symbol: string,
    status: MarketStatusDisplayHook,
    message: string | null,
    timestamp: number | null
  ) => void;
}

const StockDataHandler: React.FC<StockDataHandlerProps> = React.memo(
  ({
    symbol,
    onQuoteReceived,
    onStaticProfileUpdate,
    onMarketStatusChange,
  }) => {
    const { marketStatus, marketStatusMessage, lastApiTimestamp } =
      useStockData({
        symbol: symbol,
        onQuoteReceived: onQuoteReceived,
        onStaticProfileUpdate: onStaticProfileUpdate,
      });

    useEffect(() => {
      if (onMarketStatusChange) {
        onMarketStatusChange(
          symbol,
          marketStatus,
          marketStatusMessage,
          lastApiTimestamp
        );
      }
    }, [
      symbol,
      marketStatus,
      marketStatusMessage,
      lastApiTimestamp,
      onMarketStatusChange,
    ]);

    return null;
  }
);
StockDataHandler.displayName = "StockDataHandler";

export default function WorkspacePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();

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
  const [marketStatuses, setMarketStatuses] = useState<
    Record<
      string,
      {
        status: MarketStatusDisplayHook;
        message: string | null;
        timestamp: number | null;
      }
    >
  >({});
  const [isAddingCardInProgress, setIsAddingCardInProgress] =
    useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  const isPremium = user?.app_metadata?.is_premium ?? false;

  useEffect(() => {
    if (!isPremium && activeCards.length > 0) {
      setWorkspaceSymbolForRegularUser(activeCards[0].symbol);
    } else if (activeCards.length === 0) {
      setWorkspaceSymbolForRegularUser(null);
    }
  }, [activeCards, isPremium]);

  useEffect(() => {
    setCardsInLocalStorage(activeCards);
  }, [activeCards, setCardsInLocalStorage]);

  const uniqueSymbolsInWorkspace = useMemo(() => {
    const symbols = new Set<string>();
    activeCards.forEach((card) => symbols.add(card.symbol));
    return Array.from(symbols);
  }, [activeCards]);

  const updateOrAddCard = useCallback(
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

  const handleMarketStatusChange = useCallback(
    (
      symbol: string,
      status: MarketStatusDisplayHook,
      message: string | null,
      timestamp: number | null
    ) => {
      setMarketStatuses((prev) => ({
        ...prev,
        [symbol]: { status, message, timestamp },
      }));
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

  const handleStaticProfileUpdate = useCallback(
    (updatedProfileDBRow: ProfileDBRow) => {
      setActiveCards((prevActiveCards) => {
        const result = updateOrAddCard<ProfileCardData, ProfileDBRow>(
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
                `Profile card for ${newProfileDBData.symbol} not found for static update. No new card will be created from this event.`
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
        return result.cardChangedOrAdded
          ? result.updatedCards
          : prevActiveCards;
      });
    },
    [setActiveCards, updateOrAddCard, transformProfileDBRowToStaticData]
  );

  const processQuoteData = useCallback(
    (quoteData: CombinedQuoteData, source: "fetch" | "realtime") => {
      const apiTimestampMillis = quoteData.api_timestamp * 1000;
      if (isNaN(apiTimestampMillis)) {
        console.warn(
          `processQuoteData (${quoteData.symbol}): Invalid API timestamp received.`
        );
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
            if (!typedExistingConcrete && source === "realtime") {
              return existingConcrete || ({} as PriceCardData);
            }
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
          source === "fetch" &&
            !prevActiveCards.some(
              (c) => c.symbol === quoteData.symbol && c.type === "price"
            )
            ? (concretePriceData) =>
                ({
                  ...(concretePriceData as PriceCardData),
                  isFlipped: false,
                } as DisplayableLivePriceCard)
            : undefined
        );

        if (priceResult.cardChangedOrAdded) {
          currentCardsState = priceResult.updatedCards;
          cardsOverallNeedUpdate = true;
          const finalPriceCard = priceResult.finalCard as
            | DisplayableLivePriceCard
            | undefined;
          if (
            finalPriceCard &&
            !prevActiveCards.find((c) => c.id === finalPriceCard.id) &&
            source === "fetch" &&
            finalPriceCard.faceData.price != null
          ) {
            // New card toast handled by handleAddCardToWorkspace
          } else if (
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
              0
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
    [setActiveCards, updateOrAddCard, toast]
  );

  const handleAddCardToWorkspace = useCallback(
    async (values: AddCardFormValues) => {
      setIsAddingCardInProgress(true);
      let { symbol, cardType } = values;

      if (!isPremium && workspaceSymbolForRegularUser) {
        symbol = workspaceSymbolForRegularUser;
      }
      if (!isPremium) {
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
          setActiveCards((prev) => {
            const updatedCards = [...prev, newCardToAdd!];
            if (
              !isPremium &&
              updatedCards.length === 1 &&
              !workspaceSymbolForRegularUser
            ) {
              setWorkspaceSymbolForRegularUser(newCardToAdd!.symbol);
            }
            return updatedCards;
          });
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
      setActiveCards,
      isPremium,
      workspaceSymbolForRegularUser,
      setWorkspaceSymbolForRegularUser,
    ]
  );

  const handleClearWorkspace = () => {
    setActiveCards(INITIAL_ACTIVE_CARDS);
    setMarketStatuses({});
    setWorkspaceSymbolForRegularUser(null);
    setCardsInLocalStorage(INITIAL_ACTIVE_CARDS);
    toast({
      title: "Workspace Cleared",
      description: "You can now start fresh with any symbol.",
    });
    setIsClearConfirmOpen(false);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="px-2 sm:px-4 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">My Workspace</h1>
        <div className="flex gap-2 items-center">
          {activeCards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(true)}
              disabled={isAddingCardInProgress}>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Clear All
            </Button>
          )}
          {(activeCards.length > 0 || isPremium) && (
            <AddCardForm
              onAddCard={handleAddCardToWorkspace}
              existingCards={activeCards}
              isPremiumUser={isPremium}
              lockedSymbolForRegularUser={workspaceSymbolForRegularUser}
            />
          )}
        </div>
      </div>

      {uniqueSymbolsInWorkspace.map((s) => (
        <StockDataHandler
          key={`handler-${s}`}
          symbol={s}
          onQuoteReceived={processQuoteData}
          onStaticProfileUpdate={handleStaticProfileUpdate}
          onMarketStatusChange={handleMarketStatusChange}
        />
      ))}

      {uniqueSymbolsInWorkspace.length > 0 && (
        <div className="px-2 sm:px-4 text-center py-2 bg-card border text-card-foreground rounded-md text-xs sm:text-sm shadow max-h-48 overflow-y-auto">
          <h3 className="font-semibold mb-1 text-sm">Market Data Status:</h3>
          {uniqueSymbolsInWorkspace.map((s) => {
            const statusInfo = marketStatuses[s];
            if (!statusInfo && !isAddingCardInProgress)
              return (
                <p
                  key={`status-${s}`}
                  className="text-xs text-muted-foreground">
                  {s}: Initializing stream...
                </p>
              );
            if (!statusInfo && isAddingCardInProgress) return null; // Hide if adding in progress and no status yet
            return (
              <div key={`status-${s}`} className="text-xs mb-0.5">
                <strong>{s}:</strong> {statusInfo.status}
                {statusInfo.message && (
                  <span className="italic text-muted-foreground">
                    {" "}
                    ({String(statusInfo.message)})
                  </span>
                )}
                {statusInfo.timestamp &&
                  !isNaN(new Date(statusInfo.timestamp * 1000).getTime()) && (
                    <span className="block text-muted-foreground/80">
                      Last: {format(new Date(statusInfo.timestamp * 1000), "p")}
                    </span>
                  )}
              </div>
            );
          })}
          {Object.keys(marketStatuses).length === 0 &&
            uniqueSymbolsInWorkspace.length > 0 &&
            !isAddingCardInProgress && (
              <p className="text-xs text-muted-foreground">
                Awaiting data streams for active symbols...
              </p>
            )}
        </div>
      )}

      <div className="px-2 sm:px-0">
        {activeCards.length === 0 && !isAddingCardInProgress ? (
          <div className="text-center py-16 sm:py-20">
            <RefreshCw
              size={48}
              className="mx-auto text-muted-foreground mb-4"
              strokeWidth={1.5}
            />
            <p className="text-lg text-muted-foreground mb-6">
              Your workspace is currently empty.
            </p>
            <AddCardForm
              onAddCard={handleAddCardToWorkspace}
              existingCards={activeCards}
              isPremiumUser={isPremium}
              lockedSymbolForRegularUser={null} // No lock when empty
              triggerButton={
                <Button size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Card
                </Button>
              }
            />
            {!isPremium && (
              <p className="text-xs text-muted-foreground mt-3">
                (You can add one symbol at a time. Clear workspace to change
                symbol.)
              </p>
            )}
          </div>
        ) : (
          <ActiveCardsSection
            activeCards={activeCards}
            setActiveCards={setActiveCards} // For deletion/flip logic within ActiveCardsSection
          />
        )}
      </div>

      <AlertDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all cards from your workspace?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsClearConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearWorkspace}
              className="bg-destructive hover:bg-destructive/90">
              Clear Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
