'use client'

import { useState } from 'react'

type SyncState = 'idle' | 'loading' | 'success' | 'error'

export default function SyncButton() {
  const [state, setState] = useState<SyncState>('idle')

  async function handleSync() {
    if (state === 'loading') return
    setState('loading')

    try {
      const res = await fetch('/api/sync', { method: 'POST' })

      if (!res.ok && res.status !== 409) {
        throw new Error('Sync failed')
      }

      // Polling até finalizar
      await pollUntilDone()
      setState('success')

      // Recarrega a página para mostrar dados novos
      window.location.reload()
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  async function pollUntilDone(): Promise<void> {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const res = await fetch('/api/sync/status')
      if (!res.ok) continue
      const data = await res.json()
      if (data.status !== 'running') return
    }
  }

  const labels: Record<SyncState, string> = {
    idle: 'Atualizar',
    loading: 'Atualizando...',
    success: 'Atualizado!',
    error: 'Erro — tentar de novo'
  }

  const styles: Record<SyncState, string> = {
    idle: 'bg-blue-600 hover:bg-blue-500 text-white',
    loading: 'bg-zinc-700 text-zinc-400 cursor-not-allowed',
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 hover:bg-red-500 text-white'
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className={`text-sm font-medium px-4 py-2 rounded-lg transition ${styles[state]}`}
    >
      {state === 'loading' && (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {labels[state]}
        </span>
      )}
      {state !== 'loading' && labels[state]}
    </button>
  )
}
