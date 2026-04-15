import { logout } from '@/app/actions/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs tracking-tight">NG</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-sm">NG Hub</span>
              <span className="hidden sm:inline text-zinc-600 text-sm">·</span>
              <span className="hidden sm:inline text-zinc-500 text-xs">Meta Ads</span>
            </div>
          </div>

          {/* Right */}
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
