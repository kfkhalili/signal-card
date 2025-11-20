// src/components/game/cards/key-ratios-card/keyRatiosCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  KeyRatiosCardData,
  KeyRatiosCardStaticData,
  KeyRatiosCardLiveData,
} from "./key-ratios-card.types";
import type {
  DisplayableCard,
  DisplayableCardState,
} from "@/components/game/types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import {
  registerCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import {
  registerCardUpdateHandler,
  type CardUpdateHandler,
} from "@/components/game/cardUpdateHandler.types";
import type { Database } from "@/lib/supabase/database.types";
import type { ProfileDBRow } from "@/hooks/useStockData";
import { applyProfileCoreUpdates } from "../cardUtils";

type RatiosTtmDBRow = Database["public"]["Tables"]["ratios_ttm"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

class KeyRatiosCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeyRatiosCardError";
  }
}

function mapDbRowToLiveData(dbRow: RatiosTtmDBRow): KeyRatiosCardLiveData {
  return {
    priceToEarningsRatioTTM: dbRow.price_to_earnings_ratio_ttm,
    priceToSalesRatioTTM: dbRow.price_to_sales_ratio_ttm,
    priceToBookRatioTTM: dbRow.price_to_book_ratio_ttm,
    priceToFreeCashFlowRatioTTM: dbRow.price_to_free_cash_flow_ratio_ttm,
    enterpriseValueMultipleTTM: dbRow.enterprise_value_multiple_ttm,
    netProfitMarginTTM: dbRow.net_profit_margin_ttm,
    grossProfitMarginTTM: dbRow.gross_profit_margin_ttm,
    ebitdaMarginTTM: dbRow.ebitda_margin_ttm,
    debtToEquityRatioTTM: dbRow.debt_to_equity_ratio_ttm,
    dividendYieldTTM: dbRow.dividend_yield_ttm,
    dividendPayoutRatioTTM: dbRow.dividend_payout_ratio_ttm,
    earningsPerShareTTM: dbRow.net_income_per_share_ttm,
    revenuePerShareTTM: dbRow.revenue_per_share_ttm,
    bookValuePerShareTTM: dbRow.book_value_per_share_ttm,
    freeCashFlowPerShareTTM: dbRow.free_cash_flow_per_share_ttm,
    effectiveTaxRateTTM: dbRow.effective_tax_rate_ttm,
    currentRatioTTM: dbRow.current_ratio_ttm,
    quickRatioTTM: dbRow.quick_ratio_ttm,
    assetTurnoverTTM: dbRow.asset_turnover_ttm,
  };
}

function createEmptyKeyRatiosCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): KeyRatiosCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: KeyRatiosCardStaticData = {
    lastUpdated: null,
    reportedCurrency: null,
  };

  const emptyLiveData: KeyRatiosCardLiveData = {
    priceToEarningsRatioTTM: null,
    priceToSalesRatioTTM: null,
    priceToBookRatioTTM: null,
    priceToFreeCashFlowRatioTTM: null,
    enterpriseValueMultipleTTM: null,
    netProfitMarginTTM: null,
    grossProfitMarginTTM: null,
    ebitdaMarginTTM: null,
    debtToEquityRatioTTM: null,
    dividendYieldTTM: null,
    dividendPayoutRatioTTM: null,
    earningsPerShareTTM: null,
    revenuePerShareTTM: null,
    bookValuePerShareTTM: null,
    freeCashFlowPerShareTTM: null,
    effectiveTaxRateTTM: null,
    currentRatioTTM: null,
    quickRatioTTM: null,
    assetTurnoverTTM: null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Key Trailing Twelve Months (TTM) financial ratios for ${symbol}.`,
  };

  const concreteCardData: KeyRatiosCardData = {
    id: existingCardId || `keyratios-${symbol}-${Date.now()}`,
    type: "keyratios",
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

function constructKeyRatiosCardData(
  dbRow: RatiosTtmDBRow,
  profileInfo: {
    companyName?: string | null;
    displayCompanyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  reportedCurrency: string | null,
  idOverride?: string | null,
  existingCreatedAt?: number | null
): KeyRatiosCardData {
  const liveData = mapDbRowToLiveData(dbRow);
  const staticData: KeyRatiosCardStaticData = {
    lastUpdated: dbRow.updated_at,
    reportedCurrency: reportedCurrency,
  };

  const lastUpdatedDateString = staticData.lastUpdated
    ? new Date(staticData.lastUpdated).toLocaleDateString()
    : "N/A";

  const cardBackData: BaseCardBackData = {
    description: `Key Trailing Twelve Months (TTM) financial ratios for ${
      profileInfo.companyName || dbRow.symbol
    }. Ratios last updated on ${lastUpdatedDateString}.`,
  };

  return {
    id: idOverride || `keyratios-${dbRow.symbol}-${Date.now()}`,
    type: "keyratios",
    symbol: dbRow.symbol,
    companyName: profileInfo.companyName ?? null,
    displayCompanyName:
      profileInfo.displayCompanyName ?? profileInfo.companyName ?? null,
    logoUrl: profileInfo.logoUrl ?? null,
    websiteUrl: profileInfo.websiteUrl ?? null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData,
    backData: cardBackData,
  };
}

async function initializeKeyRatiosCard({
  symbol,
  supabase,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, KeyRatiosCardError>
> {
  const profileCardForSymbol = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileDBRowFromSupabase | undefined;

  let fetchedProfileInfo = {
    companyName: profileCardForSymbol?.company_name ?? symbol,
    displayCompanyName:
      profileCardForSymbol?.display_company_name ??
      profileCardForSymbol?.company_name ??
      symbol,
    logoUrl: profileCardForSymbol?.image ?? null,
    websiteUrl: profileCardForSymbol?.website ?? null,
    currency: profileCardForSymbol?.currency ?? null,
  };

  if (!profileCardForSymbol) {
    const profileResult = await fromPromise(
      supabase
        .from("profiles")
        .select("company_name, display_company_name, image, website, currency")
        .eq("symbol", symbol)
        .maybeSingle(),
      (e) =>
        new KeyRatiosCardError(
          `Failed to fetch profile: ${(e as Error).message}`
        )
    );
    if (profileResult.isOk() && profileResult.value.data) {
      const profileData = profileResult.value.data;
      fetchedProfileInfo = {
        companyName: profileData.company_name ?? symbol,
        displayCompanyName:
          profileData.display_company_name ??
          profileData.company_name ??
          symbol,
        logoUrl: profileData.image ?? null,
        websiteUrl: profileData.website ?? null,
        currency: profileData.currency ?? null,
      };
    } else if (profileResult.isErr()) {
      console.warn(profileResult.error.message);
    }
  }

  const fsResult = await fromPromise(
    supabase
      .from("financial_statements")
      .select("reported_currency")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) =>
      new KeyRatiosCardError(
        `Financial statement fetch failed: ${(e as Error).message}`
      )
  );

  let reportedCurrency: string | null = fetchedProfileInfo.currency ?? null;
  if (fsResult.isOk() && fsResult.value.data) {
    reportedCurrency =
      fsResult.value.data.reported_currency ?? reportedCurrency;
  } else if (fsResult.isErr()) {
    console.warn(fsResult.error.message);
  }

  const ratiosResult = await fromPromise(
    supabase.from("ratios_ttm").select("*").eq("symbol", symbol).maybeSingle(),
    (e) => new KeyRatiosCardError((e as Error).message)
  );

  if (ratiosResult.isErr()) {
    const error = ratiosResult.error;
    if (error.message.includes("PGRST116")) {
      // No data found - return empty state card
      const emptyCard = createEmptyKeyRatiosCard(symbol);
      return ok(emptyCard);
    }
    // Other errors - return error
    return err(new KeyRatiosCardError(error.message));
  }

  const ratiosData = ratiosResult.value.data;

  if (!ratiosData) {
    // No data found - return empty state card
    const emptyCard = createEmptyKeyRatiosCard(symbol);
    return ok(emptyCard);
  }

  const concreteCardData = constructKeyRatiosCardData(
    ratiosData as RatiosTtmDBRow,
    fetchedProfileInfo,
    reportedCurrency
  );
  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };
  return ok({ ...concreteCardData, ...cardState });
}
registerCardInitializer("keyratios", initializeKeyRatiosCard);

const handleKeyRatiosTTMUpdate: CardUpdateHandler<
  KeyRatiosCardData,
  RatiosTtmDBRow
> = (
  currentCardData,
  newRatiosRow
): KeyRatiosCardData => {
  const newLiveData = mapDbRowToLiveData(newRatiosRow);
  const newStaticData: KeyRatiosCardStaticData = {
    ...currentCardData.staticData,
    lastUpdated: newRatiosRow.updated_at,
  };

  if (
    JSON.stringify(currentCardData.liveData) === JSON.stringify(newLiveData) &&
    currentCardData.staticData.lastUpdated === newStaticData.lastUpdated
  ) {
    return currentCardData;
  }

  const lastUpdatedDateString = newStaticData.lastUpdated
    ? new Date(newStaticData.lastUpdated).toLocaleDateString()
    : "N/A";

  return {
    ...currentCardData,
    liveData: newLiveData,
    staticData: newStaticData,
    backData: {
      description: `Key Trailing Twelve Months (TTM) financial ratios for ${
        currentCardData.companyName || currentCardData.symbol
      }. Ratios last updated on ${lastUpdatedDateString}.`,
    },
  };
};

registerCardUpdateHandler(
  "keyratios",
  "RATIOS_TTM_UPDATE",
  handleKeyRatiosTTMUpdate
);

const handleKeyRatiosProfileUpdate: CardUpdateHandler<
  KeyRatiosCardData,
  ProfileDBRow
> = (currentCardData, profilePayload): KeyRatiosCardData => {
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentCardData,
    profilePayload
  );

  if (coreDataChanged) {
    const lastUpdatedDateString = updatedCardData.staticData.lastUpdated
      ? new Date(updatedCardData.staticData.lastUpdated).toLocaleDateString()
      : "N/A";
    const newBackDataDescription = `Key Trailing Twelve Months (TTM) financial ratios for ${updatedCardData.companyName}. Ratios last updated on ${lastUpdatedDateString}.`;

    return {
      ...updatedCardData,
      backData: {
        description: newBackDataDescription,
      },
    };
  }
  return currentCardData;
};
registerCardUpdateHandler(
  "keyratios",
  "STATIC_PROFILE_UPDATE",
  handleKeyRatiosProfileUpdate
);
