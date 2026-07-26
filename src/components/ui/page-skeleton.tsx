export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-5" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <div className="skeleton-line h-3 w-28" />
        <div className="skeleton-line h-9 w-64 max-w-full" />
        <div className="skeleton-line h-4 w-[420px] max-w-full" />
      </div>
      <div className="skeleton-panel grid gap-3 p-4 sm:grid-cols-3">
        <div className="skeleton-line h-10" /><div className="skeleton-line h-10" /><div className="skeleton-line h-10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="skeleton-panel h-44 p-5">
            <div className="skeleton-line h-3 w-2/5" />
            <div className="skeleton-line mt-5 h-4 w-full" />
            <div className="skeleton-line mt-2 h-4 w-4/5" />
            <div className="skeleton-line mt-8 h-8 w-1/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
