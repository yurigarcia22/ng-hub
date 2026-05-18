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
    <div className="group rounded-2xl border border-white/[0.05] bg-[#111115] hover:border-white/[0.10] hover:bg-[#13131a] p-5 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-[#0d0d10] overflow-hidden border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          {ad.creative_url ? (
            <Image
              src={ad.creative_url}
              alt={ad.name}
              width={64}
              height={64}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-zinc-700'}`} />
              <h3 className="text-sm font-semibold text-zinc-100 truncate leading-snug">{ad.name}</h3>
            </div>
            <MetricsBadge status={ad.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{m.label}</p>
                <p className={`text-sm font-bold tabular-nums ${
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
