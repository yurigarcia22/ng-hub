'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import CampaignCard from './CampaignCard'
import AccountCard from './AccountCard'
import SyncButton from './SyncButton'
import LastSyncInfo from './LastSyncInfo'
import type { CampaignWithMetrics } from '@/types/dashboard'
import { trendPct } from '@/types/dashboard'
import type { SyncLog } from '@/types/database'

interface AccountSummary {
  id: string
  name: string
  business_name: string | null
  currency: string
  status: string
  spend: number
  activeCampaigns: number
  totalCampaigns: number
  balance?: number
}

interface Props {
  lastSync: SyncLog | null
}

type StatusFilter = 'active' | 'all'
type Period = '7d' | '30d' | 'custom'

function fmt(d: Date) { return d.toISOString().split('T')[0] }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d) }

const STATUS_ORDER: Record<string, number> = { ACTIVE: 0, PAUSED: 1, ARCHIVED: 2, DELETED: 3 }

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: v >= 100_000 ? 'compact' : 'standard', maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
}
function fmtCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

export default function DashboardClient({ lastSync }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [balances, setBalances] = useState<Record<string, { balance: number; currency: string }>>({})
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set())
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [period, setPeriod] = useState<Period>('30d')
  const [since, setSince] = useState(daysAgo(30))
  const [until, setUntil] = useState(fmt(new Date()))

  // Load hidden accounts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ng-hub:hidden-accounts')
    if (saved) {
      try { setHiddenAccounts(new Set(JSON.parse(saved))) } catch { /* ignore */ }
    }
  }, [])

  // Fetch account summaries
  const fetchAccounts = useCallback(async (s: string, u: string) => {
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/accounts?since=${s}&until=${u}`)
      if (res.ok) setAccounts(await res.json())
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  // Fetch balances in background (non-blocking)
  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts/balances')
      if (res.ok) setBalances(await res.json())
    } catch { /* ignore */ }
  }, [])

  // Fetch campaigns for selected account (or all)
  const fetchCampaigns = useCallback(async (s: string, u: string, accountId?: string | null) => {
    setLoadingCampaigns(true)
    try {
      const params = new URLSearchParams({ since: s, until: u })
      if (accountId) params.set('account', accountId)
      const res = await fetch(`/api/campaigns?${params}`)
      if (res.ok) setCampaigns(await res.json())
    } finally {
      setLoadingCampaigns(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts(since, until)
    fetchBalances()
  }, [since, until, fetchAccounts, fetchBalances])

  useEffect(() => {
    fetchCampaigns(since, until, selectedAccount)
  }, [since, until, selectedAccount, fetchCampaigns])

  function applyPeriod(p: Period) {
    setPeriod(p)
    if (p === '7d') { setSince(daysAgo(7)); setUntil(fmt(new Date())) }
    if (p === '30d') { setSince(daysAgo(30)); setUntil(fmt(new Date())) }
  }

  // Visible accounts (not hidden)
  const visibleAccounts = useMemo(() =>
    accounts.filter(a => !hiddenAccounts.has(a.id)),
    [accounts, hiddenAccounts]
  )

  // Accounts with balance data merged
  const accountsWithBalance = useMemo(() =>
    visibleAccounts.map(a => ({
      ...a,
      balance: balances[a.id]?.balance
    })),
    [visibleAccounts, balances]
  )

  // Client-side campaign filtering
  const filtered = useMemo(() => {
    let list = campaigns
    if (statusFilter === 'active') list = list.filter(c => c.status === 'ACTIVE')
    if (selectedAccount) list = list.filter(c => c.account_id === selectedAccount)
    return [...list].sort((a, b) => {
      const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      if (so !== 0) return so
      return b.spend - a.spend
    })
  }, [campaigns, statusFilter, selectedAccount])

  // Summary for selected or all
  const summary = useMemo(() => {
    const src = selectedAccount
      ? accountsWithBalance.find(a => a.id === selectedAccount)
      : null
    const prevSpend = filtered.reduce((s, c) => s + (c.prev_spend ?? 0), 0)
    const prevImpressions = filtered.reduce((s, c) => s + (c.prev_impressions ?? 0), 0)
    const prevClicks = filtered.reduce((s, c) => s + (c.prev_clicks ?? 0), 0)
    if (src) {
      return {
        spend: src.spend,
        prevSpend,
        activeCampaigns: src.activeCampaigns,
        impressions: filtered.reduce((s, c) => s + c.impressions, 0),
        prevImpressions,
        clicks: filtered.reduce((s, c) => s + c.clicks, 0),
        prevClicks,
      }
    }
    return {
      spend: accountsWithBalance.reduce((s, a) => s + a.spend, 0),
      prevSpend,
      activeCampaigns: accountsWithBalance.reduce((s, a) => s + a.activeCampaigns, 0),
      impressions: filtered.reduce((s, c) => s + c.impressions, 0),
      prevImpressions,
      clicks: filtered.reduce((s, c) => s + c.clicks, 0),
      prevClicks,
    }
  }, [accountsWithBalance, filtered, selectedAccount])

  function handleAccountClick(id: string) {
    setSelectedAccount(prev => prev === id ? null : id)
  }

  const filtersStr = `since=${since}&until=${until}`

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campanhas</h1>
          <LastSyncInfo initial={lastSync} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/configuracoes"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Contas
          </Link>
          <SyncButton onSyncComplete={() => { fetchAccounts(since, until); fetchCampaigns(since, until, selectedAccount); fetchBalances() }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['7d', '30d'] as Period[]).map(p => (
            <button key={p} onClick={() => applyPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
            >
              {p === '7d' ? '7 dias' : '30 dias'}
            </button>
          ))}
          <button onClick={() => setPeriod('custom')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${period === 'custom' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Personalizado
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={since} max={until} onChange={e => setSince(e.target.value)}
              className="text-sm bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <span className="text-zinc-600 text-xs">até</span>
            <input type="date" value={until} min={since} max={fmt(new Date())} onChange={e => setUntil(e.target.value)}
              className="text-sm bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        )}

        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1 sm:ml-auto">
          <button onClick={() => setStatusFilter('active')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Ativas
          </button>
          <button onClick={() => setStatusFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Account cards grid */}
      {loadingAccounts ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : accountsWithBalance.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              {selectedAccount ? 'Conta selecionada' : `${accountsWithBalance.length} contas`}
            </span>
            {selectedAccount && (
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {accountsWithBalance.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                selected={selectedAccount === account.id}
                onClick={() => handleAccountClick(account.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Summary stats */}
      {!loadingAccounts && accountsWithBalance.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Gasto no período" value={fmtCurrency(summary.spend)} icon="money" color="blue" muted={summary.spend === 0} trend={trendPct(summary.spend, summary.prevSpend)} />
          <SummaryCard label="Campanhas ativas" value={summary.activeCampaigns.toString()} icon="chart" color="emerald" />
          <SummaryCard label="Impressões" value={fmtCompact(summary.impressions)} icon="eye" color="violet" muted={summary.impressions === 0} trend={trendPct(summary.impressions, summary.prevImpressions)} />
          <SummaryCard label="Cliques" value={fmtCompact(summary.clicks)} icon="cursor" color="amber" muted={summary.clicks === 0} trend={trendPct(summary.clicks, summary.prevClicks)} />
        </div>
      )}

      {/* Campaigns */}
      {loadingCampaigns ? (
        <LoadingGroups />
      ) : filtered.length === 0 ? (
        <EmptyState statusFilter={statusFilter} onShowAll={() => setStatusFilter('all')} />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <CampaignCard key={c.id} campaign={c} filters={filtersStr} />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryTrend({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const abs = Math.abs(pct)
  if (abs < 0.5) return null
  const isPositive = pct > 0
  return (
    <span className={`text-[10px] font-medium tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? '↑' : '↓'}{abs.toFixed(0)}% vs período anterior
    </span>
  )
}

function SummaryCard({ label, value, muted, icon, color, trend }: {
  label: string; value: string; muted?: boolean; icon: string; color: 'blue' | 'emerald' | 'violet' | 'amber'; trend?: number | null
}) {
  const iconColors = { blue: 'text-blue-400 bg-blue-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', violet: 'text-violet-400 bg-violet-500/10', amber: 'text-amber-400 bg-amber-500/10' }
  const icons: Record<string, React.ReactNode> = {
    money: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    chart: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    eye: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    cursor: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>,
  }
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors[color]}`}>{icons[icon]}</div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 leading-none mb-1.5">{label}</p>
        <p className={`text-lg font-bold leading-none tabular-nums ${muted ? 'text-zinc-700' : 'text-white'}`}>{value}</p>
        {trend !== undefined && trend !== null && (
          <div className="mt-1">
            <SummaryTrend pct={trend} />
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingGroups() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-5">
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
        {statusFilter === 'active' ? 'Não há campanhas ativas no período.' : 'Tente ajustar os filtros.'}
      </p>
      {statusFilter === 'active' && (
        <button onClick={onShowAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
          Ver todas as campanhas
        </button>
      )}
    </div>
  )
}
