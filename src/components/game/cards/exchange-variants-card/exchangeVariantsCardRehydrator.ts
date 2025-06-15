// src/components/game/cards/exchange-variants-card/exchangeVariantsCardRehydrator.ts
import {
  registerCardRehydrator,
  type CommonCardPropsForRehydration,
  type SpecificCardRehydrator,
} from "@/components/game/cardRehydration";
import type {
  ExchangeVariantsCardData,
  ExchangeVariantsCardLiveData,
  ExchangeVariantsCardStaticData,
  ExchangeVariant,
} from "./exchange-variants-card.types";
import type { BaseCardBackData } from "../base-card/base-card.types";

interface StoredExchangeVariant {
  variantSymbol?: string;
  exchangeShortName?: string;
  averageVolume?: number | null;
  countryName?: string | null;
  countryCode?: string | null;
}

// Add averageVolume to the stored baseExchangeInfo shape
interface StoredBaseExchangeInfo {
  exchangeShortName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  averageVolume?: number | null;
}

interface StoredExchangeVariantsCardObject {
  staticData?: {
    lastUpdated?: string | null;
    baseExchangeInfo?: StoredBaseExchangeInfo;
  };
  liveData?: { variants?: readonly StoredExchangeVariant[] };
  backData?: Partial<BaseCardBackData>;
}

const rehydrateExchangeVariantsCard: SpecificCardRehydrator = (
  cardFromStorage: Record<string, unknown>,
  commonProps: CommonCardPropsForRehydration
): ExchangeVariantsCardData | null => {
  const stored = cardFromStorage as StoredExchangeVariantsCardObject;
  const staticDataSource = stored.staticData || {};
  const variantsDataSource = stored.liveData?.variants ?? [];
  const backDataSource = stored.backData || {};

  const staticData: ExchangeVariantsCardStaticData = {
    lastUpdated: staticDataSource.lastUpdated ?? null,
    baseExchangeInfo: {
      exchangeShortName:
        staticDataSource.baseExchangeInfo?.exchangeShortName ?? null,
      countryCode: staticDataSource.baseExchangeInfo?.countryCode ?? null,
      countryName: staticDataSource.baseExchangeInfo?.countryName ?? null,
      averageVolume: staticDataSource.baseExchangeInfo?.averageVolume ?? null, // FIX: Added missing property
    },
  };

  const variants: ExchangeVariant[] = variantsDataSource.map((v) => ({
    variantSymbol: v.variantSymbol ?? "N/A",
    exchangeShortName: v.exchangeShortName ?? "N/A",
    averageVolume: v.averageVolume ?? null,
    countryName: v.countryName ?? null,
    countryCode: v.countryCode ?? null,
  }));

  const liveData: ExchangeVariantsCardLiveData = { variants };

  const backData: BaseCardBackData = {
    description:
      backDataSource.description ||
      `A list of international exchanges where ${
        commonProps.companyName || commonProps.symbol
      } is traded.`,
  };

  return {
    ...commonProps,
    type: "exchangevariants",
    staticData,
    liveData,
    backData,
    websiteUrl: null,
  };
};

registerCardRehydrator("exchangevariants", rehydrateExchangeVariantsCard);
