import { NextResponse } from 'next/server'
import { verifyShareToken } from '@/lib/share-token'
import { fetchReportData } from '@/lib/report-data'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportPdf } from './ReportPdf'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params
  const payload = verifyShareToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 })
  }

  const data = await fetchReportData(payload.accountId, payload.since, payload.until)
  if (!data) {
    return NextResponse.json({ error: 'account not found' }, { status: 404 })
  }

  const buffer = await renderToBuffer(<ReportPdf data={data} />)
  const safeName = data.account.name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
  const filename = `relatorio_${safeName}_${data.period.since}_${data.period.until}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
