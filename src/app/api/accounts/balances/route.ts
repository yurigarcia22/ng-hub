import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccountBalances } from '@/lib/meta/client'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id')
    .eq('status', 'ACTIVE')

  if (!accounts || accounts.length === 0) return NextResponse.json({})

  const balances = await getAccountBalances(accounts.map(a => a.id))
  return NextResponse.json(balances)
}
