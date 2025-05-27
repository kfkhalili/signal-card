// src/components/game/cards/revenue-card/revenueCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  RevenueCardData,
  RevenueCardLiveData,
  RevenueCardStaticData,
} from "./revenue-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

// Define expected shapes for stored data to aid safe access
interface StoredRevenueCardStaticDataShape {
  periodLabel?: string | null;
  reportedCurrency?: string | null;
  filingDate?: string | null;
  acceptedDate?: string | null;
  statementDate?: string | null;
  statementPeriod?: string | null;
}

interface StoredRevenueCardLiveDataShape {
  revenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  freeCashFlow?: number | null;
}

interface StoredBaseCardBackDataShape {
  description?: string | null;
}

interface StoredRevenueCardObject {
  staticData?: StoredRevenueCardStaticDataShape;
  liveData?: StoredRevenueCardLiveDataShape;
  backData?: StoredBaseCardBackDataShape;
}

const rehydrateRevenueCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): RevenueCardData | null => {
  const stored = cardFromStorage as StoredRevenueCardObject;

  const staticDataSource = stored.staticData || {};
  const liveDataSource = stored.liveData || {};
  const backDataSource = stored.backData || {};

  const rehydratedStaticData: RevenueCardStaticData = {
    periodLabel: staticDataSource.periodLabel ?? "N/A",
    reportedCurrency: staticDataSource.reportedCurrency ?? null,
    filingDate: staticDataSource.filingDate ?? null,
    acceptedDate: staticDataSource.acceptedDate ?? null,
    statementDate: staticDataSource.statementDate ?? "N/A",
    statementPeriod: staticDataSource.statementPeriod ?? "N/A",
  };

  const rehydratedLiveData: RevenueCardLiveData = {
    revenue: liveDataSource.revenue ?? null,
    grossProfit: liveDataSource.grossProfit ?? null,
    operatingIncome: liveDataSource.operatingIncome ?? null,
    netIncome: liveDataSource.netIncome ?? null,
    freeCashFlow: liveDataSource.freeCashFlow ?? null,
  };

  const defaultDescription = `Key financial metrics for ${commonProps.symbol} (${rehydratedStaticData.periodLabel}, ending ${rehydratedStaticData.statementDate}). Includes revenue, profits, and free cash flow.`;
  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  const rehydratedCard: RevenueCardData = {
    id: commonProps.id,
    type: "revenue",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
    websiteUrl: null, // Revenue cards typically don't have a direct websiteUrl distinct from the company profile
  };

  return rehydratedCard;
};

registerCardRehydrator("revenue", rehydrateRevenueCardInstance);
