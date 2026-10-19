export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[5.25rem] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="h-80 animate-pulse rounded-xl bg-muted xl:col-span-3" />
        <div className="h-80 animate-pulse rounded-xl bg-muted xl:col-span-2" />
      </div>
    </div>
  );
}
