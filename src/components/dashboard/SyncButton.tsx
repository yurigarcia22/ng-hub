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
      setTimeout(() => setState('idle'), 2000)
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
      // Still 'running' — continue polling
    }
    throw new Error('Sync timed out after 3 minutes')
  }

  const config = {
    idle: { label: 'Atualizar', className: 'bg-blue-600 hover:bg-blue-500 text-white' },
    loading: { label: 'Atualizando...', className: 'bg-zinc-700 text-zinc-400 cursor-not-allowed' },
    success: { label: 'Atualizado!', className: 'bg-emerald-600 text-white' },
    error: { label: 'Tentar de novo', className: 'bg-red-600 hover:bg-red-500 text-white' }
  }[state]

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition ${config.className}`}
    >
      {state === 'loading' && (
        <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {config.label}
    </button>
  )
}
