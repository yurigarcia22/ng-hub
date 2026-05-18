'use client'

import { useState } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
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
  { key: 'spend',       label: 'Gasto',       color: '#3b82f6', format: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v) },
  { key: 'impressions', label: 'Impressões',  color: '#8b5cf6', format: v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v) },
  { key: 'clicks',      label: 'Cliques',     color: '#10b981', format: v => new Intl.NumberFormat('pt-BR').format(v) },
  { key: 'ctr',         label: 'CTR',         color: '#f59e0b', format: v => `${v.toFixed(2)}%` },
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
      <div className="rounded-2xl border border-white/[0.05] bg-[#111115] p-8 text-center">
        <div className="mx-auto w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
        </div>
        <p className="text-sm text-zinc-500 font-medium">Sem dados para exibir</p>
        <p className="text-xs text-zinc-600 mt-1">Não há métricas no período selecionado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-[#111115] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Evolução de Performance</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">{data.length} {data.length === 1 ? 'dia' : 'dias'} no gráfico</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.04] rounded-xl p-1">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`press text-[11px] px-2.5 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                activeMetric === m.key
                  ? 'bg-white/[0.08] text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metric.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="#27272a" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={v => metric.format(v).replace('R$ ', 'R$ ')}
            tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0d0d10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              padding: '10px 12px',
            }}
            labelStyle={{ color: '#a1a1aa', fontWeight: 600, marginBottom: 4 }}
            formatter={(value) => [metric.format(Number(value)), metric.label]}
            labelFormatter={(label) => formatDate(String(label))}
            cursor={{ stroke: metric.color, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey={activeMetric}
            stroke={metric.color}
            strokeWidth={2.5}
            fill={`url(#grad-${activeMetric})`}
            dot={false}
            activeDot={{ r: 4, fill: metric.color, strokeWidth: 2, stroke: '#0d0d10' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

