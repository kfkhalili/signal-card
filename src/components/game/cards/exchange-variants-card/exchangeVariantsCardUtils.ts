// src/components/game/cards/exchange-variants-card/exchangeVariantsCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  ExchangeVariantsCardData,
  ExchangeVariant,
  ExchangeInfo,
  ExchangeVariantsCardStaticData,
  ExchangeVariantsCardLiveData,
} from "./exchange-variants-card.types";
import type {
  DisplayableCard,
  DisplayableCardState,
} from "@/components/game/types";
import type { BaseCardBackData } from "../base-card/base-card.types";
import {
  registerCardInitializer,
  type CardInitializationContext,
} from "@/components/game/cardInitializer.types";
import {
  registerCardUpdateHandler,
  type CardUpdateHandler,
} from "@/components/game/cardUpdateHandler.types";
import type { Database } from "@/lib/supabase/database.types";

type ExchangeVariantsDBRow =
  Database["public"]["Tables"]["exchange_variants"]["Row"];

class ExchangeVariantsCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeVariantsCardError";
  }
}

function createEmptyExchangeVariantsCard(
  symbol: string,
  profileData?: {
    company_name?: string | null;
    display_company_name?: string | null;
    image?: string | null;
    website?: string | null;
    exchange?: string | null;
  } | null,
  existingCardId?: string,
  existingCreatedAt?: number
): ExchangeVariantsCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyBaseExchangeInfo: ExchangeInfo = {
    exchangeShortName: profileData?.exchange ?? null,
    countryCode: null,
    countryName: null,
    averageVolume: null,
  };

  const emptyStaticData: ExchangeVariantsCardStaticData = {
    lastUpdated: null,
    baseExchangeInfo: emptyBaseExchangeInfo,
  };

  const emptyLiveData: ExchangeVariantsCardLiveData = {
    variants: [],
  };

  const cardBackData: BaseCardBackData = {
    description: `A list of international exchanges where ${symbol} is traded.`,
  };

  const concreteCardData: ExchangeVariantsCardData = {
    id: existingCardId || `exchangevariants-${symbol}-${Date.now()}`,
    type: "exchangevariants",
    symbol: symbol,
    companyName: profileData?.company_name ?? null,
    displayCompanyName: profileData?.display_company_name ?? profileData?.company_name ?? null,
    logoUrl: profileData?.image ?? null,
    websiteUrl: profileData?.website ?? null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData: emptyStaticData,
    liveData: emptyLiveData,
    backData: cardBackData,
  };

  return {
    ...concreteCardData,
    isFlipped: false,
  };
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
    // No profile found - return empty state card
    const emptyCard = createEmptyExchangeVariantsCard(symbol);
    if (toast) {
      toast({
        title: "Exchange Variants Card Added (Empty State)",
        description: `Awaiting profile and exchange variants data for ${symbol}.`,
        variant: "default",
      });
    }
    return ok(emptyCard);
  }

  const profileData = profileResult.value.data;
  const baseExchange = profileData.exchange;

  if (!baseExchange) {
    // No base exchange found - return empty state card
    const emptyCard = createEmptyExchangeVariantsCard(symbol, profileData);
    if (toast) {
      toast({
        title: "Exchange Variants Card Added (Empty State)",
        description: `Awaiting exchange information for ${symbol}.`,
        variant: "default",
      });
    }
    return ok(emptyCard);
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
    // No variants found - return empty state card
    const emptyCard = createEmptyExchangeVariantsCard(symbol, profileData);
    if (toast) {
      toast({
        title: "Exchange Variants Card Added (Empty State)",
        description: `Awaiting exchange variants data for ${symbol}.`,
        variant: "default",
      });
    }
    return ok(emptyCard);
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

const handleExchangeVariantsUpdate: CardUpdateHandler<
  ExchangeVariantsCardData,
  ExchangeVariantsDBRow
> = (
  currentCardData,
  updatedRow
): ExchangeVariantsCardData => {
  // If card is in empty state (no variants), always add the first variant
  if (
    currentCardData.liveData.variants.length === 0 &&
    updatedRow.is_actively_trading &&
    updatedRow.variant_symbol !== currentCardData.symbol
  ) {
    const updatedVariant: ExchangeVariant = {
      variantSymbol: updatedRow.variant_symbol,
      exchangeShortName: updatedRow.exchange_short_name,
      averageVolume: updatedRow.vol_avg,
      countryName: null, // Would need to fetch from available_exchanges
      countryCode: null, // Would need to fetch from available_exchanges
    };
    return {
      ...currentCardData,
      liveData: {
        variants: [updatedVariant],
      },
      staticData: {
        ...currentCardData.staticData,
        lastUpdated: updatedRow.updated_at || updatedRow.fetched_at || new Date().toISOString(),
      },
    };
  }

  // Check if this variant is already in the list
  const existingVariantIndex = currentCardData.liveData.variants.findIndex(
    (v) => v.variantSymbol === updatedRow.variant_symbol
  );

  // Only update if the variant is actively trading and not the base symbol
  if (
    updatedRow.is_actively_trading &&
    updatedRow.variant_symbol !== currentCardData.symbol
  ) {
    const updatedVariant: ExchangeVariant = {
      variantSymbol: updatedRow.variant_symbol,
      exchangeShortName: updatedRow.exchange_short_name,
      averageVolume: updatedRow.vol_avg,
      countryName: null, // Would need to fetch from available_exchanges
      countryCode: null, // Would need to fetch from available_exchanges
    };

    const updatedVariants = [...currentCardData.liveData.variants];
    if (existingVariantIndex >= 0) {
      // Update existing variant
      updatedVariants[existingVariantIndex] = updatedVariant;
    } else {
      // Add new variant
      updatedVariants.push(updatedVariant);
    }

    return {
      ...currentCardData,
      liveData: {
        variants: updatedVariants,
      },
      staticData: {
        ...currentCardData.staticData,
        lastUpdated: updatedRow.updated_at || updatedRow.fetched_at || new Date().toISOString(),
      },
    };
  } else if (existingVariantIndex >= 0 && !updatedRow.is_actively_trading) {
    // Remove variant if it's no longer actively trading
    const updatedVariants = currentCardData.liveData.variants.filter(
      (_, index) => index !== existingVariantIndex
    );
    return {
      ...currentCardData,
      liveData: {
        variants: updatedVariants,
      },
    };
  }

  return currentCardData; // No change needed
};

registerCardUpdateHandler(
  "exchangevariants",
  "EXCHANGE_VARIANTS_UPDATE",
  handleExchangeVariantsUpdate
);
