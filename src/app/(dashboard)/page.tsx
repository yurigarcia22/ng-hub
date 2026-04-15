import type { Metadata } from 'next'
import { getLastSync } from '@/lib/supabase/queries'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Campanhas' }

export default async function DashboardPage() {
  const lastSync = await getLastSync()
  return <DashboardClient lastSync={lastSync} />
}
