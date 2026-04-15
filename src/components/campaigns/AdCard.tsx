import MetricsBadge from '@/components/dashboard/MetricsBadge'
import type { AdWithMetrics } from '@/types/dashboard'
import Image from 'next/image'

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

interface AdCardProps {
  ad: AdWithMetrics
}

export default function AdCard({ ad }: AdCardProps) {
  const hasData = ad.spend > 0 || ad.impressions > 0
  const isActive = ad.status === 'ACTIVE'

  const metrics = [
    { label: 'Gasto', value: fmtCurrency(ad.spend) },
    { label: 'Impressões', value: fmtCompact(ad.impressions) },
    { label: 'Cliques', value: fmtCompact(ad.clicks) },
    { label: 'CTR', value: `${ad.ctr.toFixed(2)}%`, highlight: ad.ctr > 2 },
    { label: 'CPM', value: fmtCurrency(ad.cpm) },
  ]

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-5">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700/60">
          {ad.creative_url ? (
            <Image
              src={ad.creative_url}
              alt={ad.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2 min-w-0">
              <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
              <h3 className="text-sm font-medium text-zinc-100 truncate">{ad.name}</h3>
            </div>
            <MetricsBadge status={ad.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{m.label}</p>
                <p className={`text-sm font-semibold tabular-nums ${
                  !hasData ? 'text-zinc-700' :
                  m.highlight ? 'text-emerald-400' :
                  'text-zinc-100'
                }`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
