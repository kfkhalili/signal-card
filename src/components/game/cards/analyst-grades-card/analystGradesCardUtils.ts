// src/components/game/cards/analyst-grades-card/analystGradesCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  AnalystGradesCardData,
  AnalystGradesCardStaticData,
  AnalystGradesCardLiveData,
  AnalystRatingDetail,
  RatingCategory,
} from "./analyst-grades-card.types";
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
import type { ProfileDBRow } from "@/hooks/useStockData";
import { applyProfileCoreUpdates } from "../cardUtils";

type GradesHistoricalDBRow =
  Database["public"]["Tables"]["grades_historical"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

class AnalystGradesCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalystGradesCardError";
  }
}

const RATING_CATEGORIES_ORDERED: readonly {
  category: RatingCategory;
  label: string;
  colorClass: string;
}[] = [
  {
    category: "strongBuy",
    label: "Strong Buy",
    colorClass: "bg-green-500 dark:bg-green-400",
  },
  {
    category: "buy",
    label: "Buy",
    colorClass: "bg-green-400 dark:bg-green-300",
  },
  {
    category: "hold",
    label: "Hold",
    colorClass: "bg-yellow-400 dark:bg-yellow-300",
  },
  { category: "sell", label: "Sell", colorClass: "bg-red-400 dark:bg-red-300" },
  {
    category: "strongSell",
    label: "Strong Sell",
    colorClass: "bg-red-500 dark:bg-red-400",
  },
];

function mapDbRowToRatingCounts(
  row: GradesHistoricalDBRow | null
): Record<RatingCategory, number | null> {
  return {
    strongBuy: row?.analyst_ratings_strong_buy ?? null,
    buy: row?.analyst_ratings_buy ?? null,
    hold: row?.analyst_ratings_hold ?? null,
    sell: row?.analyst_ratings_sell ?? null,
    strongSell: row?.analyst_ratings_strong_sell ?? null,
  };
}

function calculateTotalAnalysts(
  counts: Record<RatingCategory, number | null>
): number {
  return Object.values(counts).reduce(
    (sum: number, current: number | null): number => sum + (current ?? 0),
    0
  );
}

function deriveConsensusLabel(
  distribution: readonly AnalystRatingDetail[],
  totalAnalysts: number
): string {
  if (totalAnalysts === 0) return "N/A";

  const weights: Record<RatingCategory, number> = {
    strongBuy: 5,
    buy: 4,
    hold: 3,
    sell: 2,
    strongSell: 1,
  };
  const weightedSum = distribution.reduce(
    (sum, item) => sum + (item.currentValue ?? 0) * weights[item.category],
    0
  );
  const averageScore = totalAnalysts > 0 ? weightedSum / totalAnalysts : 0;

  if (averageScore >= 4.5) return "Strong Buy Consensus";
  if (averageScore >= 3.5) return "Buy Consensus";
  if (averageScore >= 2.5) return "Hold Consensus";
  if (averageScore >= 1.5) return "Sell Consensus";
  return "Strong Sell Consensus";
}

function formatPeriodDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString + "T00:00:00Z");
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateString;
  }
}

function createEmptyAnalystGradesCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): AnalystGradesCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: AnalystGradesCardStaticData = {
    currentPeriodDate: null,
    previousPeriodDate: null,
  };

  const emptyLiveData: AnalystGradesCardLiveData = {
    ratingsDistribution: [],
    totalAnalystsCurrent: 0,
    totalAnalystsPrevious: null,
    consensusLabelCurrent: null,
    lastUpdated: null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Analyst rating distribution for ${symbol}.`,
  };

  const concreteCardData: AnalystGradesCardData = {
    id: existingCardId || `analystgrades-${symbol}-${Date.now()}`,
    type: "analystgrades",
    symbol: symbol,
    companyName: null,
    displayCompanyName: null,
    logoUrl: null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData: emptyStaticData,
    liveData: emptyLiveData,
    backData: cardBackData,
    websiteUrl: null,
  };

  return {
    ...concreteCardData,
    isFlipped: false,
  };
}

function constructAnalystGradesCardData(
  symbol: string,
  profileInfo: {
    companyName?: string | null;
    displayCompanyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  latestGrading: GradesHistoricalDBRow,
  previousGrading: GradesHistoricalDBRow | null,
  idOverride?: string | null,
  existingCreatedAt?: number | null
): AnalystGradesCardData {
  const currentCounts = mapDbRowToRatingCounts(latestGrading);
  const previousCounts = mapDbRowToRatingCounts(previousGrading);

  const ratingsDistribution: AnalystRatingDetail[] =
    RATING_CATEGORIES_ORDERED.map(({ category, label, colorClass }) => {
      const currentValue = currentCounts[category] ?? 0;
      const previousValue = previousCounts[category] ?? null;
      const change =
        previousValue !== null ? currentValue - previousValue : null;
      return {
        category,
        label,
        currentValue,
        previousValue,
        change,
        colorClass,
      };
    });

  const totalAnalystsCurrent = calculateTotalAnalysts(currentCounts);
  const totalAnalystsPrevious = previousGrading
    ? calculateTotalAnalysts(previousCounts)
    : null;
  const consensusLabelCurrent = deriveConsensusLabel(
    ratingsDistribution,
    totalAnalystsCurrent
  );

  const staticData: AnalystGradesCardStaticData = {
    currentPeriodDate: formatPeriodDate(latestGrading.date),
    previousPeriodDate: previousGrading
      ? formatPeriodDate(previousGrading.date)
      : null,
  };

  const liveData: AnalystGradesCardLiveData = {
    ratingsDistribution,
    totalAnalystsCurrent,
    totalAnalystsPrevious,
    consensusLabelCurrent,
    lastUpdated: latestGrading.updated_at,
  };

  const cardBackData: BaseCardBackData = {
    description: `Analyst rating distribution for ${
      profileInfo.companyName || symbol
    } as of ${
      staticData.currentPeriodDate
    }, with changes from the previous period.`,
  };

  return {
    id: idOverride || `analystgrades-${symbol}-${Date.now()}`,
    type: "analystgrades",
    symbol,
    companyName: profileInfo.companyName ?? null,
    displayCompanyName:
      profileInfo.displayCompanyName ?? profileInfo.companyName ?? null,
    logoUrl: profileInfo.logoUrl ?? null,
    websiteUrl: profileInfo.websiteUrl ?? null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData,
    backData: cardBackData,
  };
}

async function fetchAnalystGradesData(
  symbol: string,
  supabase: CardInitializationContext["supabase"],
  activeCards?: DisplayableCard[]
) {
  const profileCardForSymbol = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileDBRowFromSupabase | undefined;
  let profileInfo = {
    companyName: profileCardForSymbol?.company_name ?? symbol,
    displayCompanyName:
      profileCardForSymbol?.display_company_name ??
      profileCardForSymbol?.company_name ??
      symbol,
    logoUrl: profileCardForSymbol?.image ?? null,
    websiteUrl: profileCardForSymbol?.website ?? null,
  };

  if (!profileCardForSymbol) {
    const profileResult = await fromPromise(
      supabase
        .from("profiles")
        .select("company_name, display_company_name, image, website")
        .eq("symbol", symbol)
        .maybeSingle(),
      (e) =>
        new AnalystGradesCardError(
          `Profile fetch failed: ${(e as Error).message}`
        )
    );
    if (profileResult.isOk() && profileResult.value.data) {
      profileInfo = {
        companyName: profileResult.value.data.company_name ?? symbol,
        displayCompanyName:
          profileResult.value.data.display_company_name ??
          profileResult.value.data.company_name ??
          symbol,
        logoUrl: profileResult.value.data.image ?? null,
        websiteUrl: profileResult.value.data.website ?? null,
      };
    } else if (profileResult.isErr()) {
      console.warn(profileResult.error.message);
    }
  }

  const gradesResult = await fromPromise(
    supabase
      .from("grades_historical")
      .select("*")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(2),
    (e) =>
      new AnalystGradesCardError(`Grades fetch failed: ${(e as Error).message}`)
  );

  if (gradesResult.isErr()) {
    return err(gradesResult.error);
  }

  const gradesRows = gradesResult.value.data || [];
  return ok({
    profileInfo,
    latestGrading: gradesRows.length > 0 ? gradesRows[0] : null,
    previousGrading: gradesRows.length > 1 ? gradesRows[1] : null,
  });
}

async function initializeAnalystGradesCard({
  symbol,
  supabase,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, AnalystGradesCardError>
> {
  const fetchDataResult = await fetchAnalystGradesData(
    symbol,
    supabase,
    activeCards
  );

  if (fetchDataResult.isErr()) {
    return err(fetchDataResult.error);
  }

  const { profileInfo, latestGrading, previousGrading } = fetchDataResult.value;

  if (!latestGrading) {
    // No data found - return empty state card
    const emptyCard = createEmptyAnalystGradesCard(symbol);
    return ok(emptyCard);
  }

  const concreteCardData = constructAnalystGradesCardData(
    symbol,
    profileInfo,
    latestGrading,
    previousGrading
  );
  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };
  return ok({ ...concreteCardData, ...cardState });
}
registerCardInitializer("analystgrades", initializeAnalystGradesCard);

const handleAnalystGradesProfileUpdate: CardUpdateHandler<
  AnalystGradesCardData,
  ProfileDBRow
> = (currentCardData, profilePayload): AnalystGradesCardData => {
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentCardData,
    profilePayload
  );

  if (coreDataChanged) {
    const newBackData: BaseCardBackData = {
      description: `Analyst rating distribution for ${updatedCardData.companyName} as of ${updatedCardData.staticData.currentPeriodDate}, with changes from the previous period.`,
    };
    return {
      ...updatedCardData,
      backData: newBackData,
    };
  }
  return currentCardData;
};
registerCardUpdateHandler(
  "analystgrades",
  "STATIC_PROFILE_UPDATE",
  handleAnalystGradesProfileUpdate
);

const handleGradesHistoricalUpdate: CardUpdateHandler<
  AnalystGradesCardData,
  GradesHistoricalDBRow
> = (
  currentCardData,
  updatedRow
): AnalystGradesCardData => {
  // Check if the updated row is for a newer or same period
  const currentPeriodDate = currentCardData.staticData.currentPeriodDate;
  const updatedPeriodDate = formatPeriodDate(updatedRow.date);

  // Compare dates to see if this is a newer period
  // For simplicity, if the date string is different or newer, update
  if (
    !currentPeriodDate ||
    updatedPeriodDate !== currentPeriodDate ||
    (updatedRow.date && updatedRow.updated_at) // If we have an update timestamp, treat as newer
  ) {
    // Reconstruct the card data with the updated row as the latest
    // Use current data as previous
    const currentCounts = mapDbRowToRatingCounts(updatedRow);
    // For previous counts, we'll use the current values from the card
    const previousCounts: Record<RatingCategory, number> = {
      strongBuy: currentCardData.liveData.ratingsDistribution[0]?.currentValue ?? 0,
      buy: currentCardData.liveData.ratingsDistribution[1]?.currentValue ?? 0,
      hold: currentCardData.liveData.ratingsDistribution[2]?.currentValue ?? 0,
      sell: currentCardData.liveData.ratingsDistribution[3]?.currentValue ?? 0,
      strongSell: currentCardData.liveData.ratingsDistribution[4]?.currentValue ?? 0,
    };

    const ratingsDistribution: AnalystRatingDetail[] =
      RATING_CATEGORIES_ORDERED.map(({ category, label, colorClass }) => {
        const currentValue = currentCounts[category] ?? 0;
        const previousValue = previousCounts[category] ?? null;
        const change =
          previousValue !== null ? currentValue - previousValue : null;
        return {
          category,
          label,
          currentValue,
          previousValue,
          change,
          colorClass,
        };
      });

    const totalAnalystsCurrent = calculateTotalAnalysts(currentCounts);
    const totalAnalystsPrevious = currentCardData.liveData.totalAnalystsCurrent;
    const consensusLabelCurrent = deriveConsensusLabel(
      ratingsDistribution,
      totalAnalystsCurrent
    );

    const updatedStaticData: AnalystGradesCardStaticData = {
      currentPeriodDate: updatedPeriodDate,
      previousPeriodDate: currentPeriodDate,
    };

    const updatedLiveData: AnalystGradesCardLiveData = {
      ratingsDistribution,
      totalAnalystsCurrent,
      totalAnalystsPrevious,
      consensusLabelCurrent,
      lastUpdated: updatedRow.updated_at,
    };

    return {
      ...currentCardData,
      liveData: updatedLiveData,
      staticData: updatedStaticData,
    };
  }

  return currentCardData; // Update is for the same period, no change needed
};

registerCardUpdateHandler(
  "analystgrades",
  "GRADES_HISTORICAL_UPDATE",
  handleGradesHistoricalUpdate
);
