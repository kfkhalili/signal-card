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

function constructCashUseCardData(
  symbol: string,
  profileInfo: {
    companyName?: string | null;
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
    currentOutstandingShares: sharesData.latest,
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
    companyName: profileInfo.companyName ?? symbol,
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
    logoUrl: profileCardForSymbol?.image ?? null,
    websiteUrl: profileCardForSymbol?.website ?? null,
  };
  if (!profileCardForSymbol) {
    const profileResult = await fromPromise(
      supabase
        .from("profiles")
        .select("company_name, image, website")
        .eq("symbol", symbol)
        .maybeSingle(),
      (e) =>
        new CashUseCardError(`Profile fetch failed: ${(e as Error).message}`)
    );
    if (profileResult.isOk() && profileResult.value.data) {
      fetchedProfileInfo = {
        companyName: profileResult.value.data.company_name ?? symbol,
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
        "date, period, fiscal_year, reported_currency, balance_sheet_payload, cash_flow_payload"
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
    commonStock_value: safeJsonParseWithField<number | null>(
      fs.balance_sheet_payload,
      "commonStock",
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
    "commonStock_value"
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
  toast,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, CashUseCardError>
> {
  const result = await fetchAndProcessCashUseData(
    symbol,
    supabase,
    activeCards
  );

  return result
    .andThen((cardData) => {
      const cardState: Pick<DisplayableCardState, "isFlipped"> = {
        isFlipped: false,
      };
      return ok({ ...cardData, ...cardState });
    })
    .mapErr((error) => {
      if (toast) {
        toast({
          title: "Cash Use Card Error",
          description: `Could not fetch necessary data for ${symbol}: ${error.message}`,
          variant: "destructive",
        });
      }
      return error;
    });
}

registerCardInitializer("cashuse", initializeCashUseCard);

const handleCashUseCardFinancialStatementUpdate: CardUpdateHandler<
  CashUseCardData,
  FinancialStatementDBRowFromRealtime
> = (
  currentCashUseCardData,
  newFinancialStatementRow,
  _currentDisplayableCard,
  context
): CashUseCardData => {
  const newCommonStock = safeJsonParseWithField<number | null>(
    newFinancialStatementRow.balance_sheet_payload,
    "commonStock",
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
        newCommonStock !== null &&
        updatedLiveData.currentOutstandingShares !== newCommonStock
      ) {
        updatedLiveData.currentOutstandingShares = newCommonStock;
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
    if (context.toast) {
      context.toast({
        title: `Cash Use Figures Updated: ${currentCashUseCardData.symbol}`,
        description: `Latest statement data (${
          newPeriod ?? "N/A"
        } ${newDate}) applied. Annual charts are based on initial card data.`,
      });
    }
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
  profilePayload,
  _currentDisplayableCard,
  context
): CashUseCardData => {
  const { updatedCardData, coreDataChanged } = applyProfileCoreUpdates(
    currentCashUseCardData,
    profilePayload
  );

  let currencyChanged = false;
  const newReportedCurrency =
    profilePayload.currency ??
    currentCashUseCardData.staticData.reportedCurrency;
  if (
    currentCashUseCardData.staticData.reportedCurrency !== newReportedCurrency
  ) {
    currencyChanged = true;
  }

  if (coreDataChanged || currencyChanged) {
    if (context.toast && coreDataChanged) {
      context.toast({
        title: "Profile Info Updated",
        description: `Company details for ${currentCashUseCardData.symbol} card refreshed.`,
      });
    }
    const finalCardData = {
      ...updatedCardData,
      staticData: {
        ...updatedCardData.staticData,
        reportedCurrency: newReportedCurrency,
      },
    };

    const newBackDataDescription = `Cash usage metrics for ${
      finalCardData.companyName
    }. Financial data from ${
      finalCardData.staticData.latestStatementDate || "N/A"
    } (${finalCardData.staticData.latestStatementPeriod || "N/A"}).`;

    return {
      ...finalCardData,
      backData: {
        description: newBackDataDescription,
      },
    };
  }
  return currentCashUseCardData;
};

registerCardUpdateHandler(
  "cashuse",
  "STATIC_PROFILE_UPDATE",
  handleCashUseCardProfileUpdate
);
