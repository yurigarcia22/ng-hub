'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import CampaignCard from './CampaignCard'
import SyncButton from './SyncButton'
import LastSyncInfo from './LastSyncInfo'
import type { CampaignWithMetrics } from '@/types/dashboard'
import type { SyncLog } from '@/types/database'

interface Props {
  lastSync: SyncLog | null
  accounts: { id: string; name: string }[]
}

type StatusFilter = 'active' | 'all'
type Period = '7d' | '30d' | 'custom'

function fmt(d: Date) { return d.toISOString().split('T')[0] }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d) }

const STATUS_ORDER: Record<string, number> = { ACTIVE: 0, PAUSED: 1, ARCHIVED: 2, DELETED: 3 }

export default function DashboardClient({ lastSync, accounts }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [period, setPeriod] = useState<Period>('30d')
  const [since, setSince] = useState(daysAgo(30))
  const [until, setUntil] = useState(fmt(new Date()))

  const fetchCampaigns = useCallback(async (s: string, u: string, acc?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ since: s, until: u })
      if (acc) params.set('account', acc)
      const res = await fetch(`/api/campaigns?${params}`)
      if (res.ok) setCampaigns(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns(since, until, accountFilter || undefined)
  }, [since, until, accountFilter, fetchCampaigns])

  function applyPeriod(p: Period) {
    setPeriod(p)
    if (p === '7d') { setSince(daysAgo(7)); setUntil(fmt(new Date())) }
    if (p === '30d') { setSince(daysAgo(30)); setUntil(fmt(new Date())) }
  }

  // Filtro de status e ordenação client-side (instantâneo)
  const filtered = useMemo(() => {
    let list = campaigns
    if (statusFilter === 'active') list = list.filter(c => c.status === 'ACTIVE')
    // Ordenar: ACTIVE primeiro, depois por gasto decrescente
    return [...list].sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      if (so !== 0) return so
      return b.spend - a.spend
    })
  }, [campaigns, statusFilter])

  // Agrupar por conta
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; campaigns: CampaignWithMetrics[] }>()
    for (const c of filtered) {
      if (!map.has(c.account_id)) map.set(c.account_id, { name: c.account_name ?? c.account_id, campaigns: [] })
      map.get(c.account_id)!.campaigns.push(c)
    }
    // Ordenar grupos por gasto total decrescente
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const spendA = a.campaigns.reduce((s, c) => s + c.spend, 0)
      const spendB = b.campaigns.reduce((s, c) => s + c.spend, 0)
      return spendB - spendA
    })
  }, [filtered])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas</h1>
          <div className="mt-1">
            <LastSyncInfo initial={lastSync} />
          </div>
        </div>
        <SyncButton onSyncComplete={() => fetchCampaigns(since, until, accountFilter || undefined)} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Conta */}
        {accounts.length > 1 && (
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="text-sm bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48"
          >
            <option value="">Todas as contas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        {/* Período */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {(['7d', '30d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => applyPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${period === p ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {p === '7d' ? '7 dias' : '30 dias'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${period === 'custom' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Personalizado
          </button>
        </div>

        {/* Date pickers quando personalizado */}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={since}
              max={until}
              onChange={e => setSince(e.target.value)}
              className="text-sm bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-zinc-500 text-sm">até</span>
            <input
              type="date"
              value={until}
              min={since}
              max={fmt(new Date())}
              onChange={e => setUntil(e.target.value)}
              className="text-sm bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1 ml-auto">
          <button
            onClick={() => setStatusFilter('active')}
            className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Ativas
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${statusFilter === 'all' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <LoadingGroups />
      ) : groups.length === 0 ? (
        <EmptyState statusFilter={statusFilter} onShowAll={() => setStatusFilter('all')} />
      ) : (
        <div className="space-y-7">
          {groups.map(([accountId, group]) => (
            <section key={accountId}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-zinc-200 truncate">{group.name}</h2>
                <span className="text-xs text-zinc-600 flex-shrink-0">
                  {group.campaigns.length} {group.campaigns.length === 1 ? 'campanha' : 'campanhas'}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <div className="space-y-2">
                {group.campaigns.map(c => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    filters={`since=${since}&until=${until}`}
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

function LoadingGroups() {
  return (
    <div className="space-y-7">
      {[1, 2].map(i => (
        <div key={i} className="space-y-2 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-zinc-700" />
            <div className="h-3.5 bg-zinc-700 rounded w-40" />
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          {[1, 2, 3].map(j => (
            <div key={j} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex justify-between mb-4">
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                <div className="h-5 bg-zinc-800 rounded w-16" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map(k => <div key={k} className="h-8 bg-zinc-800 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function EmptyState({ statusFilter, onShowAll }: { statusFilter: StatusFilter; onShowAll: () => void }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-white mb-1">
        {statusFilter === 'active' ? 'Nenhuma campanha ativa' : 'Nenhuma campanha encontrada'}
      </h3>
      {statusFilter === 'active' && (
        <button onClick={onShowAll} className="text-xs text-blue-400 hover:text-blue-300 transition mt-1">
          Ver todas as campanhas
        </button>
      )}
    </div>
  )
}
