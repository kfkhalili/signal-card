// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO, isValid as isValidDate } from "date-fns";
import type { ProfileDBRow } from "@/hooks/useStockData";
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
  type CardUpdateContext,
} from "@/components/game/cardUpdateHandler.types";
import type {
  LiveQuoteIndicatorDBRow,
  FinancialStatementDBRow as FinancialStatementDBRowFromRealtime, // Renamed to avoid conflict
} from "@/lib/supabase/realtime-service";
import type { Json } from "@/lib/supabase/database.types";

// Specific type for the income statement payload relevant to ProfileCard
interface ProfileCardFmpIncomeStatementPayload {
  revenue?: number | null;
  eps?: number | null; // Assuming 'eps' is a field name. Common alternatives: 'epsdiluted', 'earningsPerShare'
  earningsPerShare?: number | null; // Adding another common variant for EPS
  // Add other fields if they become necessary for the ProfileCard
}

// Type for the source of financial statement data for ProfileCard
interface ProfileFinancialStatementSource {
  income_statement_payload: Json | null; // Use Json type from database.types.ts
}

function parseFmpIncomePayloadForProfile(
  payload: Json | null
): ProfileCardFmpIncomeStatementPayload {
  const defaultResult: ProfileCardFmpIncomeStatementPayload = {
    revenue: null,
    eps: null,
  };
  if (typeof payload !== "object" || payload === null) {
    return defaultResult;
  }
  // Type assertion: We are asserting that 'payload' matches the structure we expect.
  const assertedPayload = payload as Record<
    string,
    string | number | boolean | null | undefined | Json[]
  >;

  const revenue =
    typeof assertedPayload.revenue === "number"
      ? assertedPayload.revenue
      : null;
  const eps =
    typeof assertedPayload.eps === "number"
      ? assertedPayload.eps
      : typeof assertedPayload.earningsPerShare === "number"
      ? assertedPayload.earningsPerShare
      : null;

  return { revenue, eps };
}

function createProfileCardLiveDataFromLiveQuote(
  quote: LiveQuoteIndicatorDBRow,
  currentLiveData?: Readonly<Partial<ProfileCardLiveData>>
): ProfileCardLiveData {
  return {
    price: quote.current_price ?? null,
    marketCap: quote.market_cap ?? null,
    revenue: currentLiveData?.revenue ?? null, // Preserve existing
    eps: currentLiveData?.eps ?? null, // Preserve existing
  };
}

function createProfileCardLiveDataFromFinancialStatement(
  statementSource: ProfileFinancialStatementSource,
  currentLiveData?: Readonly<Partial<ProfileCardLiveData>>
): ProfileCardLiveData {
  const parsedPayload = parseFmpIncomePayloadForProfile(
    statementSource.income_statement_payload
  );
  return {
    price: currentLiveData?.price ?? null, // Preserve existing
    marketCap: currentLiveData?.marketCap ?? null, // Preserve existing
    revenue: parsedPayload.revenue,
    eps: parsedPayload.eps,
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
        // ignore
      }
    }

    if (isValidDate(date)) {
      try {
        return format(date, formatString);
      } catch {
        return dateString;
      }
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
  dbData: ProfileDBRow,
  initialLiveData: Readonly<ProfileCardLiveData> // Now requires fully formed initialLiveData
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
    liveData: initialLiveData, // Use the passed-in live data
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
      .select("*") // Select all profile fields initially
      .eq("symbol", symbol)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profileData) {
      const profile = profileData as ProfileDBRow;

      // Start with defaults or data from profile table
      let liveDataForCard: ProfileCardLiveData = {
        price: profile.price ?? null,
        marketCap: profile.market_cap ?? null,
        revenue: null,
        eps: null,
      };

      // Fetch latest live quote
      const { data: initialQuoteData, error: initialQuoteError } =
        await supabase
          .from("live_quote_indicators")
          .select("current_price, market_cap, api_timestamp")
          .eq("symbol", symbol)
          .order("api_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (initialQuoteError && process.env.NODE_ENV === "development") {
        console.warn(
          `[initializeProfileCard] Error fetching initial quote for ${symbol}:`,
          initialQuoteError.message
        );
      }

      if (initialQuoteData) {
        liveDataForCard = createProfileCardLiveDataFromLiveQuote(
          initialQuoteData as LiveQuoteIndicatorDBRow, // Cast needed as select is partial
          liveDataForCard
        );
      }

      // Fetch latest financial statement
      const { data: financialStatementData, error: fsError } = await supabase
        .from("financial_statements")
        .select("income_statement_payload, period, date")
        .eq("symbol", symbol)
        .order("date", { ascending: false })
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fsError && process.env.NODE_ENV === "development") {
        console.warn(
          `[initializeProfileCard] Error fetching financial statement for ${symbol}:`,
          fsError.message
        );
      }

      if (financialStatementData) {
        liveDataForCard = createProfileCardLiveDataFromFinancialStatement(
          financialStatementData as ProfileFinancialStatementSource, // Cast to defined source type
          liveDataForCard
        );
      }

      const displayableCard = createDisplayableProfileCardFromDB(
        profile,
        liveDataForCard // Pass fully formed liveData
      );

      return displayableCard as DisplayableCard; // Final cast
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

const handleProfileCardLiveQuoteUpdate: CardUpdateHandler<
  ProfileCardData,
  LiveQuoteIndicatorDBRow
> = (currentProfileCardData, leanQuotePayload): ProfileCardData => {
  // Use a read-only version of liveData for merging to prevent accidental direct mutation
  const currentLiveDataReadOnly = { ...currentProfileCardData.liveData };

  const newLiveData = createProfileCardLiveDataFromLiveQuote(
    leanQuotePayload,
    currentLiveDataReadOnly
  );

  if (
    currentProfileCardData.liveData.price !== newLiveData.price ||
    currentProfileCardData.liveData.marketCap !== newLiveData.marketCap
  ) {
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

const handleProfileCardFinancialStatementUpdate: CardUpdateHandler<
  ProfileCardData,
  FinancialStatementDBRowFromRealtime // Use the specific type from realtime-service
> = (
  currentProfileCardData,
  financialStatementRow, // This is now correctly typed
  _currentDisplayableCard, // Unused parameter
  context: CardUpdateContext
): ProfileCardData => {
  // Adapt the incoming row to the source structure expected by the creator function
  const statementSource: ProfileFinancialStatementSource = {
    income_statement_payload: financialStatementRow.income_statement_payload,
  };
  const currentLiveDataReadOnly = { ...currentProfileCardData.liveData };

  const newLiveData = createProfileCardLiveDataFromFinancialStatement(
    statementSource,
    currentLiveDataReadOnly
  );

  if (
    currentProfileCardData.liveData.revenue !== newLiveData.revenue ||
    currentProfileCardData.liveData.eps !== newLiveData.eps
  ) {
    if (context.toast) {
      context.toast({
        title: `Financials Updated: ${currentProfileCardData.symbol}`,
        description: `Data from statement ending ${financialStatementRow.date} (${financialStatementRow.period}) applied. Revenue or EPS changed.`,
      });
    }
    return {
      ...currentProfileCardData,
      liveData: newLiveData,
    };
  }
  return currentProfileCardData;
};
registerCardUpdateHandler(
  "profile",
  "FINANCIAL_STATEMENT_UPDATE",
  handleProfileCardFinancialStatementUpdate
);
