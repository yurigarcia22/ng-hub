import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('sync_logs')
    .select('id, status, started_at, finished_at, accounts_synced, records_upserted')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json(data ?? { status: 'none' })
}
