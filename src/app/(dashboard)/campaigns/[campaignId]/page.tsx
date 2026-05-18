import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCampaignById, getAdSetsWithMetrics, getChartData, getLastSync, getCampaignMetrics } from '@/lib/supabase/queries'
import { trendPct, cpmHealth, ctrHealth, frequencyHealth, costPerConvHealth, cplHealth, type HealthLevel } from '@/types/dashboard'
import Breadcrumb from '@/components/campaigns/Breadcrumb'
import AdSetCard from '@/components/campaigns/AdSetCard'
import PerformanceChart from '@/components/campaigns/PerformanceChart'
import LastSyncInfo from '@/components/dashboard/LastSyncInfo'
import SyncButton from '@/components/dashboard/SyncButton'
import type { DashboardFilters } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ campaignId: string }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignId } = await params
  const campaign = await getCampaignById(campaignId)
  return { title: campaign?.name ?? 'Campanha' }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtPercent(v: number) { return `${v.toFixed(2)}%` }

function detectTemplate(objective: string | null | undefined, conversations: number, leads: number): 'wpp' | 'leads' | 'default' {
  const obj = (objective ?? '').toUpperCase()
  if (obj.includes('MESSAGES') || obj.includes('OUTCOME_ENGAGEMENT') || conversations > 0) return 'wpp'
  if (obj.includes('LEAD') || obj.includes('OUTCOME_LEADS') || obj.includes('CONVERSIONS') || leads > 0) return 'leads'
  return 'default'
}

function HealthDot({ level }: { level: HealthLevel }) {
  const c: Record<HealthLevel, string> = {
    good: 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]',
    warning: 'bg-amber-400',
    bad: 'bg-red-400',
    neutral: ''
  }
  if (level === 'neutral') return null
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${c[level]}`} />
}

function Trend({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (!pct) return null
  const abs = Math.abs(pct)
  if (abs < 0.5) return null
  const isPos = pct > 0
  const isGood = invert ? !isPos : isPos
  return <span className={`text-xs font-semibold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>{isPos ? '↑' : '↓'}{abs.toFixed(0)}%</span>
}

function MetricCard({
  label, value, sub, trend, health, prominent = false, highlight
}: {
  label: string; value: string; sub?: string; trend?: number | null
  health?: HealthLevel; prominent?: boolean; highlight?: 'blue' | 'emerald' | 'violet' | 'amber'
}) {
  const topBorder = highlight ? {
    blue: 'border-t-blue-500', emerald: 'border-t-emerald-500',
    violet: 'border-t-violet-500', amber: 'border-t-amber-400'
  }[highlight] : ''
  return (
    <div className={`rounded-2xl bg-[#111115] border border-white/[0.06] ${highlight ? `border-t-2 ${topBorder}` : ''} p-4`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 font-medium">{label}</p>
      <div className="flex items-end gap-2">
        {health && health !== 'neutral' && <div className="mb-1"><HealthDot level={health} /></div>}
        <span className={`font-black tabular-nums tracking-tight leading-none ${prominent ? 'text-2xl text-white' : 'text-xl text-zinc-100'}`}>{value}</span>
        {trend !== undefined && <Trend pct={trend ?? null} />}
      </div>
      {sub && <p className="text-[10px] text-zinc-600 mt-1.5">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const eff = status
  const isActive = eff === 'ACTIVE'
  const isIssue = eff === 'WITH_ISSUES'
  const isPaused = eff === 'PAUSED' || eff === 'CAMPAIGN_PAUSED' || eff === 'ADSET_PAUSED'
  const isCompleted = eff === 'COMPLETED'

  const dot = isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
    : isIssue ? 'bg-amber-400' : 'bg-zinc-600'
  const text = isActive ? 'text-emerald-400' : isIssue ? 'text-amber-400' : 'text-zinc-500'
  const label = isActive ? 'Ativo' : isIssue ? 'Erro pagam.' : isPaused ? 'Pausado' : isCompleted ? 'Concluída' : eff

  return (
    <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1">
      <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  )
}

export default async function CampaignPage({ params, searchParams }: PageProps) {
  const { campaignId } = await params
  const sp = await searchParams

  const filters: Partial<DashboardFilters> = { since: sp.since, until: sp.until }
  const filtersStr = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v))
  ).toString()

  const [campaign, adSets, chartData, lastSync, metrics] = await Promise.all([
    getCampaignById(campaignId),
    getAdSetsWithMetrics(campaignId, filters),
    getChartData(campaignId, 'campaign', filters),
    getLastSync(),
    getCampaignMetrics(campaignId, filters),
  ])

  if (!campaign) notFound()

  const { current: m, prev: p } = metrics
  const hasData = m.spend > 0 || m.impressions > 0
  const effectiveStatus = (campaign as unknown as { effective_status?: string }).effective_status ?? campaign.status
  const template = detectTemplate(campaign.objective, m.conversations, m.leads)

  const cpl = m.leads > 0 && m.spend > 0 ? m.spend / m.leads : 0
  const costPerConv = m.conversations > 0 && m.spend > 0 ? m.spend / m.conversations : 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumb
            items={[{ label: 'Campanhas', href: '/' }, { label: campaign.name }]}
            filters={filtersStr}
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">{campaign.name}</h1>
            <StatusBadge status={effectiveStatus} />
            {template === 'wpp' && (
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase">WPP</span>
            )}
            {template === 'leads' && (
              <span className="text-[10px] font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md uppercase">Leads</span>
            )}
            {m.roas > 1 && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-md tabular-nums">{m.roas.toFixed(1)}x ROAS</span>
            )}
          </div>
          {campaign.objective && (
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{campaign.objective}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LastSyncInfo initial={lastSync} />
          <SyncButton />
        </div>
      </div>

      {/* Métricas de resumo — template-aware */}
      {template === 'wpp' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Gasto" value={fmtCurrency(m.spend)} prominent highlight="blue"
            trend={trendPct(m.spend, p.spend)} sub="no período" />
          <MetricCard label="Conversas" value={fmtCompact(m.conversations)}
            trend={trendPct(m.conversations, p.conversations)} highlight="emerald"
            sub={m.conversations > 0 ? `CPconv: ${fmtCurrency(costPerConv)}` : undefined}
            health={costPerConv > 0 ? costPerConvHealth(costPerConv) : undefined} />
          <MetricCard label="CTR" value={fmtPercent(m.ctr)} highlight="violet"
            health={hasData ? ctrHealth(m.ctr) : undefined} />
          <MetricCard label="CPM" value={hasData ? fmtCurrency(m.cpm) : '—'}
            health={hasData ? cpmHealth(m.cpm) : undefined}
            sub={`CPC ${m.clicks > 0 ? fmtCurrency(m.spend / m.clicks) : '—'}`} highlight="amber" />
        </div>
      ) : template === 'leads' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Gasto" value={fmtCurrency(m.spend)} prominent highlight="blue"
            trend={trendPct(m.spend, p.spend)} sub="no período" />
          <MetricCard label="Leads" value={fmtCompact(m.leads)}
            trend={trendPct(m.leads, p.leads)} highlight="violet"
            sub={cpl > 0 ? `CPL: ${fmtCurrency(cpl)}` : undefined}
            health={cpl > 0 ? cplHealth(cpl) : undefined} />
          <MetricCard label="Pág. Views" value={fmtCompact(m.page_views)} highlight="emerald"
            sub={`Cliques: ${fmtCompact(m.clicks)}`} />
          <MetricCard label="CTR" value={fmtPercent(m.ctr)}
            health={hasData ? ctrHealth(m.ctr) : undefined}
            sub={`CPM: ${hasData ? fmtCurrency(m.cpm) : '—'}`} highlight="amber" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Gasto" value={fmtCurrency(m.spend)} prominent highlight="blue"
            trend={trendPct(m.spend, p.spend)} sub="no período" />
          <MetricCard label="Impressões" value={fmtCompact(m.impressions)}
            trend={trendPct(m.impressions, p.impressions)} highlight="violet"
            sub={`Alcance: ${fmtCompact(m.reach)}`} />
          <MetricCard label="Cliques" value={fmtCompact(m.clicks)}
            trend={trendPct(m.clicks, p.clicks)} highlight="emerald"
            sub={`CTR: ${fmtPercent(m.ctr)}`}
            health={hasData ? ctrHealth(m.ctr) : undefined} />
          <MetricCard label="CPM" value={hasData ? fmtCurrency(m.cpm) : '—'}
            health={hasData ? cpmHealth(m.cpm) : undefined}
            sub={`Freq: ${m.frequency > 0 ? m.frequency.toFixed(1) : '—'}`}
            highlight="amber" />
        </div>
      )}

      {/* Métricas secundárias */}
      {hasData && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">Frequência</p>
            <div className="flex items-center gap-1">
              {m.frequency > 0 && <HealthDot level={frequencyHealth(m.frequency)} />}
              <p className="text-sm font-bold tabular-nums text-zinc-200">{m.frequency > 0 ? m.frequency.toFixed(1) : '—'}</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">Alcance</p>
            <p className="text-sm font-bold tabular-nums text-zinc-200">{fmtCompact(m.reach)}</p>
          </div>
          <div className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">CTR</p>
            <div className="flex items-center gap-1">
              <HealthDot level={ctrHealth(m.ctr)} />
              <p className="text-sm font-bold tabular-nums text-zinc-200">{fmtPercent(m.ctr)}</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">CPA</p>
            <p className="text-sm font-bold tabular-nums text-zinc-200">{m.cpa > 0 ? fmtCurrency(m.cpa) : '—'}</p>
          </div>
          <div className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">ROAS</p>
            <p className={`text-sm font-bold tabular-nums ${m.roas > 1 ? 'text-amber-400' : 'text-zinc-500'}`}>{m.roas > 0 ? `${m.roas.toFixed(2)}x` : '—'}</p>
          </div>
          <div className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">CPM</p>
            <div className="flex items-center gap-1">
              <HealthDot level={cpmHealth(m.cpm)} />
              <p className="text-sm font-bold tabular-nums text-zinc-200">{fmtCurrency(m.cpm)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <PerformanceChart data={chartData} />

      {/* Ad Sets */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Conjuntos de Anúncios</h2>
          <span className="text-xs text-zinc-600 tabular-nums">
            {adSets.length} {adSets.length === 1 ? 'conjunto' : 'conjuntos'}
          </span>
          <div className="flex-1 h-px bg-white/[0.05]" />
        </div>

        {adSets.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#111115] p-10 text-center">
            <div className="mx-auto w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 font-medium">Nenhum conjunto de anúncios</p>
            <p className="text-xs text-zinc-600 mt-1">Período sem dados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {adSets.map(adSet => (
              <AdSetCard key={adSet.id} adSet={adSet} campaignId={campaignId} filters={filtersStr} />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/${filtersStr ? `?${filtersStr}` : ''}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar às campanhas
      </Link>
    </div>
  )
}
