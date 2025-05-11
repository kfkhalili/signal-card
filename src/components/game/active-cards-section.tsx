// src/components/game/active-cards-section.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayableCard, DisplayableCardState } from "./types"; // Import DisplayableCardState
import { ActiveCards as ActiveCardsPresentational } from "./active-cards";
import { useToast } from "@/hooks/use-toast";
import type {
  PriceCardData,
  PriceCardInteractionCallbacks,
} from "./cards/price-card/price-card.types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardBackDataType, // Import the specific back data type
  ProfileCardInteractionCallbacks as ProfileCardSpecificInteractions,
} from "./cards/profile-card/profile-card.types";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  BaseCardSocialInteractions,
  CardActionContext,
} from "./cards/base-card/base-card.types";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";

type PriceSpecificInteractionsForContainer = Pick<
  PriceCardInteractionCallbacks,
  | "onPriceCardSmaClick"
  | "onPriceCardRangeContextClick"
  | "onPriceCardOpenPriceClick"
  | "onPriceCardGenerateDailyPerformanceSignal"
>;

interface ActiveCardsSectionProps {
  activeCards: DisplayableCard[];
  setActiveCards: React.Dispatch<React.SetStateAction<DisplayableCard[]>>;
  onTakeSnapshot: (cardId?: string) => void;
}

const ActiveCardsSection: React.FC<ActiveCardsSectionProps> = ({
  activeCards,
  setActiveCards,
  onTakeSnapshot,
}) => {
  const { toast } = useToast();
  const setActiveCardsRef = useRef(setActiveCards);
  const supabase = createClient();

  useEffect(() => {
    setActiveCardsRef.current = setActiveCards;
  }, [setActiveCards]);

  const [cardIdToConfirmDelete, setCardIdToConfirmDelete] = useState<
    string | null
  >(null);

  const handleDeleteRequest = useCallback((cardId: string) => {
    setCardIdToConfirmDelete(cardId);
  }, []);

  const confirmDeletion = useCallback(() => {
    if (cardIdToConfirmDelete) {
      setActiveCardsRef.current((prevCards) =>
        prevCards.filter((card) => card.id !== cardIdToConfirmDelete)
      );
      toast({
        title: "Card Removed",
        description: "The card has been removed.",
      });
      setCardIdToConfirmDelete(null);
    }
  }, [cardIdToConfirmDelete, toast]);

  const cancelDeletion = useCallback(() => {
    setCardIdToConfirmDelete(null);
  }, []);

  const transformRawProfileToProfileCardData = (
    dbData: ProfileDBRow
  ): ProfileCardData & DisplayableCardState => {
    // Ensure it returns a complete DisplayableCard part
    const staticData: ProfileCardStaticData = {
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
        ? format(parseISO(dbData.modified_at), "MMM d, yyyy")
        : undefined,
      currency: dbData.currency,
      formatted_ipo_date: dbData.ipo_date
        ? format(parseISO(dbData.ipo_date), "MMMM d, yyyy")
        : undefined,
      is_etf: dbData.is_etf,
      is_adr: dbData.is_adr,
      is_fund: dbData.is_fund,
    };

    const cardBackData: ProfileCardBackDataType = {
      description:
        dbData.description ||
        `Profile information for ${dbData.company_name || dbData.symbol}.`,
      // Add other specific back data fields if ProfileCardBackDataType defines them
    };

    return {
      id: `profile-${dbData.symbol}-${Date.now()}`,
      type: "profile",
      symbol: dbData.symbol,
      companyName: dbData.company_name,
      logoUrl: dbData.image,
      createdAt: Date.now(),
      staticData,
      liveData: {},
      backData: cardBackData, // Populate backData
      isFlipped: false, // Add isFlipped for DisplayableCardState
    };
  };

  const handleHeaderIdentityClick = useCallback(
    async (context: CardActionContext) => {
      const existingProfileCard = activeCards.find(
        (card) => card.type === "profile" && card.symbol === context.symbol
      );

      if (existingProfileCard) {
        toast({
          title: "Profile Card Active",
          description: `Profile card for ${context.symbol} is already displayed.`,
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
            transformRawProfileToProfileCardData(profileDBData);

          // newProfileCard is now ProfileCardData & DisplayableCardState, so it's a valid DisplayableCard
          setActiveCardsRef.current(
            (prev) => [newProfileCard, ...prev] as DisplayableCard[]
          );
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
      } catch (err) {
        console.error("Error fetching profile for new card:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        toast({
          title: "Error Loading Profile",
          description: `Could not load profile for ${context.symbol}: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
    [activeCards, supabase, toast]
  );

  const socialInteractionsForCards: BaseCardSocialInteractions = {
    onLike: (ctx) =>
      toast({ title: "Liked!", description: `You liked ${ctx.symbol}.` }),
    onComment: (ctx) =>
      toast({ title: "Comment", description: `Comment on ${ctx.symbol}.` }),
    onSave: (ctx) => onTakeSnapshot(ctx.id),
    onShare: (ctx) =>
      toast({ title: "Shared!", description: `Shared ${ctx.symbol}.` }),
  };

  const priceSpecificInteractionHandlers: PriceSpecificInteractionsForContainer =
    {
      onPriceCardSmaClick: (card, smaPeriod, smaValue) =>
        toast({
          title: "SMA Click",
          description: `${smaPeriod}D SMA of ${smaValue.toFixed(2)} on ${
            card.symbol
          }.`,
        }),
      onPriceCardRangeContextClick: (card, levelType, levelValue) =>
        toast({
          title: "Range Click",
          description: `Day ${levelType} of ${levelValue.toFixed(2)} on ${
            card.symbol
          }.`,
        }),
      onPriceCardOpenPriceClick: (card) =>
        toast({
          title: "Open Price Click",
          description: `Open price clicked on ${card.symbol}.`,
        }),
      onPriceCardGenerateDailyPerformanceSignal: (card) =>
        toast({
          title: "Signal Generated",
          description: `Daily performance signal for ${card.symbol}.`,
        }),
    };

  const profileSpecificInteractionHandlers: ProfileCardSpecificInteractions = {
    onWebsiteClick: (websiteUrl) => {
      toast({ title: "Opening Website", description: websiteUrl });
      window.open(websiteUrl, "_blank", "noopener,noreferrer");
    },
    onFilterByField: (fieldType, value) => {
      toast({
        title: "Filter Action",
        description: `Filter by ${fieldType}: ${value} (Not implemented).`,
      });
    },
    onShowFullPriceCard: (context) => {
      toast({
        title: "Navigation",
        description: `Show full price chart for ${context.symbol} (Not implemented).`,
      });
    },
  };

  return (
    <ActiveCardsPresentational
      cards={activeCards}
      onToggleFlipCard={(id) =>
        setActiveCardsRef.current((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isFlipped: !c.isFlipped } : c))
        )
      }
      onDeleteCardRequest={handleDeleteRequest}
      socialInteractions={socialInteractionsForCards}
      priceSpecificInteractions={priceSpecificInteractionHandlers}
      profileSpecificInteractions={profileSpecificInteractionHandlers}
      onHeaderIdentityClick={handleHeaderIdentityClick}
      cardIdToConfirmDelete={cardIdToConfirmDelete}
      onConfirmDeletion={confirmDeletion}
      onCancelDeletion={cancelDeletion}
    />
  );
};

export default ActiveCardsSection;
