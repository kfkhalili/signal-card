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
  FinancialStatementDBRow as FinancialStatementDBRowFromRealtime,
} from "@/lib/supabase/realtime-service";
import type { Database, Json } from "@/lib/supabase/database.types";
import { applyProfileCoreUpdates } from "../cardUtils";

type RatiosTtmDBRow = Database["public"]["Tables"]["ratios_ttm"]["Row"];

interface ProfileCardFmpIncomeStatementPayload {
  revenue?: number | null;
}

interface ProfileFinancialStatementSource {
  income_statement_payload: Json | null;
}

function parseFmpIncomePayloadForProfile(
  payload: Json | null
): ProfileCardFmpIncomeStatementPayload {
  const defaultResult: ProfileCardFmpIncomeStatementPayload = {
    revenue: null,
  };
  if (typeof payload !== "object" || payload === null) {
    return defaultResult;
  }
  const assertedPayload = payload as Record<
    string,
    string | number | boolean | null | undefined | Json[]
  >;
  const revenue =
    typeof assertedPayload.revenue === "number"
      ? assertedPayload.revenue
      : null;
  return { revenue };
}

function createProfileCardLiveData(
  quote?: Readonly<Partial<LiveQuoteIndicatorDBRow>> | null,
  statementSource?: Readonly<Partial<ProfileFinancialStatementSource>> | null,
  ratiosSource?: Readonly<Partial<RatiosTtmDBRow>> | null,
  currentLiveData?: Readonly<Partial<ProfileCardLiveData>>
): ProfileCardLiveData {
  const parsedIncomePayload = statementSource
    ? parseFmpIncomePayloadForProfile(
        statementSource.income_statement_payload ?? null
      )
    : { revenue: null };

  return {
    price: quote?.current_price ?? currentLiveData?.price ?? null,
    marketCap: quote?.market_cap ?? currentLiveData?.marketCap ?? null,
    revenue: parsedIncomePayload.revenue ?? currentLiveData?.revenue ?? null,
    eps: ratiosSource?.net_income_per_share_ttm ?? currentLiveData?.eps ?? null,
    priceToEarningsRatioTTM:
      ratiosSource?.price_to_earnings_ratio_ttm ??
      currentLiveData?.priceToEarningsRatioTTM ??
      null,
    priceToBookRatioTTM:
      ratiosSource?.price_to_book_ratio_ttm ??
      currentLiveData?.priceToBookRatioTTM ??
      null,
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
    last_dividend: dbData.last_dividend,
    beta: dbData.beta,
    average_volume: dbData.average_volume,
    isin: dbData.isin,
  };
}

function createDisplayableProfileCardFromDB(
  dbData: ProfileDBRow,
  initialLiveData: Readonly<ProfileCardLiveData>,
  existingCardId?: string,
  existingCreatedAt?: number
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
    id: existingCardId || `profile-${dbData.symbol}-${Date.now()}`,
    type: "profile",
    symbol: dbData.symbol,
    companyName: dbData.company_name,
    logoUrl: dbData.image,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData: initialLiveData,
    backData: cardBackData,
    websiteUrl: dbData.website,
  };
  return {
    ...concreteCardData,
    isFlipped: false, // Default isFlipped, can be overridden if needed
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
      .select("*, last_dividend, beta, average_volume, isin")
      .eq("symbol", symbol)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profileData) {
      const profile = profileData as ProfileDBRow;
      let liveDataForCard: ProfileCardLiveData = {
        price: profile.price ?? null,
        marketCap: profile.market_cap ?? null,
        revenue: null,
        eps: null,
        priceToEarningsRatioTTM: null,
        priceToBookRatioTTM: null,
      };

      const { data: initialQuoteData, error: initialQuoteError } =
        await supabase
          .from("live_quote_indicators")
          .select("current_price, market_cap")
          .eq("symbol", symbol)
          .order("api_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();
      if (initialQuoteError)
        console.warn(
          `Error fetching initial quote for ${symbol}: ${initialQuoteError.message}`
        );
      if (initialQuoteData) {
        liveDataForCard = createProfileCardLiveData(
          initialQuoteData,
          null,
          null,
          liveDataForCard
        );
      }

      const { data: financialStatementData, error: fsError } = await supabase
        .from("financial_statements")
        .select("income_statement_payload, period, date")
        .eq("symbol", symbol)
        .order("date", { ascending: false })
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fsError)
        console.warn(
          `Error fetching financial statement for ${symbol}: ${fsError.message}`
        );
      if (financialStatementData) {
        liveDataForCard = createProfileCardLiveData(
          null,
          financialStatementData as ProfileFinancialStatementSource,
          null,
          liveDataForCard
        );
      }

      const { data: ratiosData, error: ratiosError } = await supabase
        .from("ratios_ttm")
        .select(
          "price_to_earnings_ratio_ttm, net_income_per_share_ttm, price_to_book_ratio_ttm"
        )
        .eq("symbol", symbol)
        .maybeSingle();
      if (ratiosError)
        console.warn(
          `Error fetching TTM ratios for ${symbol}: ${ratiosError.message}`
        );
      if (ratiosData) {
        liveDataForCard = createProfileCardLiveData(
          null,
          null,
          ratiosData as RatiosTtmDBRow,
          liveDataForCard
        );
      }

      const displayableCard = createDisplayableProfileCardFromDB(
        profile,
        liveDataForCard
      );
      return displayableCard as DisplayableCard;
    } else {
      if (toast)
        toast({
          title: "Profile Not Found",
          description: `No profile data for ${symbol}.`,
        });
      return null;
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : `Could not initialize profile for ${symbol}.`;
    if (toast)
      toast({
        title: "Error Initializing Profile",
        description: errorMessage,
        variant: "destructive",
      });
    return null;
  }
}
registerCardInitializer("profile", initializeProfileCard);

// Handler for when the underlying ProfileDBRow itself is updated
const handleProfileCardStaticProfileUpdate: CardUpdateHandler<
  ProfileCardData,
  ProfileDBRow
> = (currentProfileCardData, profilePayload): ProfileCardData => {
  // Regenerate static data from the new profile payload
  const newStaticData = transformProfileDBRowToStaticData(profilePayload);

  // Apply core updates (companyName, logoUrl, websiteUrl) to the root of the card data
  const { updatedCardData: cardWithCoreUpdates } = applyProfileCoreUpdates(
    currentProfileCardData,
    profilePayload
  );

  // Recreate backData description with potentially new company name
  const newBackDataDescription = `Provides an overview of ${
    cardWithCoreUpdates.companyName || cardWithCoreUpdates.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  // Return a new card object with updated staticData, core properties, and backData
  // LiveData is assumed to be updated by its own dedicated handlers (LIVE_QUOTE_UPDATE, etc.)
  // but we preserve the existing liveData here.
  return {
    ...cardWithCoreUpdates, // Contains updated root companyName, logoUrl, websiteUrl
    staticData: newStaticData, // Overwrite with new static data
    backData: { description: newBackDataDescription },
    // liveData: currentProfileCardData.liveData, // Retain existing live data
    // createdAt should probably be updated if the profile itself changes substantially
    createdAt: Date.now(),
  };
};
registerCardUpdateHandler(
  "profile",
  "STATIC_PROFILE_UPDATE",
  handleProfileCardStaticProfileUpdate
);

const handleProfileCardLiveQuoteUpdate: CardUpdateHandler<
  ProfileCardData,
  LiveQuoteIndicatorDBRow
> = (currentProfileCardData, leanQuotePayload): ProfileCardData => {
  const currentLiveDataReadOnly = { ...currentProfileCardData.liveData };
  const newLiveData = createProfileCardLiveData(
    leanQuotePayload,
    null,
    null,
    currentLiveDataReadOnly
  );
  if (
    currentProfileCardData.liveData.price !== newLiveData.price ||
    currentProfileCardData.liveData.marketCap !== newLiveData.marketCap
  ) {
    return { ...currentProfileCardData, liveData: newLiveData };
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
  FinancialStatementDBRowFromRealtime
> = (
  currentProfileCardData,
  financialStatementRow,
  _currentDisplayableCard,
  context: CardUpdateContext
): ProfileCardData => {
  const statementSource: ProfileFinancialStatementSource = {
    income_statement_payload: financialStatementRow.income_statement_payload,
  };
  const currentLiveDataReadOnly = { ...currentProfileCardData.liveData };
  const newLiveData = createProfileCardLiveData(
    null,
    statementSource,
    null,
    currentLiveDataReadOnly
  );
  if (currentProfileCardData.liveData.revenue !== newLiveData.revenue) {
    if (context.toast) {
      context.toast({
        title: `Revenue Updated: ${currentProfileCardData.symbol}`,
        description: `TTM Revenue from statement ${financialStatementRow.date} (${financialStatementRow.period}) applied.`,
      });
    }
    return { ...currentProfileCardData, liveData: newLiveData };
  }
  return currentProfileCardData;
};
registerCardUpdateHandler(
  "profile",
  "FINANCIAL_STATEMENT_UPDATE",
  handleProfileCardFinancialStatementUpdate
);

const handleProfileCardRatiosTTMUpdate: CardUpdateHandler<
  ProfileCardData,
  RatiosTtmDBRow
> = (
  currentProfileCardData,
  ratiosTtmPayload,
  _currentDisplayableCard,
  context: CardUpdateContext
): ProfileCardData => {
  const currentLiveDataReadOnly = { ...currentProfileCardData.liveData };
  const newLiveData = createProfileCardLiveData(
    null,
    null,
    ratiosTtmPayload,
    currentLiveDataReadOnly
  );

  let changed = false;
  if (currentProfileCardData.liveData.eps !== newLiveData.eps) changed = true;
  if (
    currentProfileCardData.liveData.priceToEarningsRatioTTM !==
    newLiveData.priceToEarningsRatioTTM
  )
    changed = true;
  if (
    currentProfileCardData.liveData.priceToBookRatioTTM !==
    newLiveData.priceToBookRatioTTM
  )
    changed = true;

  if (changed) {
    if (context.toast) {
      context.toast({
        title: `Key Ratios Updated: ${currentProfileCardData.symbol}`,
        description: `P/E, EPS (TTM), or P/B ratios have been refreshed.`,
      });
    }
    return { ...currentProfileCardData, liveData: newLiveData };
  }
  return currentProfileCardData;
};
registerCardUpdateHandler(
  "profile",
  "RATIOS_TTM_UPDATE",
  handleProfileCardRatiosTTMUpdate
);
