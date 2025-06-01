// src/components/game/cards/key-ratios-card/keyRatiosCardUtils.ts
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

// Corrected: Use a type alias instead of an empty interface extension
type RatiosTtmDBRow = Database["public"]["Tables"]["ratios_ttm"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

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

function constructKeyRatiosCardData(
  dbRow: RatiosTtmDBRow,
  profileInfo: {
    companyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    currency?: string | null;
  },
  idOverride?: string | null,
  existingCreatedAt?: number | null
): KeyRatiosCardData {
  const liveData = mapDbRowToLiveData(dbRow);
  const staticData: KeyRatiosCardStaticData = {
    lastUpdated: dbRow.updated_at,
    reportedCurrency: profileInfo.currency ?? null,
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
    companyName: profileInfo.companyName ?? dbRow.symbol,
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
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const profileCardForSymbol = activeCards?.find(
      (c) => c.symbol === symbol && c.type === "profile"
    ) as ProfileDBRowFromSupabase | undefined;

    let fetchedProfileInfo = {
      companyName: profileCardForSymbol?.company_name ?? symbol,
      logoUrl: profileCardForSymbol?.image ?? null,
      websiteUrl: profileCardForSymbol?.website ?? null,
      currency: profileCardForSymbol?.currency ?? null,
    };

    if (!profileCardForSymbol) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("company_name, image, website, currency")
        .eq("symbol", symbol)
        .maybeSingle();

      if (profileError) {
        console.warn(
          `[initializeKeyRatiosCard] Error fetching profile for ${symbol}:`,
          profileError.message
        );
      }
      fetchedProfileInfo = {
        companyName:
          (profileData as ProfileDBRowFromSupabase | null)?.company_name ??
          symbol,
        logoUrl:
          (profileData as ProfileDBRowFromSupabase | null)?.image ?? null,
        websiteUrl:
          (profileData as ProfileDBRowFromSupabase | null)?.website ?? null,
        currency:
          (profileData as ProfileDBRowFromSupabase | null)?.currency ?? null,
      };
    }

    const { data: ratiosData, error: ratiosError } = await supabase
      .from("ratios_ttm")
      .select("*")
      .eq("symbol", symbol)
      .single();

    if (ratiosError) {
      console.error(
        `[initializeKeyRatiosCard] Supabase error fetching TTM ratios for ${symbol}:`,
        ratiosError
      );
      if (ratiosError.code === "PGRST116") {
        if (toast) {
          toast({
            title: "Ratios Not Found",
            description: `No TTM ratios currently available for ${symbol}.`,
            variant: "default",
          });
        }
        return null;
      }
      throw ratiosError;
    }

    if (!ratiosData) {
      if (toast) {
        toast({
          title: "Ratios Data Missing",
          description: `TTM ratios data is unexpectedly missing for ${symbol}.`,
          variant: "destructive",
        });
      }
      return null;
    }

    const concreteCardData = constructKeyRatiosCardData(
      ratiosData as RatiosTtmDBRow,
      fetchedProfileInfo
    );
    const cardState: Pick<DisplayableCardState, "isFlipped"> = {
      isFlipped: false,
    };
    return { ...concreteCardData, ...cardState };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[initializeKeyRatiosCard] Error initializing Key Ratios card for ${symbol}:`,
        errorMessage,
        error
      );
    }
    if (toast) {
      toast({
        title: "Error Initializing Key Ratios Card",
        description: `Could not fetch TTM ratios for ${symbol}. ${errorMessage}`,
        variant: "destructive",
      });
    }
    return null;
  }
}
registerCardInitializer("keyratios", initializeKeyRatiosCard);

const handleKeyRatiosTTMUpdate: CardUpdateHandler<
  KeyRatiosCardData,
  RatiosTtmDBRow
> = (
  currentCardData,
  newRatiosRow,
  _currentDisplayableCard,
  context
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

  if (context.toast) {
    context.toast({
      title: `Key Ratios Updated: ${currentCardData.symbol}`,
      description: `TTM Ratios have been refreshed as of ${new Date(
        newRatiosRow.updated_at
      ).toLocaleTimeString()}.`,
    });
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

  let currencyChanged = false;
  const newCurrency = profilePayload.currency ?? null;
  if (currentCardData.staticData.reportedCurrency !== newCurrency) {
    currencyChanged = true;
  }

  if (coreDataChanged || currencyChanged) {
    const finalCardData = {
      ...updatedCardData,
      staticData: {
        ...updatedCardData.staticData,
        reportedCurrency: newCurrency,
      },
    };

    const lastUpdatedDateString = finalCardData.staticData.lastUpdated
      ? new Date(finalCardData.staticData.lastUpdated).toLocaleDateString()
      : "N/A";
    const newBackDataDescription = `Key Trailing Twelve Months (TTM) financial ratios for ${finalCardData.companyName}. Ratios last updated on ${lastUpdatedDateString}.`;

    return {
      ...finalCardData,
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
