// src/components/game/cards/analyst-grades-card/analystGradesCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  AnalystGradesCardData,
  AnalystGradesCardLiveData,
  AnalystGradesCardStaticData,
  AnalystRatingDetail,
  RatingCategory,
} from "./analyst-grades-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import { parseTimestampSafe } from "@/lib/formatters";

interface StoredAnalystRatingDetailShape {
  category?: RatingCategory;
  label?: string;
  currentValue?: number;
  previousValue?: number | null;
  change?: number | null;
  colorClass?: string;
}

interface StoredAnalystGradesStaticDataShape {
  currentPeriodDate?: string;
  previousPeriodDate?: string | null;
}

interface StoredAnalystGradesLiveDataShape {
  ratingsDistribution?: readonly StoredAnalystRatingDetailShape[];
  totalAnalystsCurrent?: number;
  totalAnalystsPrevious?: number | null;
  consensusLabelCurrent?: string;
  lastUpdated?: string | number | null;
}

interface StoredAnalystGradesCardObject {
  staticData?: StoredAnalystGradesStaticDataShape;
  liveData?: StoredAnalystGradesLiveDataShape;
  backData?: Partial<BaseCardBackData>;
  websiteUrl?: string | null;
}

const rehydrateAnalystGradesCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): AnalystGradesCardData | null => {
  const stored = cardFromStorage as StoredAnalystGradesCardObject;

  const staticDataSource = stored.staticData || {};
  const liveDataSource = stored.liveData || {};
  const backDataSource = stored.backData || {};

  const rehydratedStaticData: AnalystGradesCardStaticData = {
    currentPeriodDate: staticDataSource.currentPeriodDate ?? "N/A",
    previousPeriodDate:
      staticDataSource.previousPeriodDate === undefined
        ? null
        : staticDataSource.previousPeriodDate,
  };

  const rehydratedRatingsDistribution: AnalystRatingDetail[] = (
    liveDataSource.ratingsDistribution || []
  ).map((item) => ({
    category: item.category ?? "hold", // Provide a default category
    label: item.label ?? "N/A",
    currentValue: item.currentValue ?? 0,
    previousValue: item.previousValue === undefined ? null : item.previousValue,
    change: item.change === undefined ? null : item.change,
    colorClass: item.colorClass ?? "bg-gray-300", // Default color
  }));

  const lastUpdatedTimestamp = parseTimestampSafe(liveDataSource.lastUpdated);

  const rehydratedLiveData: AnalystGradesCardLiveData = {
    ratingsDistribution: rehydratedRatingsDistribution,
    totalAnalystsCurrent: liveDataSource.totalAnalystsCurrent ?? 0,
    totalAnalystsPrevious:
      liveDataSource.totalAnalystsPrevious === undefined
        ? null
        : liveDataSource.totalAnalystsPrevious,
    consensusLabelCurrent: liveDataSource.consensusLabelCurrent ?? "N/A",
    lastUpdated: lastUpdatedTimestamp
      ? new Date(lastUpdatedTimestamp).toISOString()
      : null,
  };

  const defaultDescription = `Analyst rating distribution for ${
    commonProps.companyName || commonProps.symbol
  } as of ${rehydratedStaticData.currentPeriodDate}.`;

  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  return {
    id: commonProps.id,
    type: "analystgrades",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    displayCompanyName: commonProps.displayCompanyName,
    logoUrl: commonProps.logoUrl,
    websiteUrl: stored.websiteUrl ?? null,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
  };
};

registerCardRehydrator("analystgrades", rehydrateAnalystGradesCardInstance);
