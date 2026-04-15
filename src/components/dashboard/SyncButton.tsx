'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type SyncState = 'idle' | 'loading' | 'success' | 'error'

export default function SyncButton() {
  const [state, setState] = useState<SyncState>('idle')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleSync() {
    if (state === 'loading' || isPending) return
    setState('loading')

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (res.status === 409) {
        // Já tem sync em andamento
        setState('loading')
        pollStatus()
        return
      }
      if (!res.ok) throw new Error('Sync failed')
      setState('success')
      startTransition(() => router.refresh())
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  function pollStatus() {
    const interval = setInterval(async () => {
      const res = await fetch('/api/sync/status')
      if (res.ok) {
        const data = await res.json()
        if (data.status !== 'running') {
          clearInterval(interval)
          setState(data.status === 'success' || data.status === 'partial' ? 'success' : 'error')
          startTransition(() => router.refresh())
          setTimeout(() => setState('idle'), 3000)
        }
      }
    }, 3000)
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
    success: 'bg-emerald-600 text-white cursor-default',
    error: 'bg-red-600 hover:bg-red-500 text-white'
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${styles[state]}`}
    >
      {labels[state]}
    </button>
  )
}
