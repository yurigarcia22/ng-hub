import { logout } from '@/app/actions/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(59,130,246,0.35)]">
              <span className="text-white font-black text-xs tracking-tight">NG</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm leading-none">NG Hub</span>
              <span className="text-zinc-600 text-[10px] tracking-widest uppercase leading-none mt-0.5">Meta Ads</span>
            </div>
          </div>

          {/* Right */}
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
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
