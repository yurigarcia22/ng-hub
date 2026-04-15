import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CampaignWithMetrics } from '@/types/dashboard'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('account') ?? undefined
  const since = searchParams.get('since') ?? daysAgo(30)
  const until = searchParams.get('until') ?? today()

  const supabase = await createClient()

  let query = supabase
    .from('campaigns')
    .select('id, name, status, objective, account_id, ad_accounts(name)')
    .not('status', 'in', '("DELETED","ARCHIVED")')
    .order('account_id')
    .order('name')

  if (accountId) query = query.eq('account_id', accountId)

  const { data: campaigns } = await query
  if (!campaigns || campaigns.length === 0) return NextResponse.json([])

  const { data: metrics } = await supabase
    .from('metrics')
    .select('entity_id, spend, impressions, clicks, reach, ctr, cpm, cpa, roas')
    .eq('entity_type', 'campaign')
    .in('entity_id', campaigns.map(c => c.id))
    .gte('date', since)
    .lte('date', until)

  const metricsMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpm: number; cpa: number; roas: number; count: number }>()
  for (const m of metrics ?? []) {
    const cur = metricsMap.get(m.entity_id) ?? { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpm: 0, cpa: 0, roas: 0, count: 0 }
    metricsMap.set(m.entity_id, {
      spend: cur.spend + (m.spend ?? 0),
      impressions: cur.impressions + (m.impressions ?? 0),
      clicks: cur.clicks + (m.clicks ?? 0),
      reach: cur.reach + (m.reach ?? 0),
      ctr: cur.ctr + (m.ctr ?? 0),
      cpm: cur.cpm + (m.cpm ?? 0),
      cpa: cur.cpa + (m.cpa ?? 0),
      roas: cur.roas + (m.roas ?? 0),
      count: cur.count + 1
    })
  }

  const result: CampaignWithMetrics[] = campaigns.map(c => {
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
      roas: m ? m.roas / count : 0
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
