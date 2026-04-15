import Link from 'next/link'
import MetricsBadge from '@/components/dashboard/MetricsBadge'
import type { AdSetWithMetrics } from '@/types/dashboard'

function fmt(value: number, type: 'currency' | 'percent' | 'number') {
  if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  if (type === 'percent') return `${value.toFixed(2)}%`
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)
}

interface AdSetCardProps {
  adSet: AdSetWithMetrics
  campaignId: string
  filters?: string
}

export default function AdSetCard({ adSet, campaignId, filters }: AdSetCardProps) {
  const hasData = adSet.spend > 0 || adSet.impressions > 0

  return (
    <Link
      href={`/campaigns/${campaignId}/ad-sets/${adSet.id}${filters ? `?${filters}` : ''}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-sm font-medium text-white truncate">{adSet.name}</h3>
        <MetricsBadge status={adSet.status} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Gasto</p>
          <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
            {fmt(adSet.spend, 'currency')}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Impressões</p>
          <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
            {fmt(adSet.impressions, 'number')}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Cliques</p>
          <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
            {fmt(adSet.clicks, 'number')}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">CTR</p>
          <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
            {fmt(adSet.ctr, 'percent')}
          </p>
        </div>
      </div>
    </Link>
  )
}
