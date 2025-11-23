/**
 * Integration test for ROIC history data structure
 *
 * This tests that the data structure created for roicHistory matches
 * what Recharts expects and that dateLabel is correctly calculated.
 */

import { Option } from 'effect';

// Mock financial statement data structure
interface FinancialStatement {
  date: string;
  total_assets: number | null;
  total_equity: number | null;
  total_debt: number | null;
  cash_and_cash_equivalents: number | null;
  net_income: number | null;
}

// Mock calculateROIC function (simplified)
function calculateROIC(fs: FinancialStatement): Option.Option<number> {
  if (
    !fs.total_equity ||
    !fs.total_debt ||
    fs.cash_and_cash_equivalents === null ||
    !fs.net_income
  ) {
    return Option.none();
  }

  const investedCapital = fs.total_equity + fs.total_debt - fs.cash_and_cash_equivalents;
  if (investedCapital <= 0) {
    return Option.none();
  }

  const roic = fs.net_income / investedCapital;
  return Option.some(roic);
}

// Function to build roicHistory (matches the logic in page.tsx)
function buildRoicHistory(
  financialStatementsHistory: FinancialStatement[],
  wacc: Option.Option<number>
): Array<{ date: string; dateLabel: string; roic: number; wacc: number }> {
  const history = financialStatementsHistory
    .map((fs) => {
      const roic = calculateROIC(fs);
      return Option.match(roic, {
        onNone: () => null,
        onSome: (r) => {
          // Parse date to calculate quarter label
          const parts = fs.date.split('-');
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          const date = new Date(year, month - 1, day);
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          const yearShort = String(date.getFullYear()).slice(-2);
          const quarterLabel = `Q${quarter}${yearShort}`;

          return {
            date: fs.date,
            dateLabel: quarterLabel,
            roic: r * 100,
            wacc: Option.match(wacc, {
              onNone: () => 0,
              onSome: (w) => w * 100,
            }),
          };
        },
      });
    })
    .filter(
      (h): h is { date: string; dateLabel: string; roic: number; wacc: number } =>
        h !== null
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return history;
}

describe('ROIC History Data Structure', () => {
  const mockFinancialStatements: FinancialStatement[] = [
    {
      date: '2025-09-27',
      total_assets: 1000000,
      total_equity: 500000,
      total_debt: 200000,
      cash_and_cash_equivalents: 100000,
      net_income: 60000,
    },
    {
      date: '2024-09-28',
      total_assets: 950000,
      total_equity: 480000,
      total_debt: 190000,
      cash_and_cash_equivalents: 95000,
      net_income: 55000,
    },
    {
      date: '2023-09-30',
      total_assets: 900000,
      total_equity: 460000,
      total_debt: 180000,
      cash_and_cash_equivalents: 90000,
      net_income: 50000,
    },
  ];

  const mockWacc = Option.some(0.15); // 15%

  test('Should create correct data structure with dateLabel', () => {
    const history = buildRoicHistory(mockFinancialStatements, mockWacc);

    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({
      date: '2023-09-30',
      dateLabel: 'Q323',
      roic: expect.any(Number),
      wacc: 15,
    });
    expect(history[1]).toMatchObject({
      date: '2024-09-28',
      dateLabel: 'Q324',
      roic: expect.any(Number),
      wacc: 15,
    });
    expect(history[2]).toMatchObject({
      date: '2025-09-27',
      dateLabel: 'Q325',
      roic: expect.any(Number),
      wacc: 15,
    });
  });

  test('Should calculate correct quarter labels for September dates', () => {
    const history = buildRoicHistory(mockFinancialStatements, mockWacc);

    // All September dates should be Q3
    history.forEach((item) => {
      expect(item.dateLabel).toMatch(/^Q3\d{2}$/);
      expect(item.dateLabel).not.toMatch(/^Q1\d{2}$/);
    });
  });

  test('Should sort data chronologically', () => {
    const history = buildRoicHistory(mockFinancialStatements, mockWacc);

    for (let i = 1; i < history.length; i++) {
      const prevDate = new Date(history[i - 1].date);
      const currDate = new Date(history[i].date);
      expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
    }
  });

  test('Should handle different quarters correctly', () => {
    const mixedQuarters: FinancialStatement[] = [
      {
        date: '2025-01-15', // Q1
        total_assets: 1000000,
        total_equity: 500000,
        total_debt: 200000,
        cash_and_cash_equivalents: 100000,
        net_income: 60000,
      },
      {
        date: '2025-04-15', // Q2
        total_assets: 1000000,
        total_equity: 500000,
        total_debt: 200000,
        cash_and_cash_equivalents: 100000,
        net_income: 60000,
      },
      {
        date: '2025-07-15', // Q3
        total_assets: 1000000,
        total_equity: 500000,
        total_debt: 200000,
        cash_and_cash_equivalents: 100000,
        net_income: 60000,
      },
      {
        date: '2025-10-15', // Q4
        total_assets: 1000000,
        total_equity: 500000,
        total_debt: 200000,
        cash_and_cash_equivalents: 100000,
        net_income: 60000,
      },
    ];

    const history = buildRoicHistory(mixedQuarters, mockWacc);

    expect(history[0].dateLabel).toBe('Q125');
    expect(history[1].dateLabel).toBe('Q225');
    expect(history[2].dateLabel).toBe('Q325');
    expect(history[3].dateLabel).toBe('Q425');
  });
});

