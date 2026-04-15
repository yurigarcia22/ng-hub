'use client'

import { useEffect, useState } from 'react'
import type { SyncLog } from '@/types/database'

interface LastSyncInfoProps {
  initial: SyncLog | null
  polling?: boolean
}

export default function LastSyncInfo({ initial, polling = false }: LastSyncInfoProps) {
  const [syncLog, setSyncLog] = useState(initial)

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      const res = await fetch('/api/sync/status')
      if (res.ok) {
        const data = await res.json()
        setSyncLog(data)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [polling])

  if (!syncLog || syncLog.status === 'none' as string) {
    return <p className="text-xs text-zinc-500">Nenhuma sincronização realizada</p>
  }

  const date = new Date(syncLog.started_at)
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)

  const statusColor = syncLog.status === 'success' ? 'text-emerald-400' :
    syncLog.status === 'partial' ? 'text-yellow-400' :
    syncLog.status === 'running' ? 'text-blue-400' : 'text-zinc-500'

  const statusLabel = syncLog.status === 'success' ? 'Atualizado' :
    syncLog.status === 'partial' ? 'Parcial' :
    syncLog.status === 'running' ? 'Atualizando...' : 'Falhou'

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      <span className="text-xs text-zinc-600">{formatted}</span>
    </div>
  )
}
