// Tipos da Meta Ads API v21.0

export interface MetaAdAccount {
  id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number // 1=ACTIVE, 2=DISABLED, 3=UNSETTLED
}

export interface MetaCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  account_id: string
}

export interface MetaAdSet {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  campaign_id: string
  daily_budget?: string
}

export interface MetaAd {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  adset_id: string
  creative?: {
    thumbnail_url?: string
  }
}

export interface MetaInsight {
  date_start: string
  date_stop: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  ctr: string
  cpm: string
  cost_per_action_type?: { action_type: string; value: string }[]
  purchase_roas?: { action_type: string; value: string }[]
}

export interface MetaInsightsResponse {
  data: MetaInsight[]
  paging?: {
    cursors?: { before: string; after: string }
    next?: string
  }
}

export interface MetaError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
  }
}

export type MetaAccountStatus = 'ACTIVE' | 'DISABLED'
