import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// GET: retorna as configurações de visibilidade do usuário
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({}, { status: 401 })

  const { data } = await supabase
    .from('account_settings')
    .select('account_id, visible')
    .eq('user_id', user.id)

  const settings: Record<string, boolean> = {}
  for (const s of data ?? []) {
    settings[s.account_id] = s.visible
  }

  return NextResponse.json(settings)
}

// POST: salva configuração de visibilidade { accountId, visible }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({}, { status: 401 })

  const { accountId, visible } = await request.json()
  if (!accountId || typeof visible !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await supabase
    .from('account_settings')
    .upsert(
      { user_id: user.id, account_id: accountId, visible, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,account_id' }
    )

  return NextResponse.json({ ok: true })
}
