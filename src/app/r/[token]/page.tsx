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
  const payload = verifyShareToken(token)
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
    <span className={`text-xs font-semibold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPos ? '↑' : '↓'}{abs.toFixed(0)}%
    </span>
  )
}

export default async function SharedReportPage({ params }: PageProps) {
  const { token } = await params
  const payload = verifyShareToken(token)
  if (!payload) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-zinc-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-zinc-900">Link inválido ou expirado</h1>
          <p className="text-sm text-zinc-500 mt-1">Solicite um novo link de acesso.</p>
        </div>
      </div>
    )
  }

  const data = await fetchReportData(payload.accountId, payload.since, payload.until)
  if (!data) notFound()

  const { account, period, prevPeriod, template, allCur, allPrev, allDerived, prevDerived, campaigns, chartData, availableChartMetrics } = data
  const currency = account.currency

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sticky compact header com botão PDF */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xs">NG</span>
            </div>
            <div className="min-w-0">
              <p className="text-zinc-900 font-bold text-sm leading-none truncate">{account.name}</p>
              <p className="text-zinc-500 text-[10px] leading-none mt-0.5">Grupo NG · Performance</p>
            </div>
          </div>
          <a
            href={`/api/pdf/${token}`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Baixar PDF</span>
            <span className="sm:hidden">PDF</span>
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Hero — período + template */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Período do relatório</p>
              <p className="text-base sm:text-lg font-black text-zinc-900 tabular-nums mt-1">
                {fmtDate(period.since)} <span className="text-zinc-400 font-normal">→</span> {fmtDate(period.until)}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Comparado a: {fmtDate(prevPeriod.since)} → {fmtDate(prevPeriod.until)}
              </p>
            </div>
            <div>
              {template === 'wpp' && (
                <span className="text-[10px] font-bold tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md uppercase">WhatsApp</span>
              )}
              {template === 'leads' && (
                <span className="text-[10px] font-bold tracking-widest text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-md uppercase">Leads</span>
              )}
              {template === 'sales' && (
                <span className="text-[10px] font-bold tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md uppercase">E-commerce</span>
              )}
              {template === 'default' && (
                <span className="text-[10px] font-bold tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md uppercase">Tráfego</span>
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {campaigns.filter(c => c.effective_status === 'ACTIVE').length} campanhas ativas neste período
          </p>
        </div>

        {/* KPI Cards — 2x2 mobile, 4x1 desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Gasto */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-blue-500">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Gasto total</p>
            <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCurrency(allCur.spend, currency)}</p>
            <div className="mt-2 min-h-[16px]">
              <Trend cur={allCur.spend} prev={allPrev.spend} invert />
            </div>
          </div>

          {/* KPI principal template-aware */}
          {template === 'wpp' ? (
            <>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-emerald-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Conversas</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtNumber(allCur.conversations)}</p>
                <div className="mt-2 min-h-[16px] flex items-center gap-2">
                  <Trend cur={allCur.conversations} prev={allPrev.conversations} />
                  {allDerived.cpconv > 0 && <span className="text-[10px] text-zinc-400">{fmtCurrency(allDerived.cpconv)}/conv</span>}
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-emerald-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Mensagens</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtNumber(allCur.messages_sent)}</p>
                <p className="text-[10px] text-zinc-400 mt-2">respondidas</p>
              </div>
            </>
          ) : template === 'leads' ? (
            <>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-violet-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Leads</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtNumber(allCur.leads)}</p>
                <div className="mt-2 min-h-[16px] flex items-center gap-2">
                  <Trend cur={allCur.leads} prev={allPrev.leads} />
                  {allDerived.cpl > 0 && <span className="text-[10px] text-zinc-400">{fmtCurrency(allDerived.cpl)}/lead</span>}
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-emerald-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Taxa conv.</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtPercent(allDerived.leadConvRate)}</p>
                <p className="text-[10px] text-zinc-400 mt-2">cliques → leads</p>
              </div>
            </>
          ) : template === 'sales' ? (
            <>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-amber-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">ROAS</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{allCur.roas.toFixed(2)}x</p>
                <div className="mt-2 min-h-[16px]">
                  <Trend cur={allCur.roas} prev={allPrev.roas} />
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-emerald-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Cliques</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtNumber(allCur.clicks)}</p>
                <div className="mt-2 min-h-[16px] flex items-center gap-2">
                  <Trend cur={allCur.clicks} prev={allPrev.clicks} />
                  {allDerived.cpc > 0 && <span className="text-[10px] text-zinc-400">{fmtCurrency(allDerived.cpc)}/clk</span>}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-violet-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Impressões</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtCompact(allCur.impressions)}</p>
                <div className="mt-2 min-h-[16px] flex items-center gap-2">
                  <Trend cur={allCur.impressions} prev={allPrev.impressions} />
                  <span className="text-[10px] text-zinc-400">{fmtCompact(allCur.reach)} alcance</span>
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-emerald-500">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">Cliques</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtNumber(allCur.clicks)}</p>
                <div className="mt-2 min-h-[16px] flex items-center gap-2">
                  <Trend cur={allCur.clicks} prev={allPrev.clicks} />
                  {allDerived.cpc > 0 && <span className="text-[10px] text-zinc-400">{fmtCurrency(allDerived.cpc)}/clk</span>}
                </div>
              </div>
            </>
          )}

          {/* CTR + CPM combo */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 border-t-2 border-t-amber-500">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-medium">CTR médio</p>
            <p className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums leading-none">{fmtPercent(allCur.ctr)}</p>
            <div className="mt-2 min-h-[16px] flex items-center gap-2">
              <Trend cur={allCur.ctr} prev={allPrev.ctr} />
              <span className="text-[10px] text-zinc-400">CPM {fmtCurrency(allCur.cpm)}</span>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <ReportChart data={chartData} availableMetrics={availableChartMetrics as MetricKey[]} />

        {/* Métricas detalhadas */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6">
          <h2 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest">Métricas detalhadas</h2>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-2 mb-1">Investimento & Alcance</p>
            <MetricRow label="Gasto" cur={fmtCurrency(allCur.spend, currency)} prev={fmtCurrency(allPrev.spend, currency)} trend={<Trend cur={allCur.spend} prev={allPrev.spend} />} />
            <MetricRow label="Impressões" cur={fmtNumber(allCur.impressions)} prev={fmtNumber(allPrev.impressions)} trend={<Trend cur={allCur.impressions} prev={allPrev.impressions} />} />
            <MetricRow label="Alcance" cur={fmtNumber(allCur.reach)} prev={fmtNumber(allPrev.reach)} trend={<Trend cur={allCur.reach} prev={allPrev.reach} />} sub="pessoas únicas" />
            <MetricRow label="Frequência" cur={allCur.frequency.toFixed(2)} prev={allPrev.frequency.toFixed(2)} trend={<Trend cur={allCur.frequency} prev={allPrev.frequency} invert />} sub="visualizações por pessoa" />

            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-5 mb-1">Engajamento & Eficiência</p>
            <MetricRow label="Cliques" cur={fmtNumber(allCur.clicks)} prev={fmtNumber(allPrev.clicks)} trend={<Trend cur={allCur.clicks} prev={allPrev.clicks} />} />
            <MetricRow label="CTR" cur={fmtPercent(allCur.ctr)} prev={fmtPercent(allPrev.ctr)} trend={<Trend cur={allCur.ctr} prev={allPrev.ctr} />} sub="taxa de cliques" />
            <MetricRow label="CPC" cur={fmtCurrency(allDerived.cpc, currency)} prev={fmtCurrency(prevDerived.cpc, currency)} trend={<Trend cur={allDerived.cpc} prev={prevDerived.cpc} invert />} sub="custo por clique" />
            <MetricRow label="CPM" cur={fmtCurrency(allCur.cpm, currency)} prev={fmtCurrency(allPrev.cpm, currency)} trend={<Trend cur={allCur.cpm} prev={allPrev.cpm} invert />} sub="custo por mil impressões" />

            {(allCur.conversations > 0 || allCur.leads > 0 || allCur.roas > 0) && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-5 mb-1">Resultados de Conversão</p>
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
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Campanhas</h2>
            <span className="text-xs text-zinc-400">{campaigns.length}</span>
          </div>
          <div className="space-y-2.5">
            {campaigns.map(c => {
              const isActive = c.effective_status === 'ACTIVE'
              return (
                <div key={c.id} className={`bg-white border border-zinc-200 rounded-2xl p-4 ${!isActive ? 'opacity-75' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-zinc-100">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 leading-snug">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {c.template === 'wpp' && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">WhatsApp</span>
                          )}
                          {c.template === 'leads' && (
                            <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Leads</span>
                          )}
                          {c.template === 'sales' && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">E-commerce</span>
                          )}
                          <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            {isActive ? 'Ativa' : 'Pausada'}
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
        <details className="bg-white border border-zinc-200 rounded-2xl p-5">
          <summary className="text-xs font-bold text-zinc-500 uppercase tracking-widest cursor-pointer">Glossário de métricas</summary>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-xs text-zinc-600">
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

        <div className="text-center pt-4 pb-2">
          <p className="text-[10px] text-zinc-400">Relatório gerado pelo Grupo NG · {fmtDate(period.until)}</p>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, cur, prev, trend, sub }: { label: string; cur: string; prev: string; trend?: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0 gap-2">
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
      <p className="text-[9px] uppercase tracking-widest text-zinc-400 mb-0.5">{label}</p>
      <p className={`${small ? 'text-xs' : 'text-sm'} font-bold tabular-nums ${highlight ? 'text-amber-600' : 'text-zinc-900'}`}>{value}</p>
      {trend && <div className="mt-0.5">{trend}</div>}
    </div>
  )
}
