// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO, isValid as isValidDate } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToastFunctionType } from "@/hooks/use-toast";
import type { ProfileDBRow } from "@/hooks/useStockData";
import type {
  DisplayableCard,
  DisplayableCardState,
  ConcreteCardData,
} from "@/components/game/types";
import type {
  ProfileCardData,
  ProfileCardStaticData,
  ProfileCardLiveData,
} from "./profile-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import {
  registerCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import {
  registerCardUpdateHandler,
  type CardUpdateHandler,
  type CardUpdateContext,
} from "@/components/game/cardUpdateHandler.types";
import { createPriceCardFaceDataFromLiveQuote } from "../price-card/priceCardUtils";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";

export function transformProfileDBRowToStaticData(
  dbData: ProfileDBRow
): ProfileCardStaticData {
  const formatDate = (
    dateString: string | undefined | null,
    formatString: string
  ): string | undefined => {
    if (!dateString) return undefined;
    let date = new Date(dateString); // Try direct parsing first (handles YYYY-MM-DD and full ISO)

    if (!isValidDate(date)) {
      // If direct parsing fails, try parseISO for full ISO 8601
      try {
        date = parseISO(dateString);
      } catch (e) {
        /* Ignore parsing error */
      }
    }

    if (isValidDate(date)) {
      try {
        return format(date, formatString);
      } catch (e) {
        // Fallback if formatting itself fails (unlikely for valid date)
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[transformProfileDBRowToStaticData] Error formatting date string: ${dateString}`,
            e
          );
        }
        return dateString; // Return original problematic string
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[transformProfileDBRowToStaticData] Invalid or unparseable date string encountered: ${dateString}`
      );
    }
    return undefined;
  };

  return {
    db_id: dbData.id,
    sector: dbData.sector,
    industry: dbData.industry,
    country: dbData.country,
    exchange_full_name: dbData.exchange_full_name,
    exchange: dbData.exchange,
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
    formatted_full_time_employees: dbData.full_time_employees?.toLocaleString(),
    profile_last_updated: formatDate(dbData.modified_at, "MMM d, yy"),
    currency: dbData.currency,
    formatted_ipo_date: formatDate(dbData.ipo_date, "MMMM d, yyyy"), // Corrected format for year
    is_etf: dbData.is_etf,
    is_adr: dbData.is_adr,
    is_fund: dbData.is_fund,
  };
}

export function createDisplayableProfileCardFromDB(
  dbData: ProfileDBRow
): ProfileCardData & Pick<DisplayableCardState, "isFlipped"> {
  const staticData: ProfileCardStaticData =
    transformProfileDBRowToStaticData(dbData);

  const cardTypeDescription = `Provides an overview of ${
    dbData.company_name || dbData.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  const cardBackData: BaseCardBackData = {
    description: cardTypeDescription,
  };

  const concreteCardData: ProfileCardData = {
    id: `profile-${dbData.symbol}-${Date.now()}`,
    type: "profile",
    symbol: dbData.symbol,
    companyName: dbData.company_name,
    logoUrl: dbData.image,
    createdAt: Date.now(),
    staticData,
    liveData: {},
    backData: cardBackData,
    websiteUrl: dbData.website,
  };

  return {
    ...concreteCardData,
    isFlipped: false,
  };
}

async function initializeProfileCard({
  symbol,
  supabase,
  toast,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, symbol, company_name, image, exchange, sector, industry, website, description, country, price, market_cap, beta, last_dividend, range, change, change_percentage, volume, average_volume, currency, cik, isin, cusip, exchange_full_name, ceo, full_time_employees, phone, address, city, state, zip, ipo_date, default_image, is_etf, is_actively_trading, is_adr, is_fund, modified_at"
      )
      .eq("symbol", symbol)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const profile = data as ProfileDBRow;
      return createDisplayableProfileCardFromDB(profile) as DisplayableCard;
    } else {
      if (toast) {
        toast({
          title: "Profile Not Found",
          description: `No profile data for ${symbol}. Card not added.`,
          variant: "destructive",
        });
      }
      return null;
    }
  } catch (err: any) {
    if (toast) {
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

const handleProfileCardLiveQuoteUpdate: CardUpdateHandler<
  ProfileCardData,
  LiveQuoteIndicatorDBRow
> = (
  currentProfileCardData,
  leanQuotePayload,
  currentDisplayableCard,
  context
): ProfileCardData => {
  const apiTimestampMillis = leanQuotePayload.api_timestamp * 1000;

  if (
    currentProfileCardData.liveData?.timestamp &&
    currentProfileCardData.liveData.price !== null &&
    apiTimestampMillis < currentProfileCardData.liveData.timestamp
  ) {
    return currentProfileCardData;
  }

  const newLiveDataPortion = createPriceCardFaceDataFromLiveQuote(
    leanQuotePayload,
    apiTimestampMillis
  ) as ProfileCardLiveData;

  let liveDataActuallyChanged = false;
  if (
    !currentProfileCardData.liveData ||
    Object.keys(currentProfileCardData.liveData).length === 0
  ) {
    if (
      Object.values(newLiveDataPortion).some(
        (v) => v !== null && v !== undefined && v !== 0
      ) ||
      newLiveDataPortion.timestamp !==
        currentProfileCardData.liveData?.timestamp
    ) {
      liveDataActuallyChanged = true;
    }
  } else {
    const fieldsToCompare: (keyof ProfileCardLiveData)[] = [
      "price",
      "dayChange",
      "changePercentage",
      "volume",
      "timestamp",
      "dayHigh",
      "dayLow",
      "yearHigh",
      "yearLow",
      "dayOpen",
      "previousClose",
    ];
    for (const key of fieldsToCompare) {
      if (
        newLiveDataPortion.hasOwnProperty(key) &&
        newLiveDataPortion[key] !== currentProfileCardData.liveData[key]
      ) {
        liveDataActuallyChanged = true;
        break;
      }
      if (
        currentProfileCardData.liveData.hasOwnProperty(key) &&
        !newLiveDataPortion.hasOwnProperty(key) &&
        currentProfileCardData.liveData[key] !== null
      ) {
        liveDataActuallyChanged = true;
        break;
      }
    }
  }

  if (!liveDataActuallyChanged) {
    return currentProfileCardData;
  }

  const updatedCardData = {
    ...currentProfileCardData,
    liveData: {
      ...currentProfileCardData.liveData,
      ...newLiveDataPortion,
    },
  };

  return updatedCardData;
};
registerCardUpdateHandler(
  "profile",
  "LIVE_QUOTE_UPDATE",
  handleProfileCardLiveQuoteUpdate
);

const handleProfileCardStaticUpdate: CardUpdateHandler<
  ProfileCardData,
  ProfileDBRow
> = (
  currentProfileCardData,
  profilePayload,
  currentDisplayableCard,
  context
): ProfileCardData => {
  const newStaticData = transformProfileDBRowToStaticData(profilePayload);

  let changed = false;
  if (
    JSON.stringify(currentProfileCardData.staticData) !==
    JSON.stringify(newStaticData)
  )
    changed = true;
  if (
    currentProfileCardData.companyName !== (profilePayload.company_name ?? null)
  )
    changed = true;
  if (currentProfileCardData.logoUrl !== (profilePayload.image ?? null))
    changed = true;
  if (currentProfileCardData.websiteUrl !== (profilePayload.website ?? null))
    changed = true;

  if (!changed) {
    return currentProfileCardData;
  }

  return {
    ...currentProfileCardData,
    companyName: profilePayload.company_name ?? null,
    logoUrl: profilePayload.image ?? null,
    websiteUrl: profilePayload.website ?? null,
    staticData: newStaticData,
  };
};
registerCardUpdateHandler(
  "profile",
  "STATIC_PROFILE_UPDATE",
  handleProfileCardStaticUpdate
);
