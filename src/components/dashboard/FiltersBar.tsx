'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface FiltersBarProps {
  accounts: { id: string; name: string }[]
}

const PERIODS = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
]

function getDateRange(period: string): { since: string; until: string } {
  const until = new Date()
  const since = new Date()
  if (period === 'today') {
    // nenhum ajuste
  } else if (period === '7d') {
    since.setDate(since.getDate() - 7)
  } else {
    since.setDate(since.getDate() - 30)
  }
  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0]
  }
}

export default function FiltersBar({ accounts }: FiltersBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentAccount = searchParams.get('account') ?? ''
  const currentSince = searchParams.get('since') ?? ''
  const currentPeriod = (() => {
    if (!currentSince) return '30d'
    const today = new Date()
    const since = new Date(currentSince)
    const diff = Math.round((today.getTime() - since.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 1) return 'today'
    if (diff <= 7) return '7d'
    return '30d'
  })()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // Ao mudar período, atualizar since/until
    if (key === 'period') {
      const range = getDateRange(value)
      params.set('since', range.since)
      params.set('until', range.until)
      params.delete('period')
    }

    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {accounts.length > 1 && (
        <select
          value={currentAccount}
          onChange={e => update('account', e.target.value)}
          className="text-sm bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as contas</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => update('period', p.value)}
            className={`text-xs px-3 py-1 rounded-md transition ${
              currentPeriod === p.value
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
