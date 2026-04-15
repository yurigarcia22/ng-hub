import MetricsBadge from '@/components/dashboard/MetricsBadge'
import type { AdWithMetrics } from '@/types/dashboard'
import Image from 'next/image'

function fmt(value: number, type: 'currency' | 'percent' | 'number') {
  if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  if (type === 'percent') return `${value.toFixed(2)}%`
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)
}

interface AdCardProps {
  ad: AdWithMetrics
}

export default function AdCard({ ad }: AdCardProps) {
  const hasData = ad.spend > 0 || ad.impressions > 0

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700">
          {ad.creative_url ? (
            <Image
              src={ad.creative_url}
              alt={ad.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-medium text-white truncate">{ad.name}</h3>
            <MetricsBadge status={ad.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Gasto</p>
              <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
                {fmt(ad.spend, 'currency')}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Impressões</p>
              <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
                {fmt(ad.impressions, 'number')}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Cliques</p>
              <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
                {fmt(ad.clicks, 'number')}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">CTR</p>
              <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
                {fmt(ad.ctr, 'percent')}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">CPM</p>
              <p className={`text-sm font-semibold mt-0.5 ${!hasData ? 'text-zinc-500' : 'text-white'}`}>
                {fmt(ad.cpm, 'currency')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
