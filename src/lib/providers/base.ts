// Interface base para providers de ads
// Adicionar Google Ads: criar src/lib/providers/google.ts implementando esta interface

export type EntityType = 'campaign' | 'ad_set' | 'ad';

export interface DateRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
}

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  status: string;
  objective?: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  dailyBudget?: number;
}

export interface Ad {
  id: string;
  adSetId: string;
  name: string;
  status: string;
  creativeUrl?: string;
}

export interface Metrics {
  entityId: string;
  entityType: EntityType;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpa: number;
  roas: number;
}

export interface AdProvider {
  name: string;
  getAccounts(): Promise<AdAccount[]>;
  getCampaigns(accountId: string): Promise<Campaign[]>;
  getAdSets(campaignId: string): Promise<AdSet[]>;
  getAds(adSetId: string): Promise<Ad[]>;
  getMetrics(entityId: string, entityType: EntityType, dateRange: DateRange): Promise<Metrics[]>;
}
