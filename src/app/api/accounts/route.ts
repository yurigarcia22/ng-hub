import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const since = searchParams.get('since') ?? daysAgo(30)
  const until = searchParams.get('until') ?? new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  // Buscar todas as contas ativas
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, name, currency, status, business_id, business_name')
    .order('name')

  if (!accounts || accounts.length === 0) return NextResponse.json([])

  // Buscar todas as campanhas
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, account_id, status')
    .in('account_id', accounts.map(a => a.id))
    .not('status', 'in', '("DELETED","ARCHIVED")')

  if (!campaigns) return NextResponse.json(accounts.map(a => ({ ...a, spend: 0, activeCampaigns: 0, totalCampaigns: 0 })))

  // Buscar métricas agregadas por conta
  const { data: metrics } = await supabase
    .from('metrics')
    .select('entity_id, spend, impressions, clicks')
    .eq('entity_type', 'campaign')
    .in('entity_id', campaigns.map(c => c.id))
    .gte('date', since)
    .lte('date', until)

  // Agregar spend por campanha
  const spendByCampaign = new Map<string, number>()
  for (const m of metrics ?? []) {
    spendByCampaign.set(m.entity_id, (spendByCampaign.get(m.entity_id) ?? 0) + (m.spend ?? 0))
  }

  // Agregar por conta
  const accountTotals = new Map<string, { spend: number; activeCampaigns: number; totalCampaigns: number }>()
  for (const c of campaigns) {
    const cur = accountTotals.get(c.account_id) ?? { spend: 0, activeCampaigns: 0, totalCampaigns: 0 }
    cur.spend += spendByCampaign.get(c.id) ?? 0
    cur.totalCampaigns += 1
    if (c.status === 'ACTIVE') cur.activeCampaigns += 1
    accountTotals.set(c.account_id, cur)
  }

  const result = accounts.map(a => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    status: a.status,
    business_id: a.business_id,
    business_name: a.business_name,
    spend: accountTotals.get(a.id)?.spend ?? 0,
    activeCampaigns: accountTotals.get(a.id)?.activeCampaigns ?? 0,
    totalCampaigns: accountTotals.get(a.id)?.totalCampaigns ?? 0,
  }))

  // Ordenar por gasto decrescente
  result.sort((a, b) => b.spend - a.spend)

  return NextResponse.json(result)
}
