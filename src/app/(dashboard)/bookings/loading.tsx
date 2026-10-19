export default function BookingsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-36 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mb-4 h-10 w-full max-w-sm animate-pulse rounded-md bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
