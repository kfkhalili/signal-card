// src/components/game/cards/revenue-card/revenue-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

// Simplified interfaces for the relevant parts of FMP statement payloads
// These fields are extracted from the 'income_statement_payload' JSONB column
export interface RevenueCardFmpIncomeStatementData {
  readonly revenue?: number | null;
  readonly grossProfit?: number | null;
  readonly operatingIncome?: number | null;
  readonly netIncome?: number | null;
  // Common fields from FMP statements that might be useful for context/display
  readonly date?: string; // "YYYY-MM-DD", statement date
  readonly period?: string; // "FY", "Q1", "Q3", etc.
  readonly reportedCurrency?: string | null;
  readonly fiscalYear?: string | null;
  readonly fillingDate?: string | null; // Corrected from FmpStatementEntryBase
  readonly acceptedDate?: string | null; // Corrected from FmpStatementEntryBase
}

// Simplified interface for the relevant part of FMP cash flow payload
// These fields are extracted from the 'cash_flow_payload' JSONB column
export interface RevenueCardFmpCashFlowData {
  readonly freeCashFlow?: number | null;
  // Common fields
  readonly date?: string;
  readonly period?: string;
  readonly reportedCurrency?: string | null;
  readonly fiscalYear?: string | null;
}

/**
 * Defines the static, less frequently changing data specific to a revenue card.
 * This will store information about the financial statement period.
 */
export interface RevenueCardStaticData {
  readonly periodLabel: string; // e.g., "FY2023", "Q3 2023"
  readonly reportedCurrency: string | null;
  readonly filingDate: string | null; // Date the statement was filed "YYYY-MM-DD"
  readonly acceptedDate: string | null; // Date the filing was accepted "YYYY-MM-DD HH:MM:SS"
  readonly statementDate: string; // Actual date of the statement "YYYY-MM-DD"
  readonly statementPeriod: string; // Actual period from the statement "FY", "Q1"
}

/**
 * Defines the "live" data for a RevenueCard.
 * These are the key financial figures extracted from the latest available statements.
 */
export interface RevenueCardLiveData {
  readonly revenue: number | null;
  readonly grossProfit: number | null;
  readonly operatingIncome: number | null;
  readonly netIncome: number | null;
  readonly freeCashFlow: number | null;
}

/**
 * Main interface for the complete RevenueCard data structure.
 */
export interface RevenueCardData extends BaseCardData {
  readonly type: "revenue";
  readonly staticData: RevenueCardStaticData;
  liveData: RevenueCardLiveData; // Mutable for updates if we decide to fetch newer statements
  // backData (description) will be inherited and populated
}

/**
 * Defines specific interaction callbacks for a RevenueCard.
 * Likely empty for now.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RevenueCardInteractions {}
