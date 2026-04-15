import { Suspense } from 'react'
import { getCampaignsWithMetrics, getLastSync, getAccounts } from '@/lib/supabase/queries'
import CampaignCard from '@/components/dashboard/CampaignCard'
import LoadingSkeleton from '@/components/dashboard/LoadingSkeleton'
import LastSyncInfo from '@/components/dashboard/LastSyncInfo'
import SyncButton from '@/components/dashboard/SyncButton'
import FiltersBar from '@/components/dashboard/FiltersBar'
import type { DashboardFilters } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams

  const filters: Partial<DashboardFilters> = {
    accountId: params.account,
    since: params.since,
    until: params.until
  }

  const [campaigns, lastSync, accounts] = await Promise.all([
    getCampaignsWithMetrics(filters),
    getLastSync(),
    getAccounts()
  ])

  const filtersStr = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <div className="mt-1">
            <LastSyncInfo initial={lastSync} />
          </div>
        </div>
        <SyncButton />
      </div>

      {/* Filtros */}
      <Suspense>
        <FiltersBar accounts={accounts} />
      </Suspense>

      {/* Lista de campanhas */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              filters={filtersStr}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-white mb-1">Nenhuma campanha encontrada</h3>
      <p className="text-xs text-zinc-500 mb-4">Clique em "Atualizar" para sincronizar dados da Meta Ads</p>
    </div>
  )
}
