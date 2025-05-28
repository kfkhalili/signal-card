// src/components/game/cards/solvency-card/solvency-card.types.ts
import type { BaseCardData } from "../base-card/base-card.types";

/**
 * Defines the structure for relevant data from FMP's balance sheet payload
 * for the SolvencyCard.
 */
export interface SolvencyCardFmpBalanceSheetData {
  readonly totalAssets?: number | null;
  readonly cashAndShortTermInvestments?: number | null;
  readonly totalCurrentLiabilities?: number | null;
  readonly shortTermDebt?: number | null;
  readonly longTermDebt?: number | null;
  // Common fields from FMP statements that might be useful for context/display
  readonly date?: string; // "YYYY-MM-DD", statement date
  readonly period?: string; // "FY", "Q1", "Q3", etc.
  readonly reportedCurrency?: string | null;
  readonly fiscalYear?: string | null;
  readonly fillingDate?: string | null;
  readonly acceptedDate?: string | null;
}

/**
 * Defines the structure for relevant data from FMP's cash flow payload
 * for the SolvencyCard.
 */
export interface SolvencyCardFmpCashFlowData {
  readonly freeCashFlow?: number | null;
  // Common fields
  readonly date?: string;
  readonly period?: string;
  readonly reportedCurrency?: string | null;
  readonly fiscalYear?: string | null;
}

/**
 * Defines the static, less frequently changing data specific to a solvency card.
 * This will store information about the financial statement period.
 */
export interface SolvencyCardStaticData {
  readonly periodLabel: string; // e.g., "FY2023", "Q3 2023"
  readonly reportedCurrency: string | null;
  readonly filingDate: string | null; // Date the statement was filed "YYYY-MM-DD"
  readonly acceptedDate: string | null; // Date the filing was accepted "YYYY-MM-DD HH:MM:SS"
  readonly statementDate: string; // Actual date of the statement "YYYY-MM-DD"
  readonly statementPeriod: string; // Actual period from the statement "FY", "Q1"
}

/**
 * Defines the "live" data for a SolvencyCard.
 * These are the key financial figures extracted from the latest available statements.
 */
export interface SolvencyCardLiveData {
  readonly totalAssets: number | null;
  readonly cashAndShortTermInvestments: number | null;
  readonly totalCurrentLiabilities: number | null;
  readonly shortTermDebt: number | null;
  readonly longTermDebt: number | null;
  readonly freeCashFlow: number | null;
}

/**
 * Main interface for the complete SolvencyCard data structure.
 */
export interface SolvencyCardData extends BaseCardData {
  readonly type: "solvency";
  readonly staticData: SolvencyCardStaticData;
  liveData: SolvencyCardLiveData;
}

/**
 * Defines specific interaction callbacks for a SolvencyCard.
 * Likely empty for now.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SolvencyCardInteractions {}
