import { getLastSync, getAccounts } from '@/lib/supabase/queries'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [lastSync, accounts] = await Promise.all([
    getLastSync(),
    getAccounts()
  ])

  return <DashboardClient lastSync={lastSync} accounts={accounts} />
}
