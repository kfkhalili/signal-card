/**
 * Unit tests for quarter label calculation from date strings
 *
 * This tests the logic that converts date strings (YYYY-MM-DD) to quarter labels (QxYY)
 * to ensure correct quarter calculation regardless of timezone issues.
 */

describe('Quarter Label Calculation', () => {
  /**
   * Helper function to calculate quarter label from date string
   * This matches the logic in src/app/symbol/[ticker]/page.tsx
   */
  function calculateQuarterLabel(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Create date in local time to avoid UTC timezone shifts
    const date = new Date(year, month - 1, day);

    // Verify the date was created correctly
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error(`Date parsing failed for ${dateStr}. Got: ${date.toISOString()}`);
    }

    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const yearShort = String(date.getFullYear()).slice(-2);
    return `Q${quarter}${yearShort}`;
  }

  describe('AAPL Financial Statements (September dates)', () => {
    test('2025-09-27 should be Q325 (Q3 2025)', () => {
      const result = calculateQuarterLabel('2025-09-27');
      expect(result).toBe('Q325');
    });

    test('2024-09-28 should be Q324 (Q3 2024)', () => {
      const result = calculateQuarterLabel('2024-09-28');
      expect(result).toBe('Q324');
    });

    test('2023-09-30 should be Q323 (Q3 2023)', () => {
      const result = calculateQuarterLabel('2023-09-30');
      expect(result).toBe('Q323');
    });

    test('2022-09-24 should be Q322 (Q3 2022)', () => {
      const result = calculateQuarterLabel('2022-09-24');
      expect(result).toBe('Q322');
    });

    test('2021-09-25 should be Q321 (Q3 2021)', () => {
      const result = calculateQuarterLabel('2021-09-25');
      expect(result).toBe('Q321');
    });
  });

  describe('All quarters of the year', () => {
    test('Q1 dates (January-March)', () => {
      expect(calculateQuarterLabel('2025-01-15')).toBe('Q125');
      expect(calculateQuarterLabel('2025-02-15')).toBe('Q125');
      expect(calculateQuarterLabel('2025-03-15')).toBe('Q125');
    });

    test('Q2 dates (April-June)', () => {
      expect(calculateQuarterLabel('2025-04-15')).toBe('Q225');
      expect(calculateQuarterLabel('2025-05-15')).toBe('Q225');
      expect(calculateQuarterLabel('2025-06-15')).toBe('Q225');
    });

    test('Q3 dates (July-September)', () => {
      expect(calculateQuarterLabel('2025-07-15')).toBe('Q325');
      expect(calculateQuarterLabel('2025-08-15')).toBe('Q325');
      expect(calculateQuarterLabel('2025-09-15')).toBe('Q325');
    });

    test('Q4 dates (October-December)', () => {
      expect(calculateQuarterLabel('2025-10-15')).toBe('Q425');
      expect(calculateQuarterLabel('2025-11-15')).toBe('Q425');
      expect(calculateQuarterLabel('2025-12-15')).toBe('Q425');
    });
  });

  describe('Edge cases', () => {
    test('First day of quarter', () => {
      expect(calculateQuarterLabel('2025-01-01')).toBe('Q125');
      expect(calculateQuarterLabel('2025-04-01')).toBe('Q225');
      expect(calculateQuarterLabel('2025-07-01')).toBe('Q325');
      expect(calculateQuarterLabel('2025-10-01')).toBe('Q425');
    });

    test('Last day of quarter', () => {
      expect(calculateQuarterLabel('2025-03-31')).toBe('Q125');
      expect(calculateQuarterLabel('2025-06-30')).toBe('Q225');
      expect(calculateQuarterLabel('2025-09-30')).toBe('Q325');
      expect(calculateQuarterLabel('2025-12-31')).toBe('Q425');
    });

    test('Year boundaries', () => {
      expect(calculateQuarterLabel('2024-12-31')).toBe('Q424');
      expect(calculateQuarterLabel('2025-01-01')).toBe('Q125');
    });

    test('Different years', () => {
      expect(calculateQuarterLabel('2021-09-25')).toBe('Q321');
      expect(calculateQuarterLabel('2022-09-24')).toBe('Q322');
      expect(calculateQuarterLabel('2023-09-30')).toBe('Q323');
      expect(calculateQuarterLabel('2024-09-28')).toBe('Q324');
      expect(calculateQuarterLabel('2025-09-27')).toBe('Q325');
    });
  });

  describe('Date parsing verification', () => {
    test('Should parse dates correctly without timezone shifts', () => {
      const dateStr = '2025-09-27';
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month - 1, day);

      // Verify the date components
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(8); // September is month 8 (0-indexed)
      expect(date.getDate()).toBe(27);

      // Verify quarter calculation
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      expect(quarter).toBe(3); // September is Q3
    });

    test('Should handle all months correctly', () => {
      const testCases = [
        { date: '2025-01-15', expectedQuarter: 1 },
        { date: '2025-02-15', expectedQuarter: 1 },
        { date: '2025-03-15', expectedQuarter: 1 },
        { date: '2025-04-15', expectedQuarter: 2 },
        { date: '2025-05-15', expectedQuarter: 2 },
        { date: '2025-06-15', expectedQuarter: 2 },
        { date: '2025-07-15', expectedQuarter: 3 },
        { date: '2025-08-15', expectedQuarter: 3 },
        { date: '2025-09-15', expectedQuarter: 3 },
        { date: '2025-10-15', expectedQuarter: 4 },
        { date: '2025-11-15', expectedQuarter: 4 },
        { date: '2025-12-15', expectedQuarter: 4 },
      ];

      testCases.forEach(({ date, expectedQuarter }) => {
        const parts = date.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month - 1, day);
        const quarter = Math.floor(dateObj.getMonth() / 3) + 1;

        expect(quarter).toBe(expectedQuarter);
      });
    });
  });
});

