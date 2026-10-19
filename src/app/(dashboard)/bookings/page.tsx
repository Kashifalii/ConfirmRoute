import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Search, SearchX } from "lucide-react";
import { getBookingsListData } from "@/lib/data/queries";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/types/domain";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Bookings",
};

function parseStatus(value: string | string[] | undefined): BookingStatus | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return BOOKING_STATUSES.includes(raw as BookingStatus)
    ? (raw as BookingStatus)
    : undefined;
}

function parseQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  const { q, status } = await searchParams;
  const query = parseQuery(q);
  const statusFilter = parseStatus(status);
  const { mode, bookings, counts } = await getBookingsListData({
    query,
    status: statusFilter,
  });

  const totalCount = counts.pending_review + counts.approved + counts.archived;
  const filters: { label: string; count: number; href: string; active: boolean }[] = [
    {
      label: "All",
      count: totalCount,
      href: query ? `/bookings?q=${encodeURIComponent(query)}` : "/bookings",
      active: !statusFilter,
    },
    ...BOOKING_STATUSES.map((value) => ({
      label: BOOKING_STATUS_LABELS[value],
      count: counts[value],
      href:
        `/bookings?status=${value}` +
        (query ? `&q=${encodeURIComponent(query)}` : ""),
      active: statusFilter === value,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking in the workspace, including records pending review."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/api/audit/export">
                <Download aria-hidden="true" />
                Export audit CSV
              </a>
            </Button>
            <Button asChild>
              <Link href="/bookings/new">
                <Plus aria-hidden="true" />
                New booking
              </Link>
            </Button>
          </div>
        }
      />
      <ModeBanner mode={mode} />

      <form
        role="search"
        action="/bookings"
        method="get"
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {statusFilter ? (
          <input type="hidden" name="status" value={statusFilter} />
        ) : null}
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search reference, customer, or supplier"
            aria-label="Search bookings"
            className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.href}
            aria-current={filter.active ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              filter.active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {filter.label}
            <span className="tabular-nums opacity-70">{filter.count}</span>
          </Link>
        ))}
      </nav>

      {bookings.length > 0 ? (
        <BookingsTable bookings={bookings} />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-16 text-center ring-1 ring-foreground/10">
          <SearchX aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="font-medium text-foreground">No bookings found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {query || statusFilter
              ? "Try a different search or clear the filters."
              : "Bookings created through intake or manually will appear here."}
          </p>
          {query || statusFilter ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/bookings">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      )}

      {bookings.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          Showing {bookings.length} of {totalCount} bookings
          {query ? ` matching "${query}"` : ""}
          {statusFilter ? ` with status ${BOOKING_STATUS_LABELS[statusFilter]}` : ""}
        </p>
      ) : null}
    </>
  );
}
