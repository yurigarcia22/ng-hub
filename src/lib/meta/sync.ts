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

  // Limpa syncs travados em 'running' há mais de 5 minutos (timeouts anteriores)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  await supabase
    .from('sync_logs')
    .update({ status: 'failed', error_message: 'Timeout — função encerrada pelo servidor' })
    .eq('status', 'running')
    .lt('started_at', staleThreshold)

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
    lastDate.setDate(lastDate.getDate() - 2)
    const candidate = lastDate.toISOString().split('T')[0]
    const maxBack = daysAgo(30)
    since = candidate < maxBack ? maxBack : candidate
  } else {
    since = daysAgo(30)
  }

  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({ status: 'running', triggered_by: triggeredBy })
    .select()
    .single()

  const logId = syncLog?.id
  let recordsUpserted = 0
  let hasErrors = false

  try {
    const rawAccounts = await meta.getAdAccounts()

    // ── FASE 1: estrutura (contas + campanhas + conjuntos) ──────────────────
    // Roda para TODAS as contas antes de qualquer métrica.
    // Garante que status ACTIVE/PAUSED ficam corretos mesmo se metrics derem timeout.
    const accountsById = new Map<string, typeof rawAccounts[0]>()
    await Promise.allSettled(rawAccounts.map(async rawAccount => {
      try {
        accountsById.set(rawAccount.id, rawAccount)

        // Upsert conta
        const account = transformAccount(rawAccount)
        await supabase.from('ad_accounts').upsert(account, { onConflict: 'id' })

        // Upsert campanhas — TODOS os status (ACTIVE, PAUSED, ARCHIVED)
        const rawCampaigns = await meta.getCampaigns(rawAccount.id)
        if (rawCampaigns.length > 0) {
          const campaigns = rawCampaigns.map(c => ({
            ...transformCampaign(c, rawAccount.id),
            updated_at: new Date().toISOString(),
          }))
          await supabase.from('campaigns').upsert(campaigns, { onConflict: 'id' })
        }

        // Upsert conjuntos
        const rawAdSets = await meta.getAdSetsByAccount(rawAccount.id)
        if (rawAdSets.length > 0) {
          const adSets = rawAdSets.map(s => ({
            ...transformAdSet(s, s.campaign_id),
            updated_at: new Date().toISOString(),
          }))
          await supabase.from('ad_sets').upsert(adSets, { onConflict: 'id' })
        }
      } catch (err) {
        console.error(`[Fase 1] Erro na conta ${rawAccount.id}:`, err)
        hasErrors = true
      }
    }))

    // ── FASE 2: métricas (insights por conta, sequencial) ──────────────────
    // Feita depois da estrutura. Se der timeout aqui, os status já estão corretos.
    for (const rawAccount of rawAccounts) {
      try {
        const campaignInsights = await meta.getAccountInsightsByCampaign(rawAccount.id, since, until)
        if (campaignInsights.length > 0) {
          const metrics = campaignInsights.map(i => transformInsight(i, i.campaign_id, 'campaign'))
          await supabase.from('metrics').upsert(metrics, { onConflict: 'entity_id,entity_type,date' })
          recordsUpserted += metrics.length
        }

        const adsetInsights = await meta.getAccountInsightsByAdset(rawAccount.id, since, until)
        if (adsetInsights.length > 0) {
          const metrics = adsetInsights.map(i => transformInsight(i, i.adset_id, 'ad_set'))
          await supabase.from('metrics').upsert(metrics, { onConflict: 'entity_id,entity_type,date' })
          recordsUpserted += metrics.length
        }
      } catch (err) {
        console.error(`[Fase 2] Erro nas métricas da conta ${rawAccount.id}:`, err)
        hasErrors = true
      }
    }

    const status = hasErrors ? 'partial' : 'success'
    if (logId) {
      await supabase.from('sync_logs').update({
        status,
        finished_at: new Date().toISOString(),
        accounts_synced: rawAccounts.length,
        records_upserted: recordsUpserted,
      }).eq('id', logId)
    }

    return { status, accountsSynced: rawAccounts.length, recordsUpserted }
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
