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
      available_exchanges: {
        Row: {
          country_code: string | null
          country_name: string | null
          delay: string | null
          exchange: string
          fetched_at: string
          name: string | null
          symbol_suffix: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          country_name?: string | null
          delay?: string | null
          exchange: string
          fetched_at?: string
          name?: string | null
          symbol_suffix?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          country_name?: string | null
          delay?: string | null
          exchange?: string
          fetched_at?: string
          name?: string | null
          symbol_suffix?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dividend_history: {
        Row: {
          adj_dividend: number | null
          date: string
          declaration_date: string | null
          dividend: number | null
          fetched_at: string
          frequency: string | null
          payment_date: string | null
          record_date: string | null
          symbol: string
          updated_at: string
          yield: number | null
        }
        Insert: {
          adj_dividend?: number | null
          date: string
          declaration_date?: string | null
          dividend?: number | null
          fetched_at?: string
          frequency?: string | null
          payment_date?: string | null
          record_date?: string | null
          symbol: string
          updated_at?: string
          yield?: number | null
        }
        Update: {
          adj_dividend?: number | null
          date?: string
          declaration_date?: string | null
          dividend?: number | null
          fetched_at?: string
          frequency?: string | null
          payment_date?: string | null
          record_date?: string | null
          symbol?: string
          updated_at?: string
          yield?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dividend_history_symbol"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "supported_symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
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
      exchange_variants: {
        Row: {
          base_symbol: string
          beta: number | null
          changes: number | null
          cik: string | null
          currency: string | null
          cusip: string | null
          dcf: number | null
          dcf_diff: number | null
          default_image: boolean | null
          exchange: string | null
          exchange_short_name: string
          fetched_at: string
          image: string | null
          ipo_date: string | null
          is_actively_trading: boolean | null
          isin: string | null
          last_div: number | null
          mkt_cap: number | null
          price: number | null
          range: string | null
          updated_at: string
          variant_symbol: string
          vol_avg: number | null
        }
        Insert: {
          base_symbol: string
          beta?: number | null
          changes?: number | null
          cik?: string | null
          currency?: string | null
          cusip?: string | null
          dcf?: number | null
          dcf_diff?: number | null
          default_image?: boolean | null
          exchange?: string | null
          exchange_short_name: string
          fetched_at?: string
          image?: string | null
          ipo_date?: string | null
          is_actively_trading?: boolean | null
          isin?: string | null
          last_div?: number | null
          mkt_cap?: number | null
          price?: number | null
          range?: string | null
          updated_at?: string
          variant_symbol: string
          vol_avg?: number | null
        }
        Update: {
          base_symbol?: string
          beta?: number | null
          changes?: number | null
          cik?: string | null
          currency?: string | null
          cusip?: string | null
          dcf?: number | null
          dcf_diff?: number | null
          default_image?: boolean | null
          exchange?: string | null
          exchange_short_name?: string
          fetched_at?: string
          image?: string | null
          ipo_date?: string | null
          is_actively_trading?: boolean | null
          isin?: string | null
          last_div?: number | null
          mkt_cap?: number | null
          price?: number | null
          range?: string | null
          updated_at?: string
          variant_symbol?: string
          vol_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_exchange_variants_base_symbol"
            columns: ["base_symbol"]
            isOneToOne: false
            referencedRelation: "supported_symbols"
            referencedColumns: ["symbol"]
          },
        ]
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
      grades_historical: {
        Row: {
          analyst_ratings_buy: number | null
          analyst_ratings_hold: number | null
          analyst_ratings_sell: number | null
          analyst_ratings_strong_buy: number | null
          analyst_ratings_strong_sell: number | null
          date: string
          fetched_at: string
          symbol: string
          updated_at: string
        }
        Insert: {
          analyst_ratings_buy?: number | null
          analyst_ratings_hold?: number | null
          analyst_ratings_sell?: number | null
          analyst_ratings_strong_buy?: number | null
          analyst_ratings_strong_sell?: number | null
          date: string
          fetched_at?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          analyst_ratings_buy?: number | null
          analyst_ratings_hold?: number | null
          analyst_ratings_sell?: number | null
          analyst_ratings_strong_buy?: number | null
          analyst_ratings_strong_sell?: number | null
          date?: string
          fetched_at?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grades_historical_symbol"
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
          display_company_name: string | null
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
          display_company_name?: string | null
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
          display_company_name?: string | null
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
      ratios_ttm: {
        Row: {
          asset_turnover_ttm: number | null
          book_value_per_share_ttm: number | null
          bottom_line_profit_margin_ttm: number | null
          capex_per_share_ttm: number | null
          capital_expenditure_coverage_ratio_ttm: number | null
          cash_per_share_ttm: number | null
          cash_ratio_ttm: number | null
          continuous_operations_profit_margin_ttm: number | null
          current_ratio_ttm: number | null
          debt_service_coverage_ratio_ttm: number | null
          debt_to_assets_ratio_ttm: number | null
          debt_to_capital_ratio_ttm: number | null
          debt_to_equity_ratio_ttm: number | null
          debt_to_market_cap_ttm: number | null
          dividend_paid_and_capex_coverage_ratio_ttm: number | null
          dividend_payout_ratio_ttm: number | null
          dividend_per_share_ttm: number | null
          dividend_yield_ttm: number | null
          ebit_margin_ttm: number | null
          ebitda_margin_ttm: number | null
          ebt_per_ebit_ttm: number | null
          effective_tax_rate_ttm: number | null
          enterprise_value_multiple_ttm: number | null
          enterprise_value_ttm: number | null
          fetched_at: string
          financial_leverage_ratio_ttm: number | null
          fixed_asset_turnover_ttm: number | null
          forward_price_to_earnings_growth_ratio_ttm: number | null
          free_cash_flow_operating_cash_flow_ratio_ttm: number | null
          free_cash_flow_per_share_ttm: number | null
          gross_profit_margin_ttm: number | null
          interest_coverage_ratio_ttm: number | null
          interest_debt_per_share_ttm: number | null
          inventory_turnover_ttm: number | null
          long_term_debt_to_capital_ratio_ttm: number | null
          net_income_per_ebt_ttm: number | null
          net_income_per_share_ttm: number | null
          net_profit_margin_ttm: number | null
          operating_cash_flow_coverage_ratio_ttm: number | null
          operating_cash_flow_per_share_ttm: number | null
          operating_cash_flow_ratio_ttm: number | null
          operating_cash_flow_sales_ratio_ttm: number | null
          operating_profit_margin_ttm: number | null
          payables_turnover_ttm: number | null
          pretax_profit_margin_ttm: number | null
          price_to_book_ratio_ttm: number | null
          price_to_earnings_growth_ratio_ttm: number | null
          price_to_earnings_ratio_ttm: number | null
          price_to_fair_value_ttm: number | null
          price_to_free_cash_flow_ratio_ttm: number | null
          price_to_operating_cash_flow_ratio_ttm: number | null
          price_to_sales_ratio_ttm: number | null
          quick_ratio_ttm: number | null
          receivables_turnover_ttm: number | null
          revenue_per_share_ttm: number | null
          shareholders_equity_per_share_ttm: number | null
          short_term_operating_cash_flow_coverage_ratio_ttm: number | null
          solvency_ratio_ttm: number | null
          symbol: string
          tangible_book_value_per_share_ttm: number | null
          updated_at: string
          working_capital_turnover_ratio_ttm: number | null
        }
        Insert: {
          asset_turnover_ttm?: number | null
          book_value_per_share_ttm?: number | null
          bottom_line_profit_margin_ttm?: number | null
          capex_per_share_ttm?: number | null
          capital_expenditure_coverage_ratio_ttm?: number | null
          cash_per_share_ttm?: number | null
          cash_ratio_ttm?: number | null
          continuous_operations_profit_margin_ttm?: number | null
          current_ratio_ttm?: number | null
          debt_service_coverage_ratio_ttm?: number | null
          debt_to_assets_ratio_ttm?: number | null
          debt_to_capital_ratio_ttm?: number | null
          debt_to_equity_ratio_ttm?: number | null
          debt_to_market_cap_ttm?: number | null
          dividend_paid_and_capex_coverage_ratio_ttm?: number | null
          dividend_payout_ratio_ttm?: number | null
          dividend_per_share_ttm?: number | null
          dividend_yield_ttm?: number | null
          ebit_margin_ttm?: number | null
          ebitda_margin_ttm?: number | null
          ebt_per_ebit_ttm?: number | null
          effective_tax_rate_ttm?: number | null
          enterprise_value_multiple_ttm?: number | null
          enterprise_value_ttm?: number | null
          fetched_at?: string
          financial_leverage_ratio_ttm?: number | null
          fixed_asset_turnover_ttm?: number | null
          forward_price_to_earnings_growth_ratio_ttm?: number | null
          free_cash_flow_operating_cash_flow_ratio_ttm?: number | null
          free_cash_flow_per_share_ttm?: number | null
          gross_profit_margin_ttm?: number | null
          interest_coverage_ratio_ttm?: number | null
          interest_debt_per_share_ttm?: number | null
          inventory_turnover_ttm?: number | null
          long_term_debt_to_capital_ratio_ttm?: number | null
          net_income_per_ebt_ttm?: number | null
          net_income_per_share_ttm?: number | null
          net_profit_margin_ttm?: number | null
          operating_cash_flow_coverage_ratio_ttm?: number | null
          operating_cash_flow_per_share_ttm?: number | null
          operating_cash_flow_ratio_ttm?: number | null
          operating_cash_flow_sales_ratio_ttm?: number | null
          operating_profit_margin_ttm?: number | null
          payables_turnover_ttm?: number | null
          pretax_profit_margin_ttm?: number | null
          price_to_book_ratio_ttm?: number | null
          price_to_earnings_growth_ratio_ttm?: number | null
          price_to_earnings_ratio_ttm?: number | null
          price_to_fair_value_ttm?: number | null
          price_to_free_cash_flow_ratio_ttm?: number | null
          price_to_operating_cash_flow_ratio_ttm?: number | null
          price_to_sales_ratio_ttm?: number | null
          quick_ratio_ttm?: number | null
          receivables_turnover_ttm?: number | null
          revenue_per_share_ttm?: number | null
          shareholders_equity_per_share_ttm?: number | null
          short_term_operating_cash_flow_coverage_ratio_ttm?: number | null
          solvency_ratio_ttm?: number | null
          symbol: string
          tangible_book_value_per_share_ttm?: number | null
          updated_at?: string
          working_capital_turnover_ratio_ttm?: number | null
        }
        Update: {
          asset_turnover_ttm?: number | null
          book_value_per_share_ttm?: number | null
          bottom_line_profit_margin_ttm?: number | null
          capex_per_share_ttm?: number | null
          capital_expenditure_coverage_ratio_ttm?: number | null
          cash_per_share_ttm?: number | null
          cash_ratio_ttm?: number | null
          continuous_operations_profit_margin_ttm?: number | null
          current_ratio_ttm?: number | null
          debt_service_coverage_ratio_ttm?: number | null
          debt_to_assets_ratio_ttm?: number | null
          debt_to_capital_ratio_ttm?: number | null
          debt_to_equity_ratio_ttm?: number | null
          debt_to_market_cap_ttm?: number | null
          dividend_paid_and_capex_coverage_ratio_ttm?: number | null
          dividend_payout_ratio_ttm?: number | null
          dividend_per_share_ttm?: number | null
          dividend_yield_ttm?: number | null
          ebit_margin_ttm?: number | null
          ebitda_margin_ttm?: number | null
          ebt_per_ebit_ttm?: number | null
          effective_tax_rate_ttm?: number | null
          enterprise_value_multiple_ttm?: number | null
          enterprise_value_ttm?: number | null
          fetched_at?: string
          financial_leverage_ratio_ttm?: number | null
          fixed_asset_turnover_ttm?: number | null
          forward_price_to_earnings_growth_ratio_ttm?: number | null
          free_cash_flow_operating_cash_flow_ratio_ttm?: number | null
          free_cash_flow_per_share_ttm?: number | null
          gross_profit_margin_ttm?: number | null
          interest_coverage_ratio_ttm?: number | null
          interest_debt_per_share_ttm?: number | null
          inventory_turnover_ttm?: number | null
          long_term_debt_to_capital_ratio_ttm?: number | null
          net_income_per_ebt_ttm?: number | null
          net_income_per_share_ttm?: number | null
          net_profit_margin_ttm?: number | null
          operating_cash_flow_coverage_ratio_ttm?: number | null
          operating_cash_flow_per_share_ttm?: number | null
          operating_cash_flow_ratio_ttm?: number | null
          operating_cash_flow_sales_ratio_ttm?: number | null
          operating_profit_margin_ttm?: number | null
          payables_turnover_ttm?: number | null
          pretax_profit_margin_ttm?: number | null
          price_to_book_ratio_ttm?: number | null
          price_to_earnings_growth_ratio_ttm?: number | null
          price_to_earnings_ratio_ttm?: number | null
          price_to_fair_value_ttm?: number | null
          price_to_free_cash_flow_ratio_ttm?: number | null
          price_to_operating_cash_flow_ratio_ttm?: number | null
          price_to_sales_ratio_ttm?: number | null
          quick_ratio_ttm?: number | null
          receivables_turnover_ttm?: number | null
          revenue_per_share_ttm?: number | null
          shareholders_equity_per_share_ttm?: number | null
          short_term_operating_cash_flow_coverage_ratio_ttm?: number | null
          solvency_ratio_ttm?: number | null
          symbol?: string
          tangible_book_value_per_share_ttm?: number | null
          updated_at?: string
          working_capital_turnover_ratio_ttm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ratios_ttm_symbol"
            columns: ["symbol"]
            isOneToOne: true
            referencedRelation: "supported_symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
      revenue_product_segmentation: {
        Row: {
          data: Json | null
          date: string
          fetched_at: string
          fiscal_year: number
          period: string
          reported_currency: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          data?: Json | null
          date: string
          fetched_at?: string
          fiscal_year: number
          period: string
          reported_currency?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          data?: Json | null
          date?: string
          fetched_at?: string
          fiscal_year?: number
          period?: string
          reported_currency?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_revenue_product_segmentation_symbol"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "supported_symbols"
            referencedColumns: ["symbol"]
          },
        ]
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
      upsert_profile: {
        Args: { profile_data: Json }
        Returns: undefined
      }
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
