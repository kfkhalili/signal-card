// src/components/game/cards/dividends-history-card/dividendsHistoryCardUtils.ts
import type {
  DividendsHistoryCardData,
  DividendsHistoryCardStaticData,
  DividendsHistoryCardLiveData,
  LatestDividendInfo,
  AnnualDividendTotal,
} from "./dividends-history-card.types";
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

type DividendHistoryDBRow =
  Database["public"]["Tables"]["dividend_history"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

function getTypicalFrequency(
  latestFrequency: string | null,
  historicalRecords: readonly Pick<DividendHistoryDBRow, "frequency">[]
): string | null {
  if (latestFrequency) return latestFrequency;
  if (historicalRecords.length === 0) return null;

  const frequencyCounts: Record<string, number> = {};
  historicalRecords.forEach((record) => {
    if (record.frequency) {
      frequencyCounts[record.frequency] =
        (frequencyCounts[record.frequency] || 0) + 1;
    }
  });

  let maxCount = 0;
  let mostCommonFrequency: string | null = null;
  for (const freq in frequencyCounts) {
    if (frequencyCounts[freq] > maxCount) {
      maxCount = frequencyCounts[freq];
      mostCommonFrequency = freq;
    }
  }
  return mostCommonFrequency;
}

function calculatePastAnnualTotals( // Renamed for clarity
  historicalRecords: readonly Pick<DividendHistoryDBRow, "date" | "dividend">[],
  currentYear: number
): {
  pastTotals: readonly AnnualDividendTotal[];
  growthYoY: number | null;
} {
  const yearlyData: Record<number, number> = {};
  historicalRecords.forEach((record) => {
    if (record.date && record.dividend !== null) {
      const year = new Date(record.date).getUTCFullYear();
      yearlyData[year] = (yearlyData[year] || 0) + record.dividend;
    }
  });

  const pastTotals: AnnualDividendTotal[] = [];
  for (let i = 0; i < 3; i++) {
    const targetYear = currentYear - 1 - i;
    pastTotals.push({
      year: targetYear,
      totalDividend: yearlyData[targetYear] ?? 0, // Default to 0 if no data
      isEstimate: false,
    });
  }
  // These are already effectively sorted with newest past year first if loop is as is,
  // but we will sort the final combined array later.

  let growthYoY: number | null = null;
  const lastFullYear = currentYear - 1;
  const prevFullYear = currentYear - 2;

  const lastFullYearTotal = yearlyData[lastFullYear];
  const prevFullYearTotal = yearlyData[prevFullYear];

  if (
    lastFullYearTotal !== undefined &&
    prevFullYearTotal !== undefined &&
    prevFullYearTotal > 0
  ) {
    growthYoY = (lastFullYearTotal - prevFullYearTotal) / prevFullYearTotal;
  }

  return { pastTotals, growthYoY };
}

function calculateNextYearEstimate(
  latestDividend: LatestDividendInfo | null
): number | null {
  if (
    !latestDividend ||
    latestDividend.amount === null ||
    !latestDividend.frequency
  ) {
    return null;
  }
  const amount = latestDividend.amount;
  switch (latestDividend.frequency.toLowerCase()) {
    case "quarterly":
      return amount * 4;
    case "annually":
    case "annual": // FMP might use 'Annual'
      return amount * 1;
    case "semi-annually":
    case "semi-annual": // FMP might use 'Semi-Annual'
      return amount * 2;
    case "monthly":
      return amount * 12;
    default:
      // If frequency is unknown or irregular, cannot reliably estimate annual from single payment.
      // Could try to sum last 4 quarters if available, but that's more complex from just 'latestDividend'
      return null;
  }
}

async function fetchAndProcessDividendsData(
  symbol: string,
  supabase: CardInitializationContext["supabase"]
): Promise<{
  profileInfo: {
    companyName: string | null;
    logoUrl: string | null;
    reportedCurrency: string | null;
  };
  latestDividendRow: DividendHistoryDBRow | null;
  historicalRows: DividendHistoryDBRow[];
}> {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("company_name, image, currency")
    .eq("symbol", symbol)
    .maybeSingle();

  if (profileError) {
    console.warn(
      `[DividendsHistoryCard] Error fetching profile for ${symbol}:`,
      profileError.message
    );
  }
  const fetchedProfileInfo = {
    companyName:
      (profileData as ProfileDBRowFromSupabase | null)?.company_name ?? symbol,
    logoUrl: (profileData as ProfileDBRowFromSupabase | null)?.image ?? null,
    reportedCurrency:
      (profileData as ProfileDBRowFromSupabase | null)?.currency ?? null,
  };

  const { data: latestDividendData, error: latestDivError } = await supabase
    .from("dividend_history")
    .select("*")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestDivError) {
    console.error(
      `[DividendsHistoryCard] Error fetching latest dividend for ${symbol}:`,
      latestDivError
    );
  }

  const fourYearsAgo = new Date();
  fourYearsAgo.setUTCFullYear(fourYearsAgo.getUTCFullYear() - 4);
  const startDate = fourYearsAgo.toISOString().split("T")[0];

  const { data: historicalDivData, error: histDivError } = await supabase
    .from("dividend_history")
    .select("*")
    .eq("symbol", symbol)
    .gte("date", startDate) // Fetch enough data for 3 past full years
    .order("date", { ascending: false });

  if (histDivError) {
    console.error(
      `[DividendsHistoryCard] Error fetching historical dividends for ${symbol}:`,
      histDivError
    );
  }

  return {
    profileInfo: fetchedProfileInfo,
    latestDividendRow: latestDividendData as DividendHistoryDBRow | null,
    historicalRows: (historicalDivData as DividendHistoryDBRow[]) || [],
  };
}

function constructDividendsHistoryCardData(
  symbol: string,
  profileInfo: {
    companyName: string | null;
    logoUrl: string | null;
    reportedCurrency: string | null;
  },
  latestDividendRow: DividendHistoryDBRow | null,
  historicalRows: readonly DividendHistoryDBRow[],
  idOverride?: string | null,
  existingCreatedAt?: number | null
): DividendsHistoryCardData {
  const currentUtcYear = new Date().getUTCFullYear();
  const { pastTotals, growthYoY } = calculatePastAnnualTotals(
    historicalRows,
    currentUtcYear
  );

  const latestDividendInfo: LatestDividendInfo | null = latestDividendRow
    ? {
        amount: latestDividendRow.dividend,
        adjAmount: latestDividendRow.adj_dividend,
        exDividendDate: latestDividendRow.date,
        paymentDate: latestDividendRow.payment_date,
        declarationDate: latestDividendRow.declaration_date,
        yieldAtDistribution: latestDividendRow.yield,
        frequency: latestDividendRow.frequency,
      }
    : null;

  const nextYearEstimateValue = calculateNextYearEstimate(latestDividendInfo);
  const annualDividendFigures: AnnualDividendTotal[] = [
    ...pastTotals.map((pt) => ({ ...pt, isEstimate: false })),
  ];

  if (nextYearEstimateValue !== null) {
    annualDividendFigures.push({
      year: currentUtcYear + 1, // Estimate for the next calendar year
      totalDividend: nextYearEstimateValue,
      isEstimate: true,
    });
  }
  // Sort by year ascending for consistent display order (oldest to newest)
  annualDividendFigures.sort((a, b) => a.year - b.year);

  const staticData: DividendsHistoryCardStaticData = {
    reportedCurrency: profileInfo.reportedCurrency,
    typicalFrequency: getTypicalFrequency(
      latestDividendInfo?.frequency ?? null,
      historicalRows
    ),
  };

  const liveData: DividendsHistoryCardLiveData = {
    latestDividend: latestDividendInfo,
    annualDividendFigures: annualDividendFigures,
    lastFullYearDividendGrowthYoY: growthYoY,
    lastUpdated:
      latestDividendRow?.fetched_at || latestDividendRow?.updated_at || null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Historical dividend payments and trends for ${
      profileInfo.companyName || symbol
    }, including recent payments and annual totals. Next year estimate based on latest payment.`,
  };

  return {
    id: idOverride || `dividendshistory-${symbol}-${Date.now()}`,
    type: "dividendshistory",
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

async function initializeDividendsHistoryCard({
  symbol,
  supabase,
  toast,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { profileInfo, latestDividendRow, historicalRows } =
      await fetchAndProcessDividendsData(symbol, supabase);

    if (!latestDividendRow && historicalRows.length === 0) {
      if (toast) {
        toast({
          title: "No Dividend Data",
          description: `No dividend history found for ${symbol}.`,
          variant: "default",
        });
      }
      return null;
    }

    const concreteCardData = constructDividendsHistoryCardData(
      symbol,
      profileInfo,
      latestDividendRow,
      historicalRows
    );
    const cardState: Pick<DisplayableCardState, "isFlipped"> = {
      isFlipped: false,
    };
    return { ...concreteCardData, ...cardState };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    console.error(
      `[initializeDividendsHistoryCard] Error for ${symbol}:`,
      errorMessage
    );
    if (toast) {
      toast({
        title: "Error Initializing Dividends History",
        description: `Could not fetch dividend data for ${symbol}. ${errorMessage}`,
        variant: "destructive",
      });
    }
    return null;
  }
}
registerCardInitializer("dividendshistory", initializeDividendsHistoryCard);

const handleSingleDividendRowUpdate: CardUpdateHandler<
  DividendsHistoryCardData,
  DividendHistoryDBRow
> = (
  currentCardData,
  newDividendRow,
  _currentDisplayableCard,
  context
): DividendsHistoryCardData => {
  const updatedLiveData = { ...currentCardData.liveData };
  let hasChanged = false;
  const currentUtcYear = new Date().getUTCFullYear();

  const newIsLaterOrSameDateButNewerTimestamp =
    new Date(newDividendRow.date) >
      new Date(updatedLiveData.latestDividend?.exDividendDate || 0) ||
    (new Date(newDividendRow.date).getTime() ===
      new Date(updatedLiveData.latestDividend?.exDividendDate || 0).getTime() &&
      new Date(newDividendRow.updated_at || newDividendRow.fetched_at) >
        new Date(updatedLiveData.lastUpdated || 0));

  if (newIsLaterOrSameDateButNewerTimestamp) {
    const newLatestDividendInfo: LatestDividendInfo = {
      amount: newDividendRow.dividend,
      adjAmount: newDividendRow.adj_dividend,
      exDividendDate: newDividendRow.date,
      paymentDate: newDividendRow.payment_date,
      declarationDate: newDividendRow.declaration_date,
      yieldAtDistribution: newDividendRow.yield,
      frequency: newDividendRow.frequency,
    };
    updatedLiveData.latestDividend = newLatestDividendInfo;
    updatedLiveData.lastUpdated =
      newDividendRow.updated_at ||
      newDividendRow.fetched_at ||
      new Date().toISOString();
    hasChanged = true;

    // Recalculate next year estimate based on the new latest dividend
    const nextYearEstimateValue = calculateNextYearEstimate(
      newLatestDividendInfo
    );
    const currentAnnualFigures = [...updatedLiveData.annualDividendFigures];
    const estimateIndex = currentAnnualFigures.findIndex(
      (item) => item.isEstimate
    );

    if (nextYearEstimateValue !== null) {
      const estimateEntry: AnnualDividendTotal = {
        year: currentUtcYear + 1,
        totalDividend: nextYearEstimateValue,
        isEstimate: true,
      };
      if (estimateIndex !== -1) {
        // Update existing estimate if year matches, or if only one estimate exists
        if (currentAnnualFigures[estimateIndex].year === currentUtcYear + 1) {
          currentAnnualFigures[estimateIndex] = estimateEntry;
        } else {
          // year changed, replace
          currentAnnualFigures.splice(estimateIndex, 1, estimateEntry);
        }
      } else {
        currentAnnualFigures.push(estimateEntry);
      }
    } else if (estimateIndex !== -1) {
      // Remove estimate if it can no longer be calculated
      currentAnnualFigures.splice(estimateIndex, 1);
    }
    currentAnnualFigures.sort((a, b) => a.year - b.year);
    updatedLiveData.annualDividendFigures = currentAnnualFigures;
  }

  const updatedStaticData = { ...currentCardData.staticData };
  if (
    newIsLaterOrSameDateButNewerTimestamp &&
    newDividendRow.frequency &&
    currentCardData.staticData.typicalFrequency !== newDividendRow.frequency
  ) {
    updatedStaticData.typicalFrequency = newDividendRow.frequency;
  }

  if (hasChanged) {
    if (context.toast) {
      context.toast({
        title: "Dividend Info Updated",
        description: `Latest dividend for ${currentCardData.symbol} processed for ${newDividendRow.date}. Next year estimate may have updated.`,
      });
    }
    return {
      ...currentCardData,
      liveData: updatedLiveData,
      staticData: updatedStaticData,
    };
  }

  return currentCardData;
};

// Register with a specific event type for dividend row updates
// Ensure this event type is defined in CardUpdateEventType and dispatched correctly
registerCardUpdateHandler(
  "dividendshistory",
  "DIVIDEND_ROW_UPDATE", // Example: Replace with your actual specific event type
  handleSingleDividendRowUpdate
);

const handleDividendsHistoryProfileUpdate: CardUpdateHandler<
  DividendsHistoryCardData,
  ProfileDBRow
> = (currentCardData, profilePayload): DividendsHistoryCardData => {
  const newCompanyName = profilePayload.company_name ?? currentCardData.symbol;
  const newLogoUrl = profilePayload.image ?? null;
  const newReportedCurrency = profilePayload.currency ?? null;

  let needsUpdate = false;
  if (currentCardData.companyName !== newCompanyName) needsUpdate = true;
  if (currentCardData.logoUrl !== newLogoUrl) needsUpdate = true;
  if (currentCardData.staticData.reportedCurrency !== newReportedCurrency) {
    needsUpdate = true;
  }

  if (needsUpdate) {
    return {
      ...currentCardData,
      companyName: newCompanyName,
      logoUrl: newLogoUrl,
      staticData: {
        ...currentCardData.staticData,
        reportedCurrency: newReportedCurrency,
      },
      backData: {
        description: `Historical dividend payments and trends for ${newCompanyName}, including recent payments and annual totals. Next year estimate based on latest payment.`,
      },
    };
  }
  return currentCardData;
};
registerCardUpdateHandler(
  "dividendshistory",
  "STATIC_PROFILE_UPDATE",
  handleDividendsHistoryProfileUpdate
);
