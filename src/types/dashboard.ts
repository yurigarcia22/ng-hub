// Tipos da camada de apresentação

export interface CampaignWithMetrics {
  id: string
  name: string
  status: string
  objective: string | null
  account_id: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpm: number
  cpa: number
  roas: number
}

export interface AdSetWithMetrics {
  id: string
  name: string
  status: string
  campaign_id: string
  daily_budget: number | null
  spend: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpm: number
}

export interface AdWithMetrics {
  id: string
  name: string
  status: string
  ad_set_id: string
  creative_url: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
}

export interface DashboardFilters {
  accountId?: string
  since: string
  until: string
}

export type Period = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export interface ChartDataPoint {
  date: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
}
