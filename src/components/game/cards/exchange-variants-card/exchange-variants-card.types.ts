// src/components/game/cards/exchange-variants-card/exchange-variants-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

export interface ExchangeVariant {
  readonly variantSymbol: string;
  readonly exchangeShortName: string | null;
  readonly averageVolume: number | null;
  readonly countryName: string | null;
  readonly countryCode: string | null;
}

export interface ExchangeInfo {
  readonly exchangeShortName: string | null;
  readonly countryCode: string | null;
  readonly countryName: string | null;
  readonly averageVolume: number | null;
}

export interface ExchangeVariantsCardStaticData {
  readonly lastUpdated: string | null;
  readonly baseExchangeInfo: ExchangeInfo;
}

export interface ExchangeVariantsCardLiveData {
  readonly variants: readonly ExchangeVariant[];
}

export interface ExchangeVariantsCardData extends BaseCardData {
  readonly type: "exchangevariants";
  readonly staticData: ExchangeVariantsCardStaticData;
  liveData: ExchangeVariantsCardLiveData;
}
