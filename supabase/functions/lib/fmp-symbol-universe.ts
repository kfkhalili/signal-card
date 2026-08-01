export interface ActiveSymbolRow {
  symbol: string;
  name: string;
}

export interface StockSymbolRow {
  symbol: string;
  companyName: string;
}

export interface SymbolChangeRow {
  date: string;
  companyName: string;
  oldSymbol: string;
  newSymbol: string;
}

export interface DelistedCompanyRow {
  symbol: string;
  companyName: string;
  exchange: string;
  ipoDate: string | null;
  delistedDate: string;
}

export interface ValidatedSymbolUniverse {
  activeSymbols: ActiveSymbolRow[];
  stockSymbols: StockSymbolRow[];
  symbolChanges: SymbolChangeRow[];
  delistedCompanies: DelistedCompanyRow[];
}

const MINIMUM_ACTIVE_SYMBOLS = 10_000;
const MINIMUM_STOCK_SYMBOLS = 10_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function requiredString(
  row: Record<string, unknown>,
  field: string,
  endpoint: string,
  index: number,
): string {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `${endpoint}[${index}].${field} must be a non-empty string`,
    );
  }
  return value.trim();
}

function optionalDate(
  row: Record<string, unknown>,
  field: string,
  endpoint: string,
  index: number,
): string | null {
  const value = row[field];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new Error(
      `${endpoint}[${index}].${field} must be an ISO date or null`,
    );
  }
  return value;
}

function requiredDate(
  row: Record<string, unknown>,
  field: string,
  endpoint: string,
  index: number,
): string {
  const value = requiredString(row, field, endpoint, index);
  if (!ISO_DATE.test(value)) {
    throw new Error(`${endpoint}[${index}].${field} must be an ISO date`);
  }
  return value;
}

function records(
  payload: unknown,
  endpoint: string,
): Record<string, unknown>[] {
  if (!Array.isArray(payload)) {
    throw new Error(`${endpoint} must return a JSON array`);
  }
  return payload.map((row, index) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${endpoint}[${index}] must be an object`);
    }
    return row as Record<string, unknown>;
  });
}

function normalizedSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function rejectDuplicateSymbols(
  rows: Array<{ symbol: string }>,
  endpoint: string,
): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.symbol)) {
      throw new Error(`${endpoint} contains duplicate symbol ${row.symbol}`);
    }
    seen.add(row.symbol);
  }
}

export function validateFmpSymbolUniverse(input: {
  activeSymbols: unknown;
  stockSymbols: unknown;
  symbolChanges: unknown;
  delistedCompanies: unknown;
}): ValidatedSymbolUniverse {
  const activeSymbols = records(
    input.activeSymbols,
    "actively-trading-list",
  ).map((row, index) => ({
    symbol: normalizedSymbol(
      requiredString(row, "symbol", "actively-trading-list", index),
    ),
    name: requiredString(row, "name", "actively-trading-list", index),
  }));

  const stockSymbols = records(input.stockSymbols, "stock-list").map(
    (row, index) => ({
      symbol: normalizedSymbol(
        requiredString(row, "symbol", "stock-list", index),
      ),
      companyName: requiredString(
        row,
        "companyName",
        "stock-list",
        index,
      ),
    }),
  );

  if (activeSymbols.length < MINIMUM_ACTIVE_SYMBOLS) {
    throw new Error(
      `actively-trading-list returned only ${activeSymbols.length} rows`,
    );
  }
  if (stockSymbols.length < MINIMUM_STOCK_SYMBOLS) {
    throw new Error(`stock-list returned only ${stockSymbols.length} rows`);
  }

  rejectDuplicateSymbols(activeSymbols, "actively-trading-list");
  rejectDuplicateSymbols(stockSymbols, "stock-list");

  const stockSet = new Set(stockSymbols.map((row) => row.symbol));
  const missingFromStock = activeSymbols
    .map((row) => row.symbol)
    .filter((symbol) => !stockSet.has(symbol));
  if (missingFromStock.length > 0) {
    throw new Error(
      `actively-trading-list contains ${missingFromStock.length} symbols absent from stock-list`,
    );
  }

  const symbolChanges = records(input.symbolChanges, "symbol-change").map(
    (row, index) => ({
      date: requiredDate(row, "date", "symbol-change", index),
      companyName: requiredString(
        row,
        "companyName",
        "symbol-change",
        index,
      ),
      oldSymbol: normalizedSymbol(
        requiredString(row, "oldSymbol", "symbol-change", index),
      ),
      newSymbol: normalizedSymbol(
        requiredString(row, "newSymbol", "symbol-change", index),
      ),
    }),
  );

  const delistedCompanies = records(
    input.delistedCompanies,
    "delisted-companies",
  ).map((row, index) => ({
    symbol: normalizedSymbol(
      requiredString(row, "symbol", "delisted-companies", index),
    ),
    companyName: requiredString(
      row,
      "companyName",
      "delisted-companies",
      index,
    ),
    exchange: requiredString(
      row,
      "exchange",
      "delisted-companies",
      index,
    ).toUpperCase(),
    ipoDate: optionalDate(row, "ipoDate", "delisted-companies", index),
    delistedDate: requiredDate(
      row,
      "delistedDate",
      "delisted-companies",
      index,
    ),
  }));

  return {
    activeSymbols,
    stockSymbols,
    symbolChanges,
    delistedCompanies,
  };
}
