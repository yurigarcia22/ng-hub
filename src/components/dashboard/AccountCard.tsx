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
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-blue-500/50 bg-blue-500/[0.08] ring-1 ring-blue-500/25 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
          : 'border-white/[0.06] bg-[#111115] hover:border-white/[0.12] hover:bg-[#131319]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isActive
                ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]'
                : 'bg-zinc-700'
            }`} />
            <p className="text-xs font-semibold text-zinc-100 truncate leading-snug">{account.name}</p>
          </div>
          {account.business_name && (
            <p className="text-[10px] text-zinc-600 truncate pl-3">{account.business_name}</p>
          )}
        </div>
        {selected && (
          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.5)]">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Spend */}
      <div className="mb-3">
        <p className={`text-xl font-black tabular-nums leading-none tracking-tight ${hasSpend ? 'text-white' : 'text-zinc-700'}`}>
          {fmtCurrency(account.spend, account.currency)}
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest">gasto</p>
      </div>

      {/* Campanhas */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-emerald-400 font-semibold tabular-nums">{account.activeCampaigns}</span>
          <span className="text-zinc-600">ativas</span>
        </div>
        {account.totalCampaigns > account.activeCampaigns && (
          <div className="flex items-center gap-1">
            <span className="text-zinc-600 tabular-nums">{account.totalCampaigns - account.activeCampaigns}</span>
            <span className="text-zinc-700">pausadas</span>
          </div>
        )}
      </div>

      {/* Saldo */}
      {hasBalance && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.05]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-700 uppercase tracking-widest">Saldo</span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">
              {fmtCurrency(account.balance!, account.currency)}
            </span>
          </div>
        </div>
      )}
    </button>
  )
}
