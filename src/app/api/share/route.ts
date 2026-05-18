import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Alfabeto base32 sem caracteres ambíguos (sem 0/O/1/I/L)
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

function generateSlug(length = 8): string {
  const bytes = randomBytes(length)
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return slug
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.accountId || !body?.since || !body?.until) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Tenta reutilizar um slug existente pra mesma conta + período (idempotência)
  const { data: existing } = await supabase
    .from('report_shares')
    .select('slug')
    .eq('account_id', body.accountId)
    .eq('since', body.since)
    .eq('until', body.until)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.slug) {
    return NextResponse.json({ slug: existing.slug, path: `/r/${existing.slug}` })
  }

  // Gera novo slug, tenta até 5 vezes em caso de colisão (extremamente improvável)
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug(8)
    const { error } = await supabase.from('report_shares').insert({
      slug,
      account_id: String(body.accountId),
      since: String(body.since),
      until: String(body.until),
    })
    if (!error) {
      return NextResponse.json({ slug, path: `/r/${slug}` })
    }
    // Se erro de unique constraint, tenta de novo
    if (!error.message?.toLowerCase().includes('unique')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'slug generation failed' }, { status: 500 })
}
