// src/components/game/cards/solvency-card/solvencyCardUtils.ts
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

function constructSolvencyCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: {
    companyName?: string | null;
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
    companyName: profileInfo.companyName ?? dbRow.symbol,
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
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    const profileCardForSymbol = activeCards?.find(
      (c) => c.symbol === symbol && c.type === "profile"
    ) as ProfileDBRowFromSupabase | undefined;

    const fetchedProfileInfo = {
      companyName: profileCardForSymbol?.company_name ?? symbol,
      logoUrl: profileCardForSymbol?.image ?? null,
      websiteUrl: profileCardForSymbol?.website ?? null,
    };
    if (!profileCardForSymbol) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("company_name, image, website")
        .eq("symbol", symbol)
        .maybeSingle();

      if (profileError) {
        console.warn(
          `[initializeSolvencyCard] Error fetching profile for ${symbol}:`,
          profileError.message
        );
      }
      fetchedProfileInfo.companyName =
        (profileData as ProfileDBRowFromSupabase | null)?.company_name ??
        symbol;
      fetchedProfileInfo.logoUrl =
        (profileData as ProfileDBRowFromSupabase | null)?.image ?? null;
      fetchedProfileInfo.websiteUrl =
        (profileData as ProfileDBRowFromSupabase | null)?.website ?? null;
    }

    const { data: statementData, error: statementError } = await supabase
      .from("financial_statements")
      .select(
        "symbol, date, period, reported_currency, filing_date, accepted_date, fiscal_year, balance_sheet_payload, cash_flow_payload"
      )
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (statementError) {
      console.error(
        `[initializeSolvencyCard] Supabase error fetching financial statement for ${symbol}:`,
        statementError
      );
      throw statementError;
    }

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

      return {
        ...concreteCardData,
        ...cardState,
      } as SolvencyCardData & DisplayableCardState;
    } else {
      if (toast) {
        toast({
          title: "Statement Not Found",
          description: `No financial statements currently available for ${symbol} to create a Solvency Card.`,
          variant: "default",
        });
      }
      return null;
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[initializeSolvencyCard] Error initializing solvency card for ${symbol}:`,
        errorMessage,
        error
      );
    }
    if (toast) {
      toast({
        title: "Error Initializing Solvency Card",
        description: `Could not fetch financial data for ${symbol}. ${errorMessage}`,
        variant: "destructive",
      });
    }
    return null;
  }
}

registerCardInitializer("solvency", initializeSolvencyCard);

const handleSolvencyCardStatementUpdate: CardUpdateHandler<
  SolvencyCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentSolvencyCardData,
  newFinancialStatementRow,
  _currentDisplayableCard,
  context
): SolvencyCardData => {
  const currentStatementDateStr =
    currentSolvencyCardData.staticData.statementDate;
  const newStatementDateStr = newFinancialStatementRow.date;

  if (!newStatementDateStr || !newFinancialStatementRow.period) {
    return currentSolvencyCardData;
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
    if (context.toast) {
      context.toast({
        title: `Solvency Data Updated: ${newFinancialStatementRow.symbol}`,
        description: `New statement for period ${
          newFinancialStatementRow.period
        } ${newFinancialStatementRow.fiscal_year || ""} applied.`,
      });
    }
    return constructSolvencyCardData(
      newFinancialStatementRow,
      {
        companyName: currentSolvencyCardData.companyName,
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
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentSolvencyCardData,
    profilePayload
  );

  if (coreDataChanged) {
    const newBackDataDescription: BaseCardBackData = {
      description: `Key solvency metrics for ${
        updatedCardData.companyName // Use the new company name
      } (${updatedCardData.staticData.periodLabel}, ending ${
        updatedCardData.staticData.statementDate || "N/A"
      }). Includes assets, liabilities, debt, and cash flow.`,
    };
    return {
      ...updatedCardData,
      backData: newBackDataDescription,
    };
  }
  return currentSolvencyCardData;
};
registerCardUpdateHandler(
  "solvency",
  "STATIC_PROFILE_UPDATE",
  handleSolvencyCardProfileUpdate
);
