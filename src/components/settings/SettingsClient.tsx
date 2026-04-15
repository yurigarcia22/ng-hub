'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  currency: string
  status: string
  business_id: string | null
  business_name: string | null
  synced_at: string | null
}

interface Props {
  accounts: Account[]
  initialSettings: Record<string, boolean>
}

export default function SettingsClient({ accounts, initialSettings }: Props) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    // Default: all visible unless explicitly set to false
    const defaults: Record<string, boolean> = {}
    for (const a of accounts) {
      defaults[a.id] = initialSettings[a.id] !== false
    }
    return defaults
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Sync to localStorage as well
  useEffect(() => {
    const hidden = accounts.filter(a => visibility[a.id] === false).map(a => a.id)
    localStorage.setItem('ng-hub:hidden-accounts', JSON.stringify(hidden))
  }, [visibility, accounts])

  async function toggleAccount(accountId: string, visible: boolean) {
    setVisibility(prev => ({ ...prev, [accountId]: visible }))
    setSaving(accountId)
    try {
      await fetch('/api/accounts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, visible })
      })
      setSaved(accountId)
      setTimeout(() => setSaved(null), 2000)
    } finally {
      setSaving(null)
    }
  }

  const activeAccounts = accounts.filter(a => a.status === 'ACTIVE')
  const inactiveAccounts = accounts.filter(a => a.status !== 'ACTIVE')
  const visibleCount = accounts.filter(a => visibility[a.id] !== false).length

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configurações</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {visibleCount} de {accounts.length} contas visíveis no dashboard
          </p>
        </div>
      </div>

      {/* Active accounts */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Contas de Anúncio</h2>
          <span className="text-xs text-zinc-600">{activeAccounts.length} ativas</span>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>

        <div className="space-y-2">
          {activeAccounts.map(account => (
            <AccountRow
              key={account.id}
              account={account}
              visible={visibility[account.id] !== false}
              saving={saving === account.id}
              saved={saved === account.id}
              onToggle={v => toggleAccount(account.id, v)}
            />
          ))}
          {activeAccounts.length === 0 && (
            <p className="text-sm text-zinc-600 py-4 text-center">
              Nenhuma conta ativa. Faça uma sincronização primeiro.
            </p>
          )}
        </div>
      </div>

      {/* Inactive accounts */}
      {inactiveAccounts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-zinc-500">Contas Inativas</h2>
            <span className="text-xs text-zinc-700">{inactiveAccounts.length}</span>
            <div className="flex-1 h-px bg-zinc-800/40" />
          </div>
          <div className="space-y-2">
            {inactiveAccounts.map(account => (
              <AccountRow
                key={account.id}
                account={account}
                visible={visibility[account.id] !== false}
                saving={saving === account.id}
                saved={saved === account.id}
                onToggle={v => toggleAccount(account.id, v)}
                muted
              />
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="flex gap-3">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1">Como funciona</p>
            <p className="text-xs text-zinc-600">
              Contas ocultas não aparecem nos cards do dashboard, mas seus dados continuam sendo sincronizados.
              O nome da BM (Business Manager) é preenchido automaticamente na próxima sincronização.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountRow({
  account, visible, saving, saved, onToggle, muted
}: {
  account: Account
  visible: boolean
  saving: boolean
  saved: boolean
  onToggle: (v: boolean) => void
  muted?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
      visible
        ? 'border-zinc-800/60 bg-zinc-900/60'
        : 'border-zinc-900/60 bg-zinc-950/60 opacity-60'
    }`}>
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${account.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-zinc-700'}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${muted ? 'text-zinc-500' : 'text-zinc-200'}`}>
          {account.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {account.business_name ? (
            <span className="text-[11px] text-zinc-600">{account.business_name}</span>
          ) : (
            <span className="text-[11px] text-zinc-700 italic">BM não sincronizada</span>
          )}
          <span className="text-zinc-800">·</span>
          <span className="text-[11px] text-zinc-700 font-mono">{account.id}</span>
        </div>
      </div>

      {/* Save indicator */}
      {saved && (
        <span className="text-[10px] text-emerald-400 flex-shrink-0">Salvo</span>
      )}

      {/* Toggle */}
      <button
        onClick={() => onToggle(!visible)}
        disabled={saving}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
          visible ? 'bg-blue-600' : 'bg-zinc-700'
        } ${saving ? 'opacity-50' : ''}`}
        aria-label={visible ? 'Ocultar conta' : 'Mostrar conta'}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          visible ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  )
}
