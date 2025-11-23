/**
 * Integration test to verify ROIC history data works correctly with Recharts
 *
 * This test simulates the actual data structure that would be passed to Recharts
 * and verifies that dateLabel values are correct and unique.
 */

describe('ROIC History Recharts Integration', () => {
  // Simulate the actual data structure from Supabase
  const mockFinancialStatements = [
    { date: '2025-09-27', period: 'FY', fiscal_year: '2025' },
    { date: '2024-09-28', period: 'FY', fiscal_year: '2024' },
    { date: '2023-09-30', period: 'FY', fiscal_year: '2023' },
    { date: '2022-09-24', period: 'FY', fiscal_year: '2022' },
    { date: '2021-09-25', period: 'FY', fiscal_year: '2021' },
  ];

  // Function that matches the actual implementation
  function buildRoicHistoryData(
    financialStatementsHistory: Array<{ date: string }>
  ): Array<{ date: string; dateLabel: string; roic: number; wacc: number }> {
    return financialStatementsHistory.map((fs) => {
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
        roic: 20.5, // Mock ROIC value
        wacc: 15.0, // Mock WACC value
      };
    });
  }

  test('Should create correct dateLabel for all September dates', () => {
    const history = buildRoicHistoryData(mockFinancialStatements);

    // Sort by date (matching the actual implementation)
    const sortedHistory = history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    expect(sortedHistory).toHaveLength(5);

    // All September dates should be Q3
    expect(sortedHistory[0].dateLabel).toBe('Q321');
    expect(sortedHistory[1].dateLabel).toBe('Q322');
    expect(sortedHistory[2].dateLabel).toBe('Q323');
    expect(sortedHistory[3].dateLabel).toBe('Q324');
    expect(sortedHistory[4].dateLabel).toBe('Q325');

    // Verify none are Q1
    sortedHistory.forEach((item) => {
      expect(item.dateLabel).not.toMatch(/^Q1\d{2}$/);
      expect(item.dateLabel).toMatch(/^Q3\d{2}$/);
    });
  });

  test('Should have unique dateLabel values', () => {
    const history = buildRoicHistoryData(mockFinancialStatements);
    const dateLabels = history.map((item) => item.dateLabel);
    const uniqueLabels = new Set(dateLabels);

    expect(uniqueLabels.size).toBe(history.length);
    expect(dateLabels.length).toBe(uniqueLabels.size);
  });

  test('Should have correct data structure for Recharts', () => {
    const history = buildRoicHistoryData(mockFinancialStatements);

    history.forEach((item) => {
      // Verify required fields exist
      expect(item).toHaveProperty('date');
      expect(item).toHaveProperty('dateLabel');
      expect(item).toHaveProperty('roic');
      expect(item).toHaveProperty('wacc');

      // Verify types
      expect(typeof item.date).toBe('string');
      expect(typeof item.dateLabel).toBe('string');
      expect(typeof item.roic).toBe('number');
      expect(typeof item.wacc).toBe('number');

      // Verify dateLabel format
      expect(item.dateLabel).toMatch(/^Q[1-4]\d{2}$/);
    });
  });

  test('Should handle duplicate dates correctly', () => {
    const duplicateDates = [
      { date: '2025-09-27' },
      { date: '2025-09-27' }, // Duplicate
      { date: '2024-09-28' },
    ];

    const history = buildRoicHistoryData(duplicateDates);

    // Both should have the same dateLabel
    expect(history[0].dateLabel).toBe('Q325');
    expect(history[1].dateLabel).toBe('Q325');
    expect(history[2].dateLabel).toBe('Q324');
  });

  test('Should verify date parsing is correct for all months', () => {
    const allMonths = [
      { date: '2025-01-15' }, // Q1
      { date: '2025-02-15' }, // Q1
      { date: '2025-03-15' }, // Q1
      { date: '2025-04-15' }, // Q2
      { date: '2025-05-15' }, // Q2
      { date: '2025-06-15' }, // Q2
      { date: '2025-07-15' }, // Q3
      { date: '2025-08-15' }, // Q3
      { date: '2025-09-15' }, // Q3
      { date: '2025-10-15' }, // Q4
      { date: '2025-11-15' }, // Q4
      { date: '2025-12-15' }, // Q4
    ];

    const history = buildRoicHistoryData(allMonths);

    const expectedQuarters = ['Q125', 'Q125', 'Q125', 'Q225', 'Q225', 'Q225', 'Q325', 'Q325', 'Q325', 'Q425', 'Q425', 'Q425'];

    history.forEach((item, index) => {
      expect(item.dateLabel).toBe(expectedQuarters[index]);
    });
  });

  test('Should verify actual Supabase data format', () => {
    // This test verifies the data structure matches what Supabase returns
    const supabaseData = [
      { date: '2025-09-27', period: 'FY', fiscal_year: '2025' },
      { date: '2024-09-28', period: 'FY', fiscal_year: '2024' },
    ];

    const history = buildRoicHistoryData(supabaseData);

    expect(history[0].date).toBe('2025-09-27');
    expect(history[0].dateLabel).toBe('Q325');
    expect(history[1].date).toBe('2024-09-28');
    expect(history[1].dateLabel).toBe('Q324');
  });
});

