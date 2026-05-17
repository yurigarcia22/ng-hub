'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'

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

  // Calcular totais para exibir abaixo do gráfico
  let curTotal = 0, prevTotal = 0, curCount = 0, prevCount = 0
  for (const p of data) {
    const c = p[curKey] as number | null
    const pv = p[prevKey] as number | null
    if (c !== null) { curTotal += c; curCount++ }
    if (pv !== null) { prevTotal += pv; prevCount++ }
  }
  // Para CTR usar média
  if (metric === 'ctr') {
    curTotal = curCount > 0 ? curTotal / curCount : 0
    prevTotal = prevCount > 0 ? prevTotal / prevCount : 0
  }

  const diff = prevTotal === 0 ? null : ((curTotal - prevTotal) / prevTotal) * 100
  const isGood = diff !== null && (metric === 'ctr' || metric === 'spend' ? diff > 0 : diff > 0)

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 print:break-inside-avoid">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-widest">Evolução comparativa</h2>
          <p className="text-xs text-zinc-500 mt-1">Este período vs período anterior (mesma duração)</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 flex-wrap">
          {availableMetrics.map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`text-xs px-3 py-1 rounded-md transition ${metric === m ? 'bg-white text-zinc-900 shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Totais resumidos */}
      <div className="flex items-baseline gap-6 mb-4 pb-4 border-b border-zinc-100">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Este período</p>
          <p className="text-xl font-black text-zinc-900 tabular-nums">{fmtValue(curTotal, metric)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-0.5">Período anterior</p>
          <p className="text-sm font-bold text-zinc-500 tabular-nums">{fmtValue(prevTotal, metric)}</p>
        </div>
        {diff !== null && Math.abs(diff) >= 0.5 && (
          <div className={`ml-auto text-sm font-bold tabular-nums ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
            {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="day"
            tickFormatter={d => `D${d}`}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => fmtValue(Number(v), metric)}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12 }}
            formatter={(value) => fmtValue(Number(value), metric)}
            labelFormatter={d => `Dia ${d}`}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
          <Line
            type="monotone"
            dataKey={prevKey as string}
            name="Período anterior"
            stroke="#a1a1aa"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 3, fill: '#a1a1aa' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey={curKey as string}
            name="Este período"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
