import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CampaignWithMetrics } from '@/types/dashboard'

export const runtime = 'nodejs'

type MetricsAgg = {
  spend: number; impressions: number; clicks: number; reach: number
  ctr: number; cpm: number; cpa: number; roas: number
  conversations: number; messages_sent: number; leads: number; page_views: number
  frequency: number; count: number
}

function emptyAgg(): MetricsAgg {
  return { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpm: 0, cpa: 0, roas: 0, conversations: 0, messages_sent: 0, leads: 0, page_views: 0, frequency: 0, count: 0 }
}

function accumulate(cur: MetricsAgg, m: Partial<MetricsAgg>): MetricsAgg {
  return {
    spend: cur.spend + (m.spend ?? 0),
    impressions: cur.impressions + (m.impressions ?? 0),
    clicks: cur.clicks + (m.clicks ?? 0),
    reach: cur.reach + (m.reach ?? 0),
    ctr: cur.ctr + (m.ctr ?? 0),
    cpm: cur.cpm + (m.cpm ?? 0),
    cpa: cur.cpa + (m.cpa ?? 0),
    roas: cur.roas + (m.roas ?? 0),
    conversations: cur.conversations + (m.conversations ?? 0),
    messages_sent: cur.messages_sent + (m.messages_sent ?? 0),
    leads: cur.leads + (m.leads ?? 0),
    page_views: cur.page_views + (m.page_views ?? 0),
    frequency: cur.frequency + (m.frequency ?? 0),
    count: cur.count + 1,
  }
}

function buildMetricsMap(rows: Partial<MetricsAgg & { entity_id: string }>[]) {
  const map = new Map<string, MetricsAgg>()
  for (const m of rows) {
    if (!m.entity_id) continue
    map.set(m.entity_id, accumulate(map.get(m.entity_id) ?? emptyAgg(), m))
  }
  return map
}

// Calcula o período anterior de mesmo tamanho
function prevPeriod(since: string, until: string): { prevSince: string; prevUntil: string } {
  const s = new Date(since)
  const u = new Date(until)
  const days = Math.round((u.getTime() - s.getTime()) / 86400000)
  const prevUntil = new Date(s); prevUntil.setDate(s.getDate() - 1)
  const prevSince = new Date(prevUntil); prevSince.setDate(prevUntil.getDate() - days)
  return {
    prevSince: prevSince.toISOString().split('T')[0],
    prevUntil: prevUntil.toISOString().split('T')[0],
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('account') ?? undefined
  const since = searchParams.get('since') ?? daysAgo(30)
  const until = searchParams.get('until') ?? today()

  const supabase = await createClient()

  let query = supabase
    .from('campaigns')
    .select('id, name, status, effective_status, objective, account_id, ad_accounts(name)')
    .not('status', 'in', '("DELETED","ARCHIVED")')
    .order('account_id')
    .order('name')

  if (accountId) query = query.eq('account_id', accountId)

  const { data: campaigns } = await query
  if (!campaigns || campaigns.length === 0) return NextResponse.json([])

  const ids = campaigns.map(c => c.id)
  const { prevSince, prevUntil } = prevPeriod(since, until)
  const COLS = 'entity_id, spend, impressions, clicks, reach, ctr, cpm, cpa, roas, conversations, messages_sent, leads, page_views, frequency'

  // Buscar período atual e anterior em paralelo
  const [{ data: metrics }, { data: prevMetrics }] = await Promise.all([
    supabase.from('metrics').select(COLS).eq('entity_type', 'campaign').in('entity_id', ids).gte('date', since).lte('date', until),
    supabase.from('metrics').select('entity_id, spend, impressions, clicks, conversations, leads').eq('entity_type', 'campaign').in('entity_id', ids).gte('date', prevSince).lte('date', prevUntil),
  ])

  const current = buildMetricsMap((metrics ?? []) as Partial<MetricsAgg & { entity_id: string }>[])
  const prev = buildMetricsMap((prevMetrics ?? []) as Partial<MetricsAgg & { entity_id: string }>[])

  const result: CampaignWithMetrics[] = campaigns.map(c => {
    const m = current.get(c.id)
    const p = prev.get(c.id)
    const n = m?.count ?? 1
    const accountName = (c as unknown as { ad_accounts: { name: string } | null }).ad_accounts?.name ?? null
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      effective_status: (c as unknown as { effective_status: string | null }).effective_status ?? c.status,
      objective: c.objective,
      account_id: c.account_id,
      account_name: accountName,
      spend: m?.spend ?? 0,
      impressions: m?.impressions ?? 0,
      clicks: m?.clicks ?? 0,
      reach: m?.reach ?? 0,
      ctr: m ? m.ctr / n : 0,
      cpm: m ? m.cpm / n : 0,
      cpa: m ? m.cpa / n : 0,
      roas: m ? m.roas / n : 0,
      conversations: m?.conversations ?? 0,
      messages_sent: m?.messages_sent ?? 0,
      leads: m?.leads ?? 0,
      page_views: m?.page_views ?? 0,
      frequency: m ? m.frequency / n : 0,
      // Período anterior
      prev_spend: p?.spend ?? 0,
      prev_impressions: p?.impressions ?? 0,
      prev_clicks: p?.clicks ?? 0,
      prev_conversations: p?.conversations ?? 0,
      prev_leads: p?.leads ?? 0,
    }
  })

  return NextResponse.json(result)
}

function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
