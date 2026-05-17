import type { AdAccount, Campaign, AdSet, Ad, Metric } from '@/types/database'

// Converte status numérico Meta → string interna
function accountStatus(metaStatus: number): string {
  return metaStatus === 1 ? 'ACTIVE' : 'DISABLED'
}

export function transformAccount(raw: {
  id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
  business?: { id: string; name: string }
}): Omit<AdAccount, 'created_at'> {
  return {
    id: raw.id,
    name: raw.name,
    currency: raw.currency,
    timezone: raw.timezone_name,
    status: accountStatus(raw.account_status),
    business_id: raw.business?.id ?? null,
    business_name: raw.business?.name ?? null,
    synced_at: new Date().toISOString()
  }
}

export function transformCampaign(
  raw: { id: string; name: string; status: string; effective_status?: string; objective?: string },
  accountId: string
): Omit<Campaign, 'created_at' | 'updated_at'> {
  return {
    id: raw.id,
    account_id: accountId,
    name: raw.name,
    status: raw.status,
    effective_status: raw.effective_status ?? raw.status,
    objective: raw.objective ?? null
  }
}

export function transformAdSet(
  raw: { id: string; name: string; status: string; effective_status?: string; daily_budget?: string },
  campaignId: string
): Omit<AdSet, 'created_at' | 'updated_at'> {
  return {
    id: raw.id,
    campaign_id: campaignId,
    name: raw.name,
    status: raw.status,
    effective_status: raw.effective_status ?? raw.status,
    daily_budget: raw.daily_budget ? parseInt(raw.daily_budget) : null
  }
}

export function transformAd(
  raw: { id: string; name: string; status: string; creative?: { thumbnail_url?: string } },
  adSetId: string
): Omit<Ad, 'created_at' | 'updated_at'> {
  return {
    id: raw.id,
    ad_set_id: adSetId,
    name: raw.name,
    status: raw.status,
    creative_url: raw.creative?.thumbnail_url ?? null
  }
}

export function transformInsight(
  raw: {
    date_start: string
    spend: string
    impressions: string
    clicks: string
    reach: string
    frequency?: string
    ctr: string
    cpm: string
    cost_per_action_type?: { action_type: string; value: string }[]
    purchase_roas?: { action_type: string; value: string }[]
    actions?: { action_type: string; value: string }[]
  },
  entityId: string,
  entityType: 'campaign' | 'ad_set' | 'ad'
): Omit<Metric, 'id'> {
  const act = raw.actions ?? []
  const costAct = raw.cost_per_action_type ?? []

  const findAction = (types: string[]) => {
    for (const t of types) {
      const v = act.find(a => a.action_type === t)?.value
      if (v) return parseInt(v) || 0
    }
    return 0
  }

  const cpa = costAct.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value ?? '0'
  const roas = raw.purchase_roas?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value ?? '0'

  // WPP: conversas iniciadas (7d window) e mensagens respondidas
  const conversations = findAction([
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
    'onsite_conversion.messaging_conversation_started_365d',
  ])
  const messages_sent = findAction([
    'onsite_conversion.messaging_first_reply',
    'onsite_conversion.messaging_conversation_started_1d',
  ])

  // Leads: pixel lead ou lead form
  const leads = findAction([
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'onsite_conversion.lead_grouped',
    'onsite_web_lead',
  ])

  // Page views: visualizações de landing page
  const page_views = findAction([
    'landing_page_view',
    'link_click',
  ])

  return {
    entity_id: entityId,
    entity_type: entityType,
    date: raw.date_start,
    spend: parseFloat(raw.spend) || 0,
    impressions: parseInt(raw.impressions) || 0,
    clicks: parseInt(raw.clicks) || 0,
    reach: parseInt(raw.reach) || 0,
    ctr: parseFloat(raw.ctr) || 0,
    cpm: parseFloat(raw.cpm) || 0,
    cpa: parseFloat(cpa) || 0,
    roas: parseFloat(roas) || 0,
    conversations,
    messages_sent,
    leads,
    page_views,
    frequency: parseFloat(raw.frequency ?? '0') || 0,
  }
}
