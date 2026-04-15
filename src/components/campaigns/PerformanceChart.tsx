'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface DataPoint {
  date: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
}

interface PerformanceChartProps {
  data: DataPoint[]
}

type MetricKey = 'spend' | 'impressions' | 'clicks' | 'ctr'

const METRICS: { key: MetricKey; label: string; color: string; format: (v: number) => string }[] = [
  {
    key: 'spend',
    label: 'Gasto (R$)',
    color: '#3b82f6',
    format: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  },
  {
    key: 'impressions',
    label: 'Impressões',
    color: '#8b5cf6',
    format: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)
  },
  {
    key: 'clicks',
    label: 'Cliques',
    color: '#10b981',
    format: v => new Intl.NumberFormat('pt-BR').format(v)
  },
  {
    key: 'ctr',
    label: 'CTR (%)',
    color: '#f59e0b',
    format: v => `${v.toFixed(2)}%`
  }
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d)
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('spend')

  const metric = METRICS.find(m => m.key === activeMetric)!

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-500 text-center">Sem dados para exibir no período selecionado</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-sm font-medium text-white">Evolução de Performance</h3>
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`text-xs px-3 py-1 rounded-md transition ${
                activeMetric === m.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => metric.format(v).replace('R$\u00a0', 'R$ ')}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 12 }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value) => [metric.format(Number(value)), metric.label]}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Line
            type="monotone"
            dataKey={activeMetric}
            stroke={metric.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: metric.color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
