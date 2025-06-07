// src/components/game/cards/revenue-breakdown-card/revenueBreakdownCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
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

class RevenueBreakdownCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevenueBreakdownCardError";
  }
}

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
) {
  const profileCardForSymbol = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileDBRowFromSupabase | undefined;
  let profileInfo = {
    companyName: profileCardForSymbol?.company_name ?? symbol,
    logoUrl: profileCardForSymbol?.image ?? null,
    websiteUrl: profileCardForSymbol?.website ?? null,
    currencySymbol:
      profileCardForSymbol?.currency === "USD"
        ? "$"
        : profileCardForSymbol?.currency || "$",
  };

  if (!profileCardForSymbol) {
    const profileResult = await fromPromise(
      supabase
        .from("profiles")
        .select("company_name, image, currency, website")
        .eq("symbol", symbol)
        .maybeSingle(),
      (e) =>
        new RevenueBreakdownCardError(
          `Profile fetch failed: ${(e as Error).message}`
        )
    );
    if (profileResult.isOk() && profileResult.value.data) {
      const profileData = profileResult.value.data;
      profileInfo = {
        companyName: profileData.company_name ?? symbol,
        logoUrl: profileData.image ?? null,
        websiteUrl: profileData.website ?? null,
        currencySymbol:
          profileData.currency === "USD" ? "$" : profileData.currency || "$",
      };
    } else if (profileResult.isErr()) {
      console.warn(profileResult.error.message);
    }
  }

  const segmentDataResult = await fromPromise(
    supabase
      .from("revenue_product_segmentation")
      .select("*")
      .eq("symbol", symbol)
      .eq("period", "FY")
      .order("date", { ascending: false })
      .limit(2),
    (e) =>
      new RevenueBreakdownCardError(
        `Segmentation data fetch failed: ${(e as Error).message}`
      )
  );

  if (segmentDataResult.isErr()) {
    return err(segmentDataResult.error);
  }

  const segmentDataRows = segmentDataResult.value.data || [];
  return ok({
    profileInfo,
    latestRow: segmentDataRows.length > 0 ? segmentDataRows[0] : null,
    previousRow: segmentDataRows.length > 1 ? segmentDataRows[1] : null,
  });
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
  if (!latestRow) return null;

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
      }
      return { segmentName, currentRevenue, previousRevenue, yoyChange };
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
}: CardInitializationContext): Promise<
  Result<DisplayableCard, RevenueBreakdownCardError>
> {
  const fetchDataResult = await fetchAndProcessRevenueBreakdown(
    symbol,
    supabase,
    activeCards
  );

  if (fetchDataResult.isErr()) {
    if (toast)
      toast({
        title: "Error Initializing Revenue Breakdown",
        description: fetchDataResult.error.message,
        variant: "destructive",
      });
    return err(fetchDataResult.error);
  }

  const { profileInfo, latestRow, previousRow } = fetchDataResult.value;

  if (!latestRow) {
    if (toast)
      toast({
        title: "No Revenue Breakdown Data",
        description: `No revenue segmentation data found for ${symbol}.`,
      });
    return err(
      new RevenueBreakdownCardError(
        `No revenue segmentation data found for ${symbol}.`
      )
    );
  }

  const concreteCardData = constructRevenueBreakdownCardData(
    symbol,
    profileInfo,
    latestRow,
    previousRow
  );
  if (!concreteCardData) {
    // This case should be rare if latestRow is guaranteed, but it's a safe check.
    return err(
      new RevenueBreakdownCardError(
        "Failed to construct card data from fetched rows."
      )
    );
  }

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };
  return ok({ ...concreteCardData, ...cardState });
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
      description: `Revenue breakdown by product/segment for ${finalCardData.companyName} for ${finalCardData.staticData.latestPeriodLabel}, showing year-over-year changes.`,
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
