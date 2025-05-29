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
} from "./cash-use-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

// Shape of the card-specific static data expected in storage
interface StoredCashUseCardStaticDataShape {
  reportedCurrency?: string | null;
  // sharesRangePeriodLabel is removed as outstanding_shares is a single value
  debtRangePeriodLabel?: string;
  fcfRangePeriodLabel?: string;
  dividendsRangePeriodLabel?: string;
  latestStatementDate?: string | null;
  latestStatementPeriod?: string | null;
  latestSharesFloatDate?: string | null;
}

// Shape of the card-specific live data expected in storage
interface StoredCashUseCardLiveDataShape {
  currentOutstandingShares?: number | null;
  // outstandingShares_5y_min and _max are removed

  currentTotalDebt?: number | null;
  totalDebt_5y_min?: number | null;
  totalDebt_5y_max?: number | null;
  currentFreeCashFlow?: number | null;
  freeCashFlow_5y_min?: number | null;
  freeCashFlow_5y_max?: number | null;
  currentNetDividendsPaid?: number | null;
  netDividendsPaid_5y_min?: number | null;
  netDividendsPaid_5y_max?: number | null;
}

// Shape for the back face description
interface StoredBaseCardBackDataShape {
  description?: string | null;
}

// Defines the expected structure of the CashUseCard-specific part of cardFromStorage
// It does NOT include common properties like id, symbol, etc., as those are in commonProps.
interface StoredCashUseCardObjectShape {
  staticData?: StoredCashUseCardStaticDataShape;
  liveData?: StoredCashUseCardLiveDataShape;
  backData?: StoredBaseCardBackDataShape;
  websiteUrl?: string | null; // If CashUseCard specifically stores its own websiteUrl
}

const rehydrateCashUseCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>, // Raw object from storage, contains only card-specific parts
  commonProps: CommonCardPropsForRehydration // Common properties already parsed
): CashUseCardData | null => {
  // Cast cardFromStorage to the shape of CashUseCard-specific stored data
  const storedSpecificData = cardFromStorage as StoredCashUseCardObjectShape;

  const staticDataSource = storedSpecificData.staticData || {};
  const liveDataSource = storedSpecificData.liveData || {};
  const backDataSource = storedSpecificData.backData || {};

  const rehydratedStaticData: CashUseCardStaticData = {
    reportedCurrency: staticDataSource.reportedCurrency ?? null,
    debtRangePeriodLabel: staticDataSource.debtRangePeriodLabel ?? "N/A",
    fcfRangePeriodLabel: staticDataSource.fcfRangePeriodLabel ?? "N/A",
    dividendsRangePeriodLabel:
      staticDataSource.dividendsRangePeriodLabel ?? "N/A",
    latestStatementDate: staticDataSource.latestStatementDate ?? null,
    latestStatementPeriod: staticDataSource.latestStatementPeriod ?? null,
    latestSharesFloatDate: staticDataSource.latestSharesFloatDate ?? null,
  };

  const rehydratedLiveData: CashUseCardLiveData = {
    currentOutstandingShares: liveDataSource.currentOutstandingShares ?? null,
    currentTotalDebt: liveDataSource.currentTotalDebt ?? null,
    totalDebt_5y_min: liveDataSource.totalDebt_5y_min ?? null,
    totalDebt_5y_max: liveDataSource.totalDebt_5y_max ?? null,
    currentFreeCashFlow: liveDataSource.currentFreeCashFlow ?? null,
    freeCashFlow_5y_min: liveDataSource.freeCashFlow_5y_min ?? null,
    freeCashFlow_5y_max: liveDataSource.freeCashFlow_5y_max ?? null,
    currentNetDividendsPaid: liveDataSource.currentNetDividendsPaid ?? null,
    netDividendsPaid_5y_min: liveDataSource.netDividendsPaid_5y_min ?? null,
    netDividendsPaid_5y_max: liveDataSource.netDividendsPaid_5y_max ?? null,
  };

  const defaultDescription = `Cash usage metrics for ${
    commonProps.companyName || commonProps.symbol
  }. Financial data from ${
    rehydratedStaticData.latestStatementDate || "N/A"
  } (${
    rehydratedStaticData.latestStatementPeriod || "N/A"
  }). Shares outstanding as of ${
    rehydratedStaticData.latestSharesFloatDate || "N/A"
  }.`;

  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  // Construct the full CashUseCardData using commonProps and rehydrated specific data
  const rehydratedCard: CashUseCardData = {
    // Common properties supplied by the generic rehydration logic
    id: commonProps.id,
    type: "cashuse", // This specific rehydrator is for "cashuse" type
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,

    // Card-specific properties rehydrated here
    websiteUrl: storedSpecificData.websiteUrl ?? null, // Sourced from card-specific stored data
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
  };

  return rehydratedCard;
};

registerCardRehydrator("cashuse", rehydrateCashUseCardInstance);
