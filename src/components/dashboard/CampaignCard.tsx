import Link from 'next/link'
import MetricsBadge from './MetricsBadge'
import type { CampaignWithMetrics } from '@/types/dashboard'

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}
function fmtPercent(v: number) {
  return `${v.toFixed(2)}%`
}

interface MetricItemProps {
  label: string
  value: string
  muted?: boolean
  highlight?: boolean
}

function MetricItem({ label, value, muted, highlight }: MetricItemProps) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${
        muted ? 'text-zinc-600' :
        highlight ? 'text-emerald-400' :
        'text-zinc-100'
      }`}>
        {value}
      </p>
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
  const hasRoas = campaign.roas > 1

  return (
    <Link
      href={`/campaigns/${campaign.id}${filters ? `?${filters}` : ''}`}
      className="group block rounded-xl border border-zinc-800/60 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700/80 transition-all duration-150"
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5 min-w-0">
            {/* Active indicator */}
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
            {hasRoas && (
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md tabular-nums">
                {campaign.roas.toFixed(1)}x ROAS
              </span>
            )}
            <MetricsBadge status={campaign.status} />
          </div>
        </div>

        {/* Primary metric: Spend */}
        {hasData && (
          <div className="mb-4 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums">
              {fmtCurrency(campaign.spend)}
            </span>
            <span className="text-xs text-zinc-600">gastos</span>
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricItem label="Impressões" value={fmtCompact(campaign.impressions)} muted={!hasData} />
          <MetricItem label="Cliques" value={fmtCompact(campaign.clicks)} muted={!hasData} />
          <MetricItem label="CTR" value={fmtPercent(campaign.ctr)} muted={!hasData} highlight={hasData && campaign.ctr > 2} />
          <MetricItem label="CPM" value={fmtCurrency(campaign.cpm)} muted={!hasData} />
        </div>

        {/* Secondary metrics (CPA, ROAS) if data exists */}
        {hasData && (campaign.cpa > 0 || campaign.roas > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3.5 pt-3.5 border-t border-zinc-800/60">
            <MetricItem label="CPA" value={campaign.cpa > 0 ? fmtCurrency(campaign.cpa) : '—'} muted={campaign.cpa === 0} />
            <MetricItem label="ROAS" value={campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'} muted={campaign.roas === 0} highlight={hasRoas} />
            <MetricItem label="Alcance" value={fmtCompact(campaign.reach)} muted={campaign.reach === 0} />
          </div>
        )}

        {/* No data state */}
        {!hasData && (
          <p className="text-xs text-zinc-700 mt-2 italic">Sem dados no período selecionado</p>
        )}
      </div>

      {/* Bottom bar — arrow indicator */}
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
