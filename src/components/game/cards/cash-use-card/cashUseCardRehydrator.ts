// src/components/game/cards/cash-use-card/cashUseCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  CashUseCardData,
  CashUseCardLiveData,
  CashUseCardStaticData,
  AnnualDataPoint,
} from "./cash-use-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

interface StoredAnnualDataPoint {
  year?: number;
  value?: number;
}

interface StoredCashUseCardStaticDataShape {
  reportedCurrency?: string | null;
  latestStatementDate?: string | null;
  latestStatementPeriod?: string | null;
}

interface StoredCashUseCardLiveDataShape {
  currentOutstandingShares?: number | null;
  outstandingShares_annual_data?: readonly StoredAnnualDataPoint[];
  currentTotalDebt?: number | null;
  totalDebt_annual_data?: readonly StoredAnnualDataPoint[];
  currentFreeCashFlow?: number | null;
  freeCashFlow_annual_data?: readonly StoredAnnualDataPoint[];
  currentNetDividendsPaid?: number | null;
  netDividendsPaid_annual_data?: readonly StoredAnnualDataPoint[];
}

interface StoredBaseCardBackDataShape {
  description?: string | null;
}

interface StoredCashUseCardObjectShape {
  staticData?: StoredCashUseCardStaticDataShape;
  liveData?: StoredCashUseCardLiveDataShape;
  backData?: StoredBaseCardBackDataShape;
  websiteUrl?: string | null;
}

const rehydrateCashUseCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): CashUseCardData | null => {
  const storedSpecificData = cardFromStorage as StoredCashUseCardObjectShape;

  const staticDataSource = storedSpecificData.staticData || {};
  const liveDataSource = storedSpecificData.liveData || {};
  const backDataSource = storedSpecificData.backData || {};

  const rehydratedStaticData: CashUseCardStaticData = {
    reportedCurrency: staticDataSource.reportedCurrency ?? null,
    latestStatementDate: staticDataSource.latestStatementDate ?? null,
    latestStatementPeriod: staticDataSource.latestStatementPeriod ?? null,
  };

  const rehydrateAnnualData = (
    data: readonly StoredAnnualDataPoint[] | undefined
  ): AnnualDataPoint[] =>
    (data ?? [])
      .map((p) => ({ year: p.year ?? 0, value: p.value ?? 0 }))
      .filter((p) => p.year > 0);

  const rehydratedLiveData: CashUseCardLiveData = {
    currentOutstandingShares: liveDataSource.currentOutstandingShares ?? null,
    outstandingShares_annual_data: rehydrateAnnualData(
      liveDataSource.outstandingShares_annual_data
    ),
    currentTotalDebt: liveDataSource.currentTotalDebt ?? null,
    totalDebt_annual_data: rehydrateAnnualData(
      liveDataSource.totalDebt_annual_data
    ),
    currentFreeCashFlow: liveDataSource.currentFreeCashFlow ?? null,
    freeCashFlow_annual_data: rehydrateAnnualData(
      liveDataSource.freeCashFlow_annual_data
    ),
    currentNetDividendsPaid: liveDataSource.currentNetDividendsPaid ?? null,
    netDividendsPaid_annual_data: rehydrateAnnualData(
      liveDataSource.netDividendsPaid_annual_data
    ),
  };

  const defaultDescription = `Cash usage metrics for ${
    commonProps.companyName || commonProps.symbol
  }. Financial data from ${
    rehydratedStaticData.latestStatementDate || "N/A"
  } (${rehydratedStaticData.latestStatementPeriod || "N/A"}).`;

  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  const rehydratedCard: CashUseCardData = {
    ...commonProps,
    type: "cashuse",
    websiteUrl: storedSpecificData.websiteUrl ?? null,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
  };

  return rehydratedCard;
};

registerCardRehydrator("cashuse", rehydrateCashUseCardInstance);
