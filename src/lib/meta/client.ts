import 'server-only'

const BASE_URL = `https://graph.facebook.com/${process.env.META_API_VERSION ?? 'v21.0'}`
const TOKEN = process.env.META_SYSTEM_USER_TOKEN!

export class MetaApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public subcode?: number
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
}

async function metaFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const data = await res.json()

  if (data.error) {
    throw new MetaApiError(data.error.message, data.error.code, data.error.error_subcode)
  }

  return data as T
}

async function metaFetchWithRetry<T>(
  path: string,
  params: Record<string, string> = {},
  retries = 3
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await metaFetch<T>(path, params)
    } catch (e) {
      if (e instanceof MetaApiError && e.code === 17) {
        // Rate limit — backoff exponencial
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw e
    }
  }
  throw new Error('Max retries reached')
}

type AdAccount = {
  id: string
  name: string
  currency: string
  timezone_name: string
  account_status: number
  business?: { id: string; name: string }
}

// Retorna todas as contas vinculadas ao System User Token (com paginação)
export async function getAdAccounts() {
  const allAccounts: AdAccount[] = []
  let params: Record<string, string> = {
    fields: 'id,name,currency,timezone_name,account_status,business',
    limit: '200'
  }

  while (true) {
    const data = await metaFetchWithRetry<{
      data: AdAccount[]
      paging?: { cursors?: { after?: string }; next?: string }
    }>('/me/adaccounts', params)

    allAccounts.push(...data.data)

    // Continua se houver próxima página
    if (data.paging?.cursors?.after && data.data.length === 200) {
      params = { ...params, after: data.paging.cursors.after }
    } else {
      break
    }
  }

  return allAccounts
}

// Parse "Saldo disponível (R$107,98 BRL)" → 107.98
function parseDisplayBalance(display?: string): number | null {
  if (!display) return null
  const m = display.match(/R\$\s*([\d.,]+)/)
  if (!m) return null
  const num = m[1].replace(/\./g, '').replace(',', '.')
  const v = parseFloat(num)
  return isNaN(v) ? null : v
}

// Busca saldo real + flag de problema (limite atingido)
//  1. funding_source_details.amount (contas prepaid, type=2) — em centavos
//  2. parse de funding_source_details.display_string (contas type=20 etc.) — formatado
//  3. balance (último fallback) — em centavos
// hasIssues = true quando amount_spent >= spend_cap (conta travada por limite)
export async function getAccountBalances(accountIds: string[]) {
  const results: Record<string, { balance: number; currency: string; hasIssues: boolean }> = {}
  await Promise.allSettled(
    accountIds.map(async id => {
      try {
        const data = await metaFetchWithRetry<{
          balance: string
          currency: string
          funding_source_details?: { amount?: string; display_string?: string; type?: number }
          amount_spent?: string
          spend_cap?: string
        }>(
          `/${id}`,
          { fields: 'balance,currency,funding_source_details,amount_spent,spend_cap' }
        )

        let balance = 0
        const amount = data.funding_source_details?.amount
        if (amount && parseFloat(amount) > 0) {
          balance = parseFloat(amount) / 100
        } else {
          const parsed = parseDisplayBalance(data.funding_source_details?.display_string)
          if (parsed !== null && parsed > 0) {
            balance = parsed
          } else if (data.balance) {
            const b = parseFloat(data.balance) / 100
            if (b > 0) balance = b
          }
        }

        const spent = parseFloat(data.amount_spent ?? '0')
        const cap = parseFloat(data.spend_cap ?? '0')
        const hasIssues = cap > 0 && spent >= cap

        results[id] = {
          balance,
          currency: data.currency ?? 'BRL',
          hasIssues,
        }
      } catch {
        results[id] = { balance: 0, currency: 'BRL', hasIssues: false }
      }
    })
  )
  return results
}

// Campanhas de uma conta (inclui effective_status para status real, com paginação)
export async function getCampaigns(accountId: string) {
  const all: { id: string; name: string; status: string; effective_status: string; objective: string }[] = []
  let after: string | undefined
  while (true) {
    const params: Record<string, string> = { fields: 'id,name,status,effective_status,objective', limit: '500' }
    if (after) params.after = after
    const data = await metaFetchWithRetry<{
      data: { id: string; name: string; status: string; effective_status: string; objective: string }[]
      paging?: { cursors?: { after?: string }; next?: string }
    }>(`/${accountId}/campaigns`, params)
    all.push(...data.data)
    if (data.paging?.next && data.paging.cursors?.after) { after = data.paging.cursors.after } else { break }
  }
  return all
}

// Todos os conjuntos de anúncios de uma conta (mais rápido que por campanha)
export async function getAdSetsByAccount(accountId: string) {
  const all: { id: string; name: string; status: string; effective_status: string; daily_budget?: string; campaign_id: string }[] = []
  let after: string | undefined
  while (true) {
    const params: Record<string, string> = { fields: 'id,name,status,effective_status,daily_budget,campaign_id', limit: '500' }
    if (after) params.after = after
    const data = await metaFetchWithRetry<{
      data: { id: string; name: string; status: string; effective_status: string; daily_budget?: string; campaign_id: string }[]
      paging?: { cursors?: { after?: string }; next?: string }
    }>(`/${accountId}/adsets`, params)
    all.push(...data.data)
    if (data.paging?.next && data.paging.cursors?.after) { after = data.paging.cursors.after } else { break }
  }
  return all
}

// Conjuntos de anúncios de uma campanha (mantido para página de detalhe)
export async function getAdSets(campaignId: string) {
  const data = await metaFetchWithRetry<{ data: { id: string; name: string; status: string; daily_budget?: string }[] }>(
    `/${campaignId}/adsets`,
    { fields: 'id,name,status,daily_budget', limit: '200' }
  )
  return data.data
}

// Anúncios de um conjunto
export async function getAds(adSetId: string) {
  const data = await metaFetchWithRetry<{ data: { id: string; name: string; status: string; creative?: { thumbnail_url?: string } }[] }>(
    `/${adSetId}/ads`,
    { fields: 'id,name,status,creative{thumbnail_url}', limit: '200' }
  )
  return data.data
}

type InsightRaw = {
  date_start: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  frequency?: string
  ctr: string
  cpm: string
  cost_per_action_type?: { action_type: string; value: string }[]
  purchase_roas?: { action_type: string; value: string }[]
  actions?: { action_type: string; value: string }[]
}

const INSIGHT_FIELDS = 'spend,impressions,clicks,reach,frequency,ctr,cpm,cost_per_action_type,purchase_roas,actions'

// Insights de TODAS as campanhas de uma conta — uma única chamada de API
export async function getAccountInsightsByCampaign(accountId: string, since: string, until: string) {
  const all: (InsightRaw & { campaign_id: string })[] = []
  let after: string | undefined
  while (true) {
    const params: Record<string, string> = {
      level: 'campaign',
      fields: `campaign_id,${INSIGHT_FIELDS}`,
      time_increment: '1',
      time_range: JSON.stringify({ since, until }),
      limit: '500',
    }
    if (after) params.after = after
    try {
      const data = await metaFetchWithRetry<{
        data: (InsightRaw & { campaign_id: string })[]
        paging?: { cursors?: { after?: string }; next?: string }
      }>(`/${accountId}/insights`, params)
      all.push(...data.data)
      if (data.paging?.next && data.paging.cursors?.after) { after = data.paging.cursors.after } else { break }
    } catch { break }
  }
  return all
}

// Insights de TODOS os conjuntos de uma conta — uma única chamada de API
export async function getAccountInsightsByAdset(accountId: string, since: string, until: string) {
  const all: (InsightRaw & { adset_id: string })[] = []
  let after: string | undefined
  while (true) {
    const params: Record<string, string> = {
      level: 'adset',
      fields: `adset_id,${INSIGHT_FIELDS}`,
      time_increment: '1',
      time_range: JSON.stringify({ since, until }),
      limit: '500',
    }
    if (after) params.after = after
    try {
      const data = await metaFetchWithRetry<{
        data: (InsightRaw & { adset_id: string })[]
        paging?: { cursors?: { after?: string }; next?: string }
      }>(`/${accountId}/insights`, params)
      all.push(...data.data)
      if (data.paging?.next && data.paging.cursors?.after) { after = data.paging.cursors.after } else { break }
    } catch { break }
  }
  return all
}

// Métricas de uma entidade individual (para página de detalhe)
export async function getInsights(entityId: string, since: string, until: string) {
  try {
    const data = await metaFetchWithRetry<{ data: (InsightRaw & { date_stop: string })[] }>(
      `/${entityId}/insights`,
      {
        fields: INSIGHT_FIELDS,
        time_increment: '1',
        time_range: JSON.stringify({ since, until }),
        limit: '90'
      }
    )
    return data.data
  } catch {
    return []
  }
}
