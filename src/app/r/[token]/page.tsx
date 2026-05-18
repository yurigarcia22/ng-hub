import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { verifyShareToken } from '@/lib/share-token'
import { fetchReportData } from '@/lib/report-data'
import { ReportView } from '@/components/report/ReportView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const payload = await verifyShareToken(token)
  if (!payload) return { title: 'Relatório indisponível' }
  const data = await fetchReportData(payload.accountId, payload.since, payload.until)
  return { title: data ? `Relatório · ${data.account.name}` : 'Relatório' }
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

  return <ReportView data={data} pdfUrl={`/api/pdf/${token}`} />
}
