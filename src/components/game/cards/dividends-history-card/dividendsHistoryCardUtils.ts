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

function calculateAnnualTotals(
  historicalRecords: readonly Pick<DividendHistoryDBRow, "date" | "dividend">[],
  currentYear: number
): {
  annualTotals: readonly AnnualDividendTotal[];
  growthYoY: number | null;
} {
  const yearlyData: Record<number, number> = {};
  historicalRecords.forEach((record) => {
    if (record.date && record.dividend !== null) {
      const year = new Date(record.date).getUTCFullYear();
      yearlyData[year] = (yearlyData[year] || 0) + record.dividend;
    }
  });

  const annualTotals: AnnualDividendTotal[] = [];
  for (let i = 0; i < 3; i++) {
    const targetYear = currentYear - 1 - i;
    if (yearlyData[targetYear] !== undefined) {
      annualTotals.push({
        year: targetYear,
        totalDividend: yearlyData[targetYear],
      });
    } else {
      annualTotals.push({ year: targetYear, totalDividend: 0 });
    }
  }
  annualTotals.sort((a, b) => b.year - a.year);

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

  return { annualTotals, growthYoY };
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
    .gte("date", startDate)
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
  const currentYear = new Date().getUTCFullYear();
  const { annualTotals, growthYoY } = calculateAnnualTotals(
    historicalRows,
    currentYear
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

  const staticData: DividendsHistoryCardStaticData = {
    reportedCurrency: profileInfo.reportedCurrency,
    typicalFrequency: getTypicalFrequency(
      latestDividendInfo?.frequency ?? null,
      historicalRows
    ),
  };

  const liveData: DividendsHistoryCardLiveData = {
    latestDividend: latestDividendInfo,
    annualTotalsLast3Years: annualTotals,
    lastFullYearDividendGrowthYoY: growthYoY,
    lastUpdated:
      latestDividendRow?.fetched_at || latestDividendRow?.updated_at || null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Historical dividend payments and trends for ${
      profileInfo.companyName || symbol
    }, including recent payments and annual totals.`,
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

// To make this handler functional, you'll need to:
// 1. Define a new CardUpdateEventType, e.g., 'DIVIDEND_ROW_UPDATE'.
//    In `src/components/game/cardUpdateHandler.types.ts`:
//    export type CardUpdateEventType = ... | "DIVIDEND_ROW_UPDATE";
// 2. Ensure your real-time subscription system (likely in `useStockData.ts` or `useWorkspaceManager.ts`)
//    listens for changes to the `dividend_history` table and, when a change occurs for a relevant symbol,
//    dispatches an event with this `CardUpdateEventType` and the `DividendHistoryDBRow` as payload.
//    This dispatched event will then be caught by `useWorkspaceManager` which calls this handler.
//
// Example of registration (replace 'DIVIDEND_ROW_UPDATE' if you use a different event type name):
/*
registerCardUpdateHandler(
  "dividendshistory",
  "DIVIDEND_ROW_UPDATE", // This should be your actual event type
  handleSingleDividendRowUpdate
);
*/

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
        description: `Historical dividend payments and trends for ${newCompanyName}, including recent payments and annual totals.`,
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
