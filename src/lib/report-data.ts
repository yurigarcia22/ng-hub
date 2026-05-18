import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface Metrics {
  spend: number; impressions: number; clicks: number; reach: number
  ctr: number; cpm: number; cpa: number; roas: number
  conversations: number; messages_sent: number; leads: number
  page_views: number; frequency: number
}

export interface DerivedMetrics {
  cpc: number; cpl: number; cpconv: number
  convRateClicks: number; leadConvRate: number
  convRateConversations: number; pageViewRate: number
}

export type Template = 'wpp' | 'leads' | 'sales' | 'default'

export interface ReportCampaign {
  id: string
  name: string
  status: string
  effective_status: string
  objective: string | null
  template: Template
  m: Metrics
  p: Metrics
  derived: DerivedMetrics
}

export interface ChartPoint {
  day: number
  curDate: string | null
  prevDate: string | null
  curSpend: number | null; prevSpend: number | null
  curImpressions: number | null; prevImpressions: number | null
  curClicks: number | null; prevClicks: number | null
  curConversations: number | null; prevConversations: number | null
  curLeads: number | null; prevLeads: number | null
  curCtr: number | null; prevCtr: number | null
}

export interface ReportData {
  account: {
    id: string
    name: string
    business_name: string | null
    currency: string
    status: string
  }
  period: { since: string; until: string }
  prevPeriod: { since: string; until: string }
  template: Template
  allCur: Metrics
  allPrev: Metrics
  allDerived: DerivedMetrics
  prevDerived: DerivedMetrics
  campaigns: ReportCampaign[]
  chartData: ChartPoint[]
  availableChartMetrics: Array<'spend' | 'impressions' | 'clicks' | 'conversations' | 'leads' | 'ctr'>
}

function calcPrevPeriod(since: string, until: string) {
  const s = new Date(since), u = new Date(until)
  const days = Math.round((u.getTime() - s.getTime()) / 86400000)
  const prevUntil = new Date(s); prevUntil.setDate(s.getDate() - 1)
  const prevSince = new Date(prevUntil); prevSince.setDate(prevUntil.getDate() - days)
  return { prevSince: prevSince.toISOString().split('T')[0], prevUntil: prevUntil.toISOString().split('T')[0] }
}

function emptyMetrics(): Metrics {
  return { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpm: 0, cpa: 0, roas: 0, conversations: 0, messages_sent: 0, leads: 0, page_views: 0, frequency: 0 }
}

type Row = Record<string, number | string | null | undefined>

function aggMetrics(rows: Row[]): Metrics {
  const agg = emptyMetrics()
  let n = 0
  for (const r of rows) {
    agg.spend += Number(r.spend) || 0; agg.impressions += Number(r.impressions) || 0
    agg.clicks += Number(r.clicks) || 0; agg.reach += Number(r.reach) || 0
    agg.ctr += Number(r.ctr) || 0; agg.cpm += Number(r.cpm) || 0
    agg.cpa += Number(r.cpa) || 0; agg.roas += Number(r.roas) || 0
    agg.conversations += Number(r.conversations) || 0; agg.messages_sent += Number(r.messages_sent) || 0
    agg.leads += Number(r.leads) || 0; agg.page_views += Number(r.page_views) || 0
    agg.frequency += Number(r.frequency) || 0; n++
  }
  if (n > 0) { agg.ctr /= n; agg.cpm /= n; agg.cpa /= n; agg.roas /= n; agg.frequency /= n }
  return agg
}

function deriveMetrics(m: Metrics): DerivedMetrics {
  return {
    cpc: m.clicks > 0 ? m.spend / m.clicks : 0,
    cpl: m.leads > 0 ? m.spend / m.leads : 0,
    cpconv: m.conversations > 0 ? m.spend / m.conversations : 0,
    convRateClicks: m.clicks > 0 ? (m.leads + m.conversations) / m.clicks * 100 : 0,
    leadConvRate: m.clicks > 0 ? m.leads / m.clicks * 100 : 0,
    convRateConversations: m.clicks > 0 ? m.conversations / m.clicks * 100 : 0,
    pageViewRate: m.clicks > 0 ? m.page_views / m.clicks * 100 : 0,
  }
}

function detectTemplate(objective: string | null, conversations: number, leads: number, roas: number): Template {
  const obj = (objective ?? '').toUpperCase()
  if (roas > 0.5) return 'sales'
  if (obj.includes('MESSAGES') || obj.includes('OUTCOME_ENGAGEMENT') || conversations > 0) return 'wpp'
  if (obj.includes('LEAD') || obj.includes('OUTCOME_LEADS') || obj.includes('CONVERSIONS') || leads > 0) return 'leads'
  return 'default'
}

export async function fetchReportData(accountId: string, since: string, until: string): Promise<ReportData | null> {
  const { prevSince, prevUntil } = calcPrevPeriod(since, until)
  const supabase = createAdminClient()

  const [{ data: account }, { data: campaigns }] = await Promise.all([
    supabase.from('ad_accounts').select('id, name, currency, status, business_name').eq('id', accountId).single(),
    supabase.from('campaigns').select('id, name, status, effective_status, objective').eq('account_id', accountId).not('status', 'in', '("DELETED","ARCHIVED")').order('name'),
  ])

  if (!account) return null

  if (!campaigns || campaigns.length === 0) {
    return {
      account: { ...account, business_name: account.business_name ?? null, currency: account.currency ?? 'BRL' },
      period: { since, until },
      prevPeriod: { since: prevSince, until: prevUntil },
      template: 'default',
      allCur: emptyMetrics(), allPrev: emptyMetrics(),
      allDerived: deriveMetrics(emptyMetrics()), prevDerived: deriveMetrics(emptyMetrics()),
      campaigns: [], chartData: [], availableChartMetrics: ['spend', 'impressions', 'clicks', 'ctr'],
    }
  }

  const ids = campaigns.map(c => c.id)
  const COLS = 'entity_id, date, spend, impressions, clicks, reach, ctr, cpm, cpa, roas, conversations, messages_sent, leads, page_views, frequency'

  const [{ data: curMetrics }, { data: prevMetrics }] = await Promise.all([
    supabase.from('metrics').select(COLS).eq('entity_type', 'campaign').in('entity_id', ids).gte('date', since).lte('date', until).order('date'),
    supabase.from('metrics').select(COLS).eq('entity_type', 'campaign').in('entity_id', ids).gte('date', prevSince).lte('date', prevUntil).order('date'),
  ])

  const curByCampaign = new Map<string, Row[]>()
  const prevByCampaign = new Map<string, Row[]>()
  const curByDate = new Map<string, Row[]>()
  const prevByDate = new Map<string, Row[]>()

  for (const r of (curMetrics ?? []) as Row[]) {
    const eid = r.entity_id as string | undefined
    const d = r.date as string | undefined
    if (eid) { if (!curByCampaign.has(eid)) curByCampaign.set(eid, []); curByCampaign.get(eid)!.push(r) }
    if (d) { if (!curByDate.has(d)) curByDate.set(d, []); curByDate.get(d)!.push(r) }
  }
  for (const r of (prevMetrics ?? []) as Row[]) {
    const eid = r.entity_id as string | undefined
    const d = r.date as string | undefined
    if (eid) { if (!prevByCampaign.has(eid)) prevByCampaign.set(eid, []); prevByCampaign.get(eid)!.push(r) }
    if (d) { if (!prevByDate.has(d)) prevByDate.set(d, []); prevByDate.get(d)!.push(r) }
  }

  // Build campaigns
  const campaignRows: ReportCampaign[] = campaigns.map(c => {
    const m = aggMetrics(curByCampaign.get(c.id) ?? [])
    const p = aggMetrics(prevByCampaign.get(c.id) ?? [])
    const eff = (c as unknown as { effective_status?: string }).effective_status ?? c.status
    return {
      id: c.id, name: c.name, status: c.status, effective_status: eff, objective: c.objective,
      m, p, derived: deriveMetrics(m),
      template: detectTemplate(c.objective, m.conversations, m.leads, m.roas),
    }
  })

  // Filter: só ACTIVE ou com gasto > 0
  const visible = campaignRows.filter(c => c.effective_status === 'ACTIVE' || c.m.spend > 0)
  visible.sort((a, b) => {
    const aA = a.effective_status === 'ACTIVE' ? 1 : 0
    const bA = b.effective_status === 'ACTIVE' ? 1 : 0
    if (bA !== aA) return bA - aA
    return b.m.spend - a.m.spend
  })

  // Totais
  const allCurRows: Row[] = []
  const allPrevRows: Row[] = []
  for (const c of visible) {
    allCurRows.push(...(curByCampaign.get(c.id) ?? []))
    allPrevRows.push(...(prevByCampaign.get(c.id) ?? []))
  }
  const allCur = aggMetrics(allCurRows)
  const allPrev = aggMetrics(allPrevRows)
  const allDerived = deriveMetrics(allCur)
  const prevDerived = deriveMetrics(allPrev)

  const template: Template =
    allCur.roas > 0.5 ? 'sales'
    : allCur.conversations > allCur.leads && allCur.conversations > 0 ? 'wpp'
    : allCur.leads > 0 ? 'leads'
    : 'default'

  // Chart data
  const sinceDate = new Date(since)
  const prevSinceDate = new Date(prevSince)
  const numDays = Math.round((new Date(until).getTime() - sinceDate.getTime()) / 86400000) + 1
  const visibleIds = new Set(visible.map(c => c.id))

  function dateOffset(base: Date, off: number): string {
    const d = new Date(base); d.setDate(base.getDate() + off)
    return d.toISOString().split('T')[0]
  }

  const chartData: ChartPoint[] = []
  for (let i = 0; i < numDays; i++) {
    const curDate = dateOffset(sinceDate, i)
    const prevDate = dateOffset(prevSinceDate, i)
    const curRows = (curByDate.get(curDate) ?? []).filter(r => visibleIds.has(r.entity_id as string))
    const prevRows = (prevByDate.get(prevDate) ?? []).filter(r => visibleIds.has(r.entity_id as string))
    const cur = aggMetrics(curRows)
    const prv = aggMetrics(prevRows)
    chartData.push({
      day: i + 1, curDate, prevDate,
      curSpend: curRows.length > 0 ? cur.spend : null,
      prevSpend: prevRows.length > 0 ? prv.spend : null,
      curImpressions: curRows.length > 0 ? cur.impressions : null,
      prevImpressions: prevRows.length > 0 ? prv.impressions : null,
      curClicks: curRows.length > 0 ? cur.clicks : null,
      prevClicks: prevRows.length > 0 ? prv.clicks : null,
      curConversations: curRows.length > 0 ? cur.conversations : null,
      prevConversations: prevRows.length > 0 ? prv.conversations : null,
      curLeads: curRows.length > 0 ? cur.leads : null,
      prevLeads: prevRows.length > 0 ? prv.leads : null,
      curCtr: curRows.length > 0 ? cur.ctr : null,
      prevCtr: prevRows.length > 0 ? prv.ctr : null,
    })
  }

  const availableChartMetrics: ReportData['availableChartMetrics'] = ['spend', 'impressions', 'clicks', 'ctr']
  if (allCur.conversations > 0 || allPrev.conversations > 0) availableChartMetrics.splice(2, 0, 'conversations')
  if (allCur.leads > 0 || allPrev.leads > 0) availableChartMetrics.splice(2, 0, 'leads')

  return {
    account: {
      id: account.id,
      name: account.name,
      business_name: account.business_name ?? null,
      currency: account.currency ?? 'BRL',
      status: account.status,
    },
    period: { since, until },
    prevPeriod: { since: prevSince, until: prevUntil },
    template,
    allCur, allPrev, allDerived, prevDerived,
    campaigns: visible,
    chartData,
    availableChartMetrics,
  }
}
