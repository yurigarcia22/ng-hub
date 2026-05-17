// Tipos da camada de apresentação

export interface CampaignWithMetrics {
  id: string
  name: string
  status: string
  objective: string | null
  account_id: string
  account_name: string | null
  // Métricas do período atual
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
  // Métricas do período anterior (para comparativo)
  prev_spend: number
  prev_impressions: number
  prev_clicks: number
  prev_conversations: number
  prev_leads: number
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
  frequency: number
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

// Helpers de saúde de métrica
export type HealthLevel = 'good' | 'warning' | 'bad' | 'neutral'

export function cpmHealth(cpm: number): HealthLevel {
  if (cpm === 0) return 'neutral'
  if (cpm < 10) return 'good'
  if (cpm < 25) return 'warning'
  return 'bad'
}

export function ctrHealth(ctr: number): HealthLevel {
  if (ctr === 0) return 'neutral'
  if (ctr >= 3) return 'good'
  if (ctr >= 1) return 'warning'
  return 'bad'
}

export function frequencyHealth(freq: number): HealthLevel {
  if (freq === 0) return 'neutral'
  if (freq < 2) return 'good'
  if (freq < 4) return 'warning'
  return 'bad'
}

export function costPerConvHealth(cost: number): HealthLevel {
  if (cost === 0) return 'neutral'
  if (cost < 5) return 'good'
  if (cost < 12) return 'warning'
  return 'bad'
}

export function cplHealth(cpl: number): HealthLevel {
  if (cpl === 0) return 'neutral'
  if (cpl < 20) return 'good'
  if (cpl < 60) return 'warning'
  return 'bad'
}

export function trendPct(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}
