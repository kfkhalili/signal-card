type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      exchange_market_status: {
        Row: {
          closing_time_local: string | null;
          current_day_is_holiday: boolean | null;
          current_holiday_name: string | null;
          exchange_code: string;
          is_market_open: boolean | null;
          last_fetched_at: string;
          name: string | null;
          opening_time_local: string | null;
          raw_holidays_json: Json | null;
          status_message: string | null;
          timezone: string;
        };
        Insert: {
          closing_time_local?: string | null;
          current_day_is_holiday?: boolean | null;
          current_holiday_name?: string | null;
          exchange_code: string;
          is_market_open?: boolean | null;
          last_fetched_at?: string;
          name?: string | null;
          opening_time_local?: string | null;
          raw_holidays_json?: Json | null;
          status_message?: string | null;
          timezone: string;
        };
        Update: {
          closing_time_local?: string | null;
          current_day_is_holiday?: boolean | null;
          current_holiday_name?: string | null;
          exchange_code?: string;
          is_market_open?: boolean | null;
          last_fetched_at?: string;
          name?: string | null;
          opening_time_local?: string | null;
          raw_holidays_json?: Json | null;
          status_message?: string | null;
          timezone?: string;
        };
        Relationships: [];
      };
      live_quote_indicators: {
        Row: {
          api_timestamp: number;
          change_percentage: number | null;
          current_price: number;
          day_change: number | null;
          day_high: number | null;
          day_low: number | null;
          day_open: number | null;
          exchange: string | null;
          fetched_at: string;
          id: string;
          market_cap: number | null;
          previous_close: number | null;
          sma_200d: number | null;
          sma_50d: number | null;
          symbol: string;
          volume: number | null;
          year_high: number | null;
          year_low: number | null;
        };
        Insert: {
          api_timestamp: number;
          change_percentage?: number | null;
          current_price: number;
          day_change?: number | null;
          day_high?: number | null;
          day_low?: number | null;
          day_open?: number | null;
          exchange?: string | null;
          fetched_at?: string;
          id?: string;
          market_cap?: number | null;
          previous_close?: number | null;
          sma_200d?: number | null;
          sma_50d?: number | null;
          symbol: string;
          volume?: number | null;
          year_high?: number | null;
          year_low?: number | null;
        };
        Update: {
          api_timestamp?: number;
          change_percentage?: number | null;
          current_price?: number;
          day_change?: number | null;
          day_high?: number | null;
          day_low?: number | null;
          day_open?: number | null;
          exchange?: string | null;
          fetched_at?: string;
          id?: string;
          market_cap?: number | null;
          previous_close?: number | null;
          sma_200d?: number | null;
          sma_50d?: number | null;
          symbol?: string;
          volume?: number | null;
          year_high?: number | null;
          year_low?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: string | null;
          average_volume: number | null;
          beta: number | null;
          ceo: string | null;
          change: number | null;
          change_percentage: number | null;
          cik: string | null;
          city: string | null;
          company_name: string | null;
          country: string | null;
          currency: string | null;
          cusip: string | null;
          default_image: boolean | null;
          description: string | null;
          exchange: string | null;
          exchange_full_name: string | null;
          full_time_employees: number | null;
          id: string;
          image: string | null;
          industry: string | null;
          ipo_date: string | null;
          is_actively_trading: boolean | null;
          is_adr: boolean | null;
          is_etf: boolean | null;
          is_fund: boolean | null;
          isin: string | null;
          last_dividend: number | null;
          market_cap: number | null;
          modified_at: string;
          phone: string | null;
          price: number | null;
          range: string | null;
          sector: string | null;
          state: string | null;
          symbol: string;
          volume: number | null;
          website: string | null;
          zip: string | null;
        };
        Insert: {
          address?: string | null;
          average_volume?: number | null;
          beta?: number | null;
          ceo?: string | null;
          change?: number | null;
          change_percentage?: number | null;
          cik?: string | null;
          city?: string | null;
          company_name?: string | null;
          country?: string | null;
          currency?: string | null;
          cusip?: string | null;
          default_image?: boolean | null;
          description?: string | null;
          exchange?: string | null;
          exchange_full_name?: string | null;
          full_time_employees?: number | null;
          id?: string;
          image?: string | null;
          industry?: string | null;
          ipo_date?: string | null;
          is_actively_trading?: boolean | null;
          is_adr?: boolean | null;
          is_etf?: boolean | null;
          is_fund?: boolean | null;
          isin?: string | null;
          last_dividend?: number | null;
          market_cap?: number | null;
          modified_at?: string;
          phone?: string | null;
          price?: number | null;
          range?: string | null;
          sector?: string | null;
          state?: string | null;
          symbol: string;
          volume?: number | null;
          website?: string | null;
          zip?: string | null;
        };
        Update: {
          address?: string | null;
          average_volume?: number | null;
          beta?: number | null;
          ceo?: string | null;
          change?: number | null;
          change_percentage?: number | null;
          cik?: string | null;
          city?: string | null;
          company_name?: string | null;
          country?: string | null;
          currency?: string | null;
          cusip?: string | null;
          default_image?: boolean | null;
          description?: string | null;
          exchange?: string | null;
          exchange_full_name?: string | null;
          full_time_employees?: number | null;
          id?: string;
          image?: string | null;
          industry?: string | null;
          ipo_date?: string | null;
          is_actively_trading?: boolean | null;
          is_adr?: boolean | null;
          is_etf?: boolean | null;
          is_fund?: boolean | null;
          isin?: string | null;
          last_dividend?: number | null;
          market_cap?: number | null;
          modified_at?: string;
          phone?: string | null;
          price?: number | null;
          range?: string | null;
          sector?: string | null;
          state?: string | null;
          symbol?: string;
          volume?: number | null;
          website?: string | null;
          zip?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          full_name: string | null;
          id: string;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
