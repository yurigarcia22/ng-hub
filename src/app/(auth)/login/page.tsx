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
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-lg tracking-tight">NG</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NG Hub</h1>
          <p className="text-sm text-zinc-500 mt-1">Painel de Campanhas Meta Ads</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <form action={login} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {hasError && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">E-mail ou senha incorretos.</p>
              </div>
            )}

            <SubmitButton />
          </form>
        </div>

        <p className="text-center text-xs text-zinc-700 mt-6">Grupo NG — uso interno</p>
      </div>
    </div>
  )
}
