'use client'

import ShareButton from './ShareButton'

interface AccountCardProps {
  account: {
    id: string
    name: string
    business_name: string | null
    currency: string
    status: string
    spend: number
    activeCampaigns: number
    totalCampaigns: number
    balance?: number
    hasIssues?: boolean
  }
  selected: boolean
  onClick: () => void
  since?: string
  until?: string
}

function fmtCurrency(v: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    notation: v >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: v >= 1000 ? 0 : 2
  }).format(v)
}

export default function AccountCard({ account, selected, onClick, since, until }: AccountCardProps) {
  const isActive = account.status === 'ACTIVE'
  const hasSpend = account.spend > 0
  const hasIssues = account.hasIssues ?? false
  const balance = account.balance ?? 0
  const isCreditCard = balance === 0 && !hasIssues

  return (
    <div className="flex flex-col h-full group">
      <button
        onClick={onClick}
        className={`interactive flex-1 w-full text-left rounded-2xl border p-4 cursor-pointer relative overflow-hidden ${
          selected
            ? 'border-blue-500/40 bg-gradient-to-br from-blue-500/[0.10] via-blue-500/[0.04] to-transparent ring-1 ring-blue-500/20 shadow-[0_8px_32px_rgba(59,130,246,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]'
            : hasIssues
              ? 'border-amber-500/25 bg-[#111115] hover:border-amber-500/45 hover:bg-[#13131a] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
              : 'border-white/[0.05] bg-[#111115] hover:border-white/[0.12] hover:bg-[#13131a] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]'
        }`}
      >
        {/* Selected indicator beam */}
        {selected && (
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3 relative">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                hasIssues
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                  : isActive
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                    : 'bg-zinc-700'
              }`} />
              <p className="text-xs font-semibold text-zinc-100 truncate leading-snug tracking-tight">{account.name}</p>
            </div>
            {account.business_name && (
              <p className="text-[10px] text-zinc-600 truncate pl-3">{account.business_name}</p>
            )}
          </div>
          {selected && (
            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-scale-in">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Badge erro pagamento */}
        {hasIssues && (
          <div className="mb-2.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded uppercase">
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
              Erro pagamento
            </span>
          </div>
        )}

        {/* Spend */}
        <div className="mb-3">
          <p className={`text-xl font-black tabular-nums leading-none tracking-tight transition-colors ${hasSpend ? 'text-white' : 'text-zinc-700'}`}>
            {fmtCurrency(account.spend, account.currency)}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest font-semibold">gasto</p>
        </div>

        {/* Campanhas */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className={`font-bold tabular-nums ${account.activeCampaigns > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>{account.activeCampaigns}</span>
            <span className="text-zinc-600">ativas</span>
          </div>
          {account.totalCampaigns > account.activeCampaigns && (
            <>
              <span className="text-zinc-800">·</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500 tabular-nums">{account.totalCampaigns - account.activeCampaigns}</span>
                <span className="text-zinc-700">pausadas</span>
              </div>
            </>
          )}
        </div>

        {/* Saldo / tipo de pagamento */}
        <div className="mt-3 pt-2.5 border-t border-white/[0.05]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-700 uppercase tracking-widest font-semibold">Saldo</span>
            {isCreditCard ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Cartão
              </span>
            ) : (
              <span className={`text-xs font-bold tabular-nums ${
                hasIssues ? 'text-amber-400' : balance > 0 ? 'text-emerald-400' : 'text-zinc-600'
              }`}>
                {fmtCurrency(balance, account.currency)}
              </span>
            )}
          </div>
        </div>
      </button>

      {(since && until) && (
        <ShareButton accountId={account.id} since={since} until={until} />
      )}
    </div>
  )
}
