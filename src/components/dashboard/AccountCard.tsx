'use client'

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
  }
  selected: boolean
  onClick: () => void
}

function fmtCurrency(v: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    notation: v >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: v >= 1000 ? 0 : 2
  }).format(v)
}

export default function AccountCard({ account, selected, onClick }: AccountCardProps) {
  const isActive = account.status === 'ACTIVE'
  const hasSpend = account.spend > 0
  const hasBalance = account.balance !== undefined && account.balance > 0

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
        selected
          ? 'border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/30'
          : 'border-zinc-800/60 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
      }`}
    >
      {/* Account header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            <p className="text-xs font-semibold text-zinc-100 truncate leading-snug">{account.name}</p>
          </div>
          {account.business_name && (
            <p className="text-[10px] text-zinc-600 truncate pl-3">{account.business_name}</p>
          )}
        </div>
        {selected && (
          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Spend */}
      <div className="mb-3">
        <p className={`text-xl font-bold tabular-nums leading-none ${hasSpend ? 'text-white' : 'text-zinc-700'}`}>
          {fmtCurrency(account.spend, account.currency)}
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5">gasto no período</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span className="text-zinc-400 tabular-nums">{account.activeCampaigns} ativas</span>
        </div>
        {account.totalCampaigns > account.activeCampaigns && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-zinc-600 tabular-nums">{account.totalCampaigns - account.activeCampaigns} pausadas</span>
          </div>
        )}
      </div>

      {/* Balance */}
      {hasBalance && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Saldo</span>
            <span className="text-xs font-semibold text-emerald-400 tabular-nums">
              {fmtCurrency(account.balance!, account.currency)}
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
