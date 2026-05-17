import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createServiceClient()

  const [metricsRange, campaignStatuses, recentSyncs] = await Promise.all([
    supabase
      .from('metrics')
      .select('date')
      .eq('entity_type', 'campaign')
      .order('date', { ascending: false })
      .limit(1),
    supabase
      .from('campaigns')
      .select('status')
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const c of data ?? []) {
          counts[c.status] = (counts[c.status] ?? 0) + 1
        }
        return counts
      }),
    supabase
      .from('sync_logs')
      .select('id, status, triggered_by, started_at, finished_at, error_message, accounts_synced, records_upserted')
      .order('started_at', { ascending: false })
      .limit(5)
      .then(r => r.data),
  ])

  const { data: oldestMetric } = await supabase
    .from('metrics')
    .select('date')
    .eq('entity_type', 'campaign')
    .order('date', { ascending: true })
    .limit(1)

  const { count: totalMetrics } = await supabase
    .from('metrics')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    metrics: {
      total: totalMetrics,
      oldest: oldestMetric?.[0]?.date ?? null,
      newest: metricsRange.data?.[0]?.date ?? null,
    },
    campaigns: campaignStatuses,
    recentSyncs,
  })
}
