import Link from 'next/link'
import MetricsBadge from './MetricsBadge'
import type { CampaignWithMetrics } from '@/types/dashboard'

function fmt(value: number, type: 'currency' | 'percent' | 'number') {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }
  if (type === 'percent') {
    return `${value.toFixed(2)}%`
  }
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)
}

interface MetricItemProps {
  label: string
  value: string
  muted?: boolean
}

function MetricItem({ label, value, muted }: MetricItemProps) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${muted ? 'text-zinc-500' : 'text-white'}`}>{value}</p>
    </div>
  )
}

interface CampaignCardProps {
  campaign: CampaignWithMetrics
  filters?: string
}

export default function CampaignCard({ campaign, filters }: CampaignCardProps) {
  const hasData = campaign.spend > 0 || campaign.impressions > 0

  return (
    <Link
      href={`/campaigns/${campaign.id}${filters ? `?${filters}` : ''}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{campaign.name}</h3>
          {campaign.objective && (
            <p className="text-xs text-zinc-500 mt-0.5">{campaign.objective}</p>
          )}
        </div>
        <MetricsBadge status={campaign.status} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricItem label="Gasto" value={fmt(campaign.spend, 'currency')} muted={!hasData} />
        <MetricItem label="Impressões" value={fmt(campaign.impressions, 'number')} muted={!hasData} />
        <MetricItem label="Cliques" value={fmt(campaign.clicks, 'number')} muted={!hasData} />
        <MetricItem label="CTR" value={fmt(campaign.ctr, 'percent')} muted={!hasData} />
      </div>

      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-zinc-800">
          <MetricItem label="CPM" value={fmt(campaign.cpm, 'currency')} />
          <MetricItem label="CPA" value={campaign.cpa > 0 ? fmt(campaign.cpa, 'currency') : '—'} muted={campaign.cpa === 0} />
          <MetricItem label="ROAS" value={campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'} muted={campaign.roas === 0} />
        </div>
      )}
    </Link>
  )
}
