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

  // Buscar todas as contas
  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, name, currency, status, business_id, business_name, balance, has_issues')
    .order('name')

  if (!accounts || accounts.length === 0) return NextResponse.json([])

  // Buscar TODAS as campanhas (incluindo arquivadas) — para somar gasto histórico correto
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, account_id, status, effective_status')
    .in('account_id', accounts.map(a => a.id))

  if (!campaigns) {
    return NextResponse.json(accounts.map(a => ({
      ...a,
      spend: 0,
      activeCampaigns: 0,
      totalCampaigns: 0,
      hasIssues: a.has_issues ?? false,
    })))
  }

  // Buscar métricas agregadas — todas as campanhas, mesmo arquivadas (gasto histórico vale)
  const { data: metrics } = await supabase
    .from('metrics')
    .select('entity_id, spend')
    .eq('entity_type', 'campaign')
    .in('entity_id', campaigns.map(c => c.id))
    .gte('date', since)
    .lte('date', until)

  const spendByCampaign = new Map<string, number>()
  for (const m of metrics ?? []) {
    spendByCampaign.set(m.entity_id, (spendByCampaign.get(m.entity_id) ?? 0) + (m.spend ?? 0))
  }

  // Agregar por conta
  const accountTotals = new Map<string, { spend: number; activeCampaigns: number; totalCampaigns: number }>()
  for (const c of campaigns) {
    const cur = accountTotals.get(c.account_id) ?? { spend: 0, activeCampaigns: 0, totalCampaigns: 0 }
    // Gasto: sempre soma (qualquer campanha, mesmo arquivada)
    cur.spend += spendByCampaign.get(c.id) ?? 0
    // Total/ativas: só conta campanhas não arquivadas/deletadas
    const isVisible = c.status !== 'ARCHIVED' && c.status !== 'DELETED'
    if (isVisible) {
      cur.totalCampaigns += 1
      if ((c.effective_status ?? c.status) === 'ACTIVE') cur.activeCampaigns += 1
    }
    accountTotals.set(c.account_id, cur)
  }

  const result = accounts.map(a => {
    const totals = accountTotals.get(a.id) ?? { spend: 0, activeCampaigns: 0, totalCampaigns: 0 }
    // Se conta tem issues (limite atingido), nenhuma campanha está realmente ativa
    const activeCampaigns = a.has_issues ? 0 : totals.activeCampaigns
    return {
      id: a.id,
      name: a.name,
      currency: a.currency,
      status: a.status,
      business_id: a.business_id,
      business_name: a.business_name,
      spend: totals.spend,
      activeCampaigns,
      totalCampaigns: totals.totalCampaigns,
      balance: a.balance ?? 0,
      hasIssues: a.has_issues ?? false,
    }
  })

  result.sort((a, b) => b.spend - a.spend)

  return NextResponse.json(result)
}
