export default function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-zinc-800 rounded w-2/3" />
              <div className="h-3 bg-zinc-800 rounded w-1/3" />
            </div>
            <div className="h-5 w-16 bg-zinc-800 rounded-md" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="space-y-1">
                <div className="h-3 bg-zinc-800 rounded w-16" />
                <div className="h-4 bg-zinc-800 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
