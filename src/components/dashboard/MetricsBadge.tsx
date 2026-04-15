interface MetricsBadgeProps {
  status: string
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  PAUSED: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  DELETED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  ARCHIVED: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  DISABLED: 'bg-red-500/10 text-red-400 border border-red-500/20'
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  DELETED: 'Deletado',
  ARCHIVED: 'Arquivado',
  DISABLED: 'Desativado'
}

export default function MetricsBadge({ status }: MetricsBadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
  const label = STATUS_LABELS[status] ?? status

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}
