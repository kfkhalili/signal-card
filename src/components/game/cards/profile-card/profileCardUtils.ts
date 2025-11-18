// src/components/game/cards/profile-card/profileCardUtils.ts
import { format, parseISO, isValid as isValidDate } from "date-fns";
import { ok, err, fromPromise, Result } from "neverthrow";
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

class ProfileCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileCardError";
  }
}

interface ProfileCardFmpIncomeStatementPayload {
  revenue?: number | null;
}

interface ProfileFinancialStatementSource {
  income_statement_payload: Json | null;
  reported_currency?: string | null;
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
    displayCompanyName: dbData.display_company_name,
    logoUrl: dbData.image,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData: initialLiveData,
    backData: cardBackData,
    websiteUrl: dbData.website,
  };
  return {
    ...concreteCardData,
    isFlipped: false,
  };
}

function createEmptyProfileCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): ProfileCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: ProfileCardStaticData = {
    db_id: `empty-${symbol}-${Date.now()}`,
    sector: null,
    industry: null,
    country: null,
    exchange: null,
    exchange_full_name: null,
    website: null,
    description: null,
    ceo: null,
    full_address: null,
    phone: null,
    profile_last_updated: null,
    currency: null,
    formatted_ipo_date: null,
    formatted_full_time_employees: null,
    is_etf: null,
    is_adr: null,
    is_fund: null,
    last_dividend: null,
    beta: null,
    average_volume: null,
    isin: null,
  };

  const emptyLiveData: ProfileCardLiveData = {
    price: null,
    marketCap: null,
    revenue: null,
    eps: null,
    financialsCurrency: null,
    priceToEarningsRatioTTM: null,
    priceToBookRatioTTM: null,
  };

  const cardTypeDescription = `Provides an overview of ${symbol}'s company profile, including sector, industry, and key operational highlights.`;
  const cardBackData: BaseCardBackData = {
    description: cardTypeDescription,
  };

  const concreteCardData: ProfileCardData = {
    id: existingCardId || `profile-${symbol}-${Date.now()}`,
    type: "profile",
    symbol: symbol,
    companyName: null,
    displayCompanyName: null,
    logoUrl: null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData: emptyStaticData,
    liveData: emptyLiveData,
    backData: cardBackData,
    websiteUrl: null,
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
}: CardInitializationContext): Promise<
  Result<DisplayableCard, ProfileCardError>
> {
  const profileResult = await fromPromise(
    supabase
      .from("profiles")
      .select("*, last_dividend, beta, average_volume, isin")
      .eq("symbol", symbol)
      .maybeSingle(),
    (e) => new ProfileCardError((e as Error).message)
  );

  if (profileResult.isErr()) {
    return err(profileResult.error);
  }

  const profileData = profileResult.value.data as ProfileDBRow | null;

  if (!profileData) {
    // Create empty state card instead of returning error
    // This allows subscription to be created and card to update when data arrives
    const emptyCard = createEmptyProfileCard(symbol);
    
    if (toast) {
      toast({
        title: "Profile Card Added (Empty State)",
        description: `Awaiting profile data for ${symbol}.`,
        variant: "default",
      });
    }
    
    return ok(emptyCard);
  }

  // The rest of the data is supplemental, so we don't fail the whole operation if they're missing.
  // We can fetch them and log warnings on failure without returning an `err`.
  let liveDataForCard: ProfileCardLiveData = {
    price: profileData.price ?? null,
    marketCap: profileData.market_cap ?? null,
    revenue: null,
    eps: null,
    financialsCurrency: null,
    priceToEarningsRatioTTM: null,
    priceToBookRatioTTM: null,
  };

  const [quoteResult, fsResult, ratiosResult] = await Promise.all([
    fromPromise(
      supabase
        .from("live_quote_indicators")
        .select("current_price, market_cap")
        .eq("symbol", symbol)
        .order("api_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (e) => new ProfileCardError((e as Error).message)
    ),
    fromPromise(
      supabase
        .from("financial_statements")
        .select("income_statement_payload, period, date, reported_currency")
        .eq("symbol", symbol)
        .order("date", { ascending: false })
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (e) => new ProfileCardError((e as Error).message)
    ),
    fromPromise(
      supabase
        .from("ratios_ttm")
        .select(
          "price_to_earnings_ratio_ttm, net_income_per_share_ttm, price_to_book_ratio_ttm"
        )
        .eq("symbol", symbol)
        .maybeSingle(),
      (e) => new ProfileCardError((e as Error).message)
    ),
  ]);

  if (quoteResult.isErr()) {
    console.warn(
      `[ProfileCard] Could not fetch initial quote: ${quoteResult.error.message}`
    );
  }

  if (fsResult.isErr()) {
    console.warn(
      `[ProfileCard] Could not fetch financial statement: ${fsResult.error.message}`
    );
  }
  if (ratiosResult.isErr()) {
    console.warn(
      `[ProfileCard] Could not fetch TTM ratios: ${ratiosResult.error.message}`
    );
  }

  const quoteData =
    quoteResult.isOk() && quoteResult.value.data ? quoteResult.value.data : null;
  const statementData =
    fsResult.isOk() && fsResult.value.data ? fsResult.value.data : null;
  const ratiosData =
    ratiosResult.isOk() && ratiosResult.value.data
      ? ratiosResult.value.data
      : null;

  liveDataForCard = {
    ...liveDataForCard,
    ...createProfileCardLiveData(quoteData, statementData, ratiosData, liveDataForCard),
    financialsCurrency: statementData?.reported_currency ?? null,
  };

  const displayableCard = createDisplayableProfileCardFromDB(
    profileData,
    liveDataForCard
  );
  return ok(displayableCard);
}

registerCardInitializer("profile", initializeProfileCard);

const handleProfileCardStaticProfileUpdate: CardUpdateHandler<
  ProfileCardData,
  ProfileDBRow
> = (currentProfileCardData, profilePayload): ProfileCardData => {
  const newStaticData = transformProfileDBRowToStaticData(profilePayload);
  const { updatedCardData: cardWithCoreUpdates } = applyProfileCoreUpdates(
    currentProfileCardData,
    profilePayload
  );

  const newBackDataDescription = `Provides an overview of ${
    cardWithCoreUpdates.companyName || cardWithCoreUpdates.symbol
  }'s company profile, including sector, industry, and key operational highlights.`;

  return {
    ...cardWithCoreUpdates,
    staticData: newStaticData,
    backData: { description: newBackDataDescription },
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
    reported_currency: financialStatementRow.reported_currency,
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
    return {
      ...currentProfileCardData,
      liveData: { ...newLiveData, financialsCurrency: statementSource.reported_currency },
    };
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
