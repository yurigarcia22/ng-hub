import 'server-only'
import crypto from 'crypto'

// Usa SHARE_SECRET se existir, senão deriva de SUPABASE_SERVICE_ROLE_KEY
const SECRET = process.env.SHARE_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'ng-hub-default-secret-change-me'

export interface SharePayload {
  accountId: string
  since: string
  until: string
  /** issued at — unix seconds */
  iat?: number
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  return Buffer.from(padded, 'base64')
}

export function signShareToken(payload: SharePayload): string {
  const data: SharePayload = { ...payload, iat: Math.floor(Date.now() / 1000) }
  const dataB64 = b64urlEncode(Buffer.from(JSON.stringify(data)))
  const sig = b64urlEncode(crypto.createHmac('sha256', SECRET).update(dataB64).digest())
  return `${dataB64}.${sig}`
}

export function verifyShareToken(token: string): SharePayload | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const expected = b64urlEncode(crypto.createHmac('sha256', SECRET).update(data).digest())
    // timing-safe compare
    const a = Buffer.from(sig); const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    return JSON.parse(b64urlDecode(data).toString('utf-8')) as SharePayload
  } catch {
    return null
  }
}
