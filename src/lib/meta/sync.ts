import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { providers } from '@/lib/providers'
import * as meta from '@/lib/meta/client'
import { transformAccount, transformCampaign, transformAdSet, transformAd, transformInsight } from './transformers'

function dateRange(days: number) {
  const until = new Date()
  const since = new Date()
  since.setDate(since.getDate() - days)
  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0]
  }
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function runSync(triggeredBy: 'cron' | 'manual' = 'manual') {
  const supabase = createServiceClient()
  const range = dateRange(30)

  // Criar log de sync
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

        // Buscar campanhas
        const rawCampaigns = await meta.getCampaigns(rawAccount.id)
        for (const rawCampaign of rawCampaigns) {
          const campaign = transformCampaign(rawCampaign, rawAccount.id)
          await supabase.from('campaigns').upsert(
            { ...campaign, updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          )

          // Métricas da campanha
          const campaignInsights = await meta.getInsights(rawCampaign.id, range.since, range.until)
          const campaignMetrics = campaignInsights.map(i => transformInsight(i, rawCampaign.id, 'campaign'))
          if (campaignMetrics.length > 0) {
            await supabase.from('metrics').upsert(campaignMetrics, { onConflict: 'entity_id,entity_type,date' })
            recordsUpserted += campaignMetrics.length
          }

          // Buscar conjuntos de anúncios
          const rawAdSets = await meta.getAdSets(rawCampaign.id)
          for (const rawAdSet of rawAdSets) {
            const adSet = transformAdSet(rawAdSet, rawCampaign.id)
            await supabase.from('ad_sets').upsert(
              { ...adSet, updated_at: new Date().toISOString() },
              { onConflict: 'id' }
            )

            // Métricas do conjunto
            const adSetInsights = await meta.getInsights(rawAdSet.id, range.since, range.until)
            const adSetMetrics = adSetInsights.map(i => transformInsight(i, rawAdSet.id, 'ad_set'))
            if (adSetMetrics.length > 0) {
              await supabase.from('metrics').upsert(adSetMetrics, { onConflict: 'entity_id,entity_type,date' })
              recordsUpserted += adSetMetrics.length
            }

            // Buscar anúncios
            const rawAds = await meta.getAds(rawAdSet.id)
            for (const rawAd of rawAds) {
              const ad = transformAd(rawAd, rawAdSet.id)
              await supabase.from('ads').upsert(
                { ...ad, updated_at: new Date().toISOString() },
                { onConflict: 'id' }
              )

              // Métricas do anúncio
              const adInsights = await meta.getInsights(rawAd.id, range.since, range.until)
              const adMetrics = adInsights.map(i => transformInsight(i, rawAd.id, 'ad'))
              if (adMetrics.length > 0) {
                await supabase.from('metrics').upsert(adMetrics, { onConflict: 'entity_id,entity_type,date' })
                recordsUpserted += adMetrics.length
              }
            }
          }
        }

        accountsSynced++
        await sleep(500) // Rate limit entre contas
      } catch (err) {
        console.error(`Erro ao sincronizar conta ${rawAccount.id}:`, err)
        hasErrors = true
      }
    }

    // Atualizar log
    const status = hasErrors ? 'partial' : 'success'
    if (logId) {
      await supabase.from('sync_logs').update({
        status,
        finished_at: new Date().toISOString(),
        accounts_synced: accountsSynced,
        records_upserted: recordsUpserted
      }).eq('id', logId)
    }

    return { status, accountsSynced, recordsUpserted }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: errorMessage
      }).eq('id', logId)
    }
    throw err
  }
}
