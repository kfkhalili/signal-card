// src/components/game/cards/cash-use-card/cashUseCardUtils.ts
import type {
  CashUseCardData,
  CashUseCardStaticData,
  CashUseCardLiveData,
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

type FinancialStatementDBRowFromSupabase =
  Database["public"]["Tables"]["financial_statements"]["Row"];
type SharesFloatDBRowFromSupabase =
  Database["public"]["Tables"]["shares_float"]["Row"];
type ProfileDBRowFromSupabase = Database["public"]["Tables"]["profiles"]["Row"];

function safeJsonParse<T>(
  json: Json | null | undefined,
  fieldName: string,
  defaultValue: T
): T {
  if (json === null || json === undefined) {
    return defaultValue;
  }
  try {
    if (typeof json === "object" && json !== null) {
      if (fieldName in json) {
        const val = (json as Record<string, unknown>)[fieldName];
        return val === undefined || val === null ? defaultValue : (val as T);
      }
      return defaultValue;
    }
    if (typeof json === "string") {
      const parsed = JSON.parse(json);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        fieldName in parsed
      ) {
        const val = (parsed as Record<string, unknown>)[fieldName];
        return val === undefined || val === null ? defaultValue : (val as T);
      }
      return defaultValue;
    }
  } catch (e) {
    console.warn(
      `Failed to parse or access field '${fieldName}' from JSON:`,
      json,
      e
    );
  }
  return defaultValue;
}

interface MinMaxLatestResult<V extends number | null> {
  min: V;
  max: V;
  latest: V;
  latestDate: string | null;
  rangeLabel: string;
  latestPeriod?: string | null;
  latestFiscalYear?: string | null;
}

function getMinMaxAndLatestForFinancialMetrics<
  K extends PropertyKey,
  TData extends {
    date: string;
    period?: string;
    fiscal_year?: string;
  } & Record<K, number | null>
>(
  records: TData[] | null | undefined,
  valueKey: K,
  isFinancialStatementMetric = true
): MinMaxLatestResult<number | null> {
  const defaultResult: MinMaxLatestResult<number | null> = {
    min: null,
    max: null,
    latest: null,
    latestDate: null,
    rangeLabel: "N/A",
    latestPeriod: undefined,
    latestFiscalYear: undefined,
  };

  if (!records || records.length === 0) {
    return defaultResult;
  }

  interface MappedRecord {
    value: number | null;
    date: string;
    period: string | undefined;
    fiscal_year: string | undefined;
  }

  interface ValidatedRecord {
    value: number;
    date: string;
    period: string | undefined;
    fiscal_year: string | undefined;
  }

  const validRecords = records
    .map(
      (record): MappedRecord => ({
        value: record[valueKey],
        date: record.date,
        period: record.period,
        fiscal_year: record.fiscal_year,
      })
    )
    .filter((r): r is ValidatedRecord => r.value !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (validRecords.length === 0) {
    return defaultResult;
  }

  const latestRecord = validRecords[0];
  const oldestRecord = validRecords[validRecords.length - 1];

  const values: number[] = validRecords.map((r) => r.value);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  let rangeLabel: string;
  if (validRecords.length === 1 || latestRecord.date === oldestRecord.date) {
    rangeLabel = `As of ${latestRecord.date}`;
    if (isFinancialStatementMetric && latestRecord.period) {
      rangeLabel = `${latestRecord.period} ${
        latestRecord.fiscal_year || latestRecord.date.substring(0, 4)
      }`;
    }
  } else {
    const formatDateForLabel = (dateStr: string | null | undefined): string => {
      return dateStr ? dateStr.substring(0, 4) : "N/A";
    };
    rangeLabel = `${formatDateForLabel(
      oldestRecord?.date
    )} - ${formatDateForLabel(latestRecord?.date)}`;
  }

  return {
    min: minVal,
    max: maxVal,
    latest: latestRecord.value,
    latestDate: latestRecord.date,
    rangeLabel,
    latestPeriod: isFinancialStatementMetric ? latestRecord.period : undefined,
    latestFiscalYear: isFinancialStatementMetric
      ? latestRecord.fiscal_year
      : undefined,
  };
}

interface SharesDataPoint {
  latest: number | null;
  latestDate: string | null;
}

function constructCashUseCardData(
  symbol: string,
  profileInfo: {
    companyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  },
  sharesData: SharesDataPoint,
  totalDebtData: MinMaxLatestResult<number | null>,
  freeCashFlowData: MinMaxLatestResult<number | null>,
  netDividendsPaidData: MinMaxLatestResult<number | null>,
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
    debtRangePeriodLabel: totalDebtData.rangeLabel,
    fcfRangePeriodLabel: freeCashFlowData.rangeLabel,
    dividendsRangePeriodLabel: netDividendsPaidData.rangeLabel,
    latestStatementDate: latestFinancialStatementInfo.statementDate,
    latestStatementPeriod: latestFinancialStatementInfo.statementPeriod,
    latestSharesFloatDate: sharesData.latestDate,
  };

  const liveData: CashUseCardLiveData = {
    currentOutstandingShares: sharesData.latest,
    currentTotalDebt: totalDebtData.latest,
    totalDebt_5y_min: totalDebtData.min,
    totalDebt_5y_max: totalDebtData.max,
    currentFreeCashFlow: freeCashFlowData.latest,
    freeCashFlow_5y_min: freeCashFlowData.min,
    freeCashFlow_5y_max: freeCashFlowData.max,
    currentNetDividendsPaid: netDividendsPaidData.latest,
    netDividendsPaid_5y_min: netDividendsPaidData.min,
    netDividendsPaid_5y_max: netDividendsPaidData.max,
  };

  const cardBackData: BaseCardBackData = {
    description: `Cash usage metrics for ${
      profileInfo.companyName || symbol
    }. Financial data from ${
      latestFinancialStatementInfo.statementDate || "N/A"
    } (${
      latestFinancialStatementInfo.statementPeriod || "N/A"
    }). Shares outstanding as of ${sharesData.latestDate || "N/A"}.`,
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
): Promise<{
  sharesData: SharesDataPoint;
  totalDebtData: MinMaxLatestResult<number | null>;
  freeCashFlowData: MinMaxLatestResult<number | null>;
  netDividendsPaidData: MinMaxLatestResult<number | null>;
  latestFinancialStatementInfo: {
    reportedCurrency: string | null;
    statementDate: string | null;
    statementPeriod: string | null;
  };
  profileInfo: {
    companyName?: string | null;
    logoUrl?: string | null;
    websiteUrl?: string | null;
  };
} | null> {
  try {
    const profileCardForSymbol = activeCards?.find(
      (c) => c.symbol === symbol && c.type === "profile"
    ) as ProfileDBRowFromSupabase | undefined;

    let fetchedProfileInfo = {
      companyName: profileCardForSymbol?.company_name ?? symbol,
      logoUrl: profileCardForSymbol?.image ?? null,
      websiteUrl: profileCardForSymbol?.website ?? null,
    };
    if (!profileCardForSymbol) {
      const { data: profileDataFromDB, error: profileError } = await supabase
        .from("profiles")
        .select("company_name, image, website")
        .eq("symbol", symbol)
        .maybeSingle();

      if (profileError) {
        console.warn(
          `[CashUseCard] Error fetching profile for ${symbol}: ${profileError.message}`
        );
      }
      fetchedProfileInfo = {
        companyName:
          (profileDataFromDB as ProfileDBRowFromSupabase | null)
            ?.company_name ?? symbol,
        logoUrl:
          (profileDataFromDB as ProfileDBRowFromSupabase | null)?.image ?? null,
        websiteUrl:
          (profileDataFromDB as ProfileDBRowFromSupabase | null)?.website ??
          null,
      };
    }

    const { data: fsRecords, error: fsError } = await supabase
      .from("financial_statements")
      .select(
        "date, period, fiscal_year, reported_currency, balance_sheet_payload, cash_flow_payload"
      )
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(20); // Fetch more for 5-year range potentially (5 years * 4 quarters)

    if (fsError) throw fsError;
    const financialStatements =
      (fsRecords as FinancialStatementDBRowFromSupabase[]) || [];

    const debtRecords = financialStatements.map((fs) => ({
      date: fs.date,
      period: fs.period ?? undefined,
      fiscal_year: fs.fiscal_year ?? undefined,
      totalDebt_value: safeJsonParse<number | null>(
        fs.balance_sheet_payload,
        "totalDebt", // Ensure this key matches your JSONB structure
        null
      ),
    }));
    const fcfRecords = financialStatements.map((fs) => ({
      date: fs.date,
      period: fs.period ?? undefined,
      fiscal_year: fs.fiscal_year ?? undefined,
      freeCashFlow_value: safeJsonParse<number | null>(
        fs.cash_flow_payload,
        "freeCashFlow", // Ensure this key matches
        null
      ),
    }));
    const dividendRecords = financialStatements.map((fs) => {
      const rawValue = safeJsonParse<number | null>(
        fs.cash_flow_payload,
        "dividendsPaid", // FMP often uses "dividendsPaid" for this; Supabase has "netDividendsPaid" in type.
        // For the sake of consistency, let's assume your DB payload also uses `netDividendsPaid`.
        // If FMP directly stores a field like `dividendsPaid` that is negative, you'd use that.
        // The current type `CashUseCardFmpCashFlowData` suggests `netDividendsPaid` is the FMP field.
        null
      );
      return {
        date: fs.date,
        period: fs.period ?? undefined,
        fiscal_year: fs.fiscal_year ?? undefined,
        // Assuming "netDividendsPaid" from your types, usually negative in cash flow statements.
        // The card displays it as a positive "use" of cash.
        netDividendsPaid_value: rawValue !== null ? Math.abs(rawValue) : null,
      };
    });

    const totalDebtData = getMinMaxAndLatestForFinancialMetrics(
      debtRecords,
      "totalDebt_value"
    );
    const freeCashFlowData = getMinMaxAndLatestForFinancialMetrics(
      fcfRecords,
      "freeCashFlow_value"
    );
    const netDividendsPaidData = getMinMaxAndLatestForFinancialMetrics(
      dividendRecords,
      "netDividendsPaid_value"
    );

    const latestFinancialStatementInfo = {
      reportedCurrency: financialStatements[0]?.reported_currency ?? null,
      statementDate: financialStatements[0]?.date ?? null,
      statementPeriod: financialStatements[0]?.period ?? null,
    };

    const { data: sfRecord, error: sfError } = await supabase
      .from("shares_float")
      .select("date, outstanding_shares")
      .eq("symbol", symbol)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sfError) throw sfError;

    const sharesDataPoint: SharesDataPoint = {
      latest:
        (sfRecord as SharesFloatDBRowFromSupabase | null)?.outstanding_shares ??
        null,
      latestDate:
        (sfRecord as SharesFloatDBRowFromSupabase | null)?.date ?? null,
    };

    return {
      sharesData: sharesDataPoint,
      totalDebtData,
      freeCashFlowData,
      netDividendsPaidData,
      latestFinancialStatementInfo,
      profileInfo: fetchedProfileInfo,
    };
  } catch (error: unknown) {
    console.error(`[CashUseCard] Error fetching data for ${symbol}:`, error);
    return null;
  }
}

async function initializeCashUseCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<DisplayableCard | null> {
  const fetchedData = await fetchAndProcessCashUseData(
    symbol,
    supabase,
    activeCards
  );

  if (!fetchedData) {
    if (toast) {
      toast({
        title: "Cash Use Card Error",
        description: `Could not fetch necessary data for ${symbol}.`,
        variant: "destructive",
      });
    }
    return null;
  }

  const {
    sharesData,
    totalDebtData,
    freeCashFlowData,
    netDividendsPaidData,
    latestFinancialStatementInfo,
    profileInfo,
  } = fetchedData;

  const hasAnyFinancialData =
    totalDebtData.latest !== null ||
    freeCashFlowData.latest !== null ||
    netDividendsPaidData.latest !== null;
  const hasSharesData = sharesData.latest !== null;

  if (!hasAnyFinancialData && !hasSharesData) {
    if (toast) {
      toast({
        title: "Insufficient Data",
        description: `No financial or shares data found for ${symbol} to create a Cash Use Card.`,
        variant: "default",
      });
    }
    return null;
  }

  const concreteCardData = constructCashUseCardData(
    symbol,
    profileInfo,
    sharesData,
    totalDebtData,
    freeCashFlowData,
    netDividendsPaidData,
    latestFinancialStatementInfo
  );

  const cardState: Pick<DisplayableCardState, "isFlipped"> = {
    isFlipped: false,
  };
  return { ...concreteCardData, ...cardState };
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
  const newTotalDebt = safeJsonParse<number | null>(
    newFinancialStatementRow.balance_sheet_payload,
    "totalDebt",
    null
  );
  const newFreeCashFlow = safeJsonParse<number | null>(
    newFinancialStatementRow.cash_flow_payload,
    "freeCashFlow",
    null
  );

  const rawNewNetDividendsPaid = safeJsonParse<number | null>(
    newFinancialStatementRow.cash_flow_payload,
    "netDividendsPaid", // Assuming this key aligns with your type and typical FMP data for this field
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
    // Only update if the new statement is for the same or newer date,
    // and if the values actually differ or it's a newer period for the same date.
    // This simple check assumes newer date/period implies more relevant data.
    // More complex logic might be needed if periods can arrive out of order for the same date.

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
      periodIsSameOrNewer = newPeriodIndex <= currentPeriodIndex; // Lower index means more comprehensive/recent
    }

    if (periodIsSameOrNewer) {
      if (
        newTotalDebt !== null &&
        updatedLiveData.currentTotalDebt !== newTotalDebt
      ) {
        updatedLiveData.currentTotalDebt = newTotalDebt;
        // Note: Min/max for 5y range are NOT updated here as this handles single statement updates.
        // Min/max would typically be recalculated if the entire historical dataset changed.
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
        hasChanged || // If any value changed
        updatedStaticData.latestStatementDate !== newDate || // Or if statement date is newer
        updatedStaticData.latestStatementPeriod !== newPeriod // Or if period is different for same date
      ) {
        updatedStaticData.latestStatementDate = newDate;
        updatedStaticData.latestStatementPeriod = newPeriod;
        updatedStaticData.reportedCurrency =
          newReportedCurrency ?? updatedStaticData.reportedCurrency;
        hasChanged = true; // Ensure flag is set if only date/period changed
      }
    }
  }

  if (hasChanged) {
    if (context.toast) {
      context.toast({
        title: `Cash Use Figures Updated: ${currentCashUseCardData.symbol}`,
        description: `Latest statement data (${
          newPeriod ?? "N/A"
        } ${newDate}) applied. 5-year ranges are based on initial card data.`,
      });
    }
    const newBackDataDescription = `Cash usage metrics for ${
      currentCashUseCardData.companyName || currentCashUseCardData.symbol
    }. Financial data from ${updatedStaticData.latestStatementDate || "N/A"} (${
      updatedStaticData.latestStatementPeriod || "N/A"
    }). Shares outstanding as of ${
      updatedStaticData.latestSharesFloatDate || "N/A"
    }.`;
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

type SharesFloatDBRowForUpdate = SharesFloatDBRowFromSupabase;

const handleCashUseCardSharesFloatUpdate: CardUpdateHandler<
  CashUseCardData,
  SharesFloatDBRowForUpdate
> = (
  currentCashUseCardData,
  newSharesFloatRow,
  _currentDisplayableCard,
  context
): CashUseCardData => {
  const newOutstandingShares = newSharesFloatRow.outstanding_shares;
  const newDate = newSharesFloatRow.date;

  let hasChanged = false;
  const updatedLiveData = { ...currentCashUseCardData.liveData };
  const updatedStaticData = { ...currentCashUseCardData.staticData };

  if (
    newDate &&
    (!updatedStaticData.latestSharesFloatDate ||
      new Date(newDate) >= new Date(updatedStaticData.latestSharesFloatDate))
  ) {
    if (
      newOutstandingShares !== null &&
      updatedLiveData.currentOutstandingShares !== newOutstandingShares
    ) {
      updatedLiveData.currentOutstandingShares = newOutstandingShares;
      hasChanged = true;
    }
    if (hasChanged || updatedStaticData.latestSharesFloatDate !== newDate) {
      updatedStaticData.latestSharesFloatDate = newDate;
      hasChanged = true;
    }
  }

  if (hasChanged) {
    if (context.toast) {
      context.toast({
        title: `Shares Outstanding Updated: ${currentCashUseCardData.symbol}`,
        description: `Data as of ${newDate} applied.`,
      });
    }
    const newBackDataDescription = `Cash usage metrics for ${
      currentCashUseCardData.companyName || currentCashUseCardData.symbol
    }. Financial data from ${updatedStaticData.latestStatementDate || "N/A"} (${
      updatedStaticData.latestStatementPeriod || "N/A"
    }). Shares outstanding as of ${
      updatedStaticData.latestSharesFloatDate || "N/A"
    }.`;
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
  "SHARES_FLOAT_UPDATE",
  handleCashUseCardSharesFloatUpdate
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
      // Only toast for core changes, currency is less visible
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
      finalCardData.companyName // Use new name
    }. Financial data from ${
      finalCardData.staticData.latestStatementDate || "N/A"
    } (${
      finalCardData.staticData.latestStatementPeriod || "N/A"
    }). Shares outstanding as of ${
      finalCardData.staticData.latestSharesFloatDate || "N/A"
    }.`;

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
