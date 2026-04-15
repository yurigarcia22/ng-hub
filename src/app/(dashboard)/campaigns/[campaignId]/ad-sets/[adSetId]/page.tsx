import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCampaignById, getAdSetById, getAdsWithMetrics } from '@/lib/supabase/queries'
import Breadcrumb from '@/components/campaigns/Breadcrumb'
import AdCard from '@/components/campaigns/AdCard'
import MetricsBadge from '@/components/dashboard/MetricsBadge'
import type { DashboardFilters } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ campaignId: string; adSetId: string }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { adSetId } = await params
  const adSet = await getAdSetById(adSetId)
  return { title: adSet?.name ?? 'Conjunto de Anúncios' }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

export default async function AdSetPage({ params, searchParams }: PageProps) {
  const { campaignId, adSetId } = await params
  const sp = await searchParams

  const filters: Partial<DashboardFilters> = { since: sp.since, until: sp.until }
  const filtersStr = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v))
  ).toString()

  const [campaign, adSet, ads] = await Promise.all([
    getCampaignById(campaignId),
    getAdSetById(adSetId),
    getAdsWithMetrics(adSetId, filters)
  ])

  if (!campaign || !adSet) notFound()

  const totals = ads.reduce((acc, a) => ({
    spend: acc.spend + a.spend,
    impressions: acc.impressions + a.impressions,
    clicks: acc.clicks + a.clicks
  }), { spend: 0, impressions: 0, clicks: 0 })

  const avgCtr = ads.length > 0 ? ads.reduce((acc, a) => acc + a.ctr, 0) / ads.length : 0
  const hasData = totals.spend > 0 || totals.impressions > 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: 'Campanhas', href: '/' },
            { label: campaign.name, href: `/campaigns/${campaignId}` },
            { label: adSet.name }
          ]}
          filters={filtersStr}
        />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight">{adSet.name}</h1>
          <MetricsBadge status={adSet.status} />
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gasto Total', value: fmtCurrency(totals.spend), prominent: true },
          { label: 'Impressões', value: fmtCompact(totals.impressions) },
          { label: 'Cliques', value: fmtCompact(totals.clicks) },
          { label: 'CTR Médio', value: `${avgCtr.toFixed(2)}%` },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1.5">{m.label}</p>
            <p className={`font-bold tabular-nums ${m.prominent ? 'text-2xl text-white' : `text-lg ${hasData ? 'text-zinc-100' : 'text-zinc-700'}`}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ads */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Anúncios</h2>
          <span className="text-xs text-zinc-600 tabular-nums">
            {ads.length} {ads.length === 1 ? 'anúncio' : 'anúncios'}
          </span>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>

        {ads.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-10 text-center">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 font-medium">Nenhum anúncio encontrado</p>
            <p className="text-xs text-zinc-600 mt-1">Este conjunto não possui anúncios no período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ads.map(ad => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/campaigns/${campaignId}${filtersStr ? `?${filtersStr}` : ''}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar à campanha
      </Link>
    </div>
  )
}
