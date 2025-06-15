// src/components/game/cards/revenue-breakdown-card/revenueBreakdownCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  RevenueBreakdownCardData,
  RevenueBreakdownCardLiveData,
  RevenueBreakdownCardStaticData,
  SegmentRevenueDataItem,
} from "./revenue-breakdown-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import { parseTimestampSafe } from "@/lib/formatters";

interface StoredSegmentRevenueDataItemShape {
  segmentName?: string;
  currentRevenue?: number;
  previousRevenue?: number | null;
  yoyChange?: number | null;
}

interface StoredRevenueBreakdownStaticDataShape {
  currencySymbol?: string;
  latestPeriodLabel?: string;
  previousPeriodLabel?: string | null;
}

interface StoredRevenueBreakdownLiveDataShape {
  totalRevenueLatestPeriod?: number | null;
  breakdown?: readonly StoredSegmentRevenueDataItemShape[];
  lastUpdated?: string | number | null;
}

interface StoredRevenueBreakdownCardObject {
  staticData?: StoredRevenueBreakdownStaticDataShape;
  liveData?: StoredRevenueBreakdownLiveDataShape;
  backData?: Partial<BaseCardBackData>;
  websiteUrl?: string | null;
}

const rehydrateRevenueBreakdownCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): RevenueBreakdownCardData | null => {
  const stored = cardFromStorage as StoredRevenueBreakdownCardObject;

  const staticDataSource = stored.staticData || {};
  const liveDataSource = stored.liveData || {};
  const backDataSource = stored.backData || {};

  const rehydratedStaticData: RevenueBreakdownCardStaticData = {
    currencySymbol: staticDataSource.currencySymbol ?? "$",
    latestPeriodLabel: staticDataSource.latestPeriodLabel ?? "N/A",
    previousPeriodLabel:
      staticDataSource.previousPeriodLabel === undefined
        ? null
        : staticDataSource.previousPeriodLabel,
  };

  const rehydratedBreakdown: SegmentRevenueDataItem[] = (
    liveDataSource.breakdown || []
  ).map((item) => ({
    segmentName: item.segmentName ?? "Unknown Segment",
    currentRevenue: item.currentRevenue ?? 0,
    previousRevenue:
      item.previousRevenue === undefined ? null : item.previousRevenue,
    yoyChange: item.yoyChange === undefined ? null : item.yoyChange,
  }));

  const lastUpdatedTimestamp = parseTimestampSafe(liveDataSource.lastUpdated);

  const rehydratedLiveData: RevenueBreakdownCardLiveData = {
    totalRevenueLatestPeriod: liveDataSource.totalRevenueLatestPeriod ?? null,
    breakdown: rehydratedBreakdown,
    lastUpdated: lastUpdatedTimestamp
      ? new Date(lastUpdatedTimestamp).toISOString()
      : null,
  };

  const defaultDescription = `Revenue breakdown by product/segment for ${
    commonProps.companyName || commonProps.symbol
  } for ${rehydratedStaticData.latestPeriodLabel}.`;
  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  return {
    id: commonProps.id,
    type: "revenuebreakdown",
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

registerCardRehydrator(
  "revenuebreakdown",
  rehydrateRevenueBreakdownCardInstance
);
