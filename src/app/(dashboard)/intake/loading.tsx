function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-3 w-64 rounded bg-muted" />
        <div className="h-3 w-56 rounded bg-muted" />
      </div>
      <div className="mt-4 h-9 w-32 rounded bg-muted" />
    </div>
  );
}

export default function IntakeLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      <div className="space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
