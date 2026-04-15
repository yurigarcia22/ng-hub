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

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: v >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

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

  const filtered = useMemo(() => {
    let list = campaigns
    if (statusFilter === 'active') list = list.filter(c => c.status === 'ACTIVE')
    return [...list].sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      if (so !== 0) return so
      return b.spend - a.spend
    })
  }, [campaigns, statusFilter])

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; campaigns: CampaignWithMetrics[] }>()
    for (const c of filtered) {
      if (!map.has(c.account_id)) map.set(c.account_id, { name: c.account_name ?? c.account_id, campaigns: [] })
      map.get(c.account_id)!.campaigns.push(c)
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const spendA = a.campaigns.reduce((s, c) => s + c.spend, 0)
      const spendB = b.campaigns.reduce((s, c) => s + c.spend, 0)
      return spendB - spendA
    })
  }, [filtered])

  // Summary stats
  const summary = useMemo(() => {
    const active = filtered.filter(c => c.status === 'ACTIVE')
    return {
      totalSpend: filtered.reduce((s, c) => s + c.spend, 0),
      activeCampaigns: active.length,
      totalImpressions: filtered.reduce((s, c) => s + c.impressions, 0),
      totalClicks: filtered.reduce((s, c) => s + c.clicks, 0),
    }
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campanhas</h1>
          <div className="mt-1">
            <LastSyncInfo initial={lastSync} />
          </div>
        </div>
        <SyncButton onSyncComplete={() => fetchCampaigns(since, until, accountFilter || undefined)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        {accounts.length > 1 && (
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="text-sm bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-44 cursor-pointer"
          >
            <option value="">Todas as contas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        {/* Period */}
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['7d', '30d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => applyPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
            >
              {p === '7d' ? '7 dias' : '30 dias'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${period === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Personalizado
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={since}
              max={until}
              onChange={e => setSince(e.target.value)}
              className="text-sm bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-zinc-600 text-xs">até</span>
            <input
              type="date"
              value={until}
              min={since}
              max={fmt(new Date())}
              onChange={e => setUntil(e.target.value)}
              className="text-sm bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Status filter */}
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1 sm:ml-auto">
          <button
            onClick={() => setStatusFilter('active')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Ativas
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Gasto no período"
            value={fmtCurrency(summary.totalSpend)}
            muted={summary.totalSpend === 0}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="blue"
          />
          <SummaryCard
            label="Campanhas ativas"
            value={summary.activeCampaigns.toString()}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="emerald"
          />
          <SummaryCard
            label="Impressões"
            value={fmtCompact(summary.totalImpressions)}
            muted={summary.totalImpressions === 0}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            color="violet"
          />
          <SummaryCard
            label="Cliques"
            value={fmtCompact(summary.totalClicks)}
            muted={summary.totalClicks === 0}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            }
            color="amber"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingGroups />
      ) : groups.length === 0 ? (
        <EmptyState statusFilter={statusFilter} onShowAll={() => setStatusFilter('all')} />
      ) : (
        <div className="space-y-8">
          {groups.map(([accountId, group]) => (
            <section key={accountId}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-zinc-200 truncate">{group.name}</h2>
                <span className="text-xs text-zinc-600 flex-shrink-0 tabular-nums">
                  {group.campaigns.length} {group.campaigns.length === 1 ? 'campanha' : 'campanhas'}
                </span>
                <div className="flex-1 h-px bg-zinc-800/80" />
                <span className="text-xs text-zinc-500 flex-shrink-0 tabular-nums font-medium">
                  {fmtCurrency(group.campaigns.reduce((s, c) => s + c.spend, 0))}
                </span>
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

function SummaryCard({
  label, value, muted, icon, color
}: {
  label: string
  value: string
  muted?: boolean
  icon: React.ReactNode
  color: 'blue' | 'emerald' | 'violet' | 'amber'
}) {
  const iconColors = {
    blue: 'text-blue-400 bg-blue-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  }
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 leading-none mb-1.5">{label}</p>
        <p className={`text-lg font-bold leading-none tabular-nums ${muted ? 'text-zinc-600' : 'text-white'}`}>{value}</p>
      </div>
    </div>
  )
}

function LoadingGroups() {
  return (
    <div className="space-y-8">
      {[1, 2].map(i => (
        <div key={i} className="space-y-2 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-zinc-700" />
            <div className="h-3.5 bg-zinc-800 rounded w-40" />
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          {[1, 2, 3].map(j => (
            <div key={j} className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-5">
              <div className="flex justify-between mb-4">
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                <div className="h-5 bg-zinc-800 rounded w-16" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(k => <div key={k} className="h-8 bg-zinc-800 rounded" />)}
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
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-14 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">
        {statusFilter === 'active' ? 'Nenhuma campanha ativa' : 'Nenhuma campanha encontrada'}
      </h3>
      <p className="text-xs text-zinc-500 mb-3">
        {statusFilter === 'active'
          ? 'Não há campanhas ativas no período selecionado.'
          : 'Tente ajustar o período ou as contas selecionadas.'}
      </p>
      {statusFilter === 'active' && (
        <button
          onClick={onShowAll}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Ver todas as campanhas
        </button>
      )}
    </div>
  )
}
