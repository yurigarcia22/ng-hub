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

// Busca saldo em tempo real das contas
export async function getAccountBalances(accountIds: string[]) {
  const results: Record<string, { balance: number; currency: string }> = {}
  await Promise.allSettled(
    accountIds.map(async id => {
      try {
        const data = await metaFetchWithRetry<{ balance: string; currency: string }>(
          `/${id}`,
          { fields: 'balance,currency' }
        )
        results[id] = {
          balance: parseFloat(data.balance ?? '0') / 100,
          currency: data.currency ?? 'BRL',
        }
      } catch {
        results[id] = { balance: 0, currency: 'BRL' }
      }
    })
  )
  return results
}

// Campanhas de uma conta
export async function getCampaigns(accountId: string) {
  const data = await metaFetchWithRetry<{ data: { id: string; name: string; status: string; objective: string }[] }>(
    `/${accountId}/campaigns`,
    { fields: 'id,name,status,objective', limit: '200' }
  )
  return data.data
}

// Conjuntos de anúncios de uma campanha
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

// Métricas de uma entidade por período
export async function getInsights(
  entityId: string,
  since: string,
  until: string
) {
  try {
    const data = await metaFetchWithRetry<{ data: { date_start: string; date_stop: string; spend: string; impressions: string; clicks: string; reach: string; frequency: string; ctr: string; cpm: string; cost_per_action_type?: { action_type: string; value: string }[]; purchase_roas?: { action_type: string; value: string }[]; actions?: { action_type: string; value: string }[] }[] }>(
      `/${entityId}/insights`,
      {
        fields: 'spend,impressions,clicks,reach,frequency,ctr,cpm,cost_per_action_type,purchase_roas,actions',
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
