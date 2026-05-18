'use client'

import { useState } from 'react'
import { Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

export interface ChartPoint {
  day: number
  curDate: string | null
  prevDate: string | null
  curSpend: number | null
  prevSpend: number | null
  curImpressions: number | null
  prevImpressions: number | null
  curClicks: number | null
  prevClicks: number | null
  curConversations: number | null
  prevConversations: number | null
  curLeads: number | null
  prevLeads: number | null
  curCtr: number | null
  prevCtr: number | null
}

export type MetricKey = 'spend' | 'impressions' | 'clicks' | 'conversations' | 'leads' | 'ctr'

interface Props {
  data: ChartPoint[]
  availableMetrics: MetricKey[]
}

const LABELS: Record<MetricKey, string> = {
  spend: 'Gasto',
  impressions: 'Impressões',
  clicks: 'Cliques',
  conversations: 'Conversas',
  leads: 'Leads',
  ctr: 'CTR (%)',
}

const COLORS: Record<MetricKey, string> = {
  spend: '#3b82f6',         // blue
  impressions: '#8b5cf6',   // violet
  clicks: '#10b981',        // emerald
  conversations: '#10b981', // emerald
  leads: '#8b5cf6',         // violet
  ctr: '#f59e0b',           // amber
}

function fmtValue(v: number, key: MetricKey): string {
  if (key === 'spend') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
  if (key === 'ctr') return `${v.toFixed(2)}%`
  return new Intl.NumberFormat('pt-BR', { notation: v >= 10000 ? 'compact' : 'standard' }).format(v)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function ReportChart({ data, availableMetrics }: Props) {
  const [metric, setMetric] = useState<MetricKey>(availableMetrics[0])

  const curKey = `cur${capitalize(metric)}` as keyof ChartPoint
  const prevKey = `prev${capitalize(metric)}` as keyof ChartPoint
  const color = COLORS[metric]

  // Totais para cabeçalho
  let curTotal = 0, prevTotal = 0, curCount = 0, prevCount = 0
  for (const p of data) {
    const c = p[curKey] as number | null
    const pv = p[prevKey] as number | null
    if (c !== null) { curTotal += c; curCount++ }
    if (pv !== null) { prevTotal += pv; prevCount++ }
  }
  if (metric === 'ctr') {
    curTotal = curCount > 0 ? curTotal / curCount : 0
    prevTotal = prevCount > 0 ? prevTotal / prevCount : 0
  }

  const diff = prevTotal === 0 ? null : ((curTotal - prevTotal) / prevTotal) * 100
  const isGood = diff !== null && diff > 0

  return (
    <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] print:break-inside-avoid">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Evolução comparativa</h2>
          <p className="text-[11px] text-zinc-400 mt-1">Este período vs período anterior · mesma duração</p>
        </div>
        <div className="flex items-center gap-0.5 bg-zinc-100/70 rounded-xl p-1 flex-wrap">
          {availableMetrics.map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`press text-[11px] px-3 py-1.5 rounded-lg transition-all duration-200 font-semibold ${
                metric === m
                  ? 'bg-white text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Totals row */}
      <div className="flex items-end justify-between gap-6 mb-5 pb-5 border-b border-zinc-100 flex-wrap">
        <div className="flex items-end gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Este período</p>
            <p className="text-2xl sm:text-[28px] font-black text-zinc-900 tabular-nums leading-none tracking-tight">
              {fmtValue(curTotal, metric)}
            </p>
          </div>
          <div className="pb-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-bold">Anterior</p>
            <p className="text-base font-bold text-zinc-400 tabular-nums leading-none">
              {fmtValue(prevTotal, metric)}
            </p>
          </div>
        </div>
        {diff !== null && Math.abs(diff) >= 0.5 && (
          <div className={`inline-flex items-center gap-1.5 text-sm font-bold tabular-nums px-3 py-1.5 rounded-xl ${
            isGood
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-red-700 bg-red-50 border border-red-200'
          }`}>
            <span className="text-xs">{diff > 0 ? '▲' : '▼'}</span>
            {Math.abs(diff).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="curGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={d => `D${d}`}
            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={v => fmtValue(Number(v), metric)}
            tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              padding: '10px 12px',
            }}
            labelStyle={{ color: '#52525b', fontWeight: 600, marginBottom: 4 }}
            formatter={(value) => fmtValue(Number(value), metric)}
            labelFormatter={d => `Dia ${d}`}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.3 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
            iconType="line"
            iconSize={14}
          />
          <Line
            type="monotone"
            dataKey={prevKey as string}
            name="Período anterior"
            stroke="#a1a1aa"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 3, fill: '#a1a1aa', strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey={curKey as string}
            name="Este período"
            stroke={color}
            strokeWidth={2.5}
            fill="url(#curGradient)"
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
