import type { Metadata } from 'next'
import { login } from '@/app/actions/auth'
import SubmitButton from './submit-button'

export const metadata: Metadata = { title: 'Login' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const hasError = params?.error === '1'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/[0.05] blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 mb-5 shadow-[0_8px_32px_rgba(59,130,246,0.35)] relative">
            <span className="text-white font-black text-base tracking-tight">NG</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">NG Hub</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Painel de Campanhas Meta Ads</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d0d10]/80 border border-white/[0.06] rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl relative">
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <form action={login} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                E-mail
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-[#111115] border border-white/[0.06] rounded-xl text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-[#13131a] focus:ring-2 focus:ring-blue-500/15 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#111115] border border-white/[0.06] rounded-xl text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-[#13131a] focus:ring-2 focus:ring-blue-500/15 transition-all duration-200"
              />
            </div>

            {hasError && (
              <div className="px-4 py-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl flex items-center gap-2.5 animate-fade-in">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400 font-medium">E-mail ou senha incorretos.</p>
              </div>
            )}

            <SubmitButton />
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-8 tracking-wide">Grupo NG · uso interno</p>
      </div>
    </div>
  )
}
