import Link from 'next/link'
import MetricsBadge from '@/components/dashboard/MetricsBadge'
import type { AdSetWithMetrics } from '@/types/dashboard'

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

interface AdSetCardProps {
  adSet: AdSetWithMetrics
  campaignId: string
  filters?: string
}

export default function AdSetCard({ adSet, campaignId, filters }: AdSetCardProps) {
  const hasData = adSet.spend > 0 || adSet.impressions > 0
  const isActive = adSet.status === 'ACTIVE'

  return (
    <Link
      href={`/campaigns/${campaignId}/ad-sets/${adSet.id}${filters ? `?${filters}` : ''}`}
      className="group block rounded-xl border border-zinc-800/60 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700/80 transition-all duration-150"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-zinc-700'}`} />
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-zinc-100 truncate group-hover:text-white leading-snug">
                {adSet.name}
              </h3>
              {adSet.daily_budget && adSet.daily_budget > 0 && (
                <p className="text-xs text-zinc-600 mt-0.5">
                  Orçamento diário: {fmtCurrency(adSet.daily_budget / 100)}
                </p>
              )}
            </div>
          </div>
          <MetricsBadge status={adSet.status} />
        </div>

        {hasData && (
          <div className="mb-4 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white tabular-nums">
              {fmtCurrency(adSet.spend)}
            </span>
            <span className="text-xs text-zinc-600">gastos</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Impressões', value: fmtCompact(adSet.impressions) },
            { label: 'Cliques', value: fmtCompact(adSet.clicks) },
            { label: 'CTR', value: `${adSet.ctr.toFixed(2)}%` },
            { label: 'CPM', value: fmtCurrency(adSet.cpm) },
          ].map(m => (
            <div key={m.label} className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{m.label}</p>
              <p className={`text-sm font-semibold tabular-nums ${!hasData ? 'text-zinc-700' : 'text-zinc-100'}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {!hasData && (
          <p className="text-xs text-zinc-700 mt-2 italic">Sem dados no período selecionado</p>
        )}
      </div>

      <div className="px-5 py-2.5 border-t border-zinc-800/40 flex items-center justify-end">
        <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors flex items-center gap-1">
          Ver anúncios
          <svg className="w-3 h-3 -translate-x-0.5 group-hover:translate-x-0 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}
