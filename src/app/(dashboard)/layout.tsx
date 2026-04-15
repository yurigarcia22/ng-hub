import type { Metadata } from 'next'
import { logout } from '@/app/actions/auth'

export const metadata: Metadata = {
  title: {
    template: '%s | NG Hub',
    default: 'NG Hub — Campanhas'
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">NG Hub</span>
            <span className="text-zinc-600 text-sm hidden sm:inline">Campanhas</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-md hover:bg-zinc-800"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
