// src/components/game/cards/exchange-variants-card/exchangeVariantsCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  ExchangeVariantsCardData,
  ExchangeVariant,
  ExchangeInfo,
} from "./exchange-variants-card.types";
import type {
  DisplayableCard,
  DisplayableCardState,
} from "@/components/game/types";
import {
  registerCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";

class ExchangeVariantsCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeVariantsCardError";
  }
}

async function initializeExchangeVariantsCard({
  symbol,
  supabase,
  toast,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, ExchangeVariantsCardError>
> {
  const profileResult = await fromPromise(
    supabase
      .from("profiles")
      .select("exchange, company_name, display_company_name, image, website")
      .eq("symbol", symbol)
      .maybeSingle(),
    (e) =>
      new ExchangeVariantsCardError(
        `Failed to fetch profile for ${symbol}: ${(e as Error).message}`
      )
  );

  if (profileResult.isErr()) {
    return err(profileResult.error);
  }
  if (!profileResult.value.data) {
    return err(
      new ExchangeVariantsCardError(`No profile found for ${symbol}.`)
    );
  }

  const profileData = profileResult.value.data;
  const baseExchange = profileData.exchange;

  if (!baseExchange) {
    const errorMessage = `Could not determine the primary exchange for ${symbol}.`;
    if (toast) {
      toast({
        title: "Primary Exchange Unknown",
        description: errorMessage,
        variant: "destructive",
      });
    }
    return err(new ExchangeVariantsCardError(errorMessage));
  }

  const variantsResult = await fromPromise(
    supabase
      .from("exchange_variants")
      .select("variant_symbol, exchange_short_name, vol_avg")
      .eq("base_symbol", symbol)
      .eq("is_actively_trading", true),
    (e) => new ExchangeVariantsCardError((e as Error).message)
  );

  if (variantsResult.isErr()) {
    return err(variantsResult.error);
  }

  const allVariantsData = variantsResult.value.data ?? [];
  const baseVariantData = allVariantsData.find(
    (v) => v.variant_symbol === symbol
  );
  const baseAverageVolume = baseVariantData?.vol_avg ?? null;

  const filteredVariantsData = allVariantsData.filter(
    (v) => v.exchange_short_name !== baseExchange
  );

  if (filteredVariantsData.length === 0) {
    const errorMessage = `No variants found for ${symbol} on other exchanges.`;
    if (toast) {
      toast({
        title: "No Other Variants",
        description: errorMessage,
        variant: "default",
      });
    }
    return err(new ExchangeVariantsCardError(errorMessage));
  }

  const allExchangesResult = await fromPromise(
    supabase
      .from("available_exchanges")
      .select("exchange, country_name, country_code"),
    (e) => new ExchangeVariantsCardError((e as Error).message)
  );

  if (allExchangesResult.isErr()) {
    console.warn(
      "Could not fetch available exchanges, country names will be missing."
    );
  }

  const exchangeInfoMap = new Map<
    string,
    { name: string | null; code: string | null }
  >();
  if (allExchangesResult.isOk()) {
    allExchangesResult.value.data?.forEach((ex) => {
      exchangeInfoMap.set(ex.exchange, {
        name: ex.country_name,
        code: ex.country_code,
      });
    });
  }

  const variants: ExchangeVariant[] = filteredVariantsData.map((v) => {
    const exchangeInfo = exchangeInfoMap.get(v.exchange_short_name);
    return {
      variantSymbol: v.variant_symbol,
      exchangeShortName: v.exchange_short_name,
      averageVolume: v.vol_avg,
      countryName: exchangeInfo?.name ?? null,
      countryCode: exchangeInfo?.code ?? null,
    };
  });

  const baseExchangeDetails = exchangeInfoMap.get(baseExchange) ?? {
    name: null,
    code: null,
  };

  const baseExchangeInfo: ExchangeInfo = {
    exchangeShortName: baseExchange,
    countryCode: baseExchangeDetails.code,
    countryName: baseExchangeDetails.name,
    averageVolume: baseAverageVolume,
  };

  const cardData: ExchangeVariantsCardData = {
    id: `exchangevariants-${symbol}-${Date.now()}`,
    type: "exchangevariants",
    symbol,
    companyName: profileData.company_name,
    displayCompanyName: profileData.display_company_name,
    logoUrl: profileData.image,
    websiteUrl: profileData.website,
    createdAt: Date.now(),
    staticData: {
      lastUpdated: new Date().toISOString(),
      baseExchangeInfo: baseExchangeInfo,
    },
    liveData: {
      variants,
    },
    backData: {
      description: `A list of international exchanges where ${
        profileData.company_name || symbol
      } is traded.`,
    },
  };

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };

  return ok({ ...cardData, ...cardState });
}

registerCardInitializer("exchangevariants", initializeExchangeVariantsCard);
