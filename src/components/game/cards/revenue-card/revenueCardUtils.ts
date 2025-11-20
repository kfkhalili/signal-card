// src/components/game/cards/revenue-card/revenueCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  RevenueCardData,
  RevenueCardStaticData,
  RevenueCardLiveData,
  RevenueCardFmpIncomeStatementData,
  RevenueCardFmpCashFlowData,
} from "./revenue-card.types";
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
import type { FinancialStatementDBRow as FinancialStatementDBRowFromRealtime } from "@/lib/supabase/realtime-service";
import type { ProfileDBRow } from "@/hooks/useStockData";
import { applyProfileCoreUpdates } from "../cardUtils";

type FinancialStatementDBRowFromSupabase =
  Database["public"]["Tables"]["financial_statements"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

class RevenueCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevenueCardError";
  }
}

function createEmptyRevenueCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): RevenueCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: RevenueCardStaticData = {
    periodLabel: "N/A",
    reportedCurrency: null,
    filingDate: null,
    acceptedDate: null,
    statementDate: "N/A",
    statementPeriod: "N/A",
  };

  const emptyLiveData: RevenueCardLiveData = {
    revenue: null,
    grossProfit: null,
    operatingIncome: null,
    netIncome: null,
    freeCashFlow: null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Key financial metrics for ${symbol}. Includes revenue, profits, and free cash flow.`,
  };

  const concreteCardData: RevenueCardData = {
    id: existingCardId || `revenue-${symbol}-${Date.now()}`,
    type: "revenue",
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

function constructRevenueCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: {
    companyName?: string | null;
    displayCompanyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  idOverride?: string | null,
  existingCreatedAt?: number | null
): RevenueCardData {
  const incomePayload =
    dbRow.income_statement_payload as Partial<RevenueCardFmpIncomeStatementData> | null;
  const cashFlowPayload =
    dbRow.cash_flow_payload as Partial<RevenueCardFmpCashFlowData> | null;

  const statementDate = dbRow.date;
  const statementPeriod = dbRow.period;
  const fiscalYear =
    dbRow.fiscal_year ||
    (statementDate ? new Date(statementDate).getFullYear().toString() : "N/A");

  let periodLabel = `${statementPeriod}`;
  if (
    statementPeriod &&
    statementPeriod !== "FY" &&
    statementPeriod !== "TTM" &&
    fiscalYear !== "N/A"
  ) {
    periodLabel = `${statementPeriod} ${fiscalYear}`;
  } else if (statementPeriod === "FY" && fiscalYear !== "N/A") {
    periodLabel = `FY${fiscalYear}`;
  } else if (statementPeriod === "TTM") {
    periodLabel = "TTM";
  } else {
    periodLabel = `${statementPeriod || "N/A"} ${
      fiscalYear !== "N/A" ? fiscalYear : ""
    }`.trim();
  }

  const staticData: RevenueCardStaticData = {
    periodLabel,
    reportedCurrency: dbRow.reported_currency ?? null,
    filingDate: dbRow.filing_date ?? null,
    acceptedDate: dbRow.accepted_date ?? null,
    statementDate: statementDate,
    statementPeriod: statementPeriod,
  };

  const liveData: RevenueCardLiveData = {
    revenue: incomePayload?.revenue ?? null,
    grossProfit: incomePayload?.grossProfit ?? null,
    operatingIncome: incomePayload?.operatingIncome ?? null,
    netIncome: incomePayload?.netIncome ?? null,
    freeCashFlow: cashFlowPayload?.freeCashFlow ?? null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Key financial metrics for ${
      profileInfo.companyName || dbRow.symbol
    } (${staticData.periodLabel}, ending ${
      staticData.statementDate || "N/A"
    }). Includes revenue, profits, and free cash flow.`,
  };

  return {
    id:
      idOverride ||
      `revenue-${dbRow.symbol}-${dbRow.date}-${dbRow.period}-${Date.now()}`,
    type: "revenue",
    symbol: dbRow.symbol,
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

async function initializeRevenueCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, RevenueCardError>
> {
  const profileCardForSymbol = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileDBRowFromSupabase | undefined;

  let fetchedProfileInfo = {
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
        new RevenueCardError(`Failed to fetch profile: ${(e as Error).message}`)
    );

    if (profileResult.isOk() && profileResult.value.data) {
      const profileData = profileResult.value.data as ProfileDBRowFromSupabase;
      fetchedProfileInfo = {
        companyName: profileData.company_name ?? symbol,
        displayCompanyName:
          profileData.display_company_name ??
          profileData.company_name ??
          symbol,
        logoUrl: profileData.image ?? null,
        websiteUrl: profileData.website ?? null,
      };
    } else if (profileResult.isErr()) {
      console.warn(profileResult.error.message);
    }
  }

  const statementResult = await fromPromise(
    supabase
      .from("financial_statements")
      .select(
        "symbol, date, period, reported_currency, filing_date, accepted_date, fiscal_year, income_statement_payload, cash_flow_payload"
      )
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) =>
      new RevenueCardError(
        `Failed to fetch financial statement: ${(e as Error).message}`
      )
  );

  if (statementResult.isErr()) {
    return err(statementResult.error);
  }

  const statementData = statementResult.value.data;

  if (statementData) {
    const financialStatement =
      statementData as FinancialStatementDBRowFromSupabase;
    const concreteCardData = constructRevenueCardData(
      financialStatement,
      fetchedProfileInfo
    );
    const cardState: Pick<DisplayableCardState, "isFlipped"> = {
      isFlipped: false,
    };
    return ok({ ...concreteCardData, ...cardState });
  }

  // No data found - return empty state card
  const emptyCard = createEmptyRevenueCard(symbol);
  // Apply profile info to empty card if available
  const emptyCardWithProfile: RevenueCardData & Pick<DisplayableCardState, "isFlipped"> = {
    ...emptyCard,
    companyName: fetchedProfileInfo.companyName,
    displayCompanyName: fetchedProfileInfo.displayCompanyName,
    logoUrl: fetchedProfileInfo.logoUrl,
    websiteUrl: fetchedProfileInfo.websiteUrl,
  };
  if (toast) {
    toast({
      title: "Revenue Card Added (Empty State)",
      description: `Awaiting financial statements data for ${symbol}.`,
      variant: "default",
    });
  }
  return ok(emptyCardWithProfile);
}

registerCardInitializer("revenue", initializeRevenueCard);

const handleRevenueCardStatementUpdate: CardUpdateHandler<
  RevenueCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentRevenueCardData,
  newFinancialStatementRow,
  _currentDisplayableCard,
  context
): RevenueCardData => {
  const currentStatementDateStr =
    currentRevenueCardData.staticData.statementDate;
  const newStatementDateStr = newFinancialStatementRow.date;

  if (!newStatementDateStr || !newFinancialStatementRow.period) {
    return currentRevenueCardData;
  }

  // If card is in empty state (N/A), always update
  if (
    currentStatementDateStr === "N/A" ||
    currentRevenueCardData.staticData.statementPeriod === "N/A"
  ) {
    return constructRevenueCardData(
      newFinancialStatementRow,
      {
        companyName: currentRevenueCardData.companyName,
        displayCompanyName: currentRevenueCardData.displayCompanyName,
        logoUrl: currentRevenueCardData.logoUrl,
        websiteUrl: currentRevenueCardData.websiteUrl,
      },
      currentRevenueCardData.id,
      currentRevenueCardData.createdAt
    );
  }

  const currentStatementDate = new Date(currentStatementDateStr);
  const newStatementDate = new Date(newStatementDateStr);

  let shouldUpdate = false;
  if (newStatementDate.getTime() > currentStatementDate.getTime()) {
    shouldUpdate = true;
  } else if (newStatementDate.getTime() === currentStatementDate.getTime()) {
    const periodHierarchy = ["TTM", "FY", "H2", "H1", "Q4", "Q3", "Q2", "Q1"];
    const currentPeriodIndex = periodHierarchy.indexOf(
      currentRevenueCardData.staticData.statementPeriod
    );
    const newPeriodIndex = periodHierarchy.indexOf(
      newFinancialStatementRow.period
    );

    if (
      newPeriodIndex !== -1 &&
      (currentPeriodIndex === -1 || newPeriodIndex < currentPeriodIndex)
    ) {
      shouldUpdate = true;
    } else if (
      currentPeriodIndex === newPeriodIndex &&
      newFinancialStatementRow.accepted_date &&
      currentRevenueCardData.staticData.acceptedDate
    ) {
      const currentAcceptedDate = new Date(
        currentRevenueCardData.staticData.acceptedDate
      );
      const newAcceptedDate = new Date(newFinancialStatementRow.accepted_date);
      if (newAcceptedDate > currentAcceptedDate) {
        shouldUpdate = true;
      }
    } else if (
      currentRevenueCardData.staticData.statementPeriod !==
      newFinancialStatementRow.period
    ) {
      if (
        newFinancialStatementRow.accepted_date &&
        currentRevenueCardData.staticData.acceptedDate
      ) {
        if (
          new Date(newFinancialStatementRow.accepted_date) >=
          new Date(currentRevenueCardData.staticData.acceptedDate)
        ) {
          shouldUpdate = true;
        }
      } else {
        shouldUpdate = true;
      }
    }
  }

  if (shouldUpdate) {
    if (context.toast) {
      context.toast({
        title: `Financials Updated: ${newFinancialStatementRow.symbol}`,
        description: `New statement for period ${
          newFinancialStatementRow.period
        } ${newFinancialStatementRow.fiscal_year || ""} available.`,
      });
    }
    return constructRevenueCardData(
      newFinancialStatementRow,
      {
        companyName: currentRevenueCardData.companyName,
        displayCompanyName: currentRevenueCardData.displayCompanyName,
        logoUrl: currentRevenueCardData.logoUrl,
        websiteUrl: currentRevenueCardData.websiteUrl,
      },
      currentRevenueCardData.id,
      Date.now()
    );
  }
  return currentRevenueCardData;
};
registerCardUpdateHandler(
  "revenue",
  "FINANCIAL_STATEMENT_UPDATE",
  handleRevenueCardStatementUpdate
);

const handleRevenueCardProfileUpdate: CardUpdateHandler<
  RevenueCardData,
  ProfileDBRow
> = (currentRevenueCardData, profilePayload): RevenueCardData => {
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentRevenueCardData,
    profilePayload
  );

  if (coreDataChanged) {
    const newBackDataDescription: BaseCardBackData = {
      description: `Key financial metrics for ${updatedCardData.companyName} (${
        updatedCardData.staticData.periodLabel
      }, ending ${
        updatedCardData.staticData.statementDate || "N/A"
      }). Includes revenue, profits, and free cash flow.`,
    };
    return {
      ...updatedCardData,
      backData: newBackDataDescription,
    };
  }
  return currentRevenueCardData;
};
registerCardUpdateHandler(
  "revenue",
  "STATIC_PROFILE_UPDATE",
  handleRevenueCardProfileUpdate
);
