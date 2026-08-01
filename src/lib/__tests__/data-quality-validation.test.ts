import {
  validateBalanceSheetReconciliation,
  validateMarketCapReconciliation,
  validateReportingPeriodIntegrity,
} from "../../../supabase/functions/_shared/data-quality-validation";

describe("provider data-quality validators", () => {
  describe("balance-sheet reconciliation", () => {
    it("returns no finding when assets reconcile", () => {
      const findings = validateBalanceSheetReconciliation({
        date: "2025-12-31",
        period: "FY",
        balance_sheet_payload: {
          totalAssets: 1_000,
          totalLiabilities: 600,
          totalEquity: 400,
        },
      });

      expect(findings).toEqual([]);
    });

    it("raises a critical finding for a material accounting-equation mismatch", () => {
      const findings = validateBalanceSheetReconciliation({
        date: "2025-12-31",
        period: "FY",
        balance_sheet_payload: {
          totalAssets: 1_000,
          totalLiabilities: 500,
          totalEquity: 300,
        },
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        checkCode: "balance_sheet_reconciliation",
        severity: "critical",
        sourceDate: "2025-12-31",
      });
    });

    it("records an informational finding when the check cannot run", () => {
      const findings = validateBalanceSheetReconciliation({
        date: "2025-12-31",
        period: "FY",
        balance_sheet_payload: { totalAssets: 1_000 },
      });

      expect(findings[0]).toMatchObject({
        severity: "info",
        sourceReference: "missing-inputs",
      });
    });
  });

  describe("market-cap reconciliation", () => {
    it("returns no finding within the tolerance", () => {
      expect(validateMarketCapReconciliation({
        price: 10,
        sharesOutstanding: 100,
        marketCap: 1_030,
      })).toEqual([]);
    });

    it("raises a critical finding for a material mismatch", () => {
      const findings = validateMarketCapReconciliation({
        price: 10,
        sharesOutstanding: 100,
        marketCap: 1_500,
      });

      expect(findings[0]).toMatchObject({
        checkCode: "market_cap_reconciliation",
        severity: "critical",
      });
    });
  });

  describe("reporting-period integrity", () => {
    const now = new Date("2026-07-27T12:00:00.000Z");

    it("detects future periods and filings before the period end", () => {
      const findings = validateReportingPeriodIntegrity(
        [{
          date: "2026-12-31",
          period: "FY",
          fiscal_year: "2026",
          filing_date: "2026-01-15",
          accepted_date: "2026-01-15T12:00:00.000Z",
        }],
        now,
      );

      expect(findings).toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceReference: "future-period" }),
        expect.objectContaining({ sourceReference: "filing-before-period" }),
      ]));
    });

    it("allows EDGAR acceptance before the next-business-day filing date", () => {
      const findings = validateReportingPeriodIntegrity([{
        date: "2024-12-31",
        period: "FY",
        fiscal_year: "2024",
        filing_date: "2025-01-06",
        accepted_date: "2025-01-03T19:00:00.000Z",
      }], now);

      expect(findings).not.toEqual(expect.arrayContaining([
        expect.objectContaining({
          sourceReference: "accepted-before-filing",
        }),
      ]));
    });

    it("detects acceptance timestamps materially before filing", () => {
      const findings = validateReportingPeriodIntegrity([{
        date: "2024-12-31",
        period: "FY",
        fiscal_year: "2024",
        filing_date: "2025-01-15",
        accepted_date: "2025-01-01T12:00:00.000Z",
      }], now);

      expect(findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          sourceReference: "accepted-before-filing",
          evidence: expect.objectContaining({ graceDays: 7 }),
        }),
      ]));
    });

    it("detects multiple dates mapped to one fiscal period", () => {
      const findings = validateReportingPeriodIntegrity(
        [
          { date: "2025-12-30", period: "FY", fiscal_year: "2025" },
          { date: "2025-12-31", period: "FY", fiscal_year: "2025" },
        ],
        now,
      );

      expect(findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          sourceReference: "duplicate-2025:FY",
        }),
      ]));
    });
  });
});
