export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    PostgrestVersion: "12"
    Tables: {
      ad_accounts: {
        Row: {
          id: string
          name: string
          currency: string
          timezone: string
          status: string
          business_id: string | null
          business_name: string | null
          synced_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          currency?: string
          timezone?: string
          status?: string
          business_id?: string | null
          business_name?: string | null
          synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          currency?: string
          timezone?: string
          status?: string
          business_id?: string | null
          business_name?: string | null
          synced_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      account_settings: {
        Row: {
          user_id: string
          account_id: string
          visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          account_id: string
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          account_id?: string
          visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          account_id: string
          name: string
          status: string
          objective: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          account_id: string
          name: string
          status?: string
          objective?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          status?: string
          objective?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          }
        ]
      }
      ad_sets: {
        Row: {
          id: string
          campaign_id: string
          name: string
          status: string
          daily_budget: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          campaign_id: string
          name: string
          status?: string
          daily_budget?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          status?: string
          daily_budget?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      ads: {
        Row: {
          id: string
          ad_set_id: string
          name: string
          status: string
          creative_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          ad_set_id: string
          name: string
          status?: string
          creative_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ad_set_id?: string
          name?: string
          status?: string
          creative_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          }
        ]
      }
      metrics: {
        Row: {
          id: string
          entity_id: string
          entity_type: string
          date: string
          spend: number
          impressions: number
          clicks: number
          reach: number
          ctr: number
          cpm: number
          cpa: number
          roas: number
          conversations: number
          messages_sent: number
          leads: number
          page_views: number
          frequency: number
        }
        Insert: {
          id?: string
          entity_id: string
          entity_type: string
          date: string
          spend?: number
          impressions?: number
          clicks?: number
          reach?: number
          ctr?: number
          cpm?: number
          cpa?: number
          roas?: number
          conversations?: number
          messages_sent?: number
          leads?: number
          page_views?: number
          frequency?: number
        }
        Update: {
          id?: string
          entity_id?: string
          entity_type?: string
          date?: string
          spend?: number
          impressions?: number
          clicks?: number
          reach?: number
          ctr?: number
          cpm?: number
          cpa?: number
          roas?: number
          conversations?: number
          messages_sent?: number
          leads?: number
          page_views?: number
          frequency?: number
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          id: string
          started_at: string
          finished_at: string | null
          status: string
          accounts_synced: number
          records_upserted: number
          error_message: string | null
          triggered_by: string
        }
        Insert: {
          id?: string
          started_at?: string
          finished_at?: string | null
          status?: string
          accounts_synced?: number
          records_upserted?: number
          error_message?: string | null
          triggered_by?: string
        }
        Update: {
          id?: string
          started_at?: string
          finished_at?: string | null
          status?: string
          accounts_synced?: number
          records_upserted?: number
          error_message?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Tipos de conveniência
export type AdAccount = Database['public']['Tables']['ad_accounts']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type AdSet = Database['public']['Tables']['ad_sets']['Row']
export type Ad = Database['public']['Tables']['ads']['Row']
export type Metric = Database['public']['Tables']['metrics']['Row']
export type SyncLog = Database['public']['Tables']['sync_logs']['Row']
