import Link from 'next/link'
import MetricsBadge from './MetricsBadge'
import type { CampaignWithMetrics, HealthLevel } from '@/types/dashboard'
import { cpmHealth, ctrHealth, frequencyHealth, costPerConvHealth, cplHealth, trendPct } from '@/types/dashboard'

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtPercent(v: number) {
  return `${v.toFixed(2)}%`
}

type CampaignTemplate = 'wpp' | 'leads' | 'default'

function detectTemplate(campaign: CampaignWithMetrics): CampaignTemplate {
  const objective = (campaign.objective ?? '').toUpperCase()
  const name = campaign.name.toUpperCase()
  if (
    objective.includes('MESSAGES') ||
    objective.includes('OUTCOME_ENGAGEMENT') ||
    name.includes('WPP') ||
    name.includes('WHATSAPP') ||
    name.includes('MENSAGEM') ||
    name.includes('MSG') ||
    campaign.conversations > 0 ||
    campaign.messages_sent > 0
  ) return 'wpp'
  if (
    objective.includes('LEAD') ||
    objective.includes('OUTCOME_LEADS') ||
    objective.includes('CONVERSIONS') ||
    objective.includes('OUTCOME_SALES') ||
    name.includes('LEAD') ||
    name.includes('FORM') ||
    campaign.leads > 0
  ) return 'leads'
  return 'default'
}

function healthColor(level: HealthLevel): string {
  if (level === 'good') return 'text-emerald-400'
  if (level === 'warning') return 'text-amber-400'
  if (level === 'bad') return 'text-red-400'
  return 'text-zinc-600'
}

function TrendPill({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null
  const abs = Math.abs(pct)
  if (abs < 0.5) return null
  const isPositive = pct > 0
  const isGood = invert ? !isPositive : isPositive
  return (
    <span className={`text-[10px] font-medium tabular-nums ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? '↑' : '↓'}{abs.toFixed(0)}%
    </span>
  )
}

interface MetricItemProps {
  label: string
  value: string
  muted?: boolean
  highlight?: boolean
  health?: HealthLevel
  trend?: number | null
  trendInvert?: boolean
}

function MetricItem({ label, value, muted, highlight, health, trend, trendInvert }: MetricItemProps) {
  const colorClass = muted
    ? 'text-zinc-600'
    : health
    ? healthColor(health)
    : highlight
    ? 'text-emerald-400'
    : 'text-zinc-100'

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-sm font-semibold tabular-nums ${colorClass}`}>{value}</p>
        {trend !== undefined && trend !== null && <TrendPill pct={trend} invert={trendInvert} />}
      </div>
    </div>
  )
}

function TemplateBadge({ template }: { template: CampaignTemplate }) {
  if (template === 'wpp') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        WPP
      </span>
    )
  }
  if (template === 'leads') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Leads
      </span>
    )
  }
  return null
}

interface CampaignCardProps {
  campaign: CampaignWithMetrics
  filters?: string
}

export default function CampaignCard({ campaign, filters }: CampaignCardProps) {
  const hasData = campaign.spend > 0 || campaign.impressions > 0
  const isActive = campaign.status === 'ACTIVE'
  const template = detectTemplate(campaign)
  const hasRoas = campaign.roas > 1

  const spendTrend = trendPct(campaign.spend, campaign.prev_spend)

  type MetricDef = { label: string; value: string; muted?: boolean; highlight?: boolean; health?: HealthLevel; trend?: number | null; trendInvert?: boolean }

  // Métricas principais por template
  const primaryMetrics: MetricDef[] = (() => {
    if (template === 'wpp') {
      const hasWppData = campaign.conversations > 0 || campaign.messages_sent > 0
      const costPerConv = campaign.spend > 0 && campaign.conversations > 0
        ? campaign.spend / campaign.conversations
        : 0
      return [
        {
          label: 'Conversas',
          value: fmtCompact(campaign.conversations),
          muted: !hasWppData,
          highlight: hasWppData && campaign.conversations > 0,
          trend: trendPct(campaign.conversations, campaign.prev_conversations),
        },
        {
          label: 'Custo/Conversa',
          value: costPerConv > 0 ? fmtCurrency(costPerConv) : '—',
          muted: costPerConv === 0,
          health: costPerConv > 0 ? costPerConvHealth(costPerConv) : undefined,
          trendInvert: true,
        },
        {
          label: 'Mensagens',
          value: fmtCompact(campaign.messages_sent),
          muted: campaign.messages_sent === 0,
        },
        {
          label: 'CPM',
          value: fmtCurrency(campaign.cpm),
          muted: !hasData,
          health: hasData ? cpmHealth(campaign.cpm) : undefined,
          trendInvert: true,
        },
      ]
    }

    if (template === 'leads') {
      const cpl = campaign.leads > 0 && campaign.spend > 0 ? campaign.spend / campaign.leads : 0
      const hasLeadsData = campaign.leads > 0 || campaign.page_views > 0
      return [
        {
          label: 'Leads',
          value: fmtCompact(campaign.leads),
          muted: !hasLeadsData,
          highlight: campaign.leads > 0,
          trend: trendPct(campaign.leads, campaign.prev_leads),
        },
        {
          label: 'CPL',
          value: cpl > 0 ? fmtCurrency(cpl) : '—',
          muted: cpl === 0,
          health: cpl > 0 ? cplHealth(cpl) : undefined,
          trendInvert: true,
        },
        {
          label: 'Visualiz. Página',
          value: fmtCompact(campaign.page_views),
          muted: campaign.page_views === 0,
        },
        {
          label: 'CTR',
          value: fmtPercent(campaign.ctr),
          muted: !hasData,
          health: hasData ? ctrHealth(campaign.ctr) : undefined,
        },
      ]
    }

    return [
      {
        label: 'Impressões',
        value: fmtCompact(campaign.impressions),
        muted: !hasData,
        trend: trendPct(campaign.impressions, campaign.prev_impressions),
      },
      {
        label: 'Cliques',
        value: fmtCompact(campaign.clicks),
        muted: !hasData,
        trend: trendPct(campaign.clicks, campaign.prev_clicks),
      },
      {
        label: 'CTR',
        value: fmtPercent(campaign.ctr),
        muted: !hasData,
        health: hasData ? ctrHealth(campaign.ctr) : undefined,
      },
      {
        label: 'CPM',
        value: fmtCurrency(campaign.cpm),
        muted: !hasData,
        health: hasData ? cpmHealth(campaign.cpm) : undefined,
        trendInvert: true,
      },
    ]
  })()

  const freqValue = campaign.frequency > 0 ? campaign.frequency.toFixed(1) : '—'
  const freqHealth = campaign.frequency > 0 ? frequencyHealth(campaign.frequency) : undefined

  return (
    <Link
      href={`/campaigns/${campaign.id}${filters ? `?${filters}` : ''}`}
      className="group block rounded-xl border border-zinc-800/60 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700/80 transition-all duration-150"
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-zinc-700'}`} />
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-zinc-100 truncate group-hover:text-white leading-snug">
                {campaign.name}
              </h3>
              {campaign.objective && (
                <p className="text-xs text-zinc-600 mt-0.5 truncate">{campaign.objective}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TemplateBadge template={template} />
            {hasRoas && template !== 'leads' && (
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md tabular-nums">
                {campaign.roas.toFixed(1)}x ROAS
              </span>
            )}
            <MetricsBadge status={campaign.status} />
          </div>
        </div>

        {/* Primary metric: Spend + trend */}
        {hasData && (
          <div className="mb-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums">
              {fmtCurrency(campaign.spend)}
            </span>
            <span className="text-xs text-zinc-600">gastos</span>
            <TrendPill pct={spendTrend} />
          </div>
        )}

        {/* Metrics grid — template aware */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {primaryMetrics.map(m => (
            <MetricItem
              key={m.label}
              label={m.label}
              value={m.value}
              muted={m.muted}
              highlight={m.highlight}
              health={m.health}
              trend={m.trend}
              trendInvert={m.trendInvert}
            />
          ))}
        </div>

        {/* Secondary row: Frequência + extras */}
        {hasData && template === 'default' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3.5 pt-3.5 border-t border-zinc-800/60">
            <MetricItem
              label="Frequência"
              value={freqValue}
              muted={campaign.frequency === 0}
              health={freqHealth}
              trendInvert
            />
            <MetricItem label="CPA" value={campaign.cpa > 0 ? fmtCurrency(campaign.cpa) : '—'} muted={campaign.cpa === 0} />
            <MetricItem label="ROAS" value={campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'} muted={campaign.roas === 0} highlight={hasRoas} />
            <MetricItem label="Alcance" value={fmtCompact(campaign.reach)} muted={campaign.reach === 0} />
          </div>
        )}

        {hasData && template === 'wpp' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3.5 pt-3.5 border-t border-zinc-800/60">
            <MetricItem label="Frequência" value={freqValue} muted={campaign.frequency === 0} health={freqHealth} trendInvert />
            <MetricItem label="Alcance" value={fmtCompact(campaign.reach)} muted={campaign.reach === 0} />
            <MetricItem label="Impressões" value={fmtCompact(campaign.impressions)} muted={!hasData} trend={trendPct(campaign.impressions, campaign.prev_impressions)} />
          </div>
        )}

        {hasData && template === 'leads' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3.5 pt-3.5 border-t border-zinc-800/60">
            <MetricItem label="Frequência" value={freqValue} muted={campaign.frequency === 0} health={freqHealth} trendInvert />
            {campaign.roas > 0
              ? <MetricItem label="ROAS" value={`${campaign.roas.toFixed(2)}x`} highlight={hasRoas} />
              : <MetricItem label="Alcance" value={fmtCompact(campaign.reach)} muted={campaign.reach === 0} />
            }
            <MetricItem label="CPA" value={campaign.cpa > 0 ? fmtCurrency(campaign.cpa) : '—'} muted={campaign.cpa === 0} />
          </div>
        )}

        {/* No data state */}
        {!hasData && (
          <p className="text-xs text-zinc-700 mt-2 italic">Sem dados no período selecionado</p>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-5 py-2.5 border-t border-zinc-800/40 flex items-center justify-end">
        <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors flex items-center gap-1">
          Ver conjuntos
          <svg className="w-3 h-3 -translate-x-0.5 group-hover:translate-x-0 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
