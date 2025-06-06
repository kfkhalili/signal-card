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
import { applyProfileCoreUpdates } from "../cardUtils";

type FinancialStatementDBRowFromSupabase =
  Database["public"]["Tables"]["financial_statements"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

function constructRevenueCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: {
    companyName?: string | null;
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
    companyName: profileInfo.companyName ?? dbRow.symbol,
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
          `[initializeRevenueCard] Error fetching profile for ${symbol}:`,
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
      throw statementError;
    }

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
  _currentDisplayableCard,
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
      // This condition is a bit broad; it implies any differing period (even lower in hierarchy)
      // could trigger an update if accepted dates are also more recent or equal.
      // This might be desired to catch corrections or restatements for the same date but different period label.
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
        // If accepted dates are not available, a different period for the same statement date is considered an update
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
    // Reconstruct the card data using the new financial statement row
    // and existing profile information.
    // Important: We pass Date.now() for createdAt to signify an update,
    // unless you have specific logic to retain original creation time of the card instance itself.
    // If id needs to remain exactly the same, ensure idOverride is currentRevenueCardData.id
    // If createdAt needs to be the original creation time of this card *instance*, pass currentRevenueCardData.createdAt
    return constructRevenueCardData(
      newFinancialStatementRow, // This is the new FinancialStatementDBRowFromRealtime
      {
        companyName: currentRevenueCardData.companyName,
        logoUrl: currentRevenueCardData.logoUrl,
        websiteUrl: currentRevenueCardData.websiteUrl,
      },
      currentRevenueCardData.id, // Preserve the original card ID
      Date.now() // Update createdAt to reflect new data freshness on the card itself
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
    // If core data like companyName changed, update the description in backData
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
  return currentRevenueCardData; // No change if core data didn't change
};
registerCardUpdateHandler(
  "revenue",
  "STATIC_PROFILE_UPDATE",
  handleRevenueCardProfileUpdate
);
