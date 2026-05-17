import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ accountId: string }>
  searchParams: Promise<Record<string, string>>
}

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
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v)
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

function detectTemplate(objective: string | null, conversations: number, leads: number): 'wpp' | 'leads' | 'default' {
  const obj = (objective ?? '').toUpperCase()
  if (obj.includes('MESSAGES') || obj.includes('OUTCOME_ENGAGEMENT') || conversations > 0) return 'wpp'
  if (obj.includes('LEAD') || obj.includes('OUTCOME_LEADS') || obj.includes('CONVERSIONS') || leads > 0) return 'leads'
  return 'default'
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { accountId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('ad_accounts').select('name').eq('id', accountId).single()
  return { title: `Relatório — ${data?.name ?? 'Conta'}` }
}

type MetricsRow = { entity_id: string; spend: number; impressions: number; clicks: number; reach: number; ctr: number; cpm: number; cpa: number; roas: number; conversations: number; messages_sent: number; leads: number; page_views: number; frequency: number }

function aggMetrics(rows: Partial<MetricsRow>[]) {
  let spend = 0, impressions = 0, clicks = 0, reach = 0, ctr = 0, cpm = 0, cpa = 0, roas = 0
  let conversations = 0, messages_sent = 0, leads = 0, page_views = 0, frequency = 0, n = 0
  for (const r of rows) {
    spend += Number(r.spend) || 0; impressions += Number(r.impressions) || 0
    clicks += Number(r.clicks) || 0; reach += Number(r.reach) || 0
    ctr += Number(r.ctr) || 0; cpm += Number(r.cpm) || 0
    cpa += Number(r.cpa) || 0; roas += Number(r.roas) || 0
    conversations += Number(r.conversations) || 0; messages_sent += Number(r.messages_sent) || 0
    leads += Number(r.leads) || 0; page_views += Number(r.page_views) || 0
    frequency += Number(r.frequency) || 0; n++
  }
  if (n > 0) { ctr /= n; cpm /= n; cpa /= n; roas /= n; frequency /= n }
  return { spend, impressions, clicks, reach, ctr, cpm, cpa, roas, conversations, messages_sent, leads, page_views, frequency }
}

function TrendBadge({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const p = pct(cur, prev)
  if (p === null) return null
  const abs = Math.abs(p)
  if (abs < 0.5) return <span className="text-xs text-zinc-400">= anterior</span>
  const isPos = p > 0
  const isGood = invert ? !isPos : isPos
  return (
    <span className={`text-xs font-semibold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
      {isPos ? '↑' : '↓'}{abs.toFixed(0)}%
    </span>
  )
}

export default async function RelatorioPage({ params, searchParams }: PageProps) {
  const { accountId } = await params
  const sp = await searchParams
  const since = sp.since ?? daysAgo(30)
  const until = sp.until ?? today()
  const { prevSince, prevUntil } = calcPrevPeriod(since, until)

  const supabase = createAdminClient()

  const [{ data: account }, { data: campaigns }] = await Promise.all([
    supabase.from('ad_accounts').select('id, name, currency, status, balance, has_issues, business_name').eq('id', accountId).single(),
    supabase.from('campaigns').select('id, name, status, effective_status, objective').eq('account_id', accountId).not('status', 'in', '("DELETED","ARCHIVED")').order('name'),
  ])

  if (!account) notFound()

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-zinc-500">Nenhuma campanha encontrada.</p>
      </div>
    )
  }

  const ids = campaigns.map(c => c.id)
  const COLS = 'entity_id, spend, impressions, clicks, reach, ctr, cpm, cpa, roas, conversations, messages_sent, leads, page_views, frequency'

  const [{ data: curMetrics }, { data: prevMetrics }] = await Promise.all([
    supabase.from('metrics').select(COLS).eq('entity_type', 'campaign').in('entity_id', ids).gte('date', since).lte('date', until),
    supabase.from('metrics').select('entity_id, spend, impressions, clicks, conversations, leads').eq('entity_type', 'campaign').in('entity_id', ids).gte('date', prevSince).lte('date', prevUntil),
  ])

  // Agrupar métricas por campanha
  const curMap = new Map<string, Partial<MetricsRow>[]>()
  const prevMap = new Map<string, Partial<MetricsRow>[]>()
  for (const r of curMetrics ?? []) {
    if (!curMap.has(r.entity_id)) curMap.set(r.entity_id, [])
    curMap.get(r.entity_id)!.push(r)
  }
  for (const r of prevMetrics ?? []) {
    if (!prevMap.has(r.entity_id)) prevMap.set(r.entity_id, [])
    prevMap.get(r.entity_id)!.push(r)
  }

  // Montar lista de campanhas com métricas
  const campaignRows = campaigns.map(c => {
    const m = aggMetrics(curMap.get(c.id) ?? [])
    const p = aggMetrics(prevMap.get(c.id) ?? [])
    const eff = (c as unknown as { effective_status?: string }).effective_status ?? c.status
    return { ...c, effective_status: eff, m, p, template: detectTemplate(c.objective, m.conversations, m.leads) }
  })

  // Ordenar: ativas no topo, depois por gasto
  campaignRows.sort((a, b) => {
    const aA = a.effective_status === 'ACTIVE' ? 1 : 0
    const bA = b.effective_status === 'ACTIVE' ? 1 : 0
    if (bA !== aA) return bA - aA
    return b.m.spend - a.m.spend
  })

  // Totais gerais
  const allCur = aggMetrics(campaignRows.map(c => c.m).flatMap(m => [m]))
  const allPrev = aggMetrics(campaignRows.map(c => c.p).flatMap(p => [p]))
  const totalCpl = allCur.leads > 0 ? allCur.spend / allCur.leads : 0
  const totalCostPerConv = allCur.conversations > 0 ? allCur.spend / allCur.conversations : 0

  const balance = Number(account.balance ?? 0)
  const hasIssues = account.has_issues ?? false
  const currency = account.currency ?? 'BRL'

  // Decidir qual KPI mostrar nos totais
  const showWpp = allCur.conversations > 0 || allCur.messages_sent > 0
  const showLeads = allCur.leads > 0

  return (
    <div className="min-h-screen bg-[#F8F9FA] print:bg-white">
      {/* Print button — oculto na impressão */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <PrintButton />
        <a
          href="/"
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg transition"
        >
          ← Dashboard
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 print:px-0 print:py-0">
        {/* Header */}
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
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Período</p>
            <p className="text-sm font-bold text-zinc-800">{fmtDate(since)}</p>
            <p className="text-xs text-zinc-400">até {fmtDate(until)}</p>
            <div className="mt-3">
              {hasIssues ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Erro de pagamento
                </span>
              ) : account.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Conta ativa
                </span>
              ) : (
                <span className="text-xs text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg">Conta pausada</span>
              )}
            </div>
          </div>
        </div>

        {/* Saldo */}
        <div className={`rounded-2xl border p-4 mb-6 flex items-center justify-between ${hasIssues ? 'bg-amber-50 border-amber-200' : 'bg-white border-zinc-200'}`}>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Saldo disponível</p>
            <p className={`text-2xl font-black tabular-nums mt-0.5 ${hasIssues ? 'text-amber-600' : balance > 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {fmtCurrency(balance, currency)}
            </p>
          </div>
          {hasIssues && (
            <div className="text-right">
              <p className="text-xs font-semibold text-amber-600">Limite atingido</p>
              <p className="text-[10px] text-amber-500 mt-0.5">Campanhas pausadas automaticamente</p>
            </div>
          )}
        </div>

        {/* Totais do período — cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Gasto */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Gasto total</p>
            <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCurrency(allCur.spend, currency)}</p>
            <div className="mt-1.5">
              <TrendBadge cur={allCur.spend} prev={allPrev.spend} />
            </div>
          </div>

          {/* KPI principal por tipo */}
          {showWpp ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Conversas</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCompact(allCur.conversations)}</p>
              {totalCostPerConv > 0 && <p className="text-xs text-zinc-400 mt-1.5">CPconv: {fmtCurrency(totalCostPerConv)}</p>}
            </div>
          ) : showLeads ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Leads</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCompact(allCur.leads)}</p>
              {totalCpl > 0 && <p className="text-xs text-zinc-400 mt-1.5">CPL: {fmtCurrency(totalCpl)}</p>}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Impressões</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCompact(allCur.impressions)}</p>
              <div className="mt-1.5"><TrendBadge cur={allCur.impressions} prev={allPrev.impressions} /></div>
            </div>
          )}

          {/* Cliques */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Cliques</p>
            <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCompact(allCur.clicks)}</p>
            <div className="mt-1.5"><TrendBadge cur={allCur.clicks} prev={allPrev.clicks} /></div>
          </div>

          {/* CTR */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">CTR médio</p>
            <p className="text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtPercent(allCur.ctr)}</p>
            <p className="text-xs text-zinc-400 mt-1.5">CPM: {fmtCurrency(allCur.cpm)}</p>
          </div>
        </div>

        {/* Comparativo */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-bold text-zinc-700 mb-4 uppercase tracking-widest">
            Comparativo com período anterior
            <span className="ml-2 text-[10px] font-medium text-zinc-400 normal-case tracking-normal">
              ({fmtDate(prevSince)} → {fmtDate(prevUntil)})
            </span>
          </h2>
          <div className="divide-y divide-zinc-100">
            {[
              { label: 'Gasto', cur: fmtCurrency(allCur.spend, currency), prev: fmtCurrency(allPrev.spend, currency), cn: allCur.spend, pn: allPrev.spend },
              { label: 'Impressões', cur: fmtCompact(allCur.impressions), prev: fmtCompact(allPrev.impressions), cn: allCur.impressions, pn: allPrev.impressions },
              { label: 'Cliques', cur: fmtCompact(allCur.clicks), prev: fmtCompact(allPrev.clicks), cn: allCur.clicks, pn: allPrev.clicks },
              ...(showWpp ? [
                { label: 'Conversas WPP', cur: fmtCompact(allCur.conversations), prev: fmtCompact(allPrev.conversations), cn: allCur.conversations, pn: allPrev.conversations },
              ] : []),
              ...(showLeads ? [
                { label: 'Leads', cur: fmtCompact(allCur.leads), prev: fmtCompact(allPrev.leads), cn: allCur.leads, pn: allPrev.leads },
              ] : []),
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-zinc-600">{row.label}</span>
                <div className="flex items-center gap-6">
                  <span className="text-xs text-zinc-400 tabular-nums w-20 text-right">{row.prev}</span>
                  <span className="text-sm font-bold text-zinc-900 tabular-nums w-24 text-right">{row.cur}</span>
                  <div className="w-16 text-right"><TrendBadge cur={row.cn} prev={row.pn} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campanhas */}
        <div>
          <h2 className="text-sm font-bold text-zinc-700 mb-3 uppercase tracking-widest">Campanhas</h2>
          <div className="space-y-3">
            {campaignRows.map(c => {
              const isActive = c.effective_status === 'ACTIVE'
              const hasData = c.m.spend > 0 || c.m.impressions > 0
              const cpl = c.m.leads > 0 && c.m.spend > 0 ? c.m.spend / c.m.leads : 0
              const costPerConv = c.m.conversations > 0 && c.m.spend > 0 ? c.m.spend / c.m.conversations : 0

              return (
                <div key={c.id} className={`bg-white border rounded-2xl p-4 ${!isActive ? 'opacity-60' : ''} ${hasIssues && isActive ? 'border-amber-200' : 'border-zinc-200'}`}>
                  {/* Header da campanha */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                        isActive ? 'bg-emerald-500' : c.effective_status === 'COMPLETED' ? 'bg-zinc-400' : 'bg-zinc-300'
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-zinc-900 truncate">{c.name}</p>
                        {c.objective && <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">{c.objective}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.template === 'wpp' && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">WPP</span>
                      )}
                      {c.template === 'leads' && (
                        <span className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Leads</span>
                      )}
                      <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {isActive ? 'Ativo' : c.effective_status === 'COMPLETED' ? 'Concluído' : 'Pausado'}
                      </span>
                    </div>
                  </div>

                  {hasData ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {/* Gasto — sempre em destaque */}
                      <div className="sm:col-span-1">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Gasto</p>
                        <p className="text-base font-black text-zinc-900 tabular-nums">{fmtCurrency(c.m.spend, currency)}</p>
                        <TrendBadge cur={c.m.spend} prev={c.p.spend} />
                      </div>
                      {/* KPI primário por template */}
                      {c.template === 'wpp' ? (
                        <>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Conversas</p>
                            <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtCompact(c.m.conversations)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Custo/Conv</p>
                            <p className="text-sm font-bold text-zinc-900 tabular-nums">{costPerConv > 0 ? fmtCurrency(costPerConv) : '—'}</p>
                          </div>
                        </>
                      ) : c.template === 'leads' ? (
                        <>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Leads</p>
                            <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtCompact(c.m.leads)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">CPL</p>
                            <p className="text-sm font-bold text-zinc-900 tabular-nums">{cpl > 0 ? fmtCurrency(cpl) : '—'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Impressões</p>
                            <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtCompact(c.m.impressions)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">Cliques</p>
                            <p className="text-sm font-bold text-zinc-900 tabular-nums">{fmtCompact(c.m.clicks)}</p>
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
                  ) : (
                    <p className="text-xs text-zinc-400 italic">Sem dados no período selecionado</p>
                  )}
                </div>
              )
            })}
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
              <p className="text-[10px] text-zinc-400 mt-0.5">Marketing Digital</p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400">
            Gerado em {fmtDate(today())} · {since} → {until}
          </p>
        </div>
      </div>

      <style>{`@media print{.print-hidden{display:none!important}body{background:white}@page{margin:1.5cm;size:A4}}`}</style>
    </div>
  )
}
