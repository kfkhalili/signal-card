// src/types/market.types.ts
export interface FmpMarketHoliday {
  // If you want to type the raw_holidays_json
  year: number;
  [holidayName: string]: string | number;
}

export interface ExchangeMarketStatusRecord {
  exchange_code: string;
  name?: string | null;
  opening_time_local?: string | null;
  closing_time_local?: string | null;
  timezone: string;
  is_market_open: boolean;
  status_message?: string | null;
  current_day_is_holiday?: boolean | null;
  current_holiday_name?: string | null;
  raw_holidays_json?: FmpMarketHoliday[] | null;
  last_fetched_at: string; // ISO string
}
