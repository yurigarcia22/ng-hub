import { Suspense } from 'react'
import { getCampaignsWithMetrics, getLastSync, getAccounts } from '@/lib/supabase/queries'
import CampaignCard from '@/components/dashboard/CampaignCard'
import LastSyncInfo from '@/components/dashboard/LastSyncInfo'
import SyncButton from '@/components/dashboard/SyncButton'
import FiltersBar from '@/components/dashboard/FiltersBar'
import type { DashboardFilters, CampaignWithMetrics } from '@/types/dashboard'

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

  // Agrupar por conta
  const groups = new Map<string, { accountName: string; campaigns: CampaignWithMetrics[] }>()
  for (const c of campaigns) {
    const key = c.account_id
    if (!groups.has(key)) {
      groups.set(key, { accountName: c.account_name ?? c.account_id, campaigns: [] })
    }
    groups.get(key)!.campaigns.push(c)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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

      {/* Lista de campanhas agrupadas por conta */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([accountId, group]) => (
            <section key={accountId}>
              {/* Cabeçalho da conta */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <h2 className="text-sm font-semibold text-zinc-300 truncate">{group.accountName}</h2>
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">
                  {group.campaigns.length} {group.campaigns.length === 1 ? 'campanha' : 'campanhas'}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {group.campaigns.map(campaign => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    filters={filtersStr}
                  />
                ))}
              </div>
            </section>
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
      <p className="text-xs text-zinc-500">Clique em "Atualizar" para sincronizar dados da Meta Ads</p>
    </div>
  )
}
