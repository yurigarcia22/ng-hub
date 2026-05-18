import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { verifyShareToken } from '@/lib/share-token'
import { fetchReportData } from '@/lib/report-data'
import { ReportChart } from '@/app/relatorio/[accountId]/ReportChart'
import type { MetricKey } from '@/app/relatorio/[accountId]/ReportChart'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

function fmtCurrency(v: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: v >= 1000 ? 0 : 2 }).format(v)
}
function fmtNumber(v: number) { return new Intl.NumberFormat('pt-BR').format(Math.round(v)) }
function fmtCompact(v: number) { return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v) }
function fmtPercent(v: number) { return `${v.toFixed(2)}%` }
function fmtDate(d: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d + 'T12:00:00'))
}
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return ((cur - prev) / prev) * 100
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const payload = await verifyShareToken(token)
  if (!payload) return { title: 'Relatório indisponível' }
  const data = await fetchReportData(payload.accountId, payload.since, payload.until)
  return { title: data ? `Relatório · ${data.account.name}` : 'Relatório' }
}

function Trend({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const p = pct(cur, prev)
  if (p === null) return null
  const abs = Math.abs(p)
  if (abs < 0.5) return null
  const isPos = p > 0
  const isGood = invert ? !isPos : isPos
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
      <span className="text-[10px]">{isPos ? '▲' : '▼'}</span>
      {abs.toFixed(0)}%
    </span>
  )
}

const ACCENT = {
  wpp:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'WhatsApp', kpi: 'border-t-emerald-500', tint: 'from-emerald-50/40' },
  leads:   { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500',  label: 'Captação de Leads', kpi: 'border-t-violet-500', tint: 'from-violet-50/40' },
  sales:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   label: 'E-commerce', kpi: 'border-t-amber-500', tint: 'from-amber-50/40' },
  default: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    label: 'Tráfego', kpi: 'border-t-blue-500', tint: 'from-blue-50/40' },
}

export default async function SharedReportPage({ params }: PageProps) {
  const { token } = await params
  const payload = await verifyShareToken(token)
  if (!payload) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 mx-auto mb-5 flex items-center justify-center shadow-sm">
            <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-zinc-900">Link inválido ou expirado</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Solicite um novo link de acesso ao seu gestor.</p>
        </div>
      </div>
    )
  }

  const data = await fetchReportData(payload.accountId, payload.since, payload.until)
  if (!data) notFound()

  const { account, period, prevPeriod, template, allCur, allPrev, allDerived, prevDerived, campaigns, chartData, availableChartMetrics } = data
  const currency = account.currency
  const accent = ACCENT[template]

  return (
    <div className="min-h-screen bg-[#fafafa]" style={{ color: '#18181b', fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 glass-light border-b border-zinc-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(59,130,246,0.30)] relative">
              <span className="text-white font-black text-[11px]">NG</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div className="min-w-0">
              <p className="text-zinc-900 font-bold text-sm leading-none truncate">{account.name}</p>
              <p className="text-zinc-500 text-[10px] leading-none mt-0.5 tracking-wide">Grupo NG · Performance</p>
            </div>
          </div>
          <a
            href={`/api/pdf/${token}`}
            className="press flex-shrink-0 inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Baixar PDF</span>
            <span className="sm:hidden">PDF</span>
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6 animate-fade-in">

        {/* Hero — período + template */}
        <div className={`relative bg-white border border-zinc-200/80 rounded-3xl p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden animate-fade-in-up`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${accent.tint} to-transparent pointer-events-none`} />
          <div className="relative flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Período do relatório</p>
              <p className="text-lg sm:text-xl font-black text-zinc-900 tabular-nums mt-1.5 tracking-tight">
                {fmtDate(period.since)} <span className="text-zinc-400 font-normal mx-1">→</span> {fmtDate(period.until)}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Comparado a: <span className="tabular-nums">{fmtDate(prevPeriod.since)} → {fmtDate(prevPeriod.until)}</span>
              </p>
            </div>
            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest ${accent.text} ${accent.bg} border ${accent.border} px-2.5 py-1.5 rounded-lg uppercase`}>
              <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              {accent.label}
            </div>
          </div>
          <div className="relative flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs text-zinc-600 font-medium">
                {campaigns.filter(c => c.effective_status === 'ACTIVE').length} campanhas ativas
              </span>
            </div>
            <span className="text-zinc-300">·</span>
            <span className="text-xs text-zinc-500">{campaigns.length} no período</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Gasto */}
          <KpiCard
            label="Gasto total"
            value={fmtCurrency(allCur.spend, currency)}
            trend={<Trend cur={allCur.spend} prev={allPrev.spend} invert />}
            accent="blue"
            stagger={1}
          />

          {template === 'wpp' ? (
            <>
              <KpiCard
                label="Conversas"
                value={fmtNumber(allCur.conversations)}
                trend={<Trend cur={allCur.conversations} prev={allPrev.conversations} />}
                hint={allDerived.cpconv > 0 ? `${fmtCurrency(allDerived.cpconv)}/conv` : undefined}
                accent="emerald"
                stagger={2}
              />
              <KpiCard
                label="Mensagens"
                value={fmtNumber(allCur.messages_sent)}
                hint="respondidas"
                accent="emerald"
                stagger={3}
              />
            </>
          ) : template === 'leads' ? (
            <>
              <KpiCard
                label="Leads"
                value={fmtNumber(allCur.leads)}
                trend={<Trend cur={allCur.leads} prev={allPrev.leads} />}
                hint={allDerived.cpl > 0 ? `${fmtCurrency(allDerived.cpl)}/lead` : undefined}
                accent="violet"
                stagger={2}
              />
              <KpiCard
                label="Taxa conv."
                value={fmtPercent(allDerived.leadConvRate)}
                hint="cliques → leads"
                accent="emerald"
                stagger={3}
              />
            </>
          ) : template === 'sales' ? (
            <>
              <KpiCard
                label="ROAS"
                value={`${allCur.roas.toFixed(2)}x`}
                trend={<Trend cur={allCur.roas} prev={allPrev.roas} />}
                accent="amber"
                stagger={2}
              />
              <KpiCard
                label="Cliques"
                value={fmtNumber(allCur.clicks)}
                trend={<Trend cur={allCur.clicks} prev={allPrev.clicks} />}
                hint={allDerived.cpc > 0 ? `${fmtCurrency(allDerived.cpc)}/clk` : undefined}
                accent="emerald"
                stagger={3}
              />
            </>
          ) : (
            <>
              <KpiCard
                label="Impressões"
                value={fmtCompact(allCur.impressions)}
                trend={<Trend cur={allCur.impressions} prev={allPrev.impressions} />}
                hint={`${fmtCompact(allCur.reach)} alcance`}
                accent="violet"
                stagger={2}
              />
              <KpiCard
                label="Cliques"
                value={fmtNumber(allCur.clicks)}
                trend={<Trend cur={allCur.clicks} prev={allPrev.clicks} />}
                hint={allDerived.cpc > 0 ? `${fmtCurrency(allDerived.cpc)}/clk` : undefined}
                accent="emerald"
                stagger={3}
              />
            </>
          )}

          <KpiCard
            label="CTR médio"
            value={fmtPercent(allCur.ctr)}
            trend={<Trend cur={allCur.ctr} prev={allPrev.ctr} />}
            hint={`CPM ${fmtCurrency(allCur.cpm)}`}
            accent="amber"
            stagger={4}
          />
        </div>

        {/* Gráfico */}
        <div className="animate-fade-in-up stagger-3">
          <ReportChart data={chartData} availableMetrics={availableChartMetrics as MetricKey[]} />
        </div>

        {/* Métricas detalhadas */}
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-fade-in-up stagger-4">
          <h2 className="text-xs font-bold text-zinc-500 mb-5 uppercase tracking-widest">Métricas detalhadas</h2>

          <div className="space-y-1">
            <SectionLabel>Investimento &amp; Alcance</SectionLabel>
            <MetricRow label="Gasto" cur={fmtCurrency(allCur.spend, currency)} prev={fmtCurrency(allPrev.spend, currency)} trend={<Trend cur={allCur.spend} prev={allPrev.spend} />} />
            <MetricRow label="Impressões" cur={fmtNumber(allCur.impressions)} prev={fmtNumber(allPrev.impressions)} trend={<Trend cur={allCur.impressions} prev={allPrev.impressions} />} />
            <MetricRow label="Alcance" cur={fmtNumber(allCur.reach)} prev={fmtNumber(allPrev.reach)} trend={<Trend cur={allCur.reach} prev={allPrev.reach} />} sub="pessoas únicas" />
            <MetricRow label="Frequência" cur={allCur.frequency.toFixed(2)} prev={allPrev.frequency.toFixed(2)} trend={<Trend cur={allCur.frequency} prev={allPrev.frequency} invert />} sub="visualizações por pessoa" />

            <SectionLabel>Engajamento &amp; Eficiência</SectionLabel>
            <MetricRow label="Cliques" cur={fmtNumber(allCur.clicks)} prev={fmtNumber(allPrev.clicks)} trend={<Trend cur={allCur.clicks} prev={allPrev.clicks} />} />
            <MetricRow label="CTR" cur={fmtPercent(allCur.ctr)} prev={fmtPercent(allPrev.ctr)} trend={<Trend cur={allCur.ctr} prev={allPrev.ctr} />} sub="taxa de cliques" />
            <MetricRow label="CPC" cur={fmtCurrency(allDerived.cpc, currency)} prev={fmtCurrency(prevDerived.cpc, currency)} trend={<Trend cur={allDerived.cpc} prev={prevDerived.cpc} invert />} sub="custo por clique" />
            <MetricRow label="CPM" cur={fmtCurrency(allCur.cpm, currency)} prev={fmtCurrency(allPrev.cpm, currency)} trend={<Trend cur={allCur.cpm} prev={allPrev.cpm} invert />} sub="custo por mil impressões" />

            {(allCur.conversations > 0 || allCur.leads > 0 || allCur.roas > 0) && (
              <>
                <SectionLabel>Resultados de Conversão</SectionLabel>
                {allCur.conversations > 0 && (
                  <>
                    <MetricRow label="Conversas WPP" cur={fmtNumber(allCur.conversations)} prev={fmtNumber(allPrev.conversations)} trend={<Trend cur={allCur.conversations} prev={allPrev.conversations} />} />
                    <MetricRow label="Mensagens" cur={fmtNumber(allCur.messages_sent)} prev={fmtNumber(allPrev.messages_sent)} trend={<Trend cur={allCur.messages_sent} prev={allPrev.messages_sent} />} sub="respondidas" />
                    <MetricRow label="Custo/Conversa" cur={fmtCurrency(allDerived.cpconv, currency)} prev={fmtCurrency(prevDerived.cpconv, currency)} trend={<Trend cur={allDerived.cpconv} prev={prevDerived.cpconv} invert />} />
                  </>
                )}
                {allCur.leads > 0 && (
                  <>
                    <MetricRow label="Leads" cur={fmtNumber(allCur.leads)} prev={fmtNumber(allPrev.leads)} trend={<Trend cur={allCur.leads} prev={allPrev.leads} />} />
                    <MetricRow label="CPL" cur={fmtCurrency(allDerived.cpl, currency)} prev={fmtCurrency(prevDerived.cpl, currency)} trend={<Trend cur={allDerived.cpl} prev={prevDerived.cpl} invert />} sub="custo por lead" />
                    <MetricRow label="Taxa conv. leads" cur={fmtPercent(allDerived.leadConvRate)} prev={fmtPercent(prevDerived.leadConvRate)} trend={<Trend cur={allDerived.leadConvRate} prev={prevDerived.leadConvRate} />} sub="cliques → leads" />
                  </>
                )}
                {allCur.roas > 0 && (
                  <>
                    <MetricRow label="ROAS" cur={`${allCur.roas.toFixed(2)}x`} prev={`${allPrev.roas.toFixed(2)}x`} trend={<Trend cur={allCur.roas} prev={allPrev.roas} />} />
                    <MetricRow label="CPA" cur={fmtCurrency(allCur.cpa, currency)} prev={fmtCurrency(allPrev.cpa, currency)} trend={<Trend cur={allCur.cpa} prev={allPrev.cpa} invert />} sub="custo por aquisição" />
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Campanhas */}
        <div className="animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Campanhas</h2>
            <span className="text-xs font-semibold text-zinc-400 tabular-nums bg-white border border-zinc-200 rounded-lg px-2 py-0.5">
              {campaigns.length}
            </span>
          </div>
          <div className="space-y-3">
            {campaigns.map((c, idx) => {
              const isActive = c.effective_status === 'ACTIVE'
              const cAccent = ACCENT[c.template]
              return (
                <div
                  key={c.id}
                  className={`bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200 ${!isActive ? 'opacity-75' : ''} animate-fade-in-up`}
                  style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-zinc-100">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-300'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 leading-snug">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold ${cAccent.text} ${cAccent.bg} border ${cAccent.border} px-1.5 py-0.5 rounded uppercase tracking-wider`}>{cAccent.label}</span>
                          <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            {isActive ? '● Ativa' : '○ Pausada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <CampaignMetric label="Gasto" value={fmtCurrency(c.m.spend, currency)} trend={<Trend cur={c.m.spend} prev={c.p.spend} invert />} />
                    {c.template === 'wpp' ? (
                      <>
                        <CampaignMetric label="Conversas" value={fmtNumber(c.m.conversations)} trend={<Trend cur={c.m.conversations} prev={c.p.conversations} />} />
                        <CampaignMetric label="Custo/Conv" value={c.derived.cpconv > 0 ? fmtCurrency(c.derived.cpconv) : '—'} />
                      </>
                    ) : c.template === 'leads' ? (
                      <>
                        <CampaignMetric label="Leads" value={fmtNumber(c.m.leads)} trend={<Trend cur={c.m.leads} prev={c.p.leads} />} />
                        <CampaignMetric label="CPL" value={c.derived.cpl > 0 ? fmtCurrency(c.derived.cpl) : '—'} />
                      </>
                    ) : c.template === 'sales' ? (
                      <>
                        <CampaignMetric label="ROAS" value={`${c.m.roas.toFixed(2)}x`} highlight />
                        <CampaignMetric label="CPA" value={c.m.cpa > 0 ? fmtCurrency(c.m.cpa) : '—'} />
                      </>
                    ) : (
                      <>
                        <CampaignMetric label="Impressões" value={fmtNumber(c.m.impressions)} />
                        <CampaignMetric label="Cliques" value={fmtNumber(c.m.clicks)} />
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-zinc-100">
                    <CampaignMetric label="CTR" value={fmtPercent(c.m.ctr)} small />
                    <CampaignMetric label="CPM" value={fmtCurrency(c.m.cpm)} small />
                    <CampaignMetric label="Alcance" value={fmtNumber(c.m.reach)} small />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Glossário */}
        <details className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] group">
          <summary className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer flex items-center justify-between hover:text-zinc-700 transition-colors">
            <span>Glossário de métricas</span>
            <svg className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-4 text-xs text-zinc-600 animate-fade-in">
            <p><strong className="text-zinc-800">CTR:</strong> taxa de cliques (clicaram / viram)</p>
            <p><strong className="text-zinc-800">CPM:</strong> custo por mil impressões</p>
            <p><strong className="text-zinc-800">CPC:</strong> custo por clique</p>
            <p><strong className="text-zinc-800">CPL:</strong> custo por lead capturado</p>
            <p><strong className="text-zinc-800">CPconv:</strong> custo por conversa iniciada</p>
            <p><strong className="text-zinc-800">CPA:</strong> custo por aquisição</p>
            <p><strong className="text-zinc-800">ROAS:</strong> retorno sobre investimento</p>
            <p><strong className="text-zinc-800">Frequência:</strong> vezes que cada pessoa viu o anúncio</p>
          </div>
        </details>

        {/* Footer */}
        <div className="text-center pt-4 pb-6">
          <div className="inline-flex items-center gap-2 text-[11px] text-zinc-400">
            <div className="w-5 h-5 rounded-md bg-blue-600/90 flex items-center justify-center">
              <span className="text-white font-black text-[8px]">NG</span>
            </div>
            <span>Grupo NG · {fmtDate(period.until)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Helper Components ============
function KpiCard({ label, value, hint, trend, accent, stagger }: {
  label: string; value: string; hint?: string; trend?: React.ReactNode;
  accent: 'blue' | 'emerald' | 'violet' | 'amber'; stagger?: number
}) {
  const border = {
    blue: 'border-t-blue-500', emerald: 'border-t-emerald-500',
    violet: 'border-t-violet-500', amber: 'border-t-amber-500'
  }[accent]
  return (
    <div
      className={`bg-white border border-zinc-200/80 rounded-2xl p-4 border-t-[3px] ${border} shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow duration-300 animate-fade-in-up`}
      style={stagger ? { animationDelay: `${stagger * 60}ms` } : undefined}
    >
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none tracking-tight">{value}</p>
      <div className="mt-2.5 min-h-[16px] flex items-center gap-2">
        {trend}
        {hint && <span className="text-[10px] text-zinc-400 font-medium">{hint}</span>}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-5 first:mt-0 mb-1.5">
      {children}
    </p>
  )
}

function MetricRow({ label, cur, prev, trend, sub }: { label: string; cur: string; prev: string; trend?: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0 gap-2 hover:bg-zinc-50/50 -mx-2 px-2 rounded-lg transition-colors">
      <div className="min-w-0 flex-1">
        <span className="text-xs sm:text-sm text-zinc-700 font-medium">{label}</span>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
        <span className="text-[11px] text-zinc-400 tabular-nums hidden sm:inline w-24 text-right">{prev}</span>
        <span className="text-xs sm:text-sm font-bold text-zinc-900 tabular-nums w-20 sm:w-28 text-right">{cur}</span>
        <div className="w-12 sm:w-14 text-right">{trend}</div>
      </div>
    </div>
  )
}

function CampaignMetric({ label, value, trend, highlight, small }: { label: string; value: string; trend?: React.ReactNode; highlight?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5 font-semibold">{label}</p>
      <p className={`${small ? 'text-xs' : 'text-sm'} font-bold tabular-nums ${highlight ? 'text-amber-600' : 'text-zinc-900'}`}>{value}</p>
      {trend && <div className="mt-0.5">{trend}</div>}
    </div>
  )
}
