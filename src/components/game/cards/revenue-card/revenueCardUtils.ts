// src/components/game/cards/revenue-card/revenueCardUtils.ts
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

type FinancialStatementDBRowFromSupabase =
  Database["public"]["Tables"]["financial_statements"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

// Helper function to construct RevenueCardData from a DB row and profile details
function constructRevenueCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: { companyName?: string | null; logoUrl?: string | null },
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
    companyName: profileInfo.companyName ?? dbRow.symbol,
    logoUrl: profileInfo.logoUrl ?? null,
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
}: CardInitializationContext): Promise<DisplayableCard | null> {
  try {
    // Fetch profile data for companyName and logoUrl first
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("company_name, image") // Select only needed fields
      .eq("symbol", symbol)
      .maybeSingle();

    if (profileError) {
      // Log the error but don't necessarily fail the card creation,
      // as financial data might still be available.
      console.warn(
        `[initializeRevenueCard] Error fetching profile for ${symbol} (for name/logo):`,
        profileError.message
      );
    }
    const fetchedProfileInfo = {
      companyName:
        (profileData as ProfileDBRowFromSupabase | null)?.company_name ??
        symbol,
      logoUrl: (profileData as ProfileDBRowFromSupabase | null)?.image ?? null,
    };

    // Fetch the latest financial statement
    const { data: statementData, error: statementError } = await supabase
      .from("financial_statements")
      .select(
        "symbol, date, period, reported_currency, filing_date, accepted_date, fiscal_year, income_statement_payload, cash_flow_payload"
      )
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (statementError) {
      console.error(
        `[initializeRevenueCard] Supabase error fetching financial statement for ${symbol}:`,
        statementError
      );
      throw statementError; // This is a more critical error
    }

    if (statementData) {
      const financialStatement =
        statementData as FinancialStatementDBRowFromSupabase;
      const concreteCardData = constructRevenueCardData(
        financialStatement,
        fetchedProfileInfo // Pass fetched profile info
      );

      const cardState: Pick<DisplayableCardState, "isFlipped"> = {
        isFlipped: false,
      };

      return {
        ...concreteCardData,
        ...cardState,
      } as RevenueCardData & DisplayableCardState;
    } else {
      if (toast) {
        toast({
          title: "Statement Not Found",
          description: `No financial statements currently available for ${symbol}.`,
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
        `[initializeRevenueCard] Error initializing revenue card for ${symbol}:`,
        errorMessage,
        error
      );
    }
    if (toast) {
      toast({
        title: "Error Initializing Revenue Card",
        description: `Could not fetch financial data for ${symbol}. ${errorMessage}`,
        variant: "destructive",
      });
    }
    return null;
  }
}

registerCardInitializer("revenue", initializeRevenueCard);

const handleRevenueCardStatementUpdate: CardUpdateHandler<
  RevenueCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentRevenueCardData,
  newFinancialStatementRow,
  _currentDisplayableCard, // Parameter is part of the generic signature, can be unused if prefixed
  context
): RevenueCardData => {
  const currentStatementDateStr =
    currentRevenueCardData.staticData.statementDate;
  const newStatementDateStr = newFinancialStatementRow.date;

  if (!newStatementDateStr || !newFinancialStatementRow.period) {
    return currentRevenueCardData;
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
      // If periods are different (and not handled by hierarchy) for the same date,
      // and it's not an older accepted_date, consider it an update.
      // This might need more specific rules if FMP can provide multiple non-hierarchical statements for the same date.
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
        shouldUpdate = true; // If accepted_date isn't available for comparison, assume update.
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
        // Pass existing companyName and logoUrl
        companyName: currentRevenueCardData.companyName,
        logoUrl: currentRevenueCardData.logoUrl,
      },
      currentRevenueCardData.id, // Preserve ID
      Date.now() // Update createdAt to signify data refresh
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
  let needsDisplayUpdate = false;
  const newCompanyName =
    profilePayload.company_name ?? currentRevenueCardData.symbol;
  const newLogoUrl = profilePayload.image ?? null;

  if (currentRevenueCardData.companyName !== newCompanyName) {
    needsDisplayUpdate = true;
  }
  if (currentRevenueCardData.logoUrl !== newLogoUrl) {
    needsDisplayUpdate = true;
  }

  if (needsDisplayUpdate) {
    // Re-construct backData description if companyName changed
    const newBackDataDescription: BaseCardBackData = {
      description: `Key financial metrics for ${newCompanyName} (${
        currentRevenueCardData.staticData.periodLabel
      }, ending ${
        currentRevenueCardData.staticData.statementDate || "N/A"
      }). Includes revenue, profits, and free cash flow.`,
    };
    return {
      ...currentRevenueCardData,
      companyName: newCompanyName,
      logoUrl: newLogoUrl,
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
