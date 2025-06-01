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
import { applyProfileCoreUpdates } from "../cardUtils";

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

function calculatePastAnnualTotals(
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
      totalDividend: yearlyData[targetYear] ?? 0,
      isEstimate: false,
    });
  }

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
    case "annual":
      return amount * 1;
    case "semi-annually":
    case "semi-annual":
      return amount * 2;
    case "monthly":
      return amount * 12;
    default:
      return null;
  }
}

async function fetchAndProcessDividendsData(
  symbol: string,
  supabase: CardInitializationContext["supabase"],
  activeCards?: DisplayableCard[]
): Promise<{
  profileInfo: {
    companyName: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    reportedCurrency: string | null;
  };
  latestDividendRow: DividendHistoryDBRow | null;
  historicalRows: DividendHistoryDBRow[];
}> {
  const profileCardForSymbol = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileDBRowFromSupabase | undefined;

  let fetchedProfileInfo = {
    companyName: profileCardForSymbol?.company_name ?? symbol,
    logoUrl: profileCardForSymbol?.image ?? null,
    websiteUrl: profileCardForSymbol?.website ?? null,
    reportedCurrency: profileCardForSymbol?.currency ?? null,
  };

  if (!profileCardForSymbol) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("company_name, image, currency, website")
      .eq("symbol", symbol)
      .maybeSingle();

    if (profileError) {
      console.warn(
        `[DividendsHistoryCard] Error fetching profile for ${symbol}:`,
        profileError.message
      );
    }
    fetchedProfileInfo = {
      companyName:
        (profileData as ProfileDBRowFromSupabase | null)?.company_name ??
        symbol,
      logoUrl: (profileData as ProfileDBRowFromSupabase | null)?.image ?? null,
      websiteUrl:
        (profileData as ProfileDBRowFromSupabase | null)?.website ?? null,
      reportedCurrency:
        (profileData as ProfileDBRowFromSupabase | null)?.currency ?? null,
    };
  }

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
    websiteUrl: string | null;
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
      year: currentUtcYear + 1,
      totalDividend: nextYearEstimateValue,
      isEstimate: true,
    });
  }
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
    websiteUrl: profileInfo.websiteUrl ?? null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData,
    backData: cardBackData,
  };
}

async function initializeDividendsHistoryCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const { profileInfo, latestDividendRow, historicalRows } =
      await fetchAndProcessDividendsData(symbol, supabase, activeCards);

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
        if (currentAnnualFigures[estimateIndex].year === currentUtcYear + 1) {
          currentAnnualFigures[estimateIndex] = estimateEntry;
        } else {
          currentAnnualFigures.splice(estimateIndex, 1, estimateEntry);
        }
      } else {
        currentAnnualFigures.push(estimateEntry);
      }
    } else if (estimateIndex !== -1) {
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
    // Re-construct backData if companyName might have changed implicitly (though not directly from this payload)
    // For safety, or if profile updates are batched, consider if profileInfo should be re-fetched or passed.
    // Here, assuming companyName doesn't change with a DIVIDEND_ROW_UPDATE.
    return {
      ...currentCardData,
      liveData: updatedLiveData,
      staticData: updatedStaticData,
    };
  }

  return currentCardData;
};

registerCardUpdateHandler(
  "dividendshistory",
  "DIVIDEND_ROW_UPDATE",
  handleSingleDividendRowUpdate
);

const handleDividendsHistoryProfileUpdate: CardUpdateHandler<
  DividendsHistoryCardData,
  ProfileDBRow
> = (currentCardData, profilePayload): DividendsHistoryCardData => {
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentCardData,
    profilePayload
  );

  let currencyChanged = false;
  const newReportedCurrency = profilePayload.currency ?? null;
  if (currentCardData.staticData.reportedCurrency !== newReportedCurrency) {
    currencyChanged = true;
  }

  if (coreDataChanged || currencyChanged) {
    const finalCardData = {
      ...updatedCardData,
      staticData: {
        ...updatedCardData.staticData,
        reportedCurrency: newReportedCurrency,
      },
    };
    const newBackDataDescription: BaseCardBackData = {
      description: `Historical dividend payments and trends for ${
        finalCardData.companyName // Use the new company name
      }, including recent payments and annual totals. Next year estimate based on latest payment.`,
    };
    return {
      ...finalCardData,
      backData: newBackDataDescription,
    };
  }
  return currentCardData;
};
registerCardUpdateHandler(
  "dividendshistory",
  "STATIC_PROFILE_UPDATE",
  handleDividendsHistoryProfileUpdate
);
