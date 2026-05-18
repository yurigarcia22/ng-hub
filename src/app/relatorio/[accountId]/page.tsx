import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchReportData } from '@/lib/report-data'
import { ReportView } from '@/components/report/ReportView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ accountId: string }>
  searchParams: Promise<Record<string, string>>
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
function today() { return new Date().toISOString().split('T')[0] }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { accountId } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('ad_accounts').select('name').eq('id', accountId).single()
  return { title: `Relatório — ${data?.name ?? 'Conta'}` }
}

export default async function RelatorioPage({ params, searchParams }: PageProps) {
  const { accountId } = await params
  const sp = await searchParams
  const since = sp.since ?? daysAgo(30)
  const until = sp.until ?? today()

  const data = await fetchReportData(accountId, since, until)
  if (!data) notFound()

  return <ReportView data={data} backUrl="/" />
}
