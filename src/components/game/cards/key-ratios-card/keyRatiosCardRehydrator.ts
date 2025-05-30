// src/components/game/cards/key-ratios-card/keyRatiosCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  KeyRatiosCardData,
  KeyRatiosCardLiveData,
  KeyRatiosCardStaticData,
} from "./key-ratios-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

interface StoredKeyRatiosCardStaticDataShape {
  lastUpdated?: string | null;
  reportedCurrency?: string | null;
}

interface StoredKeyRatiosCardLiveDataShape {
  priceToEarningsRatioTTM?: number | null;
  priceToSalesRatioTTM?: number | null;
  priceToBookRatioTTM?: number | null;
  priceToFreeCashFlowRatioTTM?: number | null;
  enterpriseValueMultipleTTM?: number | null;
  netProfitMarginTTM?: number | null;
  grossProfitMarginTTM?: number | null;
  ebitdaMarginTTM?: number | null;
  debtToEquityRatioTTM?: number | null;
  dividendYieldTTM?: number | null;
  dividendPayoutRatioTTM?: number | null;
  earningsPerShareTTM?: number | null;
  revenuePerShareTTM?: number | null;
  bookValuePerShareTTM?: number | null;
  freeCashFlowPerShareTTM?: number | null;
  effectiveTaxRateTTM?: number | null;
  currentRatioTTM?: number | null;
  quickRatioTTM?: number | null;
  assetTurnoverTTM?: number | null;
}

interface StoredBaseCardBackDataShape {
  description?: string | null;
}

interface StoredKeyRatiosCardObjectShape {
  staticData?: StoredKeyRatiosCardStaticDataShape;
  liveData?: StoredKeyRatiosCardLiveDataShape;
  backData?: StoredBaseCardBackDataShape;
  websiteUrl?: string | null;
}

const rehydrateKeyRatiosCardInstance: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): KeyRatiosCardData | null => {
  const storedSpecificData = cardFromStorage as StoredKeyRatiosCardObjectShape;

  const staticDataSource = storedSpecificData.staticData || {};
  const liveDataSource = storedSpecificData.liveData || {};
  const backDataSource = storedSpecificData.backData || {};

  const rehydratedStaticData: KeyRatiosCardStaticData = {
    lastUpdated: staticDataSource.lastUpdated ?? null,
    reportedCurrency: staticDataSource.reportedCurrency ?? null,
  };

  const rehydratedLiveData: KeyRatiosCardLiveData = {
    priceToEarningsRatioTTM: liveDataSource.priceToEarningsRatioTTM ?? null,
    priceToSalesRatioTTM: liveDataSource.priceToSalesRatioTTM ?? null,
    priceToBookRatioTTM: liveDataSource.priceToBookRatioTTM ?? null,
    priceToFreeCashFlowRatioTTM:
      liveDataSource.priceToFreeCashFlowRatioTTM ?? null,
    enterpriseValueMultipleTTM:
      liveDataSource.enterpriseValueMultipleTTM ?? null,
    netProfitMarginTTM: liveDataSource.netProfitMarginTTM ?? null,
    grossProfitMarginTTM: liveDataSource.grossProfitMarginTTM ?? null,
    ebitdaMarginTTM: liveDataSource.ebitdaMarginTTM ?? null,
    debtToEquityRatioTTM: liveDataSource.debtToEquityRatioTTM ?? null,
    dividendYieldTTM: liveDataSource.dividendYieldTTM ?? null,
    dividendPayoutRatioTTM: liveDataSource.dividendPayoutRatioTTM ?? null,
    earningsPerShareTTM: liveDataSource.earningsPerShareTTM ?? null,
    revenuePerShareTTM: liveDataSource.revenuePerShareTTM ?? null,
    bookValuePerShareTTM: liveDataSource.bookValuePerShareTTM ?? null,
    freeCashFlowPerShareTTM: liveDataSource.freeCashFlowPerShareTTM ?? null,
    effectiveTaxRateTTM: liveDataSource.effectiveTaxRateTTM ?? null,
    currentRatioTTM: liveDataSource.currentRatioTTM ?? null,
    quickRatioTTM: liveDataSource.quickRatioTTM ?? null,
    assetTurnoverTTM: liveDataSource.assetTurnoverTTM ?? null,
  };

  const defaultDescription = `Key Trailing Twelve Months (TTM) financial ratios for ${
    commonProps.companyName || commonProps.symbol
  }. Ratios last updated on ${
    rehydratedStaticData.lastUpdated
      ? new Date(rehydratedStaticData.lastUpdated).toLocaleDateString()
      : "N/A"
  }.`;

  const rehydratedBackData: BaseCardBackData = {
    description: backDataSource.description || defaultDescription,
  };

  const rehydratedCard: KeyRatiosCardData = {
    id: commonProps.id,
    type: "keyratios",
    symbol: commonProps.symbol,
    createdAt: commonProps.createdAt,
    companyName: commonProps.companyName,
    logoUrl: commonProps.logoUrl,
    websiteUrl: storedSpecificData.websiteUrl ?? null,
    staticData: rehydratedStaticData,
    liveData: rehydratedLiveData,
    backData: rehydratedBackData,
  };

  return rehydratedCard;
};

registerCardRehydrator("keyratios", rehydrateKeyRatiosCardInstance);
