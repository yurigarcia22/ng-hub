import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  filters?: string
}

export default function Breadcrumb({ items, filters }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg className="w-3 h-3 text-zinc-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <Link
              href={`${item.href}${filters ? `?${filters}` : ''}`}
              className="text-zinc-500 hover:text-zinc-200 transition-colors truncate max-w-40 sm:max-w-64"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-300 font-medium truncate max-w-40 sm:max-w-64">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
