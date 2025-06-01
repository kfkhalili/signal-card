// src/components/game/cards/revenue-breakdown-card/revenueBreakdownCardUtils.ts
import type {
  RevenueBreakdownCardData,
  RevenueBreakdownCardStaticData,
  RevenueBreakdownCardLiveData,
  SegmentRevenueDataItem,
} from "./revenue-breakdown-card.types";
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

type RevenueSegmentationDBRow =
  Database["public"]["Tables"]["revenue_product_segmentation"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

function parseSegmentData(jsonData: unknown): Record<string, number> {
  if (typeof jsonData === "object" && jsonData !== null) {
    const result: Record<string, number> = {};
    for (const key in jsonData) {
      if (
        Object.prototype.hasOwnProperty.call(jsonData, key) &&
        typeof (jsonData as Record<string, unknown>)[key] === "number"
      ) {
        result[key] = (jsonData as Record<string, number>)[key];
      }
    }
    return result;
  }
  return {};
}

async function fetchAndProcessRevenueBreakdown(
  symbol: string,
  supabase: CardInitializationContext["supabase"],
  activeCards?: DisplayableCard[]
): Promise<{
  profileInfo: {
    companyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    currencySymbol: string;
  };
  latestRow: RevenueSegmentationDBRow | null;
  previousRow: RevenueSegmentationDBRow | null;
}> {
  const profileCardForSymbol = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileDBRowFromSupabase | undefined;

  let fetchedProfileInfoRaw = {
    company_name: profileCardForSymbol?.company_name ?? symbol,
    image: profileCardForSymbol?.image ?? null,
    website: profileCardForSymbol?.website ?? null,
    currency: profileCardForSymbol?.currency ?? null,
  };

  if (!profileCardForSymbol) {
    const { data: profileDataFromDB } = await supabase
      .from("profiles")
      .select("company_name, image, currency, website")
      .eq("symbol", symbol)
      .maybeSingle();
    fetchedProfileInfoRaw = {
      company_name:
        (profileDataFromDB as ProfileDBRowFromSupabase | null)?.company_name ??
        symbol,
      image:
        (profileDataFromDB as ProfileDBRowFromSupabase | null)?.image ?? null,
      website:
        (profileDataFromDB as ProfileDBRowFromSupabase | null)?.website ?? null,
      currency:
        (profileDataFromDB as ProfileDBRowFromSupabase | null)?.currency ??
        null,
    };
  }

  const baseCurrency = fetchedProfileInfoRaw.currency;
  const currencySymbol = baseCurrency === "USD" ? "$" : baseCurrency || "$";

  const profileInfo = {
    companyName: fetchedProfileInfoRaw.company_name,
    logoUrl: fetchedProfileInfoRaw.image,
    websiteUrl: fetchedProfileInfoRaw.website,
    currencySymbol: currencySymbol,
  };

  const { data: segmentDataRows, error: segmentError } = await supabase
    .from("revenue_product_segmentation")
    .select("*")
    .eq("symbol", symbol)
    .eq("period", "FY")
    .order("date", { ascending: false })
    .limit(2);

  if (segmentError) {
    console.error(
      `[RevenueBreakdownCard] Error fetching segmentation data for ${symbol}:`,
      segmentError.message
    );
    throw segmentError;
  }

  return {
    profileInfo,
    latestRow:
      segmentDataRows && segmentDataRows.length > 0 ? segmentDataRows[0] : null,
    previousRow:
      segmentDataRows && segmentDataRows.length > 1 ? segmentDataRows[1] : null,
  };
}

function constructRevenueBreakdownCardData(
  symbol: string,
  profileInfo: {
    companyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    currencySymbol: string;
  },
  latestRow: RevenueSegmentationDBRow | null,
  previousRow: RevenueSegmentationDBRow | null,
  idOverride?: string | null,
  existingCreatedAt?: number | null
): RevenueBreakdownCardData | null {
  if (!latestRow) {
    return null;
  }

  const latestSegments = parseSegmentData(latestRow.data);
  const previousSegments = previousRow
    ? parseSegmentData(previousRow.data)
    : {};

  const totalRevenueLatestPeriod = Object.values(latestSegments).reduce(
    (sum, current) => sum + current,
    0
  );

  const breakdown: SegmentRevenueDataItem[] = Object.entries(latestSegments)
    .map(([segmentName, currentRevenue]) => {
      const previousRevenue = previousSegments[segmentName] ?? null;
      let yoyChange: number | null = null;
      if (previousRevenue !== null && previousRevenue !== 0) {
        yoyChange = (currentRevenue - previousRevenue) / previousRevenue;
      } else if (previousRevenue === null && currentRevenue > 0) {
        yoyChange = null;
      }
      return {
        segmentName,
        currentRevenue,
        previousRevenue,
        yoyChange,
      };
    })
    .sort((a, b) => b.currentRevenue - a.currentRevenue);

  const staticData: RevenueBreakdownCardStaticData = {
    currencySymbol: latestRow.reported_currency || profileInfo.currencySymbol,
    latestPeriodLabel: `FY${latestRow.fiscal_year} ending ${latestRow.date}`,
    previousPeriodLabel: previousRow
      ? `FY${previousRow.fiscal_year} ending ${previousRow.date}`
      : null,
  };

  const liveData: RevenueBreakdownCardLiveData = {
    totalRevenueLatestPeriod,
    breakdown,
    lastUpdated: latestRow.updated_at,
  };

  const cardBackData: BaseCardBackData = {
    description: `Revenue breakdown by product/segment for ${
      profileInfo.companyName || symbol
    } for ${staticData.latestPeriodLabel}, showing year-over-year changes.`,
  };

  return {
    id: idOverride || `revenuebreakdown-${symbol}-${Date.now()}`,
    type: "revenuebreakdown",
    symbol,
    companyName: profileInfo.companyName ?? symbol,
    logoUrl: profileInfo.logoUrl ?? null,
    websiteUrl: profileInfo.websiteUrl ?? null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData,
    backData: cardBackData,
  };
}

async function initializeRevenueBreakdownCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { profileInfo, latestRow, previousRow } =
      await fetchAndProcessRevenueBreakdown(symbol, supabase, activeCards);

    if (!latestRow) {
      if (toast) {
        toast({
          title: "No Revenue Breakdown Data",
          description: `No revenue segmentation data found for ${symbol}.`,
        });
      }
      return null;
    }

    const concreteCardData = constructRevenueBreakdownCardData(
      symbol,
      profileInfo,
      latestRow,
      previousRow
    );

    if (!concreteCardData) return null;

    const cardState: Pick<DisplayableCardState, "isFlipped"> = {
      isFlipped: false,
    };
    return { ...concreteCardData, ...cardState };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(
      `[initializeRevenueBreakdownCard] Error for ${symbol}:`,
      errorMessage
    );
    if (toast) {
      toast({
        title: "Error Initializing Revenue Breakdown",
        description: `Could not fetch data for ${symbol}. ${errorMessage}`,
        variant: "destructive",
      });
    }
    return null;
  }
}
registerCardInitializer("revenuebreakdown", initializeRevenueBreakdownCard);

const handleRevenueBreakdownProfileUpdate: CardUpdateHandler<
  RevenueBreakdownCardData,
  ProfileDBRow
> = (currentCardData, profilePayload): RevenueBreakdownCardData => {
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentCardData,
    profilePayload
  );

  // RevenueBreakdown specific: currencySymbol might change based on profile's currency
  const newBaseCurrency = profilePayload.currency;
  const newCurrencySymbol =
    newBaseCurrency === "USD"
      ? "$"
      : newBaseCurrency || updatedCardData.staticData.currencySymbol;
  const currencySymbolChanged =
    updatedCardData.staticData.currencySymbol !== newCurrencySymbol;

  if (coreDataChanged || currencySymbolChanged) {
    const finalCardData = {
      ...updatedCardData,
      staticData: {
        ...updatedCardData.staticData,
        currencySymbol: newCurrencySymbol,
      },
    };

    const newBackData: BaseCardBackData = {
      description: `Revenue breakdown by product/segment for ${
        finalCardData.companyName // Use the potentially updated company name
      } for ${
        finalCardData.staticData.latestPeriodLabel
      }, showing year-over-year changes.`,
    };
    return {
      ...finalCardData,
      backData: newBackData,
    };
  }
  return currentCardData;
};
registerCardUpdateHandler(
  "revenuebreakdown",
  "STATIC_PROFILE_UPDATE",
  handleRevenueBreakdownProfileUpdate
);
