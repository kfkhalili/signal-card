// src/components/game/cards/cash-use-card/cashUseCardUtils.ts
import { ok, err, fromPromise, Result } from "neverthrow";
import type {
  CashUseCardData,
  CashUseCardStaticData,
  CashUseCardLiveData,
  AnnualDataPoint,
} from "./cash-use-card.types";
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
import type { Database, Json } from "@/lib/supabase/database.types";
import type { FinancialStatementDBRow as FinancialStatementDBRowFromRealtime } from "@/lib/supabase/realtime-service";
import type { ProfileDBRow as ProfileDBRowFromHook } from "@/hooks/useStockData";
import { applyProfileCoreUpdates } from "../cardUtils";
import { safeJsonParse } from "@/lib/utils";

type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

class CashUseCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CashUseCardError";
  }
}

function safeJsonParseWithField<T>(
  json: Json | null | undefined,
  fieldName: string,
  defaultValue: T
): T {
  if (json === null || json === undefined) return defaultValue;

  const parseAndExtract = (text: string): T => {
    return safeJsonParse<Record<string, unknown>>(text)
      .map((parsed) => (parsed[fieldName] as T) ?? defaultValue)
      .unwrapOr(defaultValue);
  };

  if (typeof json === "object" && json !== null) {
    return ((json as Record<string, unknown>)[fieldName] as T) ?? defaultValue;
  }

  if (typeof json === "string") {
    return parseAndExtract(json);
  }

  return defaultValue;
}

interface AnnualDataAndStatsResult {
  latest: number | null;
  latestDate: string | null;
  latestPeriod?: string | null;
  annualData: readonly AnnualDataPoint[];
}

function processFinancialRecords<
  K extends PropertyKey,
  TData extends {
    date: string;
    period?: string;
    fiscal_year?: string;
  } & Record<K, number | null>
>(records: TData[] | null | undefined, valueKey: K): AnnualDataAndStatsResult {
  const defaultResult: AnnualDataAndStatsResult = {
    latest: null,
    latestDate: null,
    annualData: [],
    latestPeriod: undefined,
  };
  if (!records || records.length === 0) return defaultResult;

  const yearlyTotals: Record<string, number> = {};
  const quarterlyData: Record<string, number> = {};
  let latestRecord: TData | null = null;

  for (const record of records) {
    if (!latestRecord || new Date(record.date) > new Date(latestRecord.date)) {
      latestRecord = record;
    }

    const year = record.fiscal_year;
    const value = record[valueKey];

    if (year && value !== null) {
      if (record.period === "FY") {
        yearlyTotals[year] = value;
      } else if (record.period?.startsWith("Q")) {
        quarterlyData[year] = (quarterlyData[year] || 0) + value;
      }
    }
  }

  const finalAnnualData: AnnualDataPoint[] = Object.entries(yearlyTotals)
    .map(([year, value]) => ({ year: parseInt(year, 10), value }))
    .sort((a, b) => a.year - b.year);

  const latestRecordValue = latestRecord ? latestRecord[valueKey] : null;

  return {
    latest: latestRecordValue,
    latestDate: latestRecord?.date ?? null,
    latestPeriod: latestRecord?.period,
    annualData: finalAnnualData.slice(-5),
  };
}

function createEmptyCashUseCard(
  symbol: string,
  existingCardId?: string,
  existingCreatedAt?: number
): CashUseCardData & Pick<DisplayableCardState, "isFlipped"> {
  const emptyStaticData: CashUseCardStaticData = {
    reportedCurrency: null,
    latestStatementDate: null,
    latestStatementPeriod: null,
  };

  const emptyLiveData: CashUseCardLiveData = {
    weightedAverageShsOut: null,
    outstandingShares_annual_data: [],
    currentTotalDebt: null,
    totalDebt_annual_data: [],
    currentFreeCashFlow: null,
    freeCashFlow_annual_data: [],
    currentNetDividendsPaid: null,
    netDividendsPaid_annual_data: [],
  };

  const cardBackData: BaseCardBackData = {
    description: `Cash use analysis for ${symbol}. Shows how the company allocates its free cash flow.`,
  };

  const concreteCardData: CashUseCardData = {
    id: existingCardId || `cashuse-${symbol}-${Date.now()}`,
    type: "cashuse",
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

function constructCashUseCardData(
  symbol: string,
  profileInfo: {
    companyName?: string | null;
    displayCompanyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  sharesData: AnnualDataAndStatsResult,
  totalDebtData: AnnualDataAndStatsResult,
  freeCashFlowData: AnnualDataAndStatsResult,
  netDividendsPaidData: AnnualDataAndStatsResult,
  latestFinancialStatementInfo: {
    reportedCurrency: string | null;
    statementDate: string | null;
    statementPeriod: string | null;
  },
  idOverride?: string | null,
  existingCreatedAt?: number | null
): CashUseCardData {
  const staticData: CashUseCardStaticData = {
    reportedCurrency: latestFinancialStatementInfo.reportedCurrency,
    latestStatementDate: latestFinancialStatementInfo.statementDate,
    latestStatementPeriod: latestFinancialStatementInfo.statementPeriod,
  };

  const liveData: CashUseCardLiveData = {
    weightedAverageShsOut: sharesData.latest,
    outstandingShares_annual_data: sharesData.annualData,
    currentTotalDebt: totalDebtData.latest,
    totalDebt_annual_data: totalDebtData.annualData,
    currentFreeCashFlow: freeCashFlowData.latest,
    freeCashFlow_annual_data: freeCashFlowData.annualData,
    currentNetDividendsPaid: netDividendsPaidData.latest,
    netDividendsPaid_annual_data: netDividendsPaidData.annualData,
  };

  const cardBackData: BaseCardBackData = {
    description: `Cash usage metrics for ${
      profileInfo.companyName || symbol
    }. Financial data from ${
      latestFinancialStatementInfo.statementDate || "N/A"
    } (${latestFinancialStatementInfo.statementPeriod || "N/A"}).`,
  };

  return {
    id: idOverride || `cashuse-${symbol}-${Date.now()}`,
    type: "cashuse",
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

async function fetchAndProcessCashUseData(
  symbol: string,
  supabase: CardInitializationContext["supabase"],
  activeCards?: DisplayableCard[]
): Promise<
  Result<ReturnType<typeof constructCashUseCardData>, CashUseCardError>
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
        new CashUseCardError(`Profile fetch failed: ${(e as Error).message}`)
    );
    if (profileResult.isOk() && profileResult.value.data) {
      fetchedProfileInfo = {
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

  const fsResult = await fromPromise(
    supabase
      .from("financial_statements")
      .select(
        "date, period, fiscal_year, reported_currency, balance_sheet_payload, cash_flow_payload, income_statement_payload"
      )
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(20),
    (e) =>
      new CashUseCardError(
        `Financial statements fetch failed: ${(e as Error).message}`
      )
  );

  if (fsResult.isErr()) {
    return err(fsResult.error);
  }
  const financialStatements = fsResult.value.data || [];

  const sharesRecords = financialStatements.map((fs) => ({
    date: fs.date,
    period: fs.period ?? undefined,
    fiscal_year: fs.fiscal_year ?? undefined,
    weightedAverageShsOut_value: safeJsonParseWithField<number | null>(
      fs.income_statement_payload,
      "weightedAverageShsOut",
      null
    ),
  }));
  const debtRecords = financialStatements.map((fs) => ({
    date: fs.date,
    period: fs.period ?? undefined,
    fiscal_year: fs.fiscal_year ?? undefined,
    totalDebt_value: safeJsonParseWithField<number | null>(
      fs.balance_sheet_payload,
      "totalDebt",
      null
    ),
  }));
  const fcfRecords = financialStatements.map((fs) => ({
    date: fs.date,
    period: fs.period ?? undefined,
    fiscal_year: fs.fiscal_year ?? undefined,
    freeCashFlow_value: safeJsonParseWithField<number | null>(
      fs.cash_flow_payload,
      "freeCashFlow",
      null
    ),
  }));
  const dividendRecords = financialStatements.map((fs) => {
    const rawValue = safeJsonParseWithField<number | null>(
      fs.cash_flow_payload,
      "netDividendsPaid",
      null
    );
    return {
      date: fs.date,
      period: fs.period ?? undefined,
      fiscal_year: fs.fiscal_year ?? undefined,
      netDividendsPaid_value: rawValue !== null ? Math.abs(rawValue) : null,
    };
  });

  const sharesData = processFinancialRecords(
    sharesRecords,
    "weightedAverageShsOut_value"
  );
  const totalDebtData = processFinancialRecords(debtRecords, "totalDebt_value");
  const freeCashFlowData = processFinancialRecords(
    fcfRecords,
    "freeCashFlow_value"
  );
  const netDividendsPaidData = processFinancialRecords(
    dividendRecords,
    "netDividendsPaid_value"
  );

  const latestFinancialStatementInfo = {
    reportedCurrency: financialStatements[0]?.reported_currency ?? null,
    statementDate: financialStatements[0]?.date ?? null,
    statementPeriod: financialStatements[0]?.period ?? null,
  };

  if (
    sharesData.latest === null &&
    totalDebtData.latest === null &&
    freeCashFlowData.latest === null &&
    netDividendsPaidData.latest === null
  ) {
    // No data found - return error that will be handled by caller
    return err(new CashUseCardError("No financial data found."));
  }

  return ok(
    constructCashUseCardData(
      symbol,
      fetchedProfileInfo,
      sharesData,
      totalDebtData,
      freeCashFlowData,
      netDividendsPaidData,
      latestFinancialStatementInfo
    )
  );
}

async function initializeCashUseCard({
  symbol,
  supabase,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, CashUseCardError>
> {
  const result = await fetchAndProcessCashUseData(
    symbol,
    supabase,
    activeCards
  );

  if (result.isErr()) {
    const error = result.error;
    if (error.message === "No financial data found.") {
      // No data found - return empty state card
      // Fetch profile info to apply to empty card
      const profileCardForSymbol = activeCards?.find(
        (c) => c.symbol === symbol && c.type === "profile"
      ) as ProfileDBRowFromSupabase | undefined;

      let fetchedProfileInfo = {
        companyName: profileCardForSymbol?.company_name ?? null,
        displayCompanyName:
          profileCardForSymbol?.display_company_name ??
          profileCardForSymbol?.company_name ??
          null,
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
            new CashUseCardError(`Profile fetch failed: ${(e as Error).message}`)
        );
        if (profileResult.isOk() && profileResult.value.data) {
          fetchedProfileInfo = {
            companyName: profileResult.value.data.company_name ?? null,
            displayCompanyName:
              profileResult.value.data.display_company_name ??
              profileResult.value.data.company_name ??
              null,
            logoUrl: profileResult.value.data.image ?? null,
            websiteUrl: profileResult.value.data.website ?? null,
          };
        }
      }

      const emptyCard = createEmptyCashUseCard(symbol);
      // Apply profile info to empty card if available
      // Only set companyName if it's not the symbol fallback (to avoid showing symbol in parenthesis)
      const emptyCardWithProfile: CashUseCardData & Pick<DisplayableCardState, "isFlipped"> = {
        ...emptyCard,
        companyName: fetchedProfileInfo.companyName && fetchedProfileInfo.companyName !== symbol
          ? fetchedProfileInfo.companyName
          : null,
        displayCompanyName: fetchedProfileInfo.displayCompanyName && fetchedProfileInfo.displayCompanyName !== symbol
          ? fetchedProfileInfo.displayCompanyName
          : null,
        logoUrl: fetchedProfileInfo.logoUrl ?? null,
        websiteUrl: fetchedProfileInfo.websiteUrl ?? null,
      };
      return ok(emptyCardWithProfile);
    }
    return err(error);
  }

  return result
    .andThen((cardData) => {
      const cardState: Pick<DisplayableCardState, "isFlipped"> = {
        isFlipped: false,
      };
      return ok({ ...cardData, ...cardState });
    })
    .mapErr((error) => {
      return error;
    });
}

registerCardInitializer("cashuse", initializeCashUseCard);

const handleCashUseCardFinancialStatementUpdate: CardUpdateHandler<
  CashUseCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentCashUseCardData,
  newFinancialStatementRow
): CashUseCardData => {
  const newWeightedAverageShsOut = safeJsonParseWithField<number | null>(
    newFinancialStatementRow.income_statement_payload,
    "weightedAverageShsOut",
    null
  );
  const newTotalDebt = safeJsonParseWithField<number | null>(
    newFinancialStatementRow.balance_sheet_payload,
    "totalDebt",
    null
  );
  const newFreeCashFlow = safeJsonParseWithField<number | null>(
    newFinancialStatementRow.cash_flow_payload,
    "freeCashFlow",
    null
  );

  const rawNewNetDividendsPaid = safeJsonParseWithField<number | null>(
    newFinancialStatementRow.cash_flow_payload,
    "netDividendsPaid",
    null
  );
  const newNetDividendsPaid =
    rawNewNetDividendsPaid !== null ? Math.abs(rawNewNetDividendsPaid) : null;

  const newDate = newFinancialStatementRow.date;
  const newPeriod = newFinancialStatementRow.period;
  const newReportedCurrency = newFinancialStatementRow.reported_currency;

  // If card is in empty state (latestStatementDate is null), always update
  if (!currentCashUseCardData.staticData.latestStatementDate && newDate) {
    // Reconstruct the card from the financial statement
    // Create a single-record structure to process
    const singleRecord = {
      date: newDate,
      period: newPeriod ?? undefined,
      fiscal_year: newFinancialStatementRow.fiscal_year ?? undefined,
      weightedAverageShsOut_value: newWeightedAverageShsOut,
      totalDebt_value: newTotalDebt,
      freeCashFlow_value: newFreeCashFlow,
      netDividendsPaid_value: newNetDividendsPaid,
    };

    const sharesData = processFinancialRecords([singleRecord], "weightedAverageShsOut_value");
    const totalDebtData = processFinancialRecords([singleRecord], "totalDebt_value");
    const freeCashFlowData = processFinancialRecords([singleRecord], "freeCashFlow_value");
    const netDividendsPaidData = processFinancialRecords([singleRecord], "netDividendsPaid_value");

    const latestFinancialStatementInfo = {
      reportedCurrency: newReportedCurrency,
      statementDate: newDate,
      statementPeriod: newPeriod,
    };

    return constructCashUseCardData(
      currentCashUseCardData.symbol,
      {
        companyName: currentCashUseCardData.companyName,
        displayCompanyName: currentCashUseCardData.displayCompanyName,
        logoUrl: currentCashUseCardData.logoUrl,
        websiteUrl: currentCashUseCardData.websiteUrl,
      },
      sharesData,
      totalDebtData,
      freeCashFlowData,
      netDividendsPaidData,
      latestFinancialStatementInfo,
      currentCashUseCardData.id,
      currentCashUseCardData.createdAt
    );
  }

  let hasChanged = false;
  const updatedLiveData = { ...currentCashUseCardData.liveData };
  const updatedStaticData = { ...currentCashUseCardData.staticData };

  if (
    newDate &&
    (!updatedStaticData.latestStatementDate ||
      new Date(newDate) >= new Date(updatedStaticData.latestStatementDate))
  ) {
    let periodIsSameOrNewer = true;
    if (
      new Date(newDate).getTime() ===
      new Date(updatedStaticData.latestStatementDate || 0).getTime()
    ) {
      const periodHierarchy = ["TTM", "FY", "H2", "H1", "Q4", "Q3", "Q2", "Q1"];
      const currentPeriodIndex = periodHierarchy.indexOf(
        updatedStaticData.latestStatementPeriod || ""
      );
      const newPeriodIndex = periodHierarchy.indexOf(newPeriod || "");
      periodIsSameOrNewer = newPeriodIndex <= currentPeriodIndex;
    }

    if (periodIsSameOrNewer) {
      if (
        newWeightedAverageShsOut !== null &&
        updatedLiveData.weightedAverageShsOut !== newWeightedAverageShsOut
      ) {
        updatedLiveData.weightedAverageShsOut = newWeightedAverageShsOut;
        hasChanged = true;
      }
      if (
        newTotalDebt !== null &&
        updatedLiveData.currentTotalDebt !== newTotalDebt
      ) {
        updatedLiveData.currentTotalDebt = newTotalDebt;
        hasChanged = true;
      }
      if (
        newFreeCashFlow !== null &&
        updatedLiveData.currentFreeCashFlow !== newFreeCashFlow
      ) {
        updatedLiveData.currentFreeCashFlow = newFreeCashFlow;
        hasChanged = true;
      }
      if (
        newNetDividendsPaid !== null &&
        updatedLiveData.currentNetDividendsPaid !== newNetDividendsPaid
      ) {
        updatedLiveData.currentNetDividendsPaid = newNetDividendsPaid;
        hasChanged = true;
      }

      if (
        hasChanged ||
        updatedStaticData.latestStatementDate !== newDate ||
        updatedStaticData.latestStatementPeriod !== newPeriod
      ) {
        updatedStaticData.latestStatementDate = newDate;
        updatedStaticData.latestStatementPeriod = newPeriod;
        updatedStaticData.reportedCurrency =
          newReportedCurrency ?? updatedStaticData.reportedCurrency;
        hasChanged = true;
      }
    }
  }

  if (hasChanged) {
    const newBackDataDescription = `Cash usage metrics for ${
      currentCashUseCardData.companyName || currentCashUseCardData.symbol
    }. Financial data from ${updatedStaticData.latestStatementDate || "N/A"} (${
      updatedStaticData.latestStatementPeriod || "N/A"
    }).`;
    return {
      ...currentCashUseCardData,
      liveData: updatedLiveData,
      staticData: updatedStaticData,
      backData: { description: newBackDataDescription },
    };
  }

  return currentCashUseCardData;
};

registerCardUpdateHandler(
  "cashuse",
  "FINANCIAL_STATEMENT_UPDATE",
  handleCashUseCardFinancialStatementUpdate
);

const handleCashUseCardProfileUpdate: CardUpdateHandler<
  CashUseCardData,
  ProfileDBRowFromHook
> = (
  currentCashUseCardData,
  profilePayload
): CashUseCardData => {
  const { updatedCardData } = applyProfileCoreUpdates(
    currentCashUseCardData,
    profilePayload
  );

  // Always apply profile updates to ensure data propagates correctly
  const newBackDataDescription = `Cash usage metrics for ${
    updatedCardData.companyName
  }. Financial data from ${
    updatedCardData.staticData.latestStatementDate || "N/A"
  } (${updatedCardData.staticData.latestStatementPeriod || "N/A"}).`;

  return {
    ...updatedCardData,
    backData: {
      description: newBackDataDescription,
    },
  };
};

registerCardUpdateHandler(
  "cashuse",
  "STATIC_PROFILE_UPDATE",
  handleCashUseCardProfileUpdate
);
