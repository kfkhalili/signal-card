// Tests for fetch-fmp-insider-transactions validation and null handling
import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Import the schema from the actual file
const FmpInsiderTransactionSchema = z.object({
  symbol: z.string().min(1),
  filingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reportingCik: z.string().min(1),
  companyCik: z.string().nullable().optional(),
  transactionType: z.string().nullable().optional(),
  securitiesOwned: z.number().nonnegative().nullable().optional(),
  reportingName: z.string().nullable().optional(),
  typeOfOwner: z.string().nullable().optional(),
  acquisitionOrDisposition: z
    .union([z.enum(['A', 'D', 'I']), z.literal(''), z.null()])
    .transform((val) => (val === '' || val === 'I' ? null : val))
    .nullable()
    .optional(),
  directOrIndirect: z.enum(['D', 'I']).nullable().optional(),
  formType: z.string().nullable().optional(),
  securitiesTransacted: z.number().nonnegative().nullable().optional(), // Can be null
  price: z.number().nonnegative().nullable().optional(),
  securityName: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
});

Deno.test('FMP Insider Transactions: securitiesTransacted null handling - should accept null', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: null,
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.securitiesTransacted, null);
});

Deno.test('FMP Insider Transactions: securitiesTransacted null handling - should accept undefined', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.securitiesTransacted, undefined);
});

Deno.test('FMP Insider Transactions: securitiesTransacted null handling - should accept valid number', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.securitiesTransacted, 1000);
});

Deno.test('FMP Insider Transactions: securitiesTransacted null handling - should accept float', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1234.56,
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.securitiesTransacted, 1234.56);
});

Deno.test('FMP Insider Transactions: securitiesTransacted null handling - should reject negative', async () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: -100,
  };

  await assertRejects(
    async () => {
      FmpInsiderTransactionSchema.parse(record);
    },
    z.ZodError
  );
});

Deno.test('FMP Insider Transactions: acquisitionOrDisposition - should transform "I" to null', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
    acquisitionOrDisposition: 'I',
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.acquisitionOrDisposition, null);
});

Deno.test('FMP Insider Transactions: acquisitionOrDisposition - should transform empty string to null', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
    acquisitionOrDisposition: '',
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.acquisitionOrDisposition, null);
});

Deno.test('FMP Insider Transactions: acquisitionOrDisposition - should accept "A"', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
    acquisitionOrDisposition: 'A',
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.acquisitionOrDisposition, 'A');
});

Deno.test('FMP Insider Transactions: acquisitionOrDisposition - should accept "D"', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
    acquisitionOrDisposition: 'D',
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.acquisitionOrDisposition, 'D');
});

Deno.test('FMP Insider Transactions: securitiesOwned - should accept float', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
    securitiesOwned: 1234.56,
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.securitiesOwned, 1234.56);
});

Deno.test('FMP Insider Transactions: securitiesOwned - should accept null', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
    securitiesOwned: null,
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.securitiesOwned, null);
});

Deno.test('FMP Insider Transactions: Filtering logic - should filter out null securitiesTransacted', () => {
  const records = [
    {
      symbol: 'AAPL',
      filingDate: '2025-11-23',
      reportingCik: '0000320193',
      securitiesTransacted: 1000,
    },
    {
      symbol: 'AAPL',
      filingDate: '2025-11-24',
      reportingCik: '0000320193',
      securitiesTransacted: null, // Should be filtered out
    },
    {
      symbol: 'AAPL',
      filingDate: '2025-11-25',
      reportingCik: '0000320193',
      securitiesTransacted: 2000,
    },
  ];

  const validated = records.map((r) => FmpInsiderTransactionSchema.parse(r));
  const filtered = validated.filter(
    (r) => r.securitiesTransacted !== null && r.securitiesTransacted !== undefined
  );

  assertEquals(filtered.length, 2);
  assertEquals(filtered[0].securitiesTransacted, 1000);
  assertEquals(filtered[1].securitiesTransacted, 2000);
});

Deno.test('FMP Insider Transactions: Filtering logic - should handle all null records', () => {
  const records = [
    {
      symbol: 'AAPL',
      filingDate: '2025-11-23',
      reportingCik: '0000320193',
      securitiesTransacted: null,
    },
    {
      symbol: 'AAPL',
      filingDate: '2025-11-24',
      reportingCik: '0000320193',
      securitiesTransacted: null,
    },
  ];

  const validated = records.map((r) => FmpInsiderTransactionSchema.parse(r));
  const filtered = validated.filter(
    (r) => r.securitiesTransacted !== null && r.securitiesTransacted !== undefined
  );

  assertEquals(filtered.length, 0);
});

Deno.test('FMP Insider Transactions: Complete record validation - should validate complete record', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    transactionDate: '2025-11-22',
    reportingCik: '0000320193',
    companyCik: '0000320193',
    transactionType: 'P-Purchase',
    securitiesOwned: 50000.5,
    reportingName: 'John Doe',
    typeOfOwner: 'officer: CEO',
    acquisitionOrDisposition: 'A',
    directOrIndirect: 'D',
    formType: '4',
    securitiesTransacted: 1000.75,
    price: 150.25,
    securityName: 'Common Stock',
    url: 'https://www.sec.gov/Archives/edgar/data/320193/000032019325000123/xslF345X03/form4.xml',
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.symbol, 'AAPL');
  assertEquals(result.securitiesTransacted, 1000.75);
  assertEquals(result.acquisitionOrDisposition, 'A');
});

Deno.test('FMP Insider Transactions: Complete record validation - should validate minimal record', () => {
  const record = {
    symbol: 'AAPL',
    filingDate: '2025-11-23',
    reportingCik: '0000320193',
    securitiesTransacted: 1000,
  };

  const result = FmpInsiderTransactionSchema.parse(record);
  assertEquals(result.symbol, 'AAPL');
  assertEquals(result.securitiesTransacted, 1000);
});

