// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js"; // Added
import type { ToastFunctionType } from "@/hooks/use-toast"; // Added
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  DisplayableCard,
  DisplayableCardState,
} from "@/components/game/types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
} from "./profile-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import {
  registerCardInitializer, // Added
  type CardInitializationContext, // Added
} from "@/components/game/cardInitializer.types"; // Adjust path as needed

export function transformProfileDBRowToStaticData(
  dbData: ProfileDBRow
): ProfileCardStaticData {
  return {
    db_id: dbData.id,
    sector: dbData.sector,
    industry: dbData.industry,
    country: dbData.country,
    exchange_full_name: dbData.exchange_full_name,
    website: dbData.website,
    description: dbData.description,
    short_description: dbData.short_description,
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
    formatted_full_time_employees: dbData.full_time_employees?.toLocaleString(),
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
}

export function createDisplayableProfileCardFromDB(
  dbData: ProfileDBRow
): ProfileCardData & Pick<DisplayableCardState, "isFlipped"> {
  // More specific return
  const staticData: ProfileCardStaticData =
    transformProfileDBRowToStaticData(dbData);

  const cardTypeDescription = `Provides an overview of ${
    dbData.company_name || dbData.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  const cardBackData: BaseCardBackData = {
    description: cardTypeDescription,
  };

  const concreteCardData: ProfileCardData = {
    id: `profile-${dbData.symbol}-${Date.now()}`, // Unique ID for workspace instance
    type: "profile",
    symbol: dbData.symbol,
    companyName: dbData.company_name,
    logoUrl: dbData.image,
    createdAt: Date.now(), // Timestamp of creation in the app
    staticData,
    liveData: {}, // Initial empty live data
    backData: cardBackData,
    websiteUrl: dbData.website, // ensure websiteUrl is part of BaseCardData for ProfileCardData
  };

  return {
    ...concreteCardData,
    isFlipped: false, // Default state for a new card
    // currentRarity, rarityReason, etc., will be added later by useWorkspaceManager
  };
}

// --- Card Initializer for ProfileCard ---
async function initializeProfileCard({
  symbol,
  supabase,
  toast,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("symbol", symbol)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // Use the existing createDisplayableProfileCardFromDB function
      return createDisplayableProfileCardFromDB(
        data as ProfileDBRow
      ) as DisplayableCard;
    } else {
      if (toast) {
        // Check if toast is provided
        toast({
          title: "Profile Not Found",
          description: `No profile data for ${symbol}. Card not added.`,
          variant: "destructive",
        });
      }
      return null;
    }
  } catch (err: any) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Error initializing profile card for ${symbol}:`, err);
    }
    if (toast) {
      // Check if toast is provided
      toast({
        title: "Error Initializing Profile",
        description:
          err.message || `Could not initialize profile for ${symbol}.`,
        variant: "destructive",
      });
    }
    return null;
  }
}

registerCardInitializer("profile", initializeProfileCard);
