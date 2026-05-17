import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCampaignById, getAdSetById, getAdsWithMetrics, getAdSetMetrics } from '@/lib/supabase/queries'
import { trendPct, cpmHealth, ctrHealth, frequencyHealth, costPerConvHealth, cplHealth, type HealthLevel } from '@/types/dashboard'
import Breadcrumb from '@/components/campaigns/Breadcrumb'
import AdCard from '@/components/campaigns/AdCard'
import type { DashboardFilters } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ campaignId: string; adSetId: string }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { adSetId } = await params
  const adSet = await getAdSetById(adSetId)
  return { title: adSet?.name ?? 'Conjunto de Anúncios' }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtPercent(v: number) { return `${v.toFixed(2)}%` }

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
  label, value, sub, trend, trendInvert, health, highlight
}: {
  label: string; value: string; sub?: string; trend?: number | null; trendInvert?: boolean
  health?: HealthLevel; highlight?: 'blue' | 'emerald' | 'violet' | 'amber'
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
        <span className="text-xl font-black tabular-nums tracking-tight leading-none text-white">{value}</span>
        {trend !== undefined && <Trend pct={trend ?? null} invert={trendInvert} />}
      </div>
      {sub && <p className="text-[10px] text-zinc-600 mt-1.5">{sub}</p>}
    </div>
  )
}

export default async function AdSetPage({ params, searchParams }: PageProps) {
  const { campaignId, adSetId } = await params
  const sp = await searchParams

  const filters: Partial<DashboardFilters> = { since: sp.since, until: sp.until }
  const filtersStr = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v))
  ).toString()

  const [campaign, adSet, ads, metrics] = await Promise.all([
    getCampaignById(campaignId),
    getAdSetById(adSetId),
    getAdsWithMetrics(adSetId, filters),
    getAdSetMetrics(adSetId, filters),
  ])

  if (!campaign || !adSet) notFound()

  const { current: m, prev: p } = metrics
  const hasData = m.spend > 0 || m.impressions > 0
  const isActive = adSet.status === 'ACTIVE'

  // Detecta template pelos dados
  const template = m.conversations > 0 || m.messages_sent > 0 ? 'wpp'
    : m.leads > 0 ? 'leads'
    : 'default'

  const cpl = m.leads > 0 && m.spend > 0 ? m.spend / m.leads : 0
  const costPerConv = m.conversations > 0 && m.spend > 0 ? m.spend / m.conversations : 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: 'Campanhas', href: '/' },
            { label: campaign.name, href: `/campaigns/${campaignId}` },
            { label: adSet.name }
          ]}
          filters={filtersStr}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold text-white tracking-tight">{adSet.name}</h1>
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-zinc-600'}`} />
            <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {isActive ? 'Ativo' : 'Pausado'}
            </span>
          </div>
          {template === 'wpp' && (
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase">WPP</span>
          )}
          {template === 'leads' && (
            <span className="text-[10px] font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md uppercase">Leads</span>
          )}
          {adSet.daily_budget && adSet.daily_budget > 0 && (
            <span className="text-xs text-zinc-500 bg-white/[0.04] border border-white/[0.05] rounded-lg px-2.5 py-1">
              Orçamento diário: {fmtCurrency(adSet.daily_budget / 100)}
            </span>
          )}
        </div>
      </div>

      {/* Métricas de resumo — template-aware */}
      {template === 'wpp' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Gasto" value={fmtCurrency(m.spend)} highlight="blue"
            trend={trendPct(m.spend, p.spend)} sub="no período" />
          <MetricCard label="Conversas" value={fmtCompact(m.conversations)}
            trend={trendPct(m.conversations, p.conversations)} highlight="emerald"
            sub={costPerConv > 0 ? `CPconv: ${fmtCurrency(costPerConv)}` : undefined}
            health={costPerConv > 0 ? costPerConvHealth(costPerConv) : undefined} />
          <MetricCard label="Mensagens" value={fmtCompact(m.messages_sent)} highlight="violet" />
          <MetricCard label="CPM" value={hasData ? fmtCurrency(m.cpm) : '—'}
            health={hasData ? cpmHealth(m.cpm) : undefined} highlight="amber"
            sub={`CTR ${fmtPercent(m.ctr)}`} />
        </div>
      ) : template === 'leads' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Gasto" value={fmtCurrency(m.spend)} highlight="blue"
            trend={trendPct(m.spend, p.spend)} sub="no período" />
          <MetricCard label="Leads" value={fmtCompact(m.leads)}
            trend={trendPct(m.leads, p.leads)} highlight="violet"
            sub={cpl > 0 ? `CPL: ${fmtCurrency(cpl)}` : undefined}
            health={cpl > 0 ? cplHealth(cpl) : undefined} />
          <MetricCard label="Pág. Views" value={fmtCompact(m.page_views)} highlight="emerald"
            sub={`Cliques: ${fmtCompact(m.clicks)}`} />
          <MetricCard label="CTR" value={fmtPercent(m.ctr)}
            health={hasData ? ctrHealth(m.ctr) : undefined} highlight="amber"
            sub={`CPM: ${hasData ? fmtCurrency(m.cpm) : '—'}`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Gasto" value={fmtCurrency(m.spend)} highlight="blue"
            trend={trendPct(m.spend, p.spend)} sub="no período" />
          <MetricCard label="Impressões" value={fmtCompact(m.impressions)}
            trend={trendPct(m.impressions, p.impressions)} highlight="violet"
            sub={`Alcance: ${fmtCompact(m.reach)}`} />
          <MetricCard label="Cliques" value={fmtCompact(m.clicks)}
            trend={trendPct(m.clicks, p.clicks)} highlight="emerald"
            sub={`CTR: ${fmtPercent(m.ctr)}`}
            health={hasData ? ctrHealth(m.ctr) : undefined} />
          <MetricCard label="CPM" value={hasData ? fmtCurrency(m.cpm) : '—'}
            health={hasData ? cpmHealth(m.cpm) : undefined} highlight="amber" />
        </div>
      )}

      {/* Métricas secundárias */}
      {hasData && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Frequência', value: m.frequency > 0 ? m.frequency.toFixed(1) : '—', health: m.frequency > 0 ? frequencyHealth(m.frequency) : undefined },
            { label: 'Alcance', value: fmtCompact(m.reach) },
            { label: 'CTR', value: fmtPercent(m.ctr), health: ctrHealth(m.ctr) as HealthLevel },
            { label: 'CPA', value: m.cpa > 0 ? fmtCurrency(m.cpa) : '—' },
            { label: 'ROAS', value: m.roas > 0 ? `${m.roas.toFixed(2)}x` : '—' },
            { label: 'CPM', value: fmtCurrency(m.cpm), health: cpmHealth(m.cpm) as HealthLevel },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-[#111115] border border-white/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-widest text-zinc-700 mb-1">{item.label}</p>
              <div className="flex items-center gap-1">
                {item.health && <HealthDot level={item.health} />}
                <p className={`text-sm font-bold tabular-nums ${item.label === 'ROAS' && m.roas > 1 ? 'text-amber-400' : 'text-zinc-200'}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ads */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Anúncios</h2>
          <span className="text-xs text-zinc-600 tabular-nums">
            {ads.length} {ads.length === 1 ? 'anúncio' : 'anúncios'}
          </span>
          <div className="flex-1 h-px bg-white/[0.05]" />
        </div>

        {ads.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#111115] p-10 text-center">
            <p className="text-sm text-zinc-500 font-medium">Nenhum anúncio encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ads.map(ad => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/campaigns/${campaignId}${filtersStr ? `?${filtersStr}` : ''}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar à campanha
      </Link>
    </div>
  )
}
