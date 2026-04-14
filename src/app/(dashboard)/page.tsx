import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Campanhas</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Logado como {user?.email}
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-zinc-500 text-sm">Dashboard em construção — Story 3.1</p>
      </div>
    </div>
  )
}
