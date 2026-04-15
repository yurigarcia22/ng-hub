import { login } from '@/app/actions/auth'
import SubmitButton from './submit-button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const hasError = params?.error === '1'

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">NG Hub</h1>
          <p className="text-sm text-zinc-400">Painel de Campanhas</p>
        </div>

        {/* Form */}
        <form action={login} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {hasError && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">E-mail ou senha incorretos.</p>
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="text-center text-xs text-zinc-600">Grupo NG — uso interno</p>
      </div>
    </div>
  )
}
