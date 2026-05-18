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

  if (!syncLog || syncLog.status === ('none' as string)) {
    return (
      <p className="text-xs text-zinc-600 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
        Nenhuma sincronização realizada
      </p>
    )
  }

  const date = new Date(syncLog.started_at)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  let relative: string
  if (diffMin < 1) relative = 'agora há pouco'
  else if (diffMin < 60) relative = `há ${diffMin}min`
  else if (diffHour < 24) relative = `há ${diffHour}h`
  else if (diffDay < 7) relative = `há ${diffDay}d`
  else {
    relative = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  const isRunning = syncLog.status === 'running'

  const dotColor = syncLog.status === 'success' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' :
    syncLog.status === 'partial' ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' :
    isRunning ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)] animate-pulse' : 'bg-zinc-600'

  const label = syncLog.status === 'success' ? 'Atualizado' :
    syncLog.status === 'partial' ? 'Parcial' :
    isRunning ? 'Sincronizando' : 'Falhou'

  const labelColor = syncLog.status === 'success' ? 'text-zinc-400' :
    syncLog.status === 'partial' ? 'text-amber-400' :
    isRunning ? 'text-blue-400' : 'text-zinc-600'

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className={`font-medium ${labelColor}`}>{label}</span>
      <span className="text-zinc-700">·</span>
      <span className="text-zinc-600" title={date.toLocaleString('pt-BR')}>{relative}</span>
    </div>
  )
}
