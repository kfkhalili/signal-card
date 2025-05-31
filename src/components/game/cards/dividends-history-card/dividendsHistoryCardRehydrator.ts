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

// Updated to include isEstimate
interface StoredAnnualDividendTotalShape {
  year?: number;
  totalDividend?: number;
  isEstimate?: boolean; // Added
}

interface StoredDividendsHistoryStaticDataShape {
  reportedCurrency?: string | null;
  typicalFrequency?: string | null;
}

interface StoredDividendsHistoryLiveDataShape {
  latestDividend?: StoredLatestDividendInfoShape | null;
  annualDividendFigures?: readonly StoredAnnualDividendTotalShape[];
  lastFullYearDividendGrowthYoY?: number | null;
  lastUpdated?: string | number | null;
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

  // Use the correct property name 'annualDividendFigures'
  // Ensure it defaults to an empty array if not present in liveDataSource
  const figuresFromStorage = liveDataSource.annualDividendFigures || [];
  const rehydratedAnnualDividendFigures: AnnualDividendTotal[] =
    figuresFromStorage
      .map((item) => ({
        year: item.year ?? 0, // Default year to 0 if undefined
        totalDividend: item.totalDividend ?? 0, // Default dividend to 0 if undefined
        isEstimate: item.isEstimate ?? false, // Default isEstimate to false
      }))
      .filter((item) => item.year !== 0); // Filter out entries with a year of 0 (likely invalid)

  const lastUpdatedTimestamp = parseTimestampSafe(liveDataSource.lastUpdated);

  const rehydratedLiveData: DividendsHistoryCardLiveData = {
    latestDividend: rehydratedLatestDividend,
    annualDividendFigures: rehydratedAnnualDividendFigures, // Correctly assigned
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
