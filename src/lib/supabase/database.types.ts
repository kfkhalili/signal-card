export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_call_queue_v2: {
        Row: {
          actual_data_size_bytes: number | null
          created_at: string
          data_type: string
          error_message: string | null
          estimated_data_size_bytes: number | null
          id: string
          job_metadata: Json | null
          max_retries: number | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          status: string
          symbol: string
        }
        Insert: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status: string
          symbol: string
        }
        Update: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type?: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      api_call_queue_v2_completed: {
        Row: {
          actual_data_size_bytes: number | null
          created_at: string
          data_type: string
          error_message: string | null
          estimated_data_size_bytes: number | null
          id: string
          job_metadata: Json | null
          max_retries: number | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          status: string
          symbol: string
        }
        Insert: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status: string
          symbol: string
        }
        Update: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type?: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      api_call_queue_v2_failed: {
        Row: {
          actual_data_size_bytes: number | null
          created_at: string
          data_type: string
          error_message: string | null
          estimated_data_size_bytes: number | null
          id: string
          job_metadata: Json | null
          max_retries: number | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          status: string
          symbol: string
        }
        Insert: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status: string
          symbol: string
        }
        Update: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type?: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      api_call_queue_v2_pending: {
        Row: {
          actual_data_size_bytes: number | null
          created_at: string
          data_type: string
          error_message: string | null
          estimated_data_size_bytes: number | null
          id: string
          job_metadata: Json | null
          max_retries: number | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          status: string
          symbol: string
        }
        Insert: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status: string
          symbol: string
        }
        Update: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type?: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      api_call_queue_v2_processing: {
        Row: {
          actual_data_size_bytes: number | null
          created_at: string
          data_type: string
          error_message: string | null
          estimated_data_size_bytes: number | null
          id: string
          job_metadata: Json | null
          max_retries: number | null
          priority: number | null
          processed_at: string | null
          retry_count: number | null
          status: string
          symbol: string
        }
        Insert: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status: string
          symbol: string
        }
        Update: {
          actual_data_size_bytes?: number | null
          created_at?: string
          data_type?: string
          error_message?: string | null
          estimated_data_size_bytes?: number | null
          id?: string
          job_metadata?: Json | null
          max_retries?: number | null
          priority?: number | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      api_calls_rate_tracker: {
        Row: {
          api_calls_made: number
          minute_bucket: string
          updated_at: string
        }
        Insert: {
          api_calls_made?: number
          minute_bucket: string
          updated_at?: string
        }
        Update: {
          api_calls_made?: number
          minute_bucket?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_data_usage_v2: {
        Row: {
          data_size_bytes: number
          id: number
          job_id: string | null
          recorded_at: string
        }
        Insert: {
          data_size_bytes: number
          id?: number
          job_id?: string | null
          recorded_at?: string
        }
        Update: {
          data_size_bytes?: number
          id?: number
          job_id?: string | null
          recorded_at?: string
        }
        Relationships: []
      }
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
      data_type_registry_v2: {
        Row: {
          api_calls_per_job: number
          created_at: string
          data_type: string
          default_ttl_minutes: number
          edge_function_name: string
          estimated_data_size_bytes: number | null
          priority: number | null
          refresh_schedule: string | null
          refresh_strategy: string
          source_timestamp_column: string | null
          staleness_function: string
          symbol_column: string | null
          table_name: string
          timestamp_column: string
          updated_at: string
        }
        Insert: {
          api_calls_per_job?: number
          created_at?: string
          data_type: string
          default_ttl_minutes: number
          edge_function_name: string
          estimated_data_size_bytes?: number | null
          priority?: number | null
          refresh_schedule?: string | null
          refresh_strategy: string
          source_timestamp_column?: string | null
          staleness_function: string
          symbol_column?: string | null
          table_name: string
          timestamp_column: string
          updated_at?: string
        }
        Update: {
          api_calls_per_job?: number
          created_at?: string
          data_type?: string
          default_ttl_minutes?: number
          edge_function_name?: string
          estimated_data_size_bytes?: number | null
          priority?: number | null
          refresh_schedule?: string | null
          refresh_strategy?: string
          source_timestamp_column?: string | null
          staleness_function?: string
          symbol_column?: string | null
          table_name?: string
          timestamp_column?: string
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
            referencedRelation: "profiles"
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
      exchange_rates: {
        Row: {
          base_code: string
          fetched_at: string
          last_updated_at: string | null
          rate: number | null
          target_code: string
        }
        Insert: {
          base_code: string
          fetched_at?: string
          last_updated_at?: string | null
          rate?: number | null
          target_code: string
        }
        Update: {
          base_code?: string
          fetched_at?: string
          last_updated_at?: string | null
          rate?: number | null
          target_code?: string
        }
        Relationships: []
      }
      exchange_variants: {
        Row: {
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
          symbol: string
          symbol_variant: string
          updated_at: string
          vol_avg: number | null
        }
        Insert: {
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
          symbol: string
          symbol_variant: string
          updated_at?: string
          vol_avg?: number | null
        }
        Update: {
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
          symbol?: string
          symbol_variant?: string
          updated_at?: string
          vol_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_exchange_variants_symbol"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["symbol"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag_name: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_name: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_name?: string
          metadata?: Json | null
          updated_at?: string
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
            referencedColumns: ["symbol"]
          },
        ]
      }
      insider_trading_statistics: {
        Row: {
          acquired_disposed_ratio: number | null
          acquired_transactions: number | null
          average_acquired: number | null
          average_disposed: number | null
          cik: string | null
          disposed_transactions: number | null
          fetched_at: string
          quarter: number
          symbol: string
          total_acquired: number | null
          total_disposed: number | null
          total_purchases: number | null
          total_sales: number | null
          year: number
        }
        Insert: {
          acquired_disposed_ratio?: number | null
          acquired_transactions?: number | null
          average_acquired?: number | null
          average_disposed?: number | null
          cik?: string | null
          disposed_transactions?: number | null
          fetched_at?: string
          quarter: number
          symbol: string
          total_acquired?: number | null
          total_disposed?: number | null
          total_purchases?: number | null
          total_sales?: number | null
          year: number
        }
        Update: {
          acquired_disposed_ratio?: number | null
          acquired_transactions?: number | null
          average_acquired?: number | null
          average_disposed?: number | null
          cik?: string | null
          disposed_transactions?: number | null
          fetched_at?: string
          quarter?: number
          symbol?: string
          total_acquired?: number | null
          total_disposed?: number | null
          total_purchases?: number | null
          total_sales?: number | null
          year?: number
        }
        Relationships: []
      }
      insider_transactions: {
        Row: {
          acquisition_or_disposition: string | null
          company_cik: string | null
          direct_or_indirect: string | null
          fetched_at: string
          filing_date: string
          form_type: string | null
          price: number | null
          reporting_cik: string
          reporting_name: string | null
          securities_owned: number | null
          securities_transacted: number
          security_name: string | null
          symbol: string
          transaction_date: string | null
          transaction_type: string | null
          type_of_owner: string | null
          url: string | null
        }
        Insert: {
          acquisition_or_disposition?: string | null
          company_cik?: string | null
          direct_or_indirect?: string | null
          fetched_at?: string
          filing_date: string
          form_type?: string | null
          price?: number | null
          reporting_cik: string
          reporting_name?: string | null
          securities_owned?: number | null
          securities_transacted: number
          security_name?: string | null
          symbol: string
          transaction_date?: string | null
          transaction_type?: string | null
          type_of_owner?: string | null
          url?: string | null
        }
        Update: {
          acquisition_or_disposition?: string | null
          company_cik?: string | null
          direct_or_indirect?: string | null
          fetched_at?: string
          filing_date?: string
          form_type?: string | null
          price?: number | null
          reporting_cik?: string
          reporting_name?: string | null
          securities_owned?: number | null
          securities_transacted?: number
          security_name?: string | null
          symbol?: string
          transaction_date?: string | null
          transaction_type?: string | null
          type_of_owner?: string | null
          url?: string | null
        }
        Relationships: []
      }
      listed_symbols: {
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
      migration_baseline: {
        Row: {
          id: number
          metric_name: string
          metric_value: Json
          notes: string | null
          recorded_at: string
        }
        Insert: {
          id?: number
          metric_name: string
          metric_value: Json
          notes?: string | null
          recorded_at?: string
        }
        Update: {
          id?: number
          metric_name?: string
          metric_value?: Json
          notes?: string | null
          recorded_at?: string
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
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
          is_profile_complete: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          is_profile_complete?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          is_profile_complete?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      valuations: {
        Row: {
          date: string
          fetched_at: string
          stock_price_at_calculation: number | null
          symbol: string
          updated_at: string
          valuation_type: string
          value: number
        }
        Insert: {
          date: string
          fetched_at?: string
          stock_price_at_calculation?: number | null
          symbol: string
          updated_at?: string
          valuation_type?: string
          value: number
        }
        Update: {
          date?: string
          fetched_at?: string
          stock_price_at_calculation?: number | null
          symbol?: string
          updated_at?: string
          valuation_type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_valuations_symbol"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["symbol"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      capture_system_baseline: {
        Args: never
        Returns: {
          metric_name: string
          metric_value: Json
        }[]
      }
      check_and_queue_stale_batch_v2: {
        Args: { p_data_types: string[]; p_priority: number; p_symbol: string }
        Returns: undefined
      }
      check_and_queue_stale_data_from_presence_v2: {
        Args: never
        Returns: undefined
      }
      check_cron_job_health: {
        Args: { p_critical_jobs: string[] }
        Returns: {
          jobname: string
          last_run: string
        }[]
      }
      check_queue_success_rate_alert: {
        Args: never
        Returns: {
          alert_status: string
          completed_count: number
          failed_count: number
          success_rate_percent: number
        }[]
      }
      check_quota_usage_alert: {
        Args: never
        Returns: {
          alert_status: string
          total_bytes: number
          usage_percent: number
        }[]
      }
      check_stuck_jobs_alert: {
        Args: never
        Returns: {
          affected_data_types: number
          alert_status: string
          stuck_count: number
        }[]
      }
      complete_queue_job_v2: {
        Args: {
          p_api_calls_made?: number
          p_data_size_bytes: number
          p_job_id: string
        }
        Returns: undefined
      }
      fail_queue_job_v2: {
        Args: { p_error_message: string; p_job_id: string }
        Returns: undefined
      }
      get_active_subscriptions_from_realtime: {
        Args: never
        Returns: {
          data_type: string
          last_seen_at: string
          subscribed_at: string
          symbol: string
          user_id: string
        }[]
      }
      get_queue_batch_v2: {
        Args: { p_batch_size?: number; p_max_priority?: number }
        Returns: {
          created_at: string
          data_type: string
          estimated_data_size_bytes: number
          id: string
          job_metadata: Json
          max_retries: number
          priority: number
          retry_count: number
          status: string
          symbol: string
        }[]
      }
      get_weighted_leaderboard: {
        Args: { weights: Json }
        Returns: {
          composite_score: number
          rank: number
          symbol: string
        }[]
      }
      handle_user_created_webhook: { Args: { user_data: Json }; Returns: Json }
      increment_api_calls: {
        Args: { p_api_calls_made: number }
        Returns: undefined
      }
      invoke_edge_function_v2: {
        Args: {
          p_function_name: string
          p_payload?: Json
          p_timeout_milliseconds?: number
        }
        Returns: number
      }
      invoke_processor_if_healthy_v2: { Args: never; Returns: undefined }
      invoke_processor_loop_v2: {
        Args: { p_iteration_delay_seconds?: number; p_max_iterations?: number }
        Returns: number
      }
      is_data_stale_v2: {
        Args: { p_fetched_at: string; p_ttl_minutes: number }
        Returns: boolean
      }
      is_exchange_open_for_symbol_v2: {
        Args: { p_data_type: string; p_symbol: string }
        Returns: boolean
      }
      is_feature_enabled: { Args: { p_flag_name: string }; Returns: boolean }
      is_insider_trading_statistics_stale_v2: {
        Args: { p_fetched_at: string; p_ttl_minutes: number }
        Returns: boolean
      }
      is_insider_transactions_stale_v2: {
        Args: { p_fetched_at: string; p_ttl_minutes: number }
        Returns: boolean
      }
      is_profile_stale_v2: {
        Args: { p_modified_at: string; p_ttl_minutes: number }
        Returns: boolean
      }
      is_quota_exceeded_v2: {
        Args: { p_safety_buffer?: number }
        Returns: boolean
      }
      is_quote_stale_v2: {
        Args: { p_fetched_at: string; p_ttl_minutes: number }
        Returns: boolean
      }
      is_valid_identifier: { Args: { p_identifier: string }; Returns: boolean }
      maintain_queue_partitions_v2: { Args: never; Returns: undefined }
      queue_refresh_if_not_exists_v2: {
        Args: {
          p_data_type: string
          p_estimated_size_bytes?: number
          p_priority: number
          p_symbol: string
        }
        Returns: string
      }
      queue_scheduled_refreshes_v2: { Args: never; Returns: number }
      record_baseline_metric: {
        Args: { p_metric_name: string; p_metric_value: Json; p_notes?: string }
        Returns: number
      }
      recover_stuck_jobs_v2: { Args: never; Returns: number }
      release_api_calls_reservation: {
        Args: { p_api_calls_to_release: number }
        Returns: undefined
      }
      reserve_api_calls: {
        Args: {
          p_api_calls_to_reserve: number
          p_max_api_calls_per_minute?: number
        }
        Returns: boolean
      }
      should_stop_processing_api_calls: {
        Args: {
          p_api_calls_to_reserve: number
          p_max_api_calls_per_minute?: number
          p_safety_buffer?: number
        }
        Returns: boolean
      }
      upsert_profile: { Args: { profile_data: Json }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
