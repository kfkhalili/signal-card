export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      exchange_market_status: {
        Row: {
          closing_time_local: string | null
          current_day_is_holiday: boolean | null
          current_holiday_name: string | null
          exchange_code: string
          is_market_open: boolean | null
          last_fetched_at: string
          name: string | null
          opening_time_local: string | null
          raw_holidays_json: Json | null
          status_message: string | null
          timezone: string
        }
        Insert: {
          closing_time_local?: string | null
          current_day_is_holiday?: boolean | null
          current_holiday_name?: string | null
          exchange_code: string
          is_market_open?: boolean | null
          last_fetched_at?: string
          name?: string | null
          opening_time_local?: string | null
          raw_holidays_json?: Json | null
          status_message?: string | null
          timezone: string
        }
        Update: {
          closing_time_local?: string | null
          current_day_is_holiday?: boolean | null
          current_holiday_name?: string | null
          exchange_code?: string
          is_market_open?: boolean | null
          last_fetched_at?: string
          name?: string | null
          opening_time_local?: string | null
          raw_holidays_json?: Json | null
          status_message?: string | null
          timezone?: string
        }
        Relationships: []
      }
      financial_statements: {
        Row: {
          accepted_date: string | null
          balance_sheet_payload: Json | null
          cash_flow_payload: Json | null
          cik: string | null
          date: string
          fetched_at: string
          filing_date: string | null
          fiscal_year: string | null
          income_statement_payload: Json | null
          period: string
          reported_currency: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          accepted_date?: string | null
          balance_sheet_payload?: Json | null
          cash_flow_payload?: Json | null
          cik?: string | null
          date: string
          fetched_at?: string
          filing_date?: string | null
          fiscal_year?: string | null
          income_statement_payload?: Json | null
          period: string
          reported_currency?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          accepted_date?: string | null
          balance_sheet_payload?: Json | null
          cash_flow_payload?: Json | null
          cik?: string | null
          date?: string
          fetched_at?: string
          filing_date?: string | null
          fiscal_year?: string | null
          income_statement_payload?: Json | null
          period?: string
          reported_currency?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_financial_statements_symbol"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "supported_symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
      live_quote_indicators: {
        Row: {
          api_timestamp: number
          change_percentage: number | null
          current_price: number
          day_change: number | null
          day_high: number | null
          day_low: number | null
          day_open: number | null
          exchange: string | null
          fetched_at: string
          id: string
          market_cap: number | null
          previous_close: number | null
          sma_200d: number | null
          sma_50d: number | null
          symbol: string
          volume: number | null
          year_high: number | null
          year_low: number | null
        }
        Insert: {
          api_timestamp: number
          change_percentage?: number | null
          current_price: number
          day_change?: number | null
          day_high?: number | null
          day_low?: number | null
          day_open?: number | null
          exchange?: string | null
          fetched_at?: string
          id?: string
          market_cap?: number | null
          previous_close?: number | null
          sma_200d?: number | null
          sma_50d?: number | null
          symbol: string
          volume?: number | null
          year_high?: number | null
          year_low?: number | null
        }
        Update: {
          api_timestamp?: number
          change_percentage?: number | null
          current_price?: number
          day_change?: number | null
          day_high?: number | null
          day_low?: number | null
          day_open?: number | null
          exchange?: string | null
          fetched_at?: string
          id?: string
          market_cap?: number | null
          previous_close?: number | null
          sma_200d?: number | null
          sma_50d?: number | null
          symbol?: string
          volume?: number | null
          year_high?: number | null
          year_low?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          average_volume: number | null
          beta: number | null
          ceo: string | null
          change: number | null
          change_percentage: number | null
          cik: string | null
          city: string | null
          company_name: string | null
          country: string | null
          currency: string | null
          cusip: string | null
          default_image: boolean | null
          description: string | null
          exchange: string | null
          exchange_full_name: string | null
          full_time_employees: number | null
          id: string
          image: string | null
          industry: string | null
          ipo_date: string | null
          is_actively_trading: boolean | null
          is_adr: boolean | null
          is_etf: boolean | null
          is_fund: boolean | null
          isin: string | null
          last_dividend: number | null
          market_cap: number | null
          modified_at: string
          phone: string | null
          price: number | null
          range: string | null
          sector: string | null
          state: string | null
          symbol: string
          volume: number | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          average_volume?: number | null
          beta?: number | null
          ceo?: string | null
          change?: number | null
          change_percentage?: number | null
          cik?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          currency?: string | null
          cusip?: string | null
          default_image?: boolean | null
          description?: string | null
          exchange?: string | null
          exchange_full_name?: string | null
          full_time_employees?: number | null
          id?: string
          image?: string | null
          industry?: string | null
          ipo_date?: string | null
          is_actively_trading?: boolean | null
          is_adr?: boolean | null
          is_etf?: boolean | null
          is_fund?: boolean | null
          isin?: string | null
          last_dividend?: number | null
          market_cap?: number | null
          modified_at?: string
          phone?: string | null
          price?: number | null
          range?: string | null
          sector?: string | null
          state?: string | null
          symbol: string
          volume?: number | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          average_volume?: number | null
          beta?: number | null
          ceo?: string | null
          change?: number | null
          change_percentage?: number | null
          cik?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          currency?: string | null
          cusip?: string | null
          default_image?: boolean | null
          description?: string | null
          exchange?: string | null
          exchange_full_name?: string | null
          full_time_employees?: number | null
          id?: string
          image?: string | null
          industry?: string | null
          ipo_date?: string | null
          is_actively_trading?: boolean | null
          is_adr?: boolean | null
          is_etf?: boolean | null
          is_fund?: boolean | null
          isin?: string | null
          last_dividend?: number | null
          market_cap?: number | null
          modified_at?: string
          phone?: string | null
          price?: number | null
          range?: string | null
          sector?: string | null
          state?: string | null
          symbol?: string
          volume?: number | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      shares_float: {
        Row: {
          date: string
          fetched_at: string
          float_shares: number | null
          free_float: number | null
          outstanding_shares: number | null
          symbol: string
          updated_at: string
        }
        Insert: {
          date: string
          fetched_at?: string
          float_shares?: number | null
          free_float?: number | null
          outstanding_shares?: number | null
          symbol: string
          updated_at?: string
        }
        Update: {
          date?: string
          fetched_at?: string
          float_shares?: number | null
          free_float?: number | null
          outstanding_shares?: number | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      supported_symbols: {
        Row: {
          added_at: string
          is_active: boolean
          last_processed_at: string | null
          symbol: string
        }
        Insert: {
          added_at?: string
          is_active?: boolean
          last_processed_at?: string | null
          symbol: string
        }
        Update: {
          added_at?: string
          is_active?: boolean
          last_processed_at?: string | null
          symbol?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
