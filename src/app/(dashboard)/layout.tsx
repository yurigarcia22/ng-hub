import { logout } from '@/app/actions/auth'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Header — glass premium */}
      <header className="glass border-b border-white/[0.05] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-[0_4px_16px_rgba(59,130,246,0.35)] transition-transform duration-200 group-hover:scale-105">
              <span className="text-white font-black text-[11px] tracking-tight">NG</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
            </div>
            <div className="flex flex-col">
              <span className="text-zinc-100 font-bold text-sm leading-none tracking-tight">NG Hub</span>
              <span className="text-zinc-600 text-[10px] tracking-widest uppercase leading-none mt-0.5">Meta Ads</span>
            </div>
          </Link>

          {/* Right */}
          <form action={logout}>
            <button
              type="submit"
              className="press flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors duration-150 px-3 py-2 rounded-lg hover:bg-white/[0.04]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
