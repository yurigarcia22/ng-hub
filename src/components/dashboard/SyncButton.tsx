'use client'

import { useState } from 'react'

type SyncState = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  onSyncComplete?: () => void
}

export default function SyncButton({ onSyncComplete }: Props) {
  const [state, setState] = useState<SyncState>('idle')

  async function handleSync() {
    if (state === 'loading') return
    setState('loading')

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok && res.status !== 409) throw new Error('Sync failed')

      await pollUntilDone()
      setState('success')
      onSyncComplete?.()
      setTimeout(() => setState('idle'), 2200)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  async function pollUntilDone() {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const res = await fetch('/api/sync/status')
      if (!res.ok) continue
      const data = await res.json()
      if (data.status === 'success' || data.status === 'partial') return
      if (data.status === 'failed') throw new Error('Sync failed on server')
    }
    throw new Error('Sync timed out after 3 minutes')
  }

  const baseClass = 'press relative inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#08080a]'

  const variants: Record<SyncState, { className: string; label: string; icon?: React.ReactNode }> = {
    idle: {
      className: 'bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-[0_4px_16px_rgba(59,130,246,0.30)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.45)] focus:ring-blue-500/40',
      label: 'Atualizar',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    loading: {
      className: 'bg-zinc-800/70 text-zinc-400 cursor-not-allowed border border-white/[0.06]',
      label: 'Atualizando...',
      icon: (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ),
    },
    success: {
      className: 'bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.40)] focus:ring-emerald-500/40',
      label: 'Atualizado!',
      icon: (
        <svg className="w-3.5 h-3.5 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      className: 'bg-red-600 hover:bg-red-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.30)] focus:ring-red-500/40',
      label: 'Tentar de novo',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  }

  const config = variants[state]

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className={`${baseClass} ${config.className}`}
    >
      {state === 'idle' && (
        <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-t-xl" />
      )}
      <span className="relative flex items-center gap-2">
        {config.icon}
        {config.label}
      </span>
    </button>
  )
}
