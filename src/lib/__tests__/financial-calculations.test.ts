/**
 * Unit tests for financial calculation utilities
 * Tests ROIC, FCF Yield, Net Debt/EBITDA, Altman Z-Score, and Interest Coverage calculations
 */

import { describe, it, expect } from '@jest/globals';
import { Option } from 'effect';
import {
  calculateROIC,
  calculateFCFYield,
  calculateNetDebtToEbitda,
  calculateAltmanZScore,
  calculateInterestCoverage,
} from '../financial-calculations';
import type { Database } from '@/lib/supabase/database.types';

type FinancialStatementDBRow = Database['public']['Tables']['financial_statements']['Row'];

describe('Financial Calculations', () => {
  describe('calculateNetDebtToEbitda', () => {
    it('should calculate Net Debt/EBITDA correctly', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {
          shortTermDebt: 10000000,
          longTermDebt: 50000000,
          cashAndCashEquivalents: 20000000,
        },
        income_statement_payload: {
          ebitda: 80000000,
        },
      };

      const result = calculateNetDebtToEbitda(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // Net Debt = (10M + 50M) - 20M = 40M
        // Ratio = 40M / 80M = 0.5
        expect(result.value).toBeCloseTo(0.5, 2);
      }
    });

    it('should calculate EBITDA from operatingIncome + depreciationAndAmortization if ebitda is missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {
          shortTermDebt: 10000000,
          longTermDebt: 50000000,
          cashAndCashEquivalents: 20000000,
        },
        income_statement_payload: {
          operatingIncome: 70000000,
          depreciationAndAmortization: 10000000,
        },
      };

      const result = calculateNetDebtToEbitda(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // EBITDA = 70M + 10M = 80M
        // Net Debt = 40M
        // Ratio = 40M / 80M = 0.5
        expect(result.value).toBeCloseTo(0.5, 2);
      }
    });

    it('should return None if EBITDA is zero or negative', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {
          shortTermDebt: 10000000,
          longTermDebt: 50000000,
          cashAndCashEquivalents: 20000000,
        },
        income_statement_payload: {
          ebitda: 0,
        },
      };

      const result = calculateNetDebtToEbitda(statement as FinancialStatementDBRow);
      expect(Option.isNone(result)).toBe(true);
    });

    it('should return None if required fields are missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {},
        income_statement_payload: {},
      };

      const result = calculateNetDebtToEbitda(statement as FinancialStatementDBRow);
      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe('calculateAltmanZScore', () => {
    it('should calculate Altman Z-Score correctly', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {
          totalCurrentAssets: 150000000,
          totalCurrentLiabilities: 100000000,
          totalAssets: 500000000,
          retainedEarnings: 200000000,
          totalLiabilities: 300000000,
        },
        income_statement_payload: {
          ebit: 50000000,
          revenue: 1000000000,
        },
      };

      const marketCap = Option.some(800000000);

      const result = calculateAltmanZScore(
        statement as FinancialStatementDBRow,
        marketCap
      );
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // A = (150M - 100M) / 500M = 0.1
        // B = 200M / 500M = 0.4
        // C = 50M / 500M = 0.1
        // D = 800M / 300M = 2.67
        // E = 1000M / 500M = 2.0
        // Z = 1.2(0.1) + 1.4(0.4) + 3.3(0.1) + 0.6(2.67) + 1.0(2.0)
        // Z = 0.12 + 0.56 + 0.33 + 1.602 + 2.0 = 4.612
        expect(result.value).toBeCloseTo(4.612, 2);
      }
    });

    it('should use totalCurrentAssets and totalCurrentLiabilities (FMP API field names)', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {
          totalCurrentAssets: 150000000,
          totalCurrentLiabilities: 100000000,
          totalAssets: 500000000,
          retainedEarnings: 200000000,
          totalLiabilities: 300000000,
        },
        income_statement_payload: {
          operatingIncome: 50000000, // Use operatingIncome if ebit is missing
          revenue: 1000000000,
        },
      };

      const marketCap = Option.some(800000000);

      const result = calculateAltmanZScore(
        statement as FinancialStatementDBRow,
        marketCap
      );
      expect(Option.isSome(result)).toBe(true);
    });

    it('should return None if marketCap is missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {
          totalCurrentAssets: 150000000,
          totalCurrentLiabilities: 100000000,
          totalAssets: 500000000,
        },
        income_statement_payload: {
          ebit: 50000000,
        },
      };

      const result = calculateAltmanZScore(
        statement as FinancialStatementDBRow,
        Option.none()
      );
      expect(Option.isNone(result)).toBe(true);
    });

    it('should return None if required fields are missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        balance_sheet_payload: {},
        income_statement_payload: {},
      };

      const result = calculateAltmanZScore(
        statement as FinancialStatementDBRow,
        Option.some(800000000)
      );
      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe('calculateInterestCoverage', () => {
    it('should calculate Interest Coverage correctly', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {
          ebit: 100000000,
          interestExpense: 5000000,
        },
      };

      const result = calculateInterestCoverage(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // Coverage = 100M / 5M = 20x
        expect(result.value).toBeCloseTo(20, 0);
      }
    });

    it('should use operatingIncome if ebit is missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {
          operatingIncome: 100000000,
          interestExpense: 5000000,
        },
      };

      const result = calculateInterestCoverage(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(result.value).toBeCloseTo(20, 0);
      }
    });

    it('should return 999 if interest expense is zero (perfect coverage)', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {
          ebit: 100000000,
          interestExpense: 0,
        },
      };

      const result = calculateInterestCoverage(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // Should return 999 to indicate perfect/infinite coverage
        expect(result.value).toBe(999);
      }
    });

    it('should return 999 if interest expense is negative (interest income)', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {
          ebit: 100000000,
          interestExpense: -5000000, // Negative = interest income
        },
      };

      const result = calculateInterestCoverage(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // Should return 999 to indicate perfect/infinite coverage
        expect(result.value).toBe(999);
      }
    });

    it('should return None if required fields are missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {},
      };

      const result = calculateInterestCoverage(statement as FinancialStatementDBRow);
      expect(Option.isNone(result)).toBe(true);
    });

    it('should return None if statement is null', () => {
      const result = calculateInterestCoverage(null);
      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe('calculateROIC', () => {
    it('should calculate ROIC correctly', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {
          operatingIncome: 100000000,
          incomeBeforeTax: 90000000,
          incomeTaxExpense: 18000000, // 20% tax rate
        },
        balance_sheet_payload: {
          totalStockholdersEquity: 500000000,
          shortTermDebt: 50000000,
          longTermDebt: 200000000,
          cashAndCashEquivalents: 100000000,
        },
      };

      const result = calculateROIC(statement as FinancialStatementDBRow);
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // NOPAT = 100M * (1 - 0.2) = 80M
        // Invested Capital = 500M + 50M + 200M - 100M = 650M
        // ROIC = 80M / 650M = 0.123 (12.3%)
        expect(result.value).toBeCloseTo(0.123, 3);
      }
    });

    it('should return None if invested capital is zero or negative', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        income_statement_payload: {
          operatingIncome: 100000000,
          incomeBeforeTax: 90000000,
          incomeTaxExpense: 18000000,
        },
        balance_sheet_payload: {
          totalStockholdersEquity: 0,
          shortTermDebt: 0,
          longTermDebt: 0,
          cashAndCashEquivalents: 100000000, // More cash than equity + debt
        },
      };

      const result = calculateROIC(statement as FinancialStatementDBRow);
      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe('calculateFCFYield', () => {
    it('should calculate FCF Yield correctly', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        cash_flow_payload: {
          freeCashFlow: 50000000,
        },
      };

      const marketCap = Option.some(1000000000);

      const result = calculateFCFYield(
        statement as FinancialStatementDBRow,
        marketCap
      );
      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        // FCF Yield = 50M / 1000M = 0.05 (5%)
        expect(result.value).toBeCloseTo(0.05, 3);
      }
    });

    it('should return None if marketCap is missing', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        cash_flow_payload: {
          freeCashFlow: 50000000,
        },
      };

      const result = calculateFCFYield(
        statement as FinancialStatementDBRow,
        Option.none()
      );
      expect(Option.isNone(result)).toBe(true);
    });

    it('should return None if marketCap is zero or negative', () => {
      const statement: Partial<FinancialStatementDBRow> = {
        cash_flow_payload: {
          freeCashFlow: 50000000,
        },
      };

      const result = calculateFCFYield(
        statement as FinancialStatementDBRow,
        Option.some(0)
      );
      expect(Option.isNone(result)).toBe(true);
    });
  });
});

