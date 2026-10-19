"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ExceptionWithBooking } from "@/lib/data/store";
import {
  EXCEPTION_STATUSES,
  EXCEPTION_STATUS_LABELS,
  type ExceptionStatus,
} from "@/types/domain";
import {
  ExceptionStatusBadge,
  ExceptionTypeBadge,
} from "@/components/bookings/status-badges";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = ExceptionStatus | "all";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...EXCEPTION_STATUSES.map((s) => ({
    value: s,
    label: EXCEPTION_STATUS_LABELS[s],
  })),
];

function describeException(exception: ExceptionWithBooking): string {
  if (exception.type === "value_change" && exception.field) {
    return `${exception.field} changed from ${exception.previousValue ?? "—"} to ${exception.newValue ?? "—"}`;
  }
  return exception.description;
}

export function ExceptionsList({
  exceptions,
  openCount,
}: {
  exceptions: ExceptionWithBooking[];
  openCount: number;
}) {
  const [filter, setFilter] = useState<StatusFilter>("open");

  const filtered =
    filter === "all"
      ? exceptions
      : exceptions.filter((e) => e.status === filter);

  const counts = {
    all: exceptions.length,
    open: openCount,
    resolved: exceptions.length - openCount,
  };

  return (
    <>
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {f.label}
            <span className="tabular-nums opacity-70">{counts[f.value]}</span>
          </button>
        ))}
      </nav>

      {filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((exception) => (
            <li
              key={exception.id}
              className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/bookings/${exception.bookingId}`}
                      className="text-sm font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {exception.bookingReference}
                    </Link>
                    <ExceptionTypeBadge type={exception.type} />
                    <ExceptionStatusBadge status={exception.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {describeException(exception)}
                  </p>
                  {exception.status === "resolved" && exception.resolvedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Resolved {formatDateTime(exception.resolvedAt)}
                      {exception.resolutionNote
                        ? ` — ${exception.resolutionNote}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-card px-4 py-16 text-center ring-1 ring-foreground/10">
          {filter === "open" ? (
            <>
              <CheckCircle2
                aria-hidden="true"
                className="size-6 text-success"
              />
              <p className="font-medium text-foreground">No open exceptions</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                All exceptions have been resolved. Great work!
              </p>
            </>
          ) : filter === "resolved" ? (
            <>
              <AlertTriangle
                aria-hidden="true"
                className="size-6 text-muted-foreground"
              />
              <p className="font-medium text-foreground">
                No resolved exceptions yet
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Resolved exceptions will appear here for audit.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle
                aria-hidden="true"
                className="size-6 text-muted-foreground"
              />
              <p className="font-medium text-foreground">No exceptions</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Exceptions from intake and review will appear here.
              </p>
            </>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          Showing {filtered.length} of {exceptions.length} exceptions
        </p>
      ) : null}
    </>
  );
}
