import 'server-only'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SharePayload {
  accountId: string
  since: string
  until: string
}

// ===== HMAC (backward compat — tokens antigos longos) =====
const SECRET = process.env.SHARE_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'ng-hub-default-secret-change-me'

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  return Buffer.from(padded, 'base64')
}

function verifyHmacToken(token: string): SharePayload | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const expected = b64urlEncode(crypto.createHmac('sha256', SECRET).update(data).digest())
    const a = Buffer.from(sig); const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    return JSON.parse(b64urlDecode(data).toString('utf-8')) as SharePayload
  } catch {
    return null
  }
}

// ===== Slug curto (atual — 8 chars, lookup no DB) =====
function isSlug(token: string): boolean {
  // 8 chars alfanuméricos maiúsculos, sem ponto (HMAC token tem ponto)
  return /^[A-Z0-9]{6,12}$/.test(token)
}

async function lookupSlug(slug: string): Promise<SharePayload | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('report_shares')
    .select('account_id, since, until')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null

  // Atualiza last_accessed_at em background (não bloqueia)
  supabase.from('report_shares').update({ last_accessed_at: new Date().toISOString() }).eq('slug', slug).then(() => {})

  return {
    accountId: data.account_id as string,
    since: data.since as string,
    until: data.until as string,
  }
}

// API unificada: aceita slug curto OU token HMAC legado
export async function verifyShareToken(token: string): Promise<SharePayload | null> {
  if (!token) return null
  if (isSlug(token)) return lookupSlug(token)
  return verifyHmacToken(token)
}
