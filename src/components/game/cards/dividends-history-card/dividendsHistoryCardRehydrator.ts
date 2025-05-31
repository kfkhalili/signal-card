// src/components/game/cards/dividends-history-card/dividendsHistoryCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  DividendsHistoryCardData,
  DividendsHistoryCardLiveData,
  DividendsHistoryCardStaticData,
  LatestDividendInfo,
  AnnualDividendTotal,
} from "./dividends-history-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import { parseTimestampSafe } from "@/lib/formatters";

interface StoredLatestDividendInfoShape {
  amount?: number | null;
  adjAmount?: number | null;
  exDividendDate?: string | null;
  paymentDate?: string | null;
  declarationDate?: string | null;
  yieldAtDistribution?: number | null;
  frequency?: string | null;
}

interface StoredAnnualDividendTotalShape {
  year?: number;
  totalDividend?: number;
}

interface StoredDividendsHistoryStaticDataShape {
  reportedCurrency?: string | null;
  typicalFrequency?: string | null;
}

interface StoredDividendsHistoryLiveDataShape {
  latestDividend?: StoredLatestDividendInfoShape | null;
  annualTotalsLast3Years?: readonly StoredAnnualDividendTotalShape[];
  lastFullYearDividendGrowthYoY?: number | null;
  lastUpdated?: string | number | null; // Can be string or number from storage
}

interface StoredBaseCardBackDataShape {
  description?: string | null;
}

interface StoredDividendsHistoryCardObject {
  staticData?: StoredDividendsHistoryStaticDataShape;
  liveData?: StoredDividendsHistoryLiveDataShape;
  backData?: StoredBaseCardBackDataShape;
  websiteUrl?: string | null;
}

const rehydrateDividendsHistoryCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): DividendsHistoryCardData | null => {
  const stored = cardFromStorage as StoredDividendsHistoryCardObject;

  const staticDataSource = stored.staticData || {};
  const liveDataSource = stored.liveData || {};
  const backDataSource = stored.backData || {};

  const rehydratedStaticData: DividendsHistoryCardStaticData = {
    reportedCurrency: staticDataSource.reportedCurrency ?? null,
    typicalFrequency: staticDataSource.typicalFrequency ?? null,
  };

  let rehydratedLatestDividend: LatestDividendInfo | null = null;
  if (liveDataSource.latestDividend) {
    const ld = liveDataSource.latestDividend;
    rehydratedLatestDividend = {
      amount: ld.amount ?? null,
      adjAmount: ld.adjAmount ?? null,
      exDividendDate: ld.exDividendDate ?? null,
      paymentDate: ld.paymentDate ?? null,
      declarationDate: ld.declarationDate ?? null,
      yieldAtDistribution: ld.yieldAtDistribution ?? null,
      frequency: ld.frequency ?? null,
    };
  }

  const rehydratedAnnualTotals: AnnualDividendTotal[] = (
    liveDataSource.annualTotalsLast3Years || []
  )
    .map((item) => ({
      year: item.year ?? 0,
      totalDividend: item.totalDividend ?? 0,
    }))
    .filter((item) => item.year !== 0); // Filter out invalid entries

  const lastUpdatedTimestamp = parseTimestampSafe(liveDataSource.lastUpdated);

  const rehydratedLiveData: DividendsHistoryCardLiveData = {
    latestDividend: rehydratedLatestDividend,
    annualTotalsLast3Years: rehydratedAnnualTotals,
    lastFullYearDividendGrowthYoY:
      liveDataSource.lastFullYearDividendGrowthYoY ?? null,
    lastUpdated: lastUpdatedTimestamp
      ? new Date(lastUpdatedTimestamp).toISOString()
      : null,
  };

  const defaultDescription = `Historical dividend payments and trends for ${
    commonProps.companyName || commonProps.symbol
  }.`;
  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  return {
    id: commonProps.id,
    type: "dividendshistory",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    websiteUrl: stored.websiteUrl ?? null,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
  };
};

registerCardRehydrator(
  "dividendshistory",
  rehydrateDividendsHistoryCardInstance
);
