import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrintButton } from './PrintButton'
import { ReportChart, type ChartPoint, type MetricKey } from './ReportChart'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ accountId: string }>
  searchParams: Promise<Record<string, string>>
}

// ============ Helpers ============
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function today() { return new Date().toISOString().split('T')[0] }

function calcPrevPeriod(since: string, until: string) {
  const s = new Date(since), u = new Date(until)
  const days = Math.round((u.getTime() - s.getTime()) / 86400000)
  const prevUntil = new Date(s); prevUntil.setDate(s.getDate() - 1)
  const prevSince = new Date(prevUntil); prevSince.setDate(prevUntil.getDate() - days)
  return { prevSince: prevSince.toISOString().split('T')[0], prevUntil: prevUntil.toISOString().split('T')[0] }
}

function fmtCurrency(v: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
}
function fmtNumber(v: number) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(v))
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtPercent(v: number) { return `${v.toFixed(2)}%` }
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d + 'T12:00:00'))
}
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return ((cur - prev) / prev) * 100
}

function detectTemplate(objective: string | null, conversations: number, leads: number, roas: number): 'wpp' | 'leads' | 'sales' | 'default' {
  const obj = (objective ?? '').toUpperCase()
  if (roas > 0.5) return 'sales'
  if (obj.includes('MESSAGES') || obj.includes('OUTCOME_ENGAGEMENT') || conversations > 0) return 'wpp'
  if (obj.includes('LEAD') || obj.includes('OUTCOME_LEADS') || obj.includes('CONVERSIONS') || leads > 0) return 'leads'
  return 'default'
}

// ============ Tipos ============
type MetricsRow = { entity_id?: string; date?: string; spend?: number | string; impressions?: number | string; clicks?: number | string; reach?: number | string; ctr?: number | string; cpm?: number | string; cpa?: number | string; roas?: number | string; conversations?: number | string; messages_sent?: number | string; leads?: number | string; page_views?: number | string; frequency?: number | string }

interface Metrics {
  spend: number; impressions: number; clicks: number; reach: number
  ctr: number; cpm: number; cpa: number; roas: number
  conversations: number; messages_sent: number; leads: number
  page_views: number; frequency: number
}

function emptyMetrics(): Metrics {
  return { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpm: 0, cpa: 0, roas: 0, conversations: 0, messages_sent: 0, leads: 0, page_views: 0, frequency: 0 }
}

function aggMetrics(rows: MetricsRow[]): Metrics {
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

function deriveMetrics(m: Metrics) {
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

// ============ Metadata ============
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { accountId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('ad_accounts').select('name').eq('id', accountId).single()
  return { title: `Relatório — ${data?.name ?? 'Conta'}` }
}

// ============ Componentes ============
function TrendBadge({ cur, prev, invert = false, hideZero = false }: { cur: number; prev: number; invert?: boolean; hideZero?: boolean }) {
  const p = pct(cur, prev)
  if (p === null) return null
  const abs = Math.abs(p)
  if (abs < 0.5) return hideZero ? null : <span className="text-xs text-zinc-400">= anterior</span>
  const isPos = p > 0
  const isGood = invert ? !isPos : isPos
  return (
    <span className={`text-xs font-semibold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPos ? '↑' : '↓'}{abs.toFixed(0)}%
    </span>
  )
}

function KpiCard({ label, value, hint, trend, accent }: {
  label: string; value: string; hint?: string; trend?: React.ReactNode; accent?: 'blue' | 'emerald' | 'violet' | 'amber'
}) {
  const accentColor = accent ? {
    blue: 'border-t-blue-500', emerald: 'border-t-emerald-500',
    violet: 'border-t-violet-500', amber: 'border-t-amber-500'
  }[accent] : 'border-t-zinc-200'
  return (
    <div className={`bg-white border border-zinc-200 ${accentColor} border-t-2 rounded-2xl p-4`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">{label}</p>
      <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{value}</p>
      <div className="mt-1.5 min-h-[16px] flex items-center gap-2">
        {trend}
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
    </div>
  )
}

function MetricRow({ label, current, previous, trend, sub }: {
  label: string; current: string; previous?: string; trend?: React.ReactNode; sub?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0">
      <div>
        <span className="text-sm text-zinc-700 font-medium">{label}</span>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-6">
        {previous !== undefined && (
          <span className="text-xs text-zinc-400 tabular-nums w-24 text-right">{previous}</span>
        )}
        <span className="text-sm font-bold text-zinc-900 tabular-nums w-28 text-right">{current}</span>
        <div className="w-16 text-right">{trend}</div>
      </div>
    </div>
  )
}

// ============ Página ============
export default async function RelatorioPage({ params, searchParams }: PageProps) {
  const { accountId } = await params
  const sp = await searchParams
  const since = sp.since ?? daysAgo(30)
  const until = sp.until ?? today()
  const { prevSince, prevUntil } = calcPrevPeriod(since, until)

  const supabase = createAdminClient()

  const [{ data: account }, { data: campaigns }] = await Promise.all([
    supabase.from('ad_accounts').select('id, name, currency, status, business_name').eq('id', accountId).single(),
    supabase.from('campaigns').select('id, name, status, effective_status, objective').eq('account_id', accountId).not('status', 'in', '("DELETED","ARCHIVED")').order('name'),
  ])

  if (!account) notFound()

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-700 font-semibold">{account.name}</p>
          <p className="text-zinc-500 text-sm mt-1">Nenhuma campanha encontrada.</p>
        </div>
      </div>
    )
  }

  const ids = campaigns.map(c => c.id)
  const COLS = 'entity_id, date, spend, impressions, clicks, reach, ctr, cpm, cpa, roas, conversations, messages_sent, leads, page_views, frequency'

  const [{ data: curMetrics }, { data: prevMetrics }] = await Promise.all([
    supabase.from('metrics').select(COLS).eq('entity_type', 'campaign').in('entity_id', ids).gte('date', since).lte('date', until).order('date'),
    supabase.from('metrics').select(COLS).eq('entity_type', 'campaign').in('entity_id', ids).gte('date', prevSince).lte('date', prevUntil).order('date'),
  ])

  // Agrupar por campanha (para lista) e por data (para gráfico)
  const curByCampaign = new Map<string, MetricsRow[]>()
  const prevByCampaign = new Map<string, MetricsRow[]>()
  const curByDate = new Map<string, MetricsRow[]>()
  const prevByDate = new Map<string, MetricsRow[]>()

  for (const r of (curMetrics ?? []) as MetricsRow[]) {
    if (r.entity_id) {
      if (!curByCampaign.has(r.entity_id)) curByCampaign.set(r.entity_id, [])
      curByCampaign.get(r.entity_id)!.push(r)
    }
    if (r.date) {
      if (!curByDate.has(r.date)) curByDate.set(r.date, [])
      curByDate.get(r.date)!.push(r)
    }
  }
  for (const r of (prevMetrics ?? []) as MetricsRow[]) {
    if (r.entity_id) {
      if (!prevByCampaign.has(r.entity_id)) prevByCampaign.set(r.entity_id, [])
      prevByCampaign.get(r.entity_id)!.push(r)
    }
    if (r.date) {
      if (!prevByDate.has(r.date)) prevByDate.set(r.date, [])
      prevByDate.get(r.date)!.push(r)
    }
  }

  // Montar campanhas com métricas
  const campaignRows = campaigns.map(c => {
    const m = aggMetrics(curByCampaign.get(c.id) ?? [])
    const p = aggMetrics(prevByCampaign.get(c.id) ?? [])
    const eff = (c as unknown as { effective_status?: string }).effective_status ?? c.status
    const template = detectTemplate(c.objective, m.conversations, m.leads, m.roas)
    return { ...c, effective_status: eff, m, p, template, derived: deriveMetrics(m) }
  })

  // FILTRO: só mostra ACTIVE ou com gasto > 0 no período
  const visibleCampaigns = campaignRows.filter(c => c.effective_status === 'ACTIVE' || c.m.spend > 0)

  // Ordenar: ativas primeiro, depois por gasto
  visibleCampaigns.sort((a, b) => {
    const aA = a.effective_status === 'ACTIVE' ? 1 : 0
    const bA = b.effective_status === 'ACTIVE' ? 1 : 0
    if (bA !== aA) return bA - aA
    return b.m.spend - a.m.spend
  })

  // Totais — somente das campanhas visíveis (que efetivamente operaram no período)
  const allCurMetrics: MetricsRow[] = []
  const allPrevMetrics: MetricsRow[] = []
  for (const c of visibleCampaigns) {
    allCurMetrics.push(...(curByCampaign.get(c.id) ?? []))
    allPrevMetrics.push(...(prevByCampaign.get(c.id) ?? []))
  }
  const allCur = aggMetrics(allCurMetrics)
  const allPrev = aggMetrics(allPrevMetrics)
  const allDerived = deriveMetrics(allCur)
  const prevDerived = deriveMetrics(allPrev)

  // Detectar template predominante da conta
  const accountTemplate: 'wpp' | 'leads' | 'sales' | 'default' =
    allCur.roas > 0.5 ? 'sales'
    : allCur.conversations > allCur.leads && allCur.conversations > 0 ? 'wpp'
    : allCur.leads > 0 ? 'leads'
    : 'default'

  // Gráfico — gerar série diária alinhada por offset de dia
  const sinceDate = new Date(since)
  const prevSinceDate = new Date(prevSince)
  const numDays = Math.round((new Date(until).getTime() - sinceDate.getTime()) / 86400000) + 1

  function dateOffset(baseDate: Date, offsetDays: number): string {
    const d = new Date(baseDate); d.setDate(baseDate.getDate() + offsetDays)
    return d.toISOString().split('T')[0]
  }

  const chartData: ChartPoint[] = []
  for (let i = 0; i < numDays; i++) {
    const curDate = dateOffset(sinceDate, i)
    const prevDate = dateOffset(prevSinceDate, i)
    const curRows = curByDate.get(curDate) ?? []
    const prevRows = prevByDate.get(prevDate) ?? []
    const cur = aggMetrics(curRows.filter(r => visibleCampaigns.some(c => c.id === r.entity_id)))
    const prv = aggMetrics(prevRows.filter(r => visibleCampaigns.some(c => c.id === r.entity_id)))
    chartData.push({
      day: i + 1,
      curDate, prevDate,
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

  // Métricas disponíveis no gráfico
  const availableMetrics: MetricKey[] = ['spend', 'impressions', 'clicks', 'ctr']
  if (allCur.conversations > 0 || allPrev.conversations > 0) availableMetrics.splice(2, 0, 'conversations')
  if (allCur.leads > 0 || allPrev.leads > 0) availableMetrics.splice(2, 0, 'leads')

  const currency = account.currency ?? 'BRL'

  return (
    <div className="min-h-screen bg-[#F8F9FA] print:bg-white">
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <PrintButton />
        <a
          href="/"
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg transition"
        >
          ← Dashboard
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 print:px-0 print:py-0">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-8 print:mb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-sm">NG</span>
              </div>
              <div>
                <p className="text-zinc-900 font-black text-lg leading-none">Grupo NG</p>
                <p className="text-zinc-500 text-xs mt-0.5">Relatório de Performance</p>
              </div>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 leading-tight">{account.name}</h1>
            {account.business_name && (
              <p className="text-sm text-zinc-500 mt-0.5">{account.business_name}</p>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {accountTemplate === 'wpp' && (
                <span className="text-[10px] font-bold tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">WhatsApp</span>
              )}
              {accountTemplate === 'leads' && (
                <span className="text-[10px] font-bold tracking-widest text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded uppercase">Captação de Leads</span>
              )}
              {accountTemplate === 'sales' && (
                <span className="text-[10px] font-bold tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">E-commerce</span>
              )}
              {accountTemplate === 'default' && (
                <span className="text-[10px] font-bold tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">Tráfego/Branding</span>
              )}
              <span className="text-xs text-zinc-500">·</span>
              <span className="text-xs text-zinc-500">
                {visibleCampaigns.filter(c => c.effective_status === 'ACTIVE').length} campanhas ativas no período
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Período</p>
            <p className="text-sm font-bold text-zinc-800">{fmtDate(since)}</p>
            <p className="text-xs text-zinc-400">até {fmtDate(until)}</p>
            <p className="text-[10px] text-zinc-400 mt-3">vs anterior:</p>
            <p className="text-[11px] text-zinc-500 tabular-nums">{fmtDate(prevSince)} → {fmtDate(prevUntil)}</p>
          </div>
        </div>

        {/* KPIs PRINCIPAIS — Template-aware (4 cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="Gasto total"
            value={fmtCurrency(allCur.spend, currency)}
            trend={<TrendBadge cur={allCur.spend} prev={allPrev.spend} invert />}
            accent="blue"
          />
          {accountTemplate === 'wpp' ? (
            <>
              <KpiCard
                label="Conversas iniciadas"
                value={fmtNumber(allCur.conversations)}
                trend={<TrendBadge cur={allCur.conversations} prev={allPrev.conversations} />}
                hint={allDerived.cpconv > 0 ? `CPconv ${fmtCurrency(allDerived.cpconv)}` : undefined}
                accent="emerald"
              />
              <KpiCard
                label="Mensagens respondidas"
                value={fmtNumber(allCur.messages_sent)}
                hint="WhatsApp"
                accent="emerald"
              />
              <KpiCard
                label="CTR médio"
                value={fmtPercent(allCur.ctr)}
                trend={<TrendBadge cur={allCur.ctr} prev={allPrev.ctr} />}
                hint={`CPM ${fmtCurrency(allCur.cpm)}`}
                accent="amber"
              />
            </>
          ) : accountTemplate === 'leads' ? (
            <>
              <KpiCard
                label="Leads gerados"
                value={fmtNumber(allCur.leads)}
                trend={<TrendBadge cur={allCur.leads} prev={allPrev.leads} />}
                hint={allDerived.cpl > 0 ? `CPL ${fmtCurrency(allDerived.cpl)}` : undefined}
                accent="violet"
              />
              <KpiCard
                label="Taxa de conversão"
                value={fmtPercent(allDerived.leadConvRate)}
                hint="cliques → leads"
                accent="emerald"
              />
              <KpiCard
                label="CTR médio"
                value={fmtPercent(allCur.ctr)}
                trend={<TrendBadge cur={allCur.ctr} prev={allPrev.ctr} />}
                hint={`CPM ${fmtCurrency(allCur.cpm)}`}
                accent="amber"
              />
            </>
          ) : accountTemplate === 'sales' ? (
            <>
              <KpiCard
                label="ROAS"
                value={`${allCur.roas.toFixed(2)}x`}
                trend={<TrendBadge cur={allCur.roas} prev={allPrev.roas} />}
                hint={`CPA ${fmtCurrency(allCur.cpa)}`}
                accent="amber"
              />
              <KpiCard
                label="Cliques"
                value={fmtNumber(allCur.clicks)}
                trend={<TrendBadge cur={allCur.clicks} prev={allPrev.clicks} />}
                hint={allDerived.cpc > 0 ? `CPC ${fmtCurrency(allDerived.cpc)}` : undefined}
                accent="emerald"
              />
              <KpiCard
                label="CTR médio"
                value={fmtPercent(allCur.ctr)}
                trend={<TrendBadge cur={allCur.ctr} prev={allPrev.ctr} />}
                hint={`CPM ${fmtCurrency(allCur.cpm)}`}
                accent="blue"
              />
            </>
          ) : (
            <>
              <KpiCard
                label="Impressões"
                value={fmtCompact(allCur.impressions)}
                trend={<TrendBadge cur={allCur.impressions} prev={allPrev.impressions} />}
                hint={`Alcance ${fmtCompact(allCur.reach)}`}
                accent="violet"
              />
              <KpiCard
                label="Cliques"
                value={fmtNumber(allCur.clicks)}
                trend={<TrendBadge cur={allCur.clicks} prev={allPrev.clicks} />}
                hint={allDerived.cpc > 0 ? `CPC ${fmtCurrency(allDerived.cpc)}` : undefined}
                accent="emerald"
              />
              <KpiCard
                label="CTR médio"
                value={fmtPercent(allCur.ctr)}
                trend={<TrendBadge cur={allCur.ctr} prev={allPrev.ctr} />}
                hint={`CPM ${fmtCurrency(allCur.cpm)}`}
                accent="amber"
              />
            </>
          )}
        </div>

        {/* GRÁFICO */}
        <ReportChart data={chartData} availableMetrics={availableMetrics} />

        {/* TABELA DETALHADA DE MÉTRICAS */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 print:break-inside-avoid">
          <h2 className="text-sm font-bold text-zinc-700 mb-4 uppercase tracking-widest">Métricas detalhadas</h2>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1 mt-2">Investimento e Alcance</p>
              <MetricRow
                label="Gasto"
                current={fmtCurrency(allCur.spend, currency)}
                previous={fmtCurrency(allPrev.spend, currency)}
                trend={<TrendBadge cur={allCur.spend} prev={allPrev.spend} />}
              />
              <MetricRow
                label="Impressões"
                current={fmtNumber(allCur.impressions)}
                previous={fmtNumber(allPrev.impressions)}
                trend={<TrendBadge cur={allCur.impressions} prev={allPrev.impressions} />}
              />
              <MetricRow
                label="Alcance"
                current={fmtNumber(allCur.reach)}
                previous={fmtNumber(allPrev.reach)}
                trend={<TrendBadge cur={allCur.reach} prev={allPrev.reach} />}
                sub="pessoas únicas alcançadas"
              />
              <MetricRow
                label="Frequência"
                current={allCur.frequency.toFixed(2)}
                previous={allPrev.frequency.toFixed(2)}
                trend={<TrendBadge cur={allCur.frequency} prev={allPrev.frequency} invert hideZero />}
                sub="vezes que cada pessoa viu"
              />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1 mt-2">Engajamento e Eficiência</p>
              <MetricRow
                label="Cliques"
                current={fmtNumber(allCur.clicks)}
                previous={fmtNumber(allPrev.clicks)}
                trend={<TrendBadge cur={allCur.clicks} prev={allPrev.clicks} />}
              />
              <MetricRow
                label="CTR (taxa de cliques)"
                current={fmtPercent(allCur.ctr)}
                previous={fmtPercent(allPrev.ctr)}
                trend={<TrendBadge cur={allCur.ctr} prev={allPrev.ctr} />}
                sub="cliques ÷ impressões"
              />
              <MetricRow
                label="CPC (custo por clique)"
                current={fmtCurrency(allDerived.cpc, currency)}
                previous={fmtCurrency(prevDerived.cpc, currency)}
                trend={<TrendBadge cur={allDerived.cpc} prev={prevDerived.cpc} invert />}
              />
              <MetricRow
                label="CPM (custo por mil impr.)"
                current={fmtCurrency(allCur.cpm, currency)}
                previous={fmtCurrency(allPrev.cpm, currency)}
                trend={<TrendBadge cur={allCur.cpm} prev={allPrev.cpm} invert />}
              />
            </div>
          </div>

          {/* Resultados — só mostra se houver */}
          {(allCur.conversations > 0 || allCur.leads > 0 || allCur.roas > 0 || allCur.page_views > 0) && (
            <div className="mt-6 pt-4 border-t border-zinc-100">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Resultados de conversão</p>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0">
                <div>
                  {allCur.conversations > 0 && (
                    <>
                      <MetricRow
                        label="Conversas WPP"
                        current={fmtNumber(allCur.conversations)}
                        previous={fmtNumber(allPrev.conversations)}
                        trend={<TrendBadge cur={allCur.conversations} prev={allPrev.conversations} />}
                      />
                      <MetricRow
                        label="Mensagens respondidas"
                        current={fmtNumber(allCur.messages_sent)}
                        previous={fmtNumber(allPrev.messages_sent)}
                        trend={<TrendBadge cur={allCur.messages_sent} prev={allPrev.messages_sent} />}
                      />
                      <MetricRow
                        label="Custo por conversa"
                        current={fmtCurrency(allDerived.cpconv, currency)}
                        previous={fmtCurrency(prevDerived.cpconv, currency)}
                        trend={<TrendBadge cur={allDerived.cpconv} prev={prevDerived.cpconv} invert />}
                      />
                      <MetricRow
                        label="Taxa cliques → conversas"
                        current={fmtPercent(allDerived.convRateConversations)}
                        previous={fmtPercent(prevDerived.convRateConversations)}
                        trend={<TrendBadge cur={allDerived.convRateConversations} prev={prevDerived.convRateConversations} />}
                      />
                    </>
                  )}
                </div>
                <div>
                  {allCur.leads > 0 && (
                    <>
                      <MetricRow
                        label="Leads"
                        current={fmtNumber(allCur.leads)}
                        previous={fmtNumber(allPrev.leads)}
                        trend={<TrendBadge cur={allCur.leads} prev={allPrev.leads} />}
                      />
                      <MetricRow
                        label="CPL (custo por lead)"
                        current={fmtCurrency(allDerived.cpl, currency)}
                        previous={fmtCurrency(prevDerived.cpl, currency)}
                        trend={<TrendBadge cur={allDerived.cpl} prev={prevDerived.cpl} invert />}
                      />
                      <MetricRow
                        label="Taxa cliques → leads"
                        current={fmtPercent(allDerived.leadConvRate)}
                        previous={fmtPercent(prevDerived.leadConvRate)}
                        trend={<TrendBadge cur={allDerived.leadConvRate} prev={prevDerived.leadConvRate} />}
                      />
                    </>
                  )}
                  {allCur.page_views > 0 && (
                    <MetricRow
                      label="Page views"
                      current={fmtNumber(allCur.page_views)}
                      previous={fmtNumber(allPrev.page_views)}
                      trend={<TrendBadge cur={allCur.page_views} prev={allPrev.page_views} />}
                    />
                  )}
                  {allCur.roas > 0 && (
                    <>
                      <MetricRow
                        label="ROAS"
                        current={`${allCur.roas.toFixed(2)}x`}
                        previous={`${allPrev.roas.toFixed(2)}x`}
                        trend={<TrendBadge cur={allCur.roas} prev={allPrev.roas} />}
                      />
                      <MetricRow
                        label="CPA (custo por aquisição)"
                        current={fmtCurrency(allCur.cpa, currency)}
                        previous={fmtCurrency(allPrev.cpa, currency)}
                        trend={<TrendBadge cur={allCur.cpa} prev={allPrev.cpa} invert />}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CAMPANHAS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-widest">Detalhamento por campanha</h2>
            <span className="text-xs text-zinc-400">{visibleCampaigns.length} {visibleCampaigns.length === 1 ? 'campanha' : 'campanhas'}</span>
          </div>
          <div className="space-y-3">
            {visibleCampaigns.map(c => {
              const isActive = c.effective_status === 'ACTIVE'
              const cpl = c.derived.cpl
              const cpconv = c.derived.cpconv
              const cpc = c.derived.cpc

              return (
                <div key={c.id} className={`bg-white border rounded-2xl p-4 ${!isActive ? 'opacity-75' : ''} border-zinc-200 print:break-inside-avoid`}>
                  {/* Header da campanha */}
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-zinc-100">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                        isActive ? 'bg-emerald-500' : c.effective_status === 'COMPLETED' ? 'bg-zinc-400' : 'bg-zinc-300'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {c.template === 'wpp' && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">WhatsApp</span>
                          )}
                          {c.template === 'leads' && (
                            <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Leads</span>
                          )}
                          {c.template === 'sales' && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">E-commerce</span>
                          )}
                          {c.objective && (
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{c.objective}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {isActive ? 'Ativa' : c.effective_status === 'COMPLETED' ? 'Concluída' : 'Pausada'}
                    </span>
                  </div>

                  {/* Grid de métricas template-aware */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {/* Gasto sempre primeiro */}
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Gasto</p>
                      <p className="text-sm font-black text-zinc-900 tabular-nums">{fmtCurrency(c.m.spend, currency)}</p>
                      <TrendBadge cur={c.m.spend} prev={c.p.spend} hideZero />
                    </div>

                    {/* Template-specific primary metrics */}
                    {c.template === 'wpp' ? (
                      <>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Conversas</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.conversations)}</p>
                          <TrendBadge cur={c.m.conversations} prev={c.p.conversations} hideZero />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Custo/Conv</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{cpconv > 0 ? fmtCurrency(cpconv) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Mensagens</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.messages_sent)}</p>
                        </div>
                      </>
                    ) : c.template === 'leads' ? (
                      <>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Leads</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.leads)}</p>
                          <TrendBadge cur={c.m.leads} prev={c.p.leads} hideZero />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">CPL</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{cpl > 0 ? fmtCurrency(cpl) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Page Views</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.page_views)}</p>
                        </div>
                      </>
                    ) : c.template === 'sales' ? (
                      <>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">ROAS</p>
                          <p className="text-sm font-bold text-amber-600 tabular-nums">{c.m.roas.toFixed(2)}x</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">CPA</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{c.m.cpa > 0 ? fmtCurrency(c.m.cpa) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Cliques</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.clicks)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Impressões</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.impressions)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Alcance</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.reach)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Cliques</p>
                          <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtNumber(c.m.clicks)}</p>
                        </div>
                      </>
                    )}

                    {/* CTR e CPM sempre */}
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">CTR</p>
                      <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtPercent(c.m.ctr)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">CPM</p>
                      <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtCurrency(c.m.cpm)}</p>
                    </div>
                  </div>

                  {/* Linha de métricas secundárias quando ativa */}
                  {isActive && (c.m.frequency > 0 || cpc > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-3 pt-3 border-t border-zinc-100">
                      {cpc > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">CPC</p>
                          <p className="text-xs font-bold text-zinc-700 tabular-nums">{fmtCurrency(cpc)}</p>
                        </div>
                      )}
                      {c.m.frequency > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Frequência</p>
                          <p className={`text-xs font-bold tabular-nums ${c.m.frequency > 4 ? 'text-amber-600' : 'text-zinc-700'}`}>
                            {c.m.frequency.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {c.template !== 'default' && c.m.reach > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Alcance</p>
                          <p className="text-xs font-bold text-zinc-700 tabular-nums">{fmtNumber(c.m.reach)}</p>
                        </div>
                      )}
                      {c.template === 'wpp' && c.derived.convRateConversations > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Conv. rate</p>
                          <p className="text-xs font-bold text-zinc-700 tabular-nums">{fmtPercent(c.derived.convRateConversations)}</p>
                        </div>
                      )}
                      {c.template === 'leads' && c.derived.leadConvRate > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Conv. rate</p>
                          <p className="text-xs font-bold text-zinc-700 tabular-nums">{fmtPercent(c.derived.leadConvRate)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Glossário compacto */}
        <div className="mt-6 bg-white border border-zinc-200 rounded-2xl p-5 print:break-inside-avoid">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Glossário</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600">
            <p><strong className="text-zinc-800">CTR:</strong> Taxa de cliques · % de quem viu e clicou</p>
            <p><strong className="text-zinc-800">CPM:</strong> Custo por mil impressões</p>
            <p><strong className="text-zinc-800">CPC:</strong> Custo por clique</p>
            <p><strong className="text-zinc-800">CPL:</strong> Custo por lead capturado</p>
            <p><strong className="text-zinc-800">CPconv:</strong> Custo por conversa iniciada</p>
            <p><strong className="text-zinc-800">CPA:</strong> Custo por aquisição/compra</p>
            <p><strong className="text-zinc-800">ROAS:</strong> Retorno sobre o investimento</p>
            <p><strong className="text-zinc-800">Frequência:</strong> Quantas vezes cada pessoa viu o anúncio</p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-10 pt-6 border-t border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">NG</span>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-700 leading-none">Grupo NG</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">Marketing Digital · Tráfego Pago</p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400">
            Gerado em {fmtDate(today())} · {since} → {until}
          </p>
        </div>
      </div>

      <style>{`@media print{.print-hidden,.print\\:hidden{display:none!important}body{background:white}@page{margin:1.5cm;size:A4}.print\\:break-inside-avoid{break-inside:avoid}}`}</style>
    </div>
  )
}
