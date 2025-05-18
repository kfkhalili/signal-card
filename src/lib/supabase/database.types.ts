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
      card_snapshots: {
        Row: {
          card_data_snapshot: Json
          card_type: string
          company_name: string | null
          first_seen_at: string
          id: string
          logo_url: string | null
          rarity_level: string | null
          rarity_reason: string | null
          state_hash: string
          symbol: string
        }
        Insert: {
          card_data_snapshot: Json
          card_type: string
          company_name?: string | null
          first_seen_at?: string
          id?: string
          logo_url?: string | null
          rarity_level?: string | null
          rarity_reason?: string | null
          state_hash: string
          symbol: string
        }
        Update: {
          card_data_snapshot?: Json
          card_type?: string
          company_name?: string | null
          first_seen_at?: string
          id?: string
          logo_url?: string | null
          rarity_level?: string | null
          rarity_reason?: string | null
          state_hash?: string
          symbol?: string
        }
        Relationships: []
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
      snapshot_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          parent_comment_id: string | null
          snapshot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          snapshot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          snapshot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "snapshot_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "snapshot_comments_with_author_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_comments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "card_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshot_likes: {
        Row: {
          id: string
          liked_at: string
          snapshot_id: string
          user_id: string
        }
        Insert: {
          id?: string
          liked_at?: string
          snapshot_id: string
          user_id: string
        }
        Update: {
          id?: string
          liked_at?: string
          snapshot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_likes_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "card_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collections: {
        Row: {
          captured_at: string
          id: string
          snapshot_id: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          captured_at?: string
          id?: string
          snapshot_id: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          captured_at?: string
          id?: string
          snapshot_id?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_collections_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "card_snapshots"
            referencedColumns: ["id"]
          },
        ]
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
      profile_descriptions: {
        Row: {
          description: string | null
          symbol: string | null
        }
        Insert: {
          description?: string | null
          symbol?: string | null
        }
        Update: {
          description?: string | null
          symbol?: string | null
        }
        Relationships: []
      }
      snapshot_comments_with_author_details: {
        Row: {
          author_avatar_url: string | null
          author_profile_id: string | null
          author_username: string | null
          comment_text: string | null
          created_at: string | null
          id: string | null
          parent_comment_id: string | null
          snapshot_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "snapshot_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "snapshot_comments_with_author_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_comments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "card_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_distinct_snapshot_selections: {
        Args: Record<PropertyKey, never>
        Returns: {
          symbol: string
          card_types: string[]
        }[]
      }
      get_snapshot_social_counts: {
        Args: { p_snapshot_id: string }
        Returns: {
          like_count: number
          comment_count: number
          collection_count: number
        }[]
      }
      get_snapshots_with_counts: {
        Args: { target_symbol: string; target_card_type: string }
        Returns: {
          id: string
          card_type: string
          symbol: string
          company_name: string
          logo_url: string
          card_data_snapshot: Json
          rarity_level: string
          rarity_reason: string
          first_seen_at: string
          like_count: number
          comment_count: number
          collection_count: number
        }[]
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
