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
  const c: Record<HealthLevel, string> = {
    good: 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]',
    warning: 'bg-amber-400',
    bad: 'bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.5)]',
    neutral: ''
  }
  if (level === 'neutral') return null
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${c[level]}`} />
}

function Trend({ pct, invert = false, size = 'sm' }: { pct: number | null; invert?: boolean; size?: 'sm' | 'xs' }) {
  if (pct === null) return null
  const abs = Math.abs(pct)
  if (abs < 0.5) return null
  const isPos = pct > 0
  const isGood = invert ? !isPos : isPos
  const cls = `${size === 'xs' ? 'text-[10px]' : 'text-xs'} font-semibold tabular-nums ${isGood ? 'text-emerald-400' : 'text-red-400'}`
  return <span className={cls}>{isPos ? '↑' : '↓'}{abs.toFixed(0)}%</span>
}

function TemplateBadge({ template }: { template: CampaignTemplate }) {
  if (template === 'wpp') return (
    <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md uppercase">WPP</span>
  )
  if (template === 'leads') return (
    <span className="text-[10px] font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md uppercase">Leads</span>
  )
  return null
}

function StatusBadge({ status }: { status: string }) {
  const isPaused = status === 'PAUSED' || status === 'CAMPAIGN_PAUSED' || status === 'ADSET_PAUSED'
  const isIssue = status === 'WITH_ISSUES'
  const isCompleted = status === 'COMPLETED'
  const isActive = status === 'ACTIVE'

  const dot = isActive
    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
    : isIssue ? 'bg-amber-400'
    : isPaused || isCompleted ? 'bg-zinc-600'
    : 'bg-red-500'

  const text = isActive ? 'text-emerald-400'
    : isIssue ? 'text-amber-400'
    : isPaused || isCompleted ? 'text-zinc-500'
    : 'text-red-400'

  const label = isActive ? 'Ativo'
    : isPaused ? 'Pausado'
    : isCompleted ? 'Concluída'
    : isIssue ? 'Erro pagam.'
    : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')

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
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 font-medium">{label}</p>
      <div className="flex items-center gap-1.5">
        {health && health !== 'neutral' && <HealthDot level={health} />}
        <span className={`text-sm font-semibold tabular-nums ${muted ? 'text-zinc-700' : 'text-zinc-100'}`}>{value}</span>
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
  const effectiveStatus = campaign.effective_status ?? campaign.status
  const isActive = effectiveStatus === 'ACTIVE'
  const template = detectTemplate(campaign)
  const hasRoas = campaign.roas > 1
  const spendTrend = trendPct(campaign.spend, campaign.prev_spend)
  const accentBar = isActive ? ACCENT[template] : 'bg-white/[0.08]'

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
      className="group relative block rounded-2xl bg-[#111115] border border-white/[0.05] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 overflow-hidden"
    >
      {/* Acento lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentBar} transition-all duration-300 group-hover:w-[4px]`} />
      {/* Top highlight on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="pl-5 pr-5 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <TemplateBadge template={template} />
              <h3 className="text-sm font-semibold text-zinc-100 truncate leading-snug">
                {campaign.name}
              </h3>
            </div>
            {campaign.objective && (
              <p className="text-[11px] text-zinc-600 truncate">{campaign.objective}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {hasRoas && (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded-md tabular-nums">{campaign.roas.toFixed(1)}x ROAS</span>
            )}
            <StatusBadge status={effectiveStatus} />
          </div>
        </div>

        {/* Spend herói */}
        {hasData ? (
          <div className="mb-4">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[1.85rem] font-black text-white tabular-nums tracking-tight leading-none">
                {fmtCurrency(campaign.spend)}
              </span>
              <Trend pct={spendTrend} />
            </div>
            <p className="text-[11px] text-zinc-600 mt-1">gastos no período</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-700 italic mb-4">Sem dados no período selecionado</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 pb-4 pt-3 border-t border-white/[0.05]">
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
      <div className="border-t border-white/[0.04] px-5 py-2.5 flex items-center justify-end bg-[#0D0E12]">
        <span className="text-xs text-zinc-600 group-hover:text-zinc-300 transition-colors flex items-center gap-1 font-medium">
          Ver conjuntos
          <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
