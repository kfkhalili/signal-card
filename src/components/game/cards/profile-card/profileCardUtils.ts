// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO, isValid as isValidDate } from "date-fns";
import type { ProfileDBRow } from "@/hooks/useStockData"; // Defines the structure of data from 'profiles' table
import type {
  DisplayableCard,
  DisplayableCardState,
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
} from "@/components/game/cardUpdateHandler.types";
import type { LiveQuoteIndicatorDBRow } from "@/lib/supabase/realtime-service";

// Interface for the minimal data structure needed to create ProfileCardLiveData
interface QuoteSource {
  current_price: number | null;
  // Other fields might be present but are not used by createProfileCardLiveDataFromLiveQuote
}

// Updated local utility function to accept an object with at least a 'current_price' property
function createProfileCardLiveDataFromLiveQuote(
  quote: QuoteSource
): ProfileCardLiveData {
  return {
    price: quote.current_price,
  };
}

function transformProfileDBRowToStaticData(
  dbData: ProfileDBRow
): ProfileCardStaticData {
  const formatDate = (
    dateString: string | undefined | null,
    formatString: string
  ): string | undefined => {
    if (!dateString) return undefined;
    let date = new Date(dateString);

    if (!isValidDate(date)) {
      try {
        date = parseISO(dateString);
      } catch {
        /* Ignore parsing error */
      }
    }

    if (isValidDate(date)) {
      try {
        return format(date, formatString);
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[transformProfileDBRowToStaticData] Error formatting date string: ${dateString}`,
            e
          );
        }
        return dateString;
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
    formatted_ipo_date: formatDate(dbData.ipo_date, "MMMM d, yy"),
    is_etf: dbData.is_etf,
    is_adr: dbData.is_adr,
    is_fund: dbData.is_fund,
  };
}

function createDisplayableProfileCardFromDB(
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
    id: `profile-<span class="math-inline">{dbData.symbol}-</span>{Date.now()}`,
    type: "profile",
    symbol: dbData.symbol,
    companyName: dbData.company_name,
    logoUrl: dbData.image,
    createdAt: Date.now(),
    staticData,
    liveData: { price: dbData.price }, // Initialize with price from ProfileDBRow
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
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, symbol, company_name, image, exchange, sector, industry, website, description, country, \
        market_cap, beta, last_dividend, range, change, change_percentage, volume, average_volume, currency, cik, isin, \
        cusip, exchange_full_name, ceo, full_time_employees, phone, address, city, state, zip, ipo_date, default_image, is_etf, \
        is_actively_trading, is_adr, is_fund, modified_at"
      )
      .eq("symbol", symbol)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profileData) {
      const profile = profileData as ProfileDBRow;
      const displayableCard = createDisplayableProfileCardFromDB(
        profile
      ) as ProfileCardData & Pick<DisplayableCardState, "isFlipped">;

      // Attempt to get a more current price from live_quote_indicators
      // Select only 'price' and 'api_timestamp' (for ordering).
      const { data: initialQuoteData, error: initialQuoteError } =
        await supabase
          .from("live_quote_indicators")
          .select("current_price, api_timestamp") // Fetch only necessary fields
          .eq("symbol", symbol)
          .order("api_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(); // Type of initialQuoteData will be:
      // { price: number | null; api_timestamp: string | number | null } | null

      if (initialQuoteError && process.env.NODE_ENV === "development") {
        console.warn(
          `[initializeProfileCard] Error fetching initial quote for ${symbol}:`,
          initialQuoteError.message
        );
      }

      if (initialQuoteData) {
        // initialQuoteData (if not null) is guaranteed to have a 'price' property,
        // so it satisfies the 'QuoteSource' interface.
        displayableCard.liveData =
          createProfileCardLiveDataFromLiveQuote(initialQuoteData);
      }
      // If initialQuoteData is not found, liveData.price remains as initialized from profiles.price

      return displayableCard as DisplayableCard;
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : `Could not initialize profile for ${symbol}.`;
    if (toast) {
      toast({
        title: "Error Initializing Profile",
        description: errorMessage,
        variant: "destructive",
      });
    }
    return null;
  }
}
registerCardInitializer("profile", initializeProfileCard);

// Realtime updates are expected to send the full LiveQuoteIndicatorDBRow.
// This row structure naturally satisfies the 'QuoteSource' interface as it includes 'price'.
const handleProfileCardLiveQuoteUpdate: CardUpdateHandler<
  ProfileCardData,
  LiveQuoteIndicatorDBRow // Payload from Supabase realtime
> = (currentProfileCardData, leanQuotePayload): ProfileCardData => {
  const newLiveData = createProfileCardLiveDataFromLiveQuote(leanQuotePayload);

  if (currentProfileCardData.liveData?.price !== newLiveData.price) {
    return {
      ...currentProfileCardData,
      liveData: newLiveData,
    };
  }

  return currentProfileCardData;
};
registerCardUpdateHandler(
  "profile",
  "LIVE_QUOTE_UPDATE",
  handleProfileCardLiveQuoteUpdate
);
