import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { campaignId } = await params
  const campaign = await getCampaignById(campaignId)
  return { title: campaign?.name ?? 'Campanha' }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

export default async function CampaignPage({ params, searchParams }: PageProps) {
  const { campaignId } = await params
  const sp = await searchParams

  const filters: Partial<DashboardFilters> = { since: sp.since, until: sp.until }
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

  const totals = adSets.reduce((acc, s) => ({
    spend: acc.spend + s.spend,
    impressions: acc.impressions + s.impressions,
    clicks: acc.clicks + s.clicks,
    reach: acc.reach + (s.reach ?? 0)
  }), { spend: 0, impressions: 0, clicks: 0, reach: 0 })

  const hasData = totals.spend > 0 || totals.impressions > 0

  const summaryMetrics = [
    { label: 'Gasto Total', value: fmtCurrency(totals.spend), prominent: true },
    { label: 'Impressões', value: fmtCompact(totals.impressions) },
    { label: 'Cliques', value: fmtCompact(totals.clicks) },
    { label: 'Alcance', value: fmtCompact(totals.reach) },
  ]

  return (
    <div className="space-y-7">
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">{campaign.name}</h1>
            <MetricsBadge status={campaign.status} />
          </div>
          {campaign.objective && (
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{campaign.objective}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LastSyncInfo initial={lastSync} />
          <SyncButton />
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryMetrics.map(m => (
          <div key={m.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1.5">{m.label}</p>
            <p className={`font-bold tabular-nums ${m.prominent ? 'text-2xl text-white' : `text-lg ${hasData ? 'text-zinc-100' : 'text-zinc-700'}`}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <PerformanceChart data={chartData} />

      {/* Ad Sets */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Conjuntos de Anúncios</h2>
          <span className="text-xs text-zinc-600 tabular-nums">
            {adSets.length} {adSets.length === 1 ? 'conjunto' : 'conjuntos'}
          </span>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>

        {adSets.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-10 text-center">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 font-medium">Nenhum conjunto de anúncios</p>
            <p className="text-xs text-zinc-600 mt-1">Esta campanha não possui conjuntos no período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-2">
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
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar às campanhas
      </Link>
    </div>
  )
}
