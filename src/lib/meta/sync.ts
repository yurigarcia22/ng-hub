import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import * as meta from '@/lib/meta/client'
import { transformAccount, transformCampaign, transformAdSet, transformInsight } from './transformers'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export async function runSync(triggeredBy: 'cron' | 'manual' = 'manual') {
  const supabase = createServiceClient()

  // Incremental: sincroniza a partir do último sync bem-sucedido (mínimo 2 dias de overlap)
  const { data: lastLog } = await supabase
    .from('sync_logs')
    .select('started_at')
    .in('status', ['success', 'partial'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  const until = today()
  let since: string

  if (lastLog?.started_at) {
    const lastDate = new Date(lastLog.started_at)
    lastDate.setDate(lastDate.getDate() - 2) // 2 dias de overlap para não perder dados
    const candidate = lastDate.toISOString().split('T')[0]
    const maxBack = daysAgo(30)
    since = candidate < maxBack ? maxBack : candidate
  } else {
    since = daysAgo(30) // Primeiro sync: últimos 30 dias
  }

  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', triggered_by: triggeredBy })
    .select()
    .single()

  const logId = syncLog?.id
  let accountsSynced = 0
  let recordsUpserted = 0
  let hasErrors = false

  try {
    const rawAccounts = await meta.getAdAccounts()

    for (const rawAccount of rawAccounts) {
      try {
        // Upsert conta
        const account = transformAccount(rawAccount)
        await supabase.from('ad_accounts').upsert(account, { onConflict: 'id' })

        // Upsert campanhas (estrutura)
        const rawCampaigns = await meta.getCampaigns(rawAccount.id)
        if (rawCampaigns.length > 0) {
          const campaigns = rawCampaigns.map(c => ({
            ...transformCampaign(c, rawAccount.id),
            updated_at: new Date().toISOString(),
          }))
          await supabase.from('campaigns').upsert(campaigns, { onConflict: 'id' })
        }

        // Upsert conjuntos (estrutura — TODOS de uma conta em 1 chamada)
        const rawAdSets = await meta.getAdSetsByAccount(rawAccount.id)
        if (rawAdSets.length > 0) {
          const adSets = rawAdSets.map(s => ({
            ...transformAdSet(s, s.campaign_id),
            updated_at: new Date().toISOString(),
          }))
          await supabase.from('ad_sets').upsert(adSets, { onConflict: 'id' })
        }

        // Métricas de campanhas — TODAS de uma conta em 1 chamada de API
        const campaignInsights = await meta.getAccountInsightsByCampaign(rawAccount.id, since, until)
        if (campaignInsights.length > 0) {
          const metrics = campaignInsights.map(i => transformInsight(i, i.campaign_id, 'campaign'))
          await supabase.from('metrics').upsert(metrics, { onConflict: 'entity_id,entity_type,date' })
          recordsUpserted += metrics.length
        }

        // Métricas de conjuntos — TODOS de uma conta em 1 chamada de API
        const adsetInsights = await meta.getAccountInsightsByAdset(rawAccount.id, since, until)
        if (adsetInsights.length > 0) {
          const metrics = adsetInsights.map(i => transformInsight(i, i.adset_id, 'ad_set'))
          await supabase.from('metrics').upsert(metrics, { onConflict: 'entity_id,entity_type,date' })
          recordsUpserted += metrics.length
        }

        accountsSynced++
      } catch (err) {
        console.error(`Erro ao sincronizar conta ${rawAccount.id}:`, err)
        hasErrors = true
      }
    }

    const status = hasErrors ? 'partial' : 'success'
    if (logId) {
      await supabase.from('sync_logs').update({
        status,
        finished_at: new Date().toISOString(),
        accounts_synced: accountsSynced,
        records_upserted: recordsUpserted,
      }).eq('id', logId)
    }

    return { status, accountsSynced, recordsUpserted }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: errorMessage,
      }).eq('id', logId)
    }
    throw err
  }
}
