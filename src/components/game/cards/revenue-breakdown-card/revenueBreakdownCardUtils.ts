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
import type { FinancialStatementDBRow as FinancialStatementDBRowFromRealtime } from "@/lib/supabase/realtime-service";
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
    displayCompanyName:
      profileCardForSymbol?.display_company_name ??
      profileCardForSymbol?.company_name ??
      symbol,
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
        .select("company_name, display_company_name, image, currency, website")
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
        displayCompanyName:
          profileData.display_company_name ??
          profileData.company_name ??
          symbol,
        logoUrl: profileData.image ?? null,
        websiteUrl: profileData.website ?? null,
        currencySymbol:
          profileData.currency === "USD" ? "$" : profileData.currency || "$",
      };
    } else if (profileResult.isErr()) {
      console.warn(profileResult.error.message);
    }
  }

  // Fetch segmentation data
  // CRITICAL: Exclude sentinel records (fiscal_year: 1900, date: '1900-01-01')
  const segmentDataResult = await fromPromise(
    supabase
      .from("revenue_product_segmentation")
      .select("*")
      .eq("symbol", symbol)
      .eq("period", "FY")
      .neq("fiscal_year", "1900") // Exclude sentinel records
      .neq("date", "1900-01-01") // Additional check for sentinel records
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

  // Filter out any sentinel records that might have slipped through
  // fiscal_year is an integer, so check for number 1900
  const segmentDataRows = (segmentDataResult.value.data || []).filter(
    (row) => row.fiscal_year !== 1900 && row.date !== "1900-01-01"
  );

  // Fetch latest financial statement to get revenue for consistency with revenue card
  const financialStatementResult = await fromPromise(
    supabase
      .from("financial_statements")
      .select("income_statement_payload, date, period, fiscal_year")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) =>
      new RevenueBreakdownCardError(
        `Financial statement fetch failed: ${(e as Error).message}`
      )
  );

  let revenueFromFinancialStatements: number | null = null;
  if (financialStatementResult.isOk() && financialStatementResult.value.data) {
    const incomePayload = financialStatementResult.value.data.income_statement_payload;
    if (incomePayload && typeof incomePayload === 'object' && 'revenue' in incomePayload) {
      const revenue = (incomePayload as { revenue?: number }).revenue;
      if (typeof revenue === 'number') {
        revenueFromFinancialStatements = revenue;
      }
    }
  }

  return ok({
    profileInfo,
    latestRow: segmentDataRows.length > 0 ? segmentDataRows[0] : null,
    previousRow: segmentDataRows.length > 1 ? segmentDataRows[1] : null,
    revenueFromFinancialStatements,
  });
}

function createEmptyRevenueBreakdownCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): RevenueBreakdownCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: RevenueBreakdownCardStaticData = {
    currencySymbol: "$",
    latestPeriodLabel: "N/A",
    previousPeriodLabel: null,
  };

  const emptyLiveData: RevenueBreakdownCardLiveData = {
    totalRevenueLatestPeriod: null,
    breakdown: [],
    lastUpdated: null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Revenue breakdown by product/segment for ${symbol}.`,
  };

  const concreteCardData: RevenueBreakdownCardData = {
    id: existingCardId || `revenuebreakdown-${symbol}-${Date.now()}`,
    type: "revenuebreakdown",
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

function constructRevenueBreakdownCardData(
  symbol: string,
  profileInfo: {
    companyName?: string | null;
    displayCompanyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
    currencySymbol: string;
  },
  latestRow: RevenueSegmentationDBRow | null,
  previousRow: RevenueSegmentationDBRow | null,
  revenueFromFinancialStatements: number | null = null,
  idOverride?: string | null,
  existingCreatedAt?: number | null
): RevenueBreakdownCardData | null {
  if (!latestRow) return null;

  const latestSegments = parseSegmentData(latestRow.data);
  const previousSegments = previousRow
    ? parseSegmentData(previousRow.data)
    : {};

  // Use revenue from financial_statements if available (for consistency with revenue card)
  // Otherwise, calculate from segmentation data
  const totalRevenueLatestPeriod = revenueFromFinancialStatements !== null
    ? revenueFromFinancialStatements
    : Object.values(latestSegments).reduce((sum, current) => sum + current, 0);

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

  const { profileInfo, latestRow, previousRow, revenueFromFinancialStatements } = fetchDataResult.value;

  if (!latestRow) {
    // No data found - return empty state card
    const emptyCard = createEmptyRevenueBreakdownCard(symbol);
    if (toast) {
      toast({
        title: "Revenue Breakdown Card Added (Empty State)",
        description: `Awaiting revenue segmentation data for ${symbol}.`,
        variant: "default",
      });
    }
    return ok(emptyCard);
  }

  const concreteCardData = constructRevenueBreakdownCardData(
    symbol,
    profileInfo,
    latestRow,
    previousRow,
    revenueFromFinancialStatements
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

const handleRevenueSegmentationUpdate: CardUpdateHandler<
  RevenueBreakdownCardData,
  RevenueSegmentationDBRow
> = (
  currentCardData,
  updatedRow
): RevenueBreakdownCardData => {
  // CRITICAL: Ignore sentinel records (fiscal_year: 1900, date: '1900-01-01')
  // fiscal_year is an integer, so check for number 1900
  if (updatedRow.fiscal_year === 1900 || updatedRow.date === "1900-01-01") {
    return currentCardData; // Don't process sentinel records
  }

  // If card is in empty state (latestPeriodLabel is "N/A"), always update
  if (
    currentCardData.staticData.latestPeriodLabel === "N/A" &&
    updatedRow.date
  ) {
    const updatedSegments = parseSegmentData(updatedRow.data);
    // Calculate revenue from segments as fallback, but preserve revenue from financial_statements if already set
    const revenueFromSegments = Object.values(updatedSegments).reduce(
      (sum, current) => sum + current,
      0
    );
    // Use revenue from financial_statements if available, otherwise use calculated from segments
    const totalRevenue = currentCardData.liveData.totalRevenueLatestPeriod !== null
      ? currentCardData.liveData.totalRevenueLatestPeriod
      : revenueFromSegments;

    const breakdown: SegmentRevenueDataItem[] = Object.entries(
      updatedSegments
    ).map(([segmentName, currentRevenue]) => ({
      segmentName,
      currentRevenue,
      previousRevenue: null,
      yoyChange: null,
    }));

    return {
      ...currentCardData,
      liveData: {
        totalRevenueLatestPeriod: totalRevenue,
        breakdown: breakdown.sort((a, b) => b.currentRevenue - a.currentRevenue),
        lastUpdated: updatedRow.updated_at || updatedRow.fetched_at,
      },
      staticData: {
        currencySymbol: updatedRow.reported_currency || currentCardData.staticData.currencySymbol,
        latestPeriodLabel: `FY${updatedRow.fiscal_year} ending ${updatedRow.date}`,
        previousPeriodLabel: null,
      },
    };
  }

  // Check if the updated row is for the latest period (newer date)
  const currentLatestDate = currentCardData.staticData.latestPeriodLabel
    .split("ending ")[1]
    ?.trim();
  const updatedDate = updatedRow.date;

  if (!currentLatestDate || !updatedDate) {
    return currentCardData; // Can't compare, return unchanged
  }

  // If the updated row is for a newer or same period, update the card
  if (updatedDate >= currentLatestDate) {
    // Reconstruct the card data with the updated row as the latest
    // For simplicity, we'll use just this row (previous will be the old latest)
    const updatedSegments = parseSegmentData(updatedRow.data);
    const previousSegments = parseSegmentData(
      currentCardData.liveData.breakdown.reduce(
        (acc, item) => {
          acc[item.segmentName] = item.currentRevenue;
          return acc;
        },
        {} as Record<string, number>
      )
    );

    // Calculate revenue from segments as fallback, but preserve revenue from financial_statements if already set
    const revenueFromSegments = Object.values(updatedSegments).reduce(
      (sum, current) => sum + current,
      0
    );
    // Use revenue from financial_statements if available, otherwise use calculated from segments
    const totalRevenue = currentCardData.liveData.totalRevenueLatestPeriod !== null
      ? currentCardData.liveData.totalRevenueLatestPeriod
      : revenueFromSegments;

    const breakdown: SegmentRevenueDataItem[] = Object.entries(
      updatedSegments
    ).map(([segmentName, currentRevenue]) => {
      const previousRevenue = previousSegments[segmentName] ?? null;
      let yoyChange: number | null = null;
      if (previousRevenue !== null && previousRevenue !== 0) {
        yoyChange = (currentRevenue - previousRevenue) / previousRevenue;
      }
      return { segmentName, currentRevenue, previousRevenue, yoyChange };
    });

    const updatedLiveData: RevenueBreakdownCardLiveData = {
      totalRevenueLatestPeriod: totalRevenue,
      breakdown: breakdown.sort((a, b) => b.currentRevenue - a.currentRevenue),
      lastUpdated: updatedRow.updated_at || updatedRow.fetched_at,
    };

    const updatedStaticData: RevenueBreakdownCardStaticData = {
      currencySymbol:
        updatedRow.reported_currency || currentCardData.staticData.currencySymbol,
      latestPeriodLabel: `FY${updatedRow.fiscal_year} ending ${updatedRow.date}`,
      previousPeriodLabel: currentCardData.staticData.latestPeriodLabel,
    };

    return {
      ...currentCardData,
      liveData: updatedLiveData,
      staticData: updatedStaticData,
    };
  }

  return currentCardData; // Update is for an older period, no change needed
};

registerCardUpdateHandler(
  "revenuebreakdown",
  "REVENUE_SEGMENTATION_UPDATE",
  handleRevenueSegmentationUpdate
);

const handleRevenueBreakdownFinancialStatementUpdate: CardUpdateHandler<
  RevenueBreakdownCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentCardData,
  updatedFinancialStatement
): RevenueBreakdownCardData => {
  // Extract revenue from the financial statement
  const incomePayload = updatedFinancialStatement.income_statement_payload;
  let revenueFromFinancialStatements: number | null = null;

  if (incomePayload && typeof incomePayload === 'object' && 'revenue' in incomePayload) {
    const revenue = (incomePayload as { revenue?: number }).revenue;
    if (typeof revenue === 'number') {
      revenueFromFinancialStatements = revenue;
    }
  }

  // Only update if we got a valid revenue value and it's different from current
  if (revenueFromFinancialStatements !== null &&
      revenueFromFinancialStatements !== currentCardData.liveData.totalRevenueLatestPeriod) {
    return {
      ...currentCardData,
      liveData: {
        ...currentCardData.liveData,
        totalRevenueLatestPeriod: revenueFromFinancialStatements,
      },
    };
  }

  return currentCardData;
};

registerCardUpdateHandler(
  "revenuebreakdown",
  "FINANCIAL_STATEMENT_UPDATE",
  handleRevenueBreakdownFinancialStatementUpdate
);
