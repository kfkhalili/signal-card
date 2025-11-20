// src/components/game/cards/solvency-card/solvencyCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  SolvencyCardData,
  SolvencyCardStaticData,
  SolvencyCardLiveData,
  SolvencyCardFmpBalanceSheetData,
  SolvencyCardFmpCashFlowData,
} from "./solvency-card.types";
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

class SolvencyCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SolvencyCardError";
  }
}

function createEmptySolvencyCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): SolvencyCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: SolvencyCardStaticData = {
    periodLabel: "N/A",
    reportedCurrency: null,
    filingDate: null,
    acceptedDate: null,
    statementDate: "N/A",
    statementPeriod: "N/A",
  };

  const emptyLiveData: SolvencyCardLiveData = {
    totalAssets: null,
    cashAndShortTermInvestments: null,
    totalCurrentLiabilities: null,
    shortTermDebt: null,
    longTermDebt: null,
    freeCashFlow: null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Key solvency metrics for ${symbol}. Includes assets, liabilities, debt, and cash flow.`,
  };

  const concreteCardData: SolvencyCardData = {
    id: existingCardId || `solvency-${symbol}-${Date.now()}`,
    type: "solvency",
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

function constructSolvencyCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: {
    companyName?: string | null;
    displayCompanyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  idOverride?: string | null,
  existingCreatedAt?: number | null
): SolvencyCardData {
  const balanceSheetPayload =
    dbRow.balance_sheet_payload as Partial<SolvencyCardFmpBalanceSheetData> | null;
  const cashFlowPayload =
    dbRow.cash_flow_payload as Partial<SolvencyCardFmpCashFlowData> | null;

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

  const staticData: SolvencyCardStaticData = {
    periodLabel,
    reportedCurrency: dbRow.reported_currency ?? null,
    filingDate: dbRow.filing_date ?? null,
    acceptedDate: dbRow.accepted_date ?? null,
    statementDate: statementDate,
    statementPeriod: statementPeriod,
  };

  const liveData: SolvencyCardLiveData = {
    totalAssets: balanceSheetPayload?.totalAssets ?? null,
    cashAndShortTermInvestments:
      balanceSheetPayload?.cashAndShortTermInvestments ?? null,
    totalCurrentLiabilities:
      balanceSheetPayload?.totalCurrentLiabilities ?? null,
    shortTermDebt: balanceSheetPayload?.shortTermDebt ?? null,
    longTermDebt: balanceSheetPayload?.longTermDebt ?? null,
    freeCashFlow: cashFlowPayload?.freeCashFlow ?? null,
  };

  const cardBackData: BaseCardBackData = {
    description: `Key solvency metrics for ${
      profileInfo.companyName || dbRow.symbol
    } (${staticData.periodLabel}, ending ${
      staticData.statementDate || "N/A"
    }). Includes assets, liabilities, debt, and cash flow.`,
  };

  return {
    id:
      idOverride ||
      `solvency-${dbRow.symbol}-${dbRow.date}-${dbRow.period}-${Date.now()}`,
    type: "solvency",
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

async function initializeSolvencyCard({
  symbol,
  supabase,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, SolvencyCardError>
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
        new SolvencyCardError(
          `Failed to fetch profile: ${(e as Error).message}`
        )
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
        "symbol, date, period, reported_currency, filing_date, accepted_date, fiscal_year, balance_sheet_payload, cash_flow_payload"
      )
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (e) =>
      new SolvencyCardError(
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
    const concreteCardData = constructSolvencyCardData(
      financialStatement,
      fetchedProfileInfo
    );
    const cardState: Pick<DisplayableCardState, "isFlipped"> = {
      isFlipped: false,
    };
    return ok({ ...concreteCardData, ...cardState });
  }

  // No data found - return empty state card
  const emptyCard = createEmptySolvencyCard(symbol);
  // Apply profile info to empty card if available
  const emptyCardWithProfile: SolvencyCardData & Pick<DisplayableCardState, "isFlipped"> = {
    ...emptyCard,
    companyName: fetchedProfileInfo.companyName ?? null,
    displayCompanyName: fetchedProfileInfo.displayCompanyName ?? null,
    logoUrl: fetchedProfileInfo.logoUrl ?? null,
    websiteUrl: fetchedProfileInfo.websiteUrl ?? null,
  };
  return ok(emptyCardWithProfile);
}

registerCardInitializer("solvency", initializeSolvencyCard);

const handleSolvencyCardStatementUpdate: CardUpdateHandler<
  SolvencyCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentSolvencyCardData,
  newFinancialStatementRow
): SolvencyCardData => {
  const currentStatementDateStr =
    currentSolvencyCardData.staticData.statementDate;
  const newStatementDateStr = newFinancialStatementRow.date;

  if (!newStatementDateStr || !newFinancialStatementRow.period) {
    return currentSolvencyCardData;
  }

  // If card is in empty state (N/A), always update
  if (
    currentStatementDateStr === "N/A" ||
    currentSolvencyCardData.staticData.statementPeriod === "N/A"
  ) {
    return constructSolvencyCardData(
      newFinancialStatementRow,
      {
        companyName: currentSolvencyCardData.companyName,
        displayCompanyName: currentSolvencyCardData.displayCompanyName,
        logoUrl: currentSolvencyCardData.logoUrl,
        websiteUrl: currentSolvencyCardData.websiteUrl,
      },
      currentSolvencyCardData.id,
      currentSolvencyCardData.createdAt
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
      currentSolvencyCardData.staticData.statementPeriod
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
      currentSolvencyCardData.staticData.acceptedDate
    ) {
      const currentAcceptedDate = new Date(
        currentSolvencyCardData.staticData.acceptedDate
      );
      const newAcceptedDate = new Date(newFinancialStatementRow.accepted_date);
      if (newAcceptedDate > currentAcceptedDate) {
        shouldUpdate = true;
      }
    } else if (
      currentSolvencyCardData.staticData.statementPeriod !==
      newFinancialStatementRow.period
    ) {
      if (
        newFinancialStatementRow.accepted_date &&
        currentSolvencyCardData.staticData.acceptedDate
      ) {
        if (
          new Date(newFinancialStatementRow.accepted_date) >=
          new Date(currentSolvencyCardData.staticData.acceptedDate)
        ) {
          shouldUpdate = true;
        }
      } else {
        shouldUpdate = true;
      }
    }
  }

  if (shouldUpdate) {
    return constructSolvencyCardData(
      newFinancialStatementRow,
      {
        companyName: currentSolvencyCardData.companyName,
        displayCompanyName: currentSolvencyCardData.displayCompanyName,
        logoUrl: currentSolvencyCardData.logoUrl,
        websiteUrl: currentSolvencyCardData.websiteUrl,
      },
      currentSolvencyCardData.id,
      Date.now()
    );
  }
  return currentSolvencyCardData;
};
registerCardUpdateHandler(
  "solvency",
  "FINANCIAL_STATEMENT_UPDATE",
  handleSolvencyCardStatementUpdate
);

const handleSolvencyCardProfileUpdate: CardUpdateHandler<
  SolvencyCardData,
  ProfileDBRow
> = (currentSolvencyCardData, profilePayload): SolvencyCardData => {
  const { updatedCardData } = applyProfileCoreUpdates(
    currentSolvencyCardData,
    profilePayload
  );

  // Always apply profile updates to ensure data propagates correctly
  const newBackDataDescription: BaseCardBackData = {
    description: `Key solvency metrics for ${updatedCardData.companyName} (${
      updatedCardData.staticData.periodLabel
    }, ending ${
      updatedCardData.staticData.statementDate || "N/A"
    }). Includes assets, liabilities, debt, and cash flow.`,
  };
  return {
    ...updatedCardData,
    backData: newBackDataDescription,
  };
};
registerCardUpdateHandler(
  "solvency",
  "STATIC_PROFILE_UPDATE",
  handleSolvencyCardProfileUpdate
);
