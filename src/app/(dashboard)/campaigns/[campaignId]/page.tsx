import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCampaignById, getAdSetsWithMetrics, getChartData, getLastSync } from '@/lib/supabase/queries'
import Breadcrumb from '@/components/campaigns/Breadcrumb'
import AdSetCard from '@/components/campaigns/AdSetCard'
import PerformanceChart from '@/components/campaigns/PerformanceChart'
import MetricsBadge from '@/components/dashboard/MetricsBadge'
import LastSyncInfo from '@/components/dashboard/LastSyncInfo'
import SyncButton from '@/components/dashboard/SyncButton'
import type { DashboardFilters } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ campaignId: string }>
  searchParams: Promise<Record<string, string>>
}

function fmt(value: number, type: 'currency' | 'percent' | 'number') {
  if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  if (type === 'percent') return `${value.toFixed(2)}%`
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)
}

export default async function CampaignPage({ params, searchParams }: PageProps) {
  const { campaignId } = await params
  const sp = await searchParams

  const filters: Partial<DashboardFilters> = {
    since: sp.since,
    until: sp.until
  }
  const filtersStr = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v))
  ).toString()

  const [campaign, adSets, chartData, lastSync] = await Promise.all([
    getCampaignById(campaignId),
    getAdSetsWithMetrics(campaignId, filters),
    getChartData(campaignId, 'campaign', filters),
    getLastSync()
  ])

  if (!campaign) notFound()

  // Agregar métricas totais dos conjuntos
  const totals = adSets.reduce((acc, s) => ({
    spend: acc.spend + s.spend,
    impressions: acc.impressions + s.impressions,
    clicks: acc.clicks + s.clicks,
    reach: acc.reach + s.reach
  }), { spend: 0, impressions: 0, clicks: 0, reach: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumb
            items={[
              { label: 'Campanhas', href: '/' },
              { label: campaign.name }
            ]}
            filters={filtersStr}
          />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
            <MetricsBadge status={campaign.status} />
          </div>
          {campaign.objective && (
            <p className="text-sm text-zinc-500">{campaign.objective}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LastSyncInfo initial={lastSync} />
          <SyncButton />
        </div>
      </div>

      {/* Métricas totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Gasto Total', value: fmt(totals.spend, 'currency') },
          { label: 'Impressões', value: fmt(totals.impressions, 'number') },
          { label: 'Cliques', value: fmt(totals.clicks, 'number') },
          { label: 'Alcance', value: fmt(totals.reach, 'number') }
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{m.label}</p>
            <p className={`text-lg font-bold mt-1 ${totals.spend === 0 ? 'text-zinc-500' : 'text-white'}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <PerformanceChart data={chartData} />

      {/* Conjuntos de anúncios */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Conjuntos de Anúncios ({adSets.length})
        </h2>
        {adSets.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-sm text-zinc-500">Nenhum conjunto de anúncios encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adSets.map(adSet => (
              <AdSetCard
                key={adSet.id}
                adSet={adSet}
                campaignId={campaignId}
                filters={filtersStr}
              />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/${filtersStr ? `?${filtersStr}` : ''}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar às campanhas
      </Link>
    </div>
  )
}
