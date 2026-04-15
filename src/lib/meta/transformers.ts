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
  raw: { id: string; name: string; status: string; objective?: string },
  accountId: string
): Omit<Campaign, 'created_at' | 'updated_at'> {
  return {
    id: raw.id,
    account_id: accountId,
    name: raw.name,
    status: raw.status,
    objective: raw.objective ?? null
  }
}

export function transformAdSet(
  raw: { id: string; name: string; status: string; daily_budget?: string },
  campaignId: string
): Omit<AdSet, 'created_at' | 'updated_at'> {
  return {
    id: raw.id,
    campaign_id: campaignId,
    name: raw.name,
    status: raw.status,
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
    ctr: string
    cpm: string
    cost_per_action_type?: { action_type: string; value: string }[]
    purchase_roas?: { action_type: string; value: string }[]
  },
  entityId: string,
  entityType: 'campaign' | 'ad_set' | 'ad'
): Omit<Metric, 'id'> {
  const cpa = raw.cost_per_action_type?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value ?? '0'
  const roas = raw.purchase_roas?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value ?? '0'

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
    roas: parseFloat(roas) || 0
  }
}
