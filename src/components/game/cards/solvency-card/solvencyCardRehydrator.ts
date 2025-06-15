// src/components/game/cards/solvency-card/solvencyCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  SolvencyCardData,
  SolvencyCardLiveData,
  SolvencyCardStaticData,
} from "./solvency-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

// Define expected shapes for stored data
interface StoredSolvencyCardStaticDataShape {
  periodLabel?: string | null;
  reportedCurrency?: string | null;
  filingDate?: string | null;
  acceptedDate?: string | null;
  statementDate?: string | null;
  statementPeriod?: string | null;
}

interface StoredSolvencyCardLiveDataShape {
  totalAssets?: number | null;
  cashAndShortTermInvestments?: number | null;
  totalCurrentLiabilities?: number | null;
  shortTermDebt?: number | null;
  longTermDebt?: number | null;
  freeCashFlow?: number | null;
}

interface StoredBaseCardBackDataShape {
  description?: string | null;
}

interface StoredSolvencyCardObject {
  staticData?: StoredSolvencyCardStaticDataShape;
  liveData?: StoredSolvencyCardLiveDataShape;
  backData?: StoredBaseCardBackDataShape;
}

const rehydrateSolvencyCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): SolvencyCardData | null => {
  const stored = cardFromStorage as StoredSolvencyCardObject;

  const staticDataSource = stored.staticData || {};
  const liveDataSource = stored.liveData || {};
  const backDataSource = stored.backData || {};

  const rehydratedStaticData: SolvencyCardStaticData = {
    periodLabel: staticDataSource.periodLabel ?? "N/A",
    reportedCurrency: staticDataSource.reportedCurrency ?? null,
    filingDate: staticDataSource.filingDate ?? null,
    acceptedDate: staticDataSource.acceptedDate ?? null,
    statementDate: staticDataSource.statementDate ?? "N/A",
    statementPeriod: staticDataSource.statementPeriod ?? "N/A",
  };

  const rehydratedLiveData: SolvencyCardLiveData = {
    totalAssets: liveDataSource.totalAssets ?? null,
    cashAndShortTermInvestments:
      liveDataSource.cashAndShortTermInvestments ?? null,
    totalCurrentLiabilities: liveDataSource.totalCurrentLiabilities ?? null,
    shortTermDebt: liveDataSource.shortTermDebt ?? null,
    longTermDebt: liveDataSource.longTermDebt ?? null,
    freeCashFlow: liveDataSource.freeCashFlow ?? null,
  };

  const defaultDescription = `Key solvency metrics for ${commonProps.symbol} (${rehydratedStaticData.periodLabel}, ending ${rehydratedStaticData.statementDate}). Includes assets, liabilities, debt, and cash flow.`;
  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  const rehydratedCard: SolvencyCardData = {
    ...commonProps,
    type: "solvency",
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
    websiteUrl: null, // Solvency cards typically don't have a direct websiteUrl
  };

  return rehydratedCard;
};

registerCardRehydrator("solvency", rehydrateSolvencyCardInstance);
