import Link from 'next/link'
import type { AdSetWithMetrics, HealthLevel } from '@/types/dashboard'
import { cpmHealth, ctrHealth, frequencyHealth, costPerConvHealth, cplHealth } from '@/types/dashboard'

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtPercent(v: number) { return `${v.toFixed(2)}%` }

type Template = 'wpp' | 'leads' | 'default'

function detectTemplate(s: AdSetWithMetrics): Template {
  if (s.conversations > 0 || s.messages_sent > 0) return 'wpp'
  if (s.leads > 0) return 'leads'
  return 'default'
}

function HealthDot({ level }: { level: HealthLevel }) {
  const c: Record<HealthLevel, string> = {
    good: 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]',
    warning: 'bg-amber-400',
    bad: 'bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.5)]',
    neutral: ''
  }
  if (level === 'neutral') return null
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${c[level]}`} />
}

type MetricDef = { label: string; value: string; muted?: boolean; health?: HealthLevel }

function MetricCell({ label, value, muted, health }: MetricDef) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 font-medium">{label}</p>
      <div className="flex items-center gap-1.5">
        {health && health !== 'neutral' && <HealthDot level={health} />}
        <span className={`text-sm font-semibold tabular-nums ${muted ? 'text-zinc-700' : 'text-zinc-100'}`}>{value}</span>
      </div>
    </div>
  )
}

interface AdSetCardProps {
  adSet: AdSetWithMetrics
  campaignId: string
  filters?: string
}

export default function AdSetCard({ adSet, campaignId, filters }: AdSetCardProps) {
  const hasData = adSet.spend > 0 || adSet.impressions > 0
  const isActive = adSet.status === 'ACTIVE'
  const template = hasData ? detectTemplate(adSet) : 'default'

  const dotColor = isActive
    ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]'
    : 'bg-zinc-600'

  const accentBar = isActive
    ? template === 'wpp' ? 'bg-emerald-500' : template === 'leads' ? 'bg-violet-500' : 'bg-blue-500'
    : 'bg-white/[0.06]'

  const primaryMetrics: MetricDef[] = (() => {
    if (!hasData) return []
    if (template === 'wpp') {
      const costPerConv = adSet.spend > 0 && adSet.conversations > 0 ? adSet.spend / adSet.conversations : 0
      return [
        { label: 'Conversas', value: fmtCompact(adSet.conversations), muted: adSet.conversations === 0 },
        { label: 'Custo/Conv', value: costPerConv > 0 ? fmtCurrency(costPerConv) : '—', muted: costPerConv === 0, health: costPerConv > 0 ? costPerConvHealth(costPerConv) : undefined },
        { label: 'Mensagens', value: fmtCompact(adSet.messages_sent), muted: adSet.messages_sent === 0 },
        { label: 'CPM', value: fmtCurrency(adSet.cpm), health: cpmHealth(adSet.cpm) },
      ]
    }
    if (template === 'leads') {
      const cpl = adSet.leads > 0 && adSet.spend > 0 ? adSet.spend / adSet.leads : 0
      return [
        { label: 'Leads', value: fmtCompact(adSet.leads), muted: adSet.leads === 0 },
        { label: 'CPL', value: cpl > 0 ? fmtCurrency(cpl) : '—', muted: cpl === 0, health: cpl > 0 ? cplHealth(cpl) : undefined },
        { label: 'Pág. Views', value: fmtCompact(adSet.page_views), muted: adSet.page_views === 0 },
        { label: 'CTR', value: fmtPercent(adSet.ctr), health: ctrHealth(adSet.ctr) },
      ]
    }
    return [
      { label: 'Impressões', value: fmtCompact(adSet.impressions) },
      { label: 'Cliques', value: fmtCompact(adSet.clicks) },
      { label: 'CTR', value: fmtPercent(adSet.ctr), health: ctrHealth(adSet.ctr) },
      { label: 'CPM', value: fmtCurrency(adSet.cpm), health: cpmHealth(adSet.cpm) },
    ]
  })()

  return (
    <Link
      href={`/campaigns/${campaignId}/ad-sets/${adSet.id}${filters ? `?${filters}` : ''}`}
      className="group relative block rounded-2xl bg-[#111115] border border-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-200 overflow-hidden"
    >
      {/* Acento lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentBar}`} />

      <div className="pl-5 pr-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white leading-snug">
                {adSet.name}
              </h3>
              {adSet.daily_budget && adSet.daily_budget > 0 && (
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Orçamento diário: {fmtCurrency(adSet.daily_budget / 100)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {adSet.roas > 1 && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded-md tabular-nums">
                {adSet.roas.toFixed(1)}x ROAS
              </span>
            )}
            <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {isActive ? 'Ativo' : 'Pausado'}
            </span>
          </div>
        </div>

        {/* Spend */}
        {hasData ? (
          <div className="mb-4">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">
              {fmtCurrency(adSet.spend)}
            </span>
            <p className="text-[10px] text-zinc-600 mt-0.5">gastos no período</p>
          </div>
        ) : (
          <p className="text-xs text-zinc-700 italic mb-4">Sem dados no período selecionado</p>
        )}

        {/* Métricas primárias */}
        {primaryMetrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-3">
            {primaryMetrics.map(m => (
              <MetricCell key={m.label} {...m} />
            ))}
          </div>
        )}

        {/* Métricas secundárias */}
        {hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pt-3 border-t border-white/[0.05]">
            <MetricCell label="Alcance" value={fmtCompact(adSet.reach)} muted={adSet.reach === 0} />
            <MetricCell
              label="Frequência"
              value={adSet.frequency > 0 ? adSet.frequency.toFixed(1) : '—'}
              muted={adSet.frequency === 0}
              health={adSet.frequency > 0 ? frequencyHealth(adSet.frequency) : undefined}
            />
            {template === 'default' && (
              <>
                <MetricCell label="CPA" value={adSet.cpa > 0 ? fmtCurrency(adSet.cpa) : '—'} muted={adSet.cpa === 0} />
                <MetricCell label="ROAS" value={adSet.roas > 0 ? `${adSet.roas.toFixed(2)}x` : '—'} muted={adSet.roas === 0} />
              </>
            )}
            {template === 'wpp' && (
              <MetricCell label="Impressões" value={fmtCompact(adSet.impressions)} muted={!hasData} />
            )}
            {template === 'leads' && (
              <MetricCell label="CPM" value={fmtCurrency(adSet.cpm)} health={cpmHealth(adSet.cpm)} />
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.04] px-5 py-2.5 flex items-center justify-end bg-[#0D0E12]">
        <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors flex items-center gap-1">
          Ver anúncios
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
