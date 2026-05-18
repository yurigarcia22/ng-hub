interface MetricsBadgeProps {
  status: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ACTIVE:           { bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' },
  PAUSED:           { bg: 'bg-zinc-500/[0.08]',    text: 'text-zinc-400',    border: 'border-white/[0.06]',   dot: 'bg-zinc-500' },
  CAMPAIGN_PAUSED:  { bg: 'bg-zinc-500/[0.08]',    text: 'text-zinc-400',    border: 'border-white/[0.06]',   dot: 'bg-zinc-500' },
  ADSET_PAUSED:     { bg: 'bg-zinc-500/[0.08]',    text: 'text-zinc-400',    border: 'border-white/[0.06]',   dot: 'bg-zinc-500' },
  COMPLETED:        { bg: 'bg-blue-500/[0.08]',    text: 'text-blue-400',    border: 'border-blue-500/20',    dot: 'bg-blue-400' },
  WITH_ISSUES:      { bg: 'bg-amber-500/[0.10]',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' },
  DELETED:          { bg: 'bg-red-500/[0.08]',     text: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-500' },
  ARCHIVED:         { bg: 'bg-yellow-500/[0.08]',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  dot: 'bg-yellow-500' },
  DISABLED:         { bg: 'bg-red-500/[0.08]',     text: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-500' },
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  CAMPAIGN_PAUSED: 'Pausado',
  ADSET_PAUSED: 'Pausado',
  COMPLETED: 'Concluída',
  WITH_ISSUES: 'Erro pagamento',
  DELETED: 'Deletado',
  ARCHIVED: 'Arquivado',
  DISABLED: 'Desativado'
}

export default function MetricsBadge({ status }: MetricsBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PAUSED
  const label = STATUS_LABELS[status] ?? status

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  )
}
