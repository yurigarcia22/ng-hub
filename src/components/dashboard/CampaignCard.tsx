import Link from 'next/link'
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

function detectTemplate(c: CampaignWithMetrics): CampaignTemplate {
  const obj = (c.objective ?? '').toUpperCase()
  const name = c.name.toUpperCase()
  if (obj.includes('MESSAGES') || obj.includes('OUTCOME_ENGAGEMENT') || name.includes('WPP') || name.includes('WHATSAPP') || name.includes('MENSAGEM') || name.includes('MSG') || c.conversations > 0 || c.messages_sent > 0) return 'wpp'
  if (obj.includes('LEAD') || obj.includes('OUTCOME_LEADS') || obj.includes('CONVERSIONS') || obj.includes('OUTCOME_SALES') || name.includes('LEAD') || name.includes('FORM') || c.leads > 0) return 'leads'
  return 'default'
}

const ACCENT: Record<CampaignTemplate, string> = {
  wpp: 'bg-emerald-500',
  leads: 'bg-violet-500',
  default: 'bg-blue-500',
}

function HealthDot({ level }: { level: HealthLevel }) {
  const c: Record<HealthLevel, string> = { good: 'bg-emerald-500', warning: 'bg-amber-400', bad: 'bg-red-500', neutral: '' }
  if (level === 'neutral') return null
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${c[level]}`} />
}

function Trend({ pct, invert = false, size = 'sm' }: { pct: number | null; invert?: boolean; size?: 'sm' | 'xs' }) {
  if (pct === null) return null
  const abs = Math.abs(pct)
  if (abs < 0.5) return null
  const isPos = pct > 0
  const isGood = invert ? !isPos : isPos
  const cls = `${size === 'xs' ? 'text-[10px]' : 'text-xs'} font-semibold tabular-nums ${isGood ? 'text-emerald-600' : 'text-red-500'}`
  return <span className={cls}>{isPos ? '↑' : '↓'}{abs.toFixed(0)}%</span>
}

function TemplateBadge({ template }: { template: CampaignTemplate }) {
  if (template === 'wpp') return (
    <span className="text-[10px] font-bold tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase">WPP</span>
  )
  if (template === 'leads') return (
    <span className="text-[10px] font-bold tracking-widest text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md uppercase">Leads</span>
  )
  return null
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  const paused = status === 'PAUSED'
  const dot = active ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : paused ? 'bg-slate-300' : 'bg-red-400'
  const text = active ? 'text-emerald-600' : paused ? 'text-slate-400' : 'text-red-500'
  const label = active ? 'Ativo' : paused ? 'Pausado' : status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className={`text-xs font-medium ${text}`}>{label}</span>
    </div>
  )
}

type MetricDef = { label: string; value: string; muted?: boolean; health?: HealthLevel; trend?: number | null; trendInvert?: boolean }

function MetricCell({ label, value, muted, health, trend, trendInvert }: MetricDef) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 font-medium">{label}</p>
      <div className="flex items-center gap-1.5">
        {health && health !== 'neutral' && <HealthDot level={health} />}
        <span className={`text-sm font-semibold tabular-nums ${muted ? 'text-slate-300' : 'text-slate-800'}`}>{value}</span>
        {trend !== undefined && trend !== null && <Trend pct={trend} invert={trendInvert} size="xs" />}
      </div>
    </div>
  )
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
  const accentBar = isActive ? ACCENT[template] : 'bg-slate-200'

  const primaryMetrics: MetricDef[] = (() => {
    if (template === 'wpp') {
      const costPerConv = campaign.spend > 0 && campaign.conversations > 0 ? campaign.spend / campaign.conversations : 0
      const hasWpp = campaign.conversations > 0 || campaign.messages_sent > 0
      return [
        { label: 'Conversas', value: fmtCompact(campaign.conversations), muted: !hasWpp, trend: trendPct(campaign.conversations, campaign.prev_conversations) },
        { label: 'Custo/Conv', value: costPerConv > 0 ? fmtCurrency(costPerConv) : '—', muted: costPerConv === 0, health: costPerConv > 0 ? costPerConvHealth(costPerConv) : undefined, trendInvert: true },
        { label: 'Mensagens', value: fmtCompact(campaign.messages_sent), muted: campaign.messages_sent === 0 },
        { label: 'CPM', value: hasData ? fmtCurrency(campaign.cpm) : '—', muted: !hasData, health: hasData ? cpmHealth(campaign.cpm) : undefined, trendInvert: true },
      ]
    }
    if (template === 'leads') {
      const cpl = campaign.leads > 0 && campaign.spend > 0 ? campaign.spend / campaign.leads : 0
      const hasLeads = campaign.leads > 0 || campaign.page_views > 0
      return [
        { label: 'Leads', value: fmtCompact(campaign.leads), muted: !hasLeads, trend: trendPct(campaign.leads, campaign.prev_leads) },
        { label: 'CPL', value: cpl > 0 ? fmtCurrency(cpl) : '—', muted: cpl === 0, health: cpl > 0 ? cplHealth(cpl) : undefined, trendInvert: true },
        { label: 'Pág. Views', value: fmtCompact(campaign.page_views), muted: campaign.page_views === 0 },
        { label: 'CTR', value: fmtPercent(campaign.ctr), muted: !hasData, health: hasData ? ctrHealth(campaign.ctr) : undefined },
      ]
    }
    return [
      { label: 'Impressões', value: fmtCompact(campaign.impressions), muted: !hasData, trend: trendPct(campaign.impressions, campaign.prev_impressions) },
      { label: 'Cliques', value: fmtCompact(campaign.clicks), muted: !hasData, trend: trendPct(campaign.clicks, campaign.prev_clicks) },
      { label: 'CTR', value: fmtPercent(campaign.ctr), muted: !hasData, health: hasData ? ctrHealth(campaign.ctr) : undefined },
      { label: 'CPM', value: fmtCurrency(campaign.cpm), muted: !hasData, health: hasData ? cpmHealth(campaign.cpm) : undefined, trendInvert: true },
    ]
  })()

  const freqHealth = campaign.frequency > 0 ? frequencyHealth(campaign.frequency) : undefined
  const freqVal = campaign.frequency > 0 ? campaign.frequency.toFixed(1) : '—'

  return (
    <Link
      href={`/campaigns/${campaign.id}${filters ? `?${filters}` : ''}`}
      className="group relative block rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm transition-all duration-200 overflow-hidden"
    >
      {/* Acento lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentBar}`} />

      <div className="pl-5 pr-5 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <TemplateBadge template={template} />
              <h3 className="text-sm font-semibold text-slate-800 truncate leading-snug">
                {campaign.name}
              </h3>
            </div>
            {campaign.objective && (
              <p className="text-[11px] text-slate-400 truncate">{campaign.objective}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {hasRoas && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md tabular-nums">{campaign.roas.toFixed(1)}x ROAS</span>
            )}
            <StatusBadge status={campaign.status} />
          </div>
        </div>

        {/* Spend herói */}
        {hasData ? (
          <div className="mb-4">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[1.85rem] font-black text-slate-900 tabular-nums tracking-tight leading-none">
                {fmtCurrency(campaign.spend)}
              </span>
              <Trend pct={spendTrend} />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">gastos no período</p>
          </div>
        ) : (
          <p className="text-sm text-slate-300 italic mb-4">Sem dados no período selecionado</p>
        )}

        {/* Métricas primárias */}
        {hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pb-4">
            {primaryMetrics.map(m => (
              <MetricCell key={m.label} {...m} />
            ))}
          </div>
        )}

        {/* Métricas secundárias */}
        {hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pb-4 pt-3 border-t border-slate-100">
            <MetricCell label="Frequência" value={freqVal} muted={campaign.frequency === 0} health={freqHealth} trendInvert />
            <MetricCell label="Alcance" value={fmtCompact(campaign.reach)} muted={campaign.reach === 0} />
            {template === 'default' && (
              <>
                <MetricCell label="CPA" value={campaign.cpa > 0 ? fmtCurrency(campaign.cpa) : '—'} muted={campaign.cpa === 0} />
                <MetricCell label="ROAS" value={campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'} muted={campaign.roas === 0} />
              </>
            )}
            {template === 'wpp' && (
              <MetricCell label="Impressões" value={fmtCompact(campaign.impressions)} muted={!hasData} trend={trendPct(campaign.impressions, campaign.prev_impressions)} />
            )}
            {template === 'leads' && (
              <MetricCell label="CPA" value={campaign.cpa > 0 ? fmtCurrency(campaign.cpa) : '—'} muted={campaign.cpa === 0} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-2.5 flex items-center justify-end bg-slate-50/50">
        <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-1">
          Ver conjuntos
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
