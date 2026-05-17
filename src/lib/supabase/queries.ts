import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CampaignWithMetrics, AdSetWithMetrics, AdWithMetrics, DashboardFilters } from '@/types/dashboard'
import type { SyncLog } from '@/types/database'

function defaultFilters(): DashboardFilters {
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - 30)
  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0]
  }
}

export async function getCampaignsWithMetrics(
  filters?: Partial<DashboardFilters>
): Promise<CampaignWithMetrics[]> {
  const supabase = await createClient()
  const f = { ...defaultFilters(), ...filters }

  let query = supabase
    .from('campaigns')
    .select('id, name, status, objective, account_id, ad_accounts(name)')
    .order('account_id')
    .order('name')

  if (f.accountId) {
    query = query.eq('account_id', f.accountId)
  }

  const { data: campaigns, error } = await query
  if (error || !campaigns) return []

  // Buscar métricas agregadas por campanha
  const { data: metrics } = await supabase
    .from('metrics')
    .select('entity_id, spend, impressions, clicks, reach, ctr, cpm, cpa, roas, conversations, messages_sent, leads, page_views, frequency')
    .eq('entity_type', 'campaign')
    .in('entity_id', campaigns.map(c => c.id))
    .gte('date', f.since)
    .lte('date', f.until)

  // Agregar métricas por campanha
  const metricsMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpm: number; cpa: number; roas: number; conversations: number; messages_sent: number; leads: number; page_views: number; frequency: number; count: number }>()

  for (const m of metrics ?? []) {
    const current = metricsMap.get(m.entity_id) ?? { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpm: 0, cpa: 0, roas: 0, conversations: 0, messages_sent: 0, leads: 0, page_views: 0, frequency: 0, count: 0 }
    metricsMap.set(m.entity_id, {
      spend: current.spend + (m.spend ?? 0),
      impressions: current.impressions + (m.impressions ?? 0),
      clicks: current.clicks + (m.clicks ?? 0),
      reach: current.reach + (m.reach ?? 0),
      ctr: current.ctr + (m.ctr ?? 0),
      cpm: current.cpm + (m.cpm ?? 0),
      cpa: current.cpa + (m.cpa ?? 0),
      roas: current.roas + (m.roas ?? 0),
      conversations: current.conversations + (m.conversations ?? 0),
      messages_sent: current.messages_sent + (m.messages_sent ?? 0),
      leads: current.leads + (m.leads ?? 0),
      page_views: current.page_views + (m.page_views ?? 0),
      frequency: current.frequency + (m.frequency ?? 0),
      count: current.count + 1
    })
  }

  return campaigns.map(c => {
    const m = metricsMap.get(c.id)
    const count = m?.count ?? 1
    const accountName = (c as unknown as { ad_accounts: { name: string } | null }).ad_accounts?.name ?? null
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      account_id: c.account_id,
      account_name: accountName,
      spend: m?.spend ?? 0,
      impressions: m?.impressions ?? 0,
      clicks: m?.clicks ?? 0,
      reach: m?.reach ?? 0,
      ctr: m ? m.ctr / count : 0,
      cpm: m ? m.cpm / count : 0,
      cpa: m ? m.cpa / count : 0,
      roas: m ? m.roas / count : 0,
      conversations: m?.conversations ?? 0,
      messages_sent: m?.messages_sent ?? 0,
      leads: m?.leads ?? 0,
      page_views: m?.page_views ?? 0,
      frequency: m ? m.frequency / count : 0,
      prev_spend: 0,
      prev_impressions: 0,
      prev_clicks: 0,
      prev_conversations: 0,
      prev_leads: 0,
    }
  })
}

export async function getAdSetsWithMetrics(
  campaignId: string,
  filters?: Partial<DashboardFilters>
): Promise<AdSetWithMetrics[]> {
  const supabase = await createClient()
  const f = { ...defaultFilters(), ...filters }

  const { data: adSets } = await supabase
    .from('ad_sets')
    .select('id, name, status, campaign_id, daily_budget')
    .eq('campaign_id', campaignId)
    .order('name')

  if (!adSets) return []

  const { data: metrics } = await supabase
    .from('metrics')
    .select('entity_id, spend, impressions, clicks, reach, ctr, cpm, frequency')
    .eq('entity_type', 'ad_set')
    .in('entity_id', adSets.map(s => s.id))
    .gte('date', f.since)
    .lte('date', f.until)

  const metricsMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpm: number; frequency: number; count: number }>()
  for (const m of metrics ?? []) {
    const cur = metricsMap.get(m.entity_id) ?? { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpm: 0, frequency: 0, count: 0 }
    metricsMap.set(m.entity_id, {
      spend: cur.spend + (m.spend ?? 0),
      impressions: cur.impressions + (m.impressions ?? 0),
      clicks: cur.clicks + (m.clicks ?? 0),
      reach: cur.reach + (m.reach ?? 0),
      ctr: cur.ctr + (m.ctr ?? 0),
      cpm: cur.cpm + (m.cpm ?? 0),
      frequency: cur.frequency + (m.frequency ?? 0),
      count: cur.count + 1
    })
  }

  return adSets.map(s => {
    const m = metricsMap.get(s.id)
    const count = m?.count ?? 1
    return {
      ...s,
      spend: m?.spend ?? 0,
      impressions: m?.impressions ?? 0,
      clicks: m?.clicks ?? 0,
      reach: m?.reach ?? 0,
      ctr: m ? m.ctr / count : 0,
      cpm: m ? m.cpm / count : 0,
      frequency: m ? m.frequency / count : 0,
    }
  })
}

export async function getAdsWithMetrics(
  adSetId: string,
  filters?: Partial<DashboardFilters>
): Promise<AdWithMetrics[]> {
  const supabase = await createClient()
  const f = { ...defaultFilters(), ...filters }

  const { data: ads } = await supabase
    .from('ads')
    .select('id, name, status, ad_set_id, creative_url')
    .eq('ad_set_id', adSetId)
    .order('name')

  if (!ads) return []

  const { data: metrics } = await supabase
    .from('metrics')
    .select('entity_id, spend, impressions, clicks, ctr, cpm')
    .eq('entity_type', 'ad')
    .in('entity_id', ads.map(a => a.id))
    .gte('date', f.since)
    .lte('date', f.until)

  const metricsMap = new Map<string, { spend: number; impressions: number; clicks: number; ctr: number; cpm: number; count: number }>()
  for (const m of metrics ?? []) {
    const cur = metricsMap.get(m.entity_id) ?? { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpm: 0, count: 0 }
    metricsMap.set(m.entity_id, {
      spend: cur.spend + (m.spend ?? 0),
      impressions: cur.impressions + (m.impressions ?? 0),
      clicks: cur.clicks + (m.clicks ?? 0),
      ctr: cur.ctr + (m.ctr ?? 0),
      cpm: cur.cpm + (m.cpm ?? 0),
      count: cur.count + 1
    })
  }

  return ads.map(a => {
    const m = metricsMap.get(a.id)
    const count = m?.count ?? 1
    return {
      ...a,
      spend: m?.spend ?? 0,
      impressions: m?.impressions ?? 0,
      clicks: m?.clicks ?? 0,
      ctr: m ? m.ctr / count : 0,
      cpm: m ? m.cpm / count : 0
    }
  })
}

export async function getChartData(
  entityId: string,
  entityType: 'campaign' | 'ad_set' | 'ad',
  filters?: Partial<DashboardFilters>
) {
  const supabase = await createClient()
  const f = { ...defaultFilters(), ...filters }

  const { data } = await supabase
    .from('metrics')
    .select('date, spend, impressions, clicks, ctr')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .gte('date', f.since)
    .lte('date', f.until)
    .order('date')

  return data ?? []
}

export async function getLastSync(): Promise<SyncLog | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sync_logs')
    .select('*')
    .in('status', ['success', 'partial'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function getRunningSyncId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sync_logs')
    .select('id')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()
  return data?.id ?? null
}

export async function getAccounts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ad_accounts')
    .select('id, name')
    .eq('status', 'ACTIVE')
    .order('name')
  return data ?? []
}

export async function getCampaignById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function getAdSetById(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ad_sets')
    .select('*')
    .eq('id', id)
    .single()
  return data
}
