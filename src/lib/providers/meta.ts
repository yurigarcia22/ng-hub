import 'server-only'
import type { AdProvider, AdAccount, Campaign, AdSet, Ad, Metrics, EntityType, DateRange } from './base'
import * as meta from '@/lib/meta/client'
import * as t from '@/lib/meta/transformers'

export class MetaProvider implements AdProvider {
  name = 'meta'

  async getAccounts(): Promise<AdAccount[]> {
    const raw = await meta.getAdAccounts()
    return raw.map(a => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      timezone: a.timezone_name,
      status: a.account_status === 1 ? 'ACTIVE' : 'DISABLED'
    }))
  }

  async getCampaigns(accountId: string): Promise<Campaign[]> {
    const raw = await meta.getCampaigns(accountId)
    return raw.map(c => ({
      id: c.id,
      accountId,
      name: c.name,
      status: c.status,
      objective: c.objective
    }))
  }

  async getAdSets(campaignId: string): Promise<AdSet[]> {
    const raw = await meta.getAdSets(campaignId)
    return raw.map(s => ({
      id: s.id,
      campaignId,
      name: s.name,
      status: s.status,
      dailyBudget: s.daily_budget ? parseInt(s.daily_budget) : undefined
    }))
  }

  async getAds(adSetId: string): Promise<Ad[]> {
    const raw = await meta.getAds(adSetId)
    return raw.map(a => ({
      id: a.id,
      adSetId,
      name: a.name,
      status: a.status,
      creativeUrl: a.creative?.thumbnail_url
    }))
  }

  async getMetrics(
    entityId: string,
    entityType: EntityType,
    dateRange: DateRange
  ): Promise<Metrics[]> {
    const raw = await meta.getInsights(entityId, dateRange.since, dateRange.until)
    return raw.map(r => {
      const cpa = r.cost_per_action_type?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value ?? '0'
      const roas = r.purchase_roas?.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value ?? '0'
      return {
        entityId,
        entityType,
        date: r.date_start,
        spend: parseFloat(r.spend) || 0,
        impressions: parseInt(r.impressions) || 0,
        clicks: parseInt(r.clicks) || 0,
        reach: parseInt(r.reach) || 0,
        ctr: parseFloat(r.ctr) || 0,
        cpm: parseFloat(r.cpm) || 0,
        cpa: parseFloat(cpa) || 0,
        roas: parseFloat(roas) || 0
      }
    })
  }
}
