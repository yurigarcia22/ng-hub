export default function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl border border-white/[0.05] bg-[#111115] p-5 animate-fade-in-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="space-y-2 flex-1">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
            <div className="skeleton h-5 w-16" />
          </div>
          <div className="skeleton h-8 w-32 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="space-y-2">
                <div className="skeleton h-2 w-12" />
                <div className="skeleton h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
