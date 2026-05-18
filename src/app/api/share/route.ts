import { NextRequest, NextResponse } from 'next/server'
import { signShareToken } from '@/lib/share-token'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.accountId || !body?.since || !body?.until) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }
  const token = signShareToken({
    accountId: String(body.accountId),
    since: String(body.since),
    until: String(body.until),
  })
  return NextResponse.json({ token, path: `/r/${token}` })
}
