import { notFound } from 'next/navigation'
import Link from 'next/link'
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

function fmt(value: number, type: 'currency' | 'percent' | 'number') {
  if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  if (type === 'percent') return `${value.toFixed(2)}%`
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)
}

export default async function AdSetPage({ params, searchParams }: PageProps) {
  const { campaignId, adSetId } = await params
  const sp = await searchParams

  const filters: Partial<DashboardFilters> = {
    since: sp.since,
    until: sp.until
  }
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

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">{adSet.name}</h1>
          <MetricsBadge status={adSet.status} />
        </div>
      </div>

      {/* Métricas totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Gasto Total', value: fmt(totals.spend, 'currency') },
          { label: 'Impressões', value: fmt(totals.impressions, 'number') },
          { label: 'Cliques', value: fmt(totals.clicks, 'number') },
          { label: 'CTR Médio', value: fmt(avgCtr, 'percent') }
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{m.label}</p>
            <p className={`text-lg font-bold mt-1 ${totals.spend === 0 ? 'text-zinc-500' : 'text-white'}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Anúncios */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Anúncios ({ads.length})
        </h2>
        {ads.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-sm text-zinc-500">Nenhum anúncio encontrado neste conjunto</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map(ad => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/campaigns/${campaignId}${filtersStr ? `?${filtersStr}` : ''}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar ao conjunto
      </Link>
    </div>
  )
}
