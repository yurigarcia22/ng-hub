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
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-zinc-600">/</span>}
          {item.href ? (
            <Link
              href={`${item.href}${filters ? `?${filters}` : ''}`}
              className="text-zinc-400 hover:text-white transition truncate max-w-48"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-medium truncate max-w-48">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
