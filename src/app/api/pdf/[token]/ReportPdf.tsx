import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/report-data'

// ============ Styles ============
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#18181b',
    backgroundColor: '#ffffff',
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e4e4e7' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32, backgroundColor: '#2563eb', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  brandName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#18181b' },
  brandSub: { fontSize: 8, color: '#71717a', marginTop: 1 },
  periodBox: { alignItems: 'flex-end' },
  periodLabel: { fontSize: 7, color: '#a1a1aa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  periodValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#27272a' },
  periodPrev: { fontSize: 8, color: '#a1a1aa', marginTop: 4 },

  // Title
  accountName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#18181b', marginBottom: 4 },
  accountSub: { fontSize: 9, color: '#71717a', marginBottom: 8 },
  templateBadge: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase', padding: '3 6', borderRadius: 3, alignSelf: 'flex-start' },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 16 },
  kpiCard: { flex: 1, padding: 10, border: '1px solid #e4e4e7', borderRadius: 6, borderTop: '2px solid #2563eb' },
  kpiCardEmerald: { borderTop: '2px solid #10b981' },
  kpiCardViolet: { borderTop: '2px solid #8b5cf6' },
  kpiCardAmber: { borderTop: '2px solid #f59e0b' },
  kpiLabel: { fontSize: 7, color: '#a1a1aa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  kpiValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#18181b' },
  kpiTrend: { fontSize: 8, marginTop: 4 },
  kpiHint: { fontSize: 7, color: '#a1a1aa', marginTop: 2 },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#52525b', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  sectionBox: { border: '1px solid #e4e4e7', borderRadius: 6, padding: 12 },

  // Metric rows
  metricGroup: { marginBottom: 10 },
  metricGroupTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#a1a1aa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottom: '1px solid #f4f4f5' },
  metricLabel: { fontSize: 9, color: '#52525b', flex: 1 },
  metricLabelSub: { fontSize: 7, color: '#a1a1aa', marginTop: 1 },
  metricCur: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#18181b', width: 70, textAlign: 'right' },
  metricPrev: { fontSize: 8, color: '#a1a1aa', width: 60, textAlign: 'right' },
  metricTrend: { fontSize: 8, width: 40, textAlign: 'right' },

  // Campaign card
  campaignCard: { border: '1px solid #e4e4e7', borderRadius: 6, padding: 10, marginBottom: 8 },
  campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid #f4f4f5' },
  campaignName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#18181b', marginBottom: 2 },
  campaignObj: { fontSize: 7, color: '#a1a1aa', textTransform: 'uppercase' },
  campaignStatus: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  campaignMetrics: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  campaignMetric: { width: '15%' },
  campaignMetricLabel: { fontSize: 6, color: '#a1a1aa', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  campaignMetricValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#18181b' },

  // Two-column metrics
  twoCol: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #e4e4e7' },
  footerText: { fontSize: 7, color: '#a1a1aa' },
  pageNum: { fontSize: 7, color: '#a1a1aa' },
})

// ============ Helpers ============
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

// ============ Sub-components ============
function TrendText({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const p = pct(cur, prev)
  if (p === null) return <Text style={{ ...styles.metricTrend, color: '#a1a1aa' }}>—</Text>
  const abs = Math.abs(p)
  if (abs < 0.5) return <Text style={{ ...styles.metricTrend, color: '#a1a1aa' }}>=</Text>
  const isPos = p > 0
  const isGood = invert ? !isPos : isPos
  return (
    <Text style={{ ...styles.metricTrend, color: isGood ? '#059669' : '#dc2626', fontFamily: 'Helvetica-Bold' }}>
      {isPos ? '↑' : '↓'}{abs.toFixed(0)}%
    </Text>
  )
}

function MetricRow({ label, cur, prev, curN, prevN, sub, invert = false }: { label: string; cur: string; prev: string; curN: number; prevN: number; sub?: string; invert?: boolean }) {
  return (
    <View style={styles.metricRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.metricLabel}>{label}</Text>
        {sub && <Text style={styles.metricLabelSub}>{sub}</Text>}
      </View>
      <Text style={styles.metricPrev}>{prev}</Text>
      <Text style={styles.metricCur}>{cur}</Text>
      <TrendText cur={curN} prev={prevN} invert={invert} />
    </View>
  )
}

function templateBadge(template: string): { label: string; bg: string; color: string } {
  switch (template) {
    case 'wpp': return { label: 'WhatsApp', bg: '#ecfdf5', color: '#047857' }
    case 'leads': return { label: 'Leads', bg: '#f5f3ff', color: '#6d28d9' }
    case 'sales': return { label: 'E-commerce', bg: '#fffbeb', color: '#b45309' }
    default: return { label: 'Tráfego', bg: '#eff6ff', color: '#1d4ed8' }
  }
}

// ============ Main Document ============
export function ReportPdf({ data }: { data: ReportData }) {
  const { account, period, prevPeriod, template, allCur, allPrev, allDerived, prevDerived, campaigns } = data
  const currency = account.currency
  const tplBadge = templateBadge(template)
  const activeCampaigns = campaigns.filter(c => c.effective_status === 'ACTIVE').length

  return (
    <Document>
      {/* PAGE 1: Resumo */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>NG</Text></View>
            <View>
              <Text style={styles.brandName}>Grupo NG</Text>
              <Text style={styles.brandSub}>Relatório de Performance</Text>
            </View>
          </View>
          <View style={styles.periodBox}>
            <Text style={styles.periodLabel}>Período</Text>
            <Text style={styles.periodValue}>{fmtDate(period.since)} – {fmtDate(period.until)}</Text>
            <Text style={styles.periodPrev}>vs {fmtDate(prevPeriod.since)} – {fmtDate(prevPeriod.until)}</Text>
          </View>
        </View>

        {/* Account */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.accountName}>{account.name}</Text>
          {account.business_name && <Text style={styles.accountSub}>{account.business_name}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...styles.templateBadge, backgroundColor: tplBadge.bg, color: tplBadge.color }}>{tplBadge.label}</Text>
            <Text style={{ fontSize: 8, color: '#71717a' }}>
              {activeCampaigns} campanhas ativas · {campaigns.length} no relatório
            </Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Gasto total</Text>
            <Text style={styles.kpiValue}>{fmtCurrency(allCur.spend, currency)}</Text>
            <View><TrendText cur={allCur.spend} prev={allPrev.spend} invert /></View>
          </View>

          {template === 'wpp' ? (
            <>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardEmerald }}>
                <Text style={styles.kpiLabel}>Conversas</Text>
                <Text style={styles.kpiValue}>{fmtNumber(allCur.conversations)}</Text>
                <View><TrendText cur={allCur.conversations} prev={allPrev.conversations} /></View>
                {allDerived.cpconv > 0 && <Text style={styles.kpiHint}>{fmtCurrency(allDerived.cpconv)}/conv</Text>}
              </View>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardAmber }}>
                <Text style={styles.kpiLabel}>CTR médio</Text>
                <Text style={styles.kpiValue}>{fmtPercent(allCur.ctr)}</Text>
                <View><TrendText cur={allCur.ctr} prev={allPrev.ctr} /></View>
                <Text style={styles.kpiHint}>CPM {fmtCurrency(allCur.cpm)}</Text>
              </View>
            </>
          ) : template === 'leads' ? (
            <>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardViolet }}>
                <Text style={styles.kpiLabel}>Leads</Text>
                <Text style={styles.kpiValue}>{fmtNumber(allCur.leads)}</Text>
                <View><TrendText cur={allCur.leads} prev={allPrev.leads} /></View>
                {allDerived.cpl > 0 && <Text style={styles.kpiHint}>{fmtCurrency(allDerived.cpl)}/lead</Text>}
              </View>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardEmerald }}>
                <Text style={styles.kpiLabel}>Taxa conv.</Text>
                <Text style={styles.kpiValue}>{fmtPercent(allDerived.leadConvRate)}</Text>
                <Text style={styles.kpiHint}>cliques → leads</Text>
              </View>
            </>
          ) : template === 'sales' ? (
            <>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardAmber }}>
                <Text style={styles.kpiLabel}>ROAS</Text>
                <Text style={styles.kpiValue}>{allCur.roas.toFixed(2)}x</Text>
                <View><TrendText cur={allCur.roas} prev={allPrev.roas} /></View>
              </View>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardEmerald }}>
                <Text style={styles.kpiLabel}>Cliques</Text>
                <Text style={styles.kpiValue}>{fmtNumber(allCur.clicks)}</Text>
                <View><TrendText cur={allCur.clicks} prev={allPrev.clicks} /></View>
              </View>
            </>
          ) : (
            <>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardViolet }}>
                <Text style={styles.kpiLabel}>Impressões</Text>
                <Text style={styles.kpiValue}>{fmtCompact(allCur.impressions)}</Text>
                <View><TrendText cur={allCur.impressions} prev={allPrev.impressions} /></View>
                <Text style={styles.kpiHint}>{fmtCompact(allCur.reach)} alcance</Text>
              </View>
              <View style={{ ...styles.kpiCard, ...styles.kpiCardEmerald }}>
                <Text style={styles.kpiLabel}>Cliques</Text>
                <Text style={styles.kpiValue}>{fmtNumber(allCur.clicks)}</Text>
                <View><TrendText cur={allCur.clicks} prev={allPrev.clicks} /></View>
                {allDerived.cpc > 0 && <Text style={styles.kpiHint}>{fmtCurrency(allDerived.cpc)}/clk</Text>}
              </View>
            </>
          )}

          <View style={{ ...styles.kpiCard, ...styles.kpiCardAmber }}>
            <Text style={styles.kpiLabel}>CTR médio</Text>
            <Text style={styles.kpiValue}>{fmtPercent(allCur.ctr)}</Text>
            <View><TrendText cur={allCur.ctr} prev={allPrev.ctr} /></View>
            <Text style={styles.kpiHint}>CPM {fmtCurrency(allCur.cpm)}</Text>
          </View>
        </View>

        {/* Métricas detalhadas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas detalhadas</Text>
          <View style={styles.sectionBox}>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.metricGroupTitle}>Investimento & Alcance</Text>
                <MetricRow label="Gasto" cur={fmtCurrency(allCur.spend, currency)} prev={fmtCurrency(allPrev.spend, currency)} curN={allCur.spend} prevN={allPrev.spend} />
                <MetricRow label="Impressões" cur={fmtNumber(allCur.impressions)} prev={fmtNumber(allPrev.impressions)} curN={allCur.impressions} prevN={allPrev.impressions} />
                <MetricRow label="Alcance" cur={fmtNumber(allCur.reach)} prev={fmtNumber(allPrev.reach)} curN={allCur.reach} prevN={allPrev.reach} sub="pessoas únicas" />
                <MetricRow label="Frequência" cur={allCur.frequency.toFixed(2)} prev={allPrev.frequency.toFixed(2)} curN={allCur.frequency} prevN={allPrev.frequency} invert />
              </View>
              <View style={styles.col}>
                <Text style={styles.metricGroupTitle}>Engajamento & Eficiência</Text>
                <MetricRow label="Cliques" cur={fmtNumber(allCur.clicks)} prev={fmtNumber(allPrev.clicks)} curN={allCur.clicks} prevN={allPrev.clicks} />
                <MetricRow label="CTR" cur={fmtPercent(allCur.ctr)} prev={fmtPercent(allPrev.ctr)} curN={allCur.ctr} prevN={allPrev.ctr} sub="taxa de cliques" />
                <MetricRow label="CPC" cur={fmtCurrency(allDerived.cpc)} prev={fmtCurrency(prevDerived.cpc)} curN={allDerived.cpc} prevN={prevDerived.cpc} invert />
                <MetricRow label="CPM" cur={fmtCurrency(allCur.cpm)} prev={fmtCurrency(allPrev.cpm)} curN={allCur.cpm} prevN={allPrev.cpm} invert />
              </View>
            </View>

            {(allCur.conversations > 0 || allCur.leads > 0 || allCur.roas > 0) && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e4e4e7' }}>
                <Text style={styles.metricGroupTitle}>Resultados de Conversão</Text>
                <View style={styles.twoCol}>
                  <View style={styles.col}>
                    {allCur.conversations > 0 && (
                      <>
                        <MetricRow label="Conversas WPP" cur={fmtNumber(allCur.conversations)} prev={fmtNumber(allPrev.conversations)} curN={allCur.conversations} prevN={allPrev.conversations} />
                        <MetricRow label="Custo/Conversa" cur={fmtCurrency(allDerived.cpconv)} prev={fmtCurrency(prevDerived.cpconv)} curN={allDerived.cpconv} prevN={prevDerived.cpconv} invert />
                      </>
                    )}
                  </View>
                  <View style={styles.col}>
                    {allCur.leads > 0 && (
                      <>
                        <MetricRow label="Leads" cur={fmtNumber(allCur.leads)} prev={fmtNumber(allPrev.leads)} curN={allCur.leads} prevN={allPrev.leads} />
                        <MetricRow label="CPL" cur={fmtCurrency(allDerived.cpl)} prev={fmtCurrency(prevDerived.cpl)} curN={allDerived.cpl} prevN={prevDerived.cpl} invert />
                      </>
                    )}
                    {allCur.roas > 0 && (
                      <>
                        <MetricRow label="ROAS" cur={`${allCur.roas.toFixed(2)}x`} prev={`${allPrev.roas.toFixed(2)}x`} curN={allCur.roas} prevN={allPrev.roas} />
                        <MetricRow label="CPA" cur={fmtCurrency(allCur.cpa)} prev={fmtCurrency(allPrev.cpa)} curN={allCur.cpa} prevN={allPrev.cpa} invert />
                      </>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Grupo NG · Marketing Digital · Gerado em {fmtDate(new Date().toISOString().split('T')[0])}</Text>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </View>
      </Page>

      {/* PAGE 2+: Campanhas */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>NG</Text></View>
            <View>
              <Text style={styles.brandName}>{account.name}</Text>
              <Text style={styles.brandSub}>Detalhamento por campanha</Text>
            </View>
          </View>
          <Text style={styles.periodValue}>{fmtDate(period.since)} – {fmtDate(period.until)}</Text>
        </View>

        {campaigns.map(c => {
          const isActive = c.effective_status === 'ACTIVE'
          const tpl = templateBadge(c.template)
          return (
            <View key={c.id} style={styles.campaignCard} wrap={false}>
              <View style={styles.campaignHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={{ ...styles.templateBadge, backgroundColor: tpl.bg, color: tpl.color, fontSize: 6 }}>{tpl.label}</Text>
                    {c.objective && <Text style={styles.campaignObj}>{c.objective}</Text>}
                  </View>
                </View>
                <Text style={{ ...styles.campaignStatus, color: isActive ? '#059669' : '#a1a1aa' }}>
                  {isActive ? 'Ativa' : 'Pausada'}
                </Text>
              </View>

              <View style={styles.campaignMetrics}>
                <View style={styles.campaignMetric}>
                  <Text style={styles.campaignMetricLabel}>Gasto</Text>
                  <Text style={styles.campaignMetricValue}>{fmtCurrency(c.m.spend, currency)}</Text>
                </View>
                {c.template === 'wpp' ? (
                  <>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Conversas</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.conversations)}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Custo/Conv</Text>
                      <Text style={styles.campaignMetricValue}>{c.derived.cpconv > 0 ? fmtCurrency(c.derived.cpconv) : '—'}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Alcance</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.reach)}</Text>
                    </View>
                  </>
                ) : c.template === 'leads' ? (
                  <>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Leads</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.leads)}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>CPL</Text>
                      <Text style={styles.campaignMetricValue}>{c.derived.cpl > 0 ? fmtCurrency(c.derived.cpl) : '—'}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Page Views</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.page_views)}</Text>
                    </View>
                  </>
                ) : c.template === 'sales' ? (
                  <>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>ROAS</Text>
                      <Text style={{ ...styles.campaignMetricValue, color: '#d97706' }}>{c.m.roas.toFixed(2)}x</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>CPA</Text>
                      <Text style={styles.campaignMetricValue}>{c.m.cpa > 0 ? fmtCurrency(c.m.cpa) : '—'}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Cliques</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.clicks)}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Impressões</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.impressions)}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Alcance</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.reach)}</Text>
                    </View>
                    <View style={styles.campaignMetric}>
                      <Text style={styles.campaignMetricLabel}>Cliques</Text>
                      <Text style={styles.campaignMetricValue}>{fmtNumber(c.m.clicks)}</Text>
                    </View>
                  </>
                )}
                <View style={styles.campaignMetric}>
                  <Text style={styles.campaignMetricLabel}>CTR</Text>
                  <Text style={styles.campaignMetricValue}>{fmtPercent(c.m.ctr)}</Text>
                </View>
                <View style={styles.campaignMetric}>
                  <Text style={styles.campaignMetricLabel}>CPM</Text>
                  <Text style={styles.campaignMetricValue}>{fmtCurrency(c.m.cpm)}</Text>
                </View>
              </View>
            </View>
          )
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Grupo NG · Marketing Digital · {account.name}</Text>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  )
}
