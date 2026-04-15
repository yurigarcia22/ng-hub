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
    return (
      <p className="text-xs text-zinc-600 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
        Nenhuma sincronização realizada
      </p>
    )
  }

  const date = new Date(syncLog.started_at)
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(date)

  const isRunning = syncLog.status === 'running'

  const dotColor = syncLog.status === 'success' ? 'bg-emerald-500' :
    syncLog.status === 'partial' ? 'bg-amber-500' :
    isRunning ? 'bg-blue-500' : 'bg-zinc-600'

  const label = syncLog.status === 'success' ? 'Atualizado' :
    syncLog.status === 'partial' ? 'Parcial' :
    isRunning ? 'Sincronizando...' : 'Falhou'

  const labelColor = syncLog.status === 'success' ? 'text-zinc-400' :
    syncLog.status === 'partial' ? 'text-amber-400' :
    isRunning ? 'text-blue-400' : 'text-zinc-600'

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor} ${isRunning ? 'animate-pulse' : ''}`} />
      <span className={`text-xs ${labelColor}`}>{label}</span>
      <span className="text-xs text-zinc-700">{formatted}</span>
    </div>
  )
}
