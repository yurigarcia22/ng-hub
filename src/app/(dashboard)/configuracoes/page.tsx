import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Configurações' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, name, currency, status, business_id, business_name, synced_at')
    .order('name')

  const { data: settings } = user ? await supabase
    .from('account_settings')
    .select('account_id, visible')
    .eq('user_id', user.id) : { data: [] }

  const settingsMap: Record<string, boolean> = {}
  for (const s of settings ?? []) {
    settingsMap[s.account_id] = s.visible
  }

  return (
    <SettingsClient
      accounts={accounts ?? []}
      initialSettings={settingsMap}
    />
  )
}
