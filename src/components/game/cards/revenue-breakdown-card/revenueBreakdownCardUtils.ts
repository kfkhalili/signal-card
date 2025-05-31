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
  supabase: CardInitializationContext["supabase"]
): Promise<{
  profileInfo: {
    companyName?: string | null;
    logoUrl?: string | null;
    currencySymbol: string;
  };
  latestRow: RevenueSegmentationDBRow | null;
  previousRow: RevenueSegmentationDBRow | null;
}> {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_name, image, currency")
    .eq("symbol", symbol)
    .maybeSingle();

  const baseCurrency = (profileData as ProfileDBRowFromSupabase | null)
    ?.currency;
  // Default to '$' if reported_currency is null or profile currency is not available
  const currencySymbol = baseCurrency === "USD" ? "$" : baseCurrency || "$";

  const profileInfo = {
    companyName:
      (profileData as ProfileDBRowFromSupabase | null)?.company_name ?? symbol,
    logoUrl: (profileData as ProfileDBRowFromSupabase | null)?.image ?? null,
    currencySymbol: currencySymbol,
  };

  const { data: segmentDataRows, error: segmentError } = await supabase
    .from("revenue_product_segmentation")
    .select("*")
    .eq("symbol", symbol)
    .eq("period", "FY") // Assuming annual data is always 'FY'
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
    currencySymbol: string;
  },
  latestRow: RevenueSegmentationDBRow | null,
  previousRow: RevenueSegmentationDBRow | null,
  idOverride?: string | null,
  existingCreatedAt?: number | null
): RevenueBreakdownCardData | null {
  // Can return null if no latestRow
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
        yoyChange = null; // Indicate as new or unable to calculate
      }
      return {
        segmentName,
        currentRevenue,
        previousRevenue,
        yoyChange,
      };
    })
    .sort((a, b) => b.currentRevenue - a.currentRevenue); // Sort by current revenue desc

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
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData,
    backData: cardBackData,
    websiteUrl: null,
  };
}

async function initializeRevenueBreakdownCard({
  symbol,
  supabase,
  toast,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { profileInfo, latestRow, previousRow } =
      await fetchAndProcessRevenueBreakdown(symbol, supabase);

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

    if (!concreteCardData) return null; // Should be handled by !latestRow check already

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

// Update handler for when revenue_product_segmentation table changes
// This assumes the payload would be the new/updated segmentation row,
// but for annual data, a full re-fetch like initialization is more robust.
// const handleRevenueBreakdownDataUpdate: CardUpdateHandler<
//   RevenueBreakdownCardData,
//   RevenueSegmentationDBRow // Or a more abstract update payload
// > = async (
//   currentCardData,
//   _updatedSegmentationRow, // May not be used if re-fetching
//   _currentDisplayableCard,
//   context
// ): Promise<RevenueBreakdownCardData> => {
//   const { supabase, toast } = context as CardInitializationContext;
//   try {
//     const { profileInfo, latestRow, previousRow } =
//       await fetchAndProcessRevenueBreakdown(currentCardData.symbol, supabase);

//     if (!latestRow) {
//       if (toast) {
//         toast({
//           title: "Data Missing",
//           description: `Revenue breakdown data no longer found for ${currentCardData.symbol}. Card may be stale.`,
//           variant: "destructive",
//         });
//       }
//       return currentCardData; // Or handle as an error/removal
//     }

//     if (toast) {
//       toast({
//         title: "Revenue Breakdown Synced",
//         description: `Data for ${currentCardData.symbol} refreshed.`,
//       });
//     }

//     const updatedCardData = constructRevenueBreakdownCardData(
//       currentCardData.symbol,
//       profileInfo,
//       latestRow,
//       previousRow,
//       currentCardData.id,
//       currentCardData.createdAt
//     );
//     return updatedCardData || currentCardData; // Fallback to current data if construction fails
//   } catch {
//     if (toast) {
//       toast({
//         title: "Update Error",
//         description: `Failed to refresh revenue breakdown for ${currentCardData.symbol}.`,
//         variant: "destructive",
//       });
//     }
//     return currentCardData;
//   }
// };
// This registration is more conceptual for annual data.
// You'd need an event like "ANNUAL_DATA_REFRESH_REVENUE_BREAKDOWN"
// or trigger it based on the 'updated_at' field if you poll.
// For now, using a placeholder event. If this table updates via Supabase CDC,
// the payload type for `handleRevenueBreakdownDataUpdate` should match that.
/*
registerCardUpdateHandler(
  "revenuebreakdown",
  "REVENUE_SEGMENTATION_TABLE_UPDATE", // Placeholder for a specific event
  handleRevenueBreakdownDataUpdate as CardUpdateHandler<RevenueBreakdownCardData, unknown>
);
*/

const handleRevenueBreakdownProfileUpdate: CardUpdateHandler<
  RevenueBreakdownCardData,
  ProfileDBRow
> = (currentCardData, profilePayload): RevenueBreakdownCardData => {
  const newCompanyName = profilePayload.company_name ?? currentCardData.symbol;
  const newLogoUrl = profilePayload.image ?? null;
  const newCurrencySymbol =
    (profilePayload.currency === "USD" ? "$" : profilePayload.currency) ||
    currentCardData.staticData.currencySymbol;

  if (
    currentCardData.companyName !== newCompanyName ||
    currentCardData.logoUrl !== newLogoUrl ||
    currentCardData.staticData.currencySymbol !== newCurrencySymbol
  ) {
    const newBackData: BaseCardBackData = {
      description: `Revenue breakdown by product/segment for ${newCompanyName} for ${currentCardData.staticData.latestPeriodLabel}, showing year-over-year changes.`,
    };
    return {
      ...currentCardData,
      companyName: newCompanyName,
      logoUrl: newLogoUrl,
      staticData: {
        ...currentCardData.staticData,
        currencySymbol: newCurrencySymbol,
      },
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
