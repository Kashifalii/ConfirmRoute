import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BookingWithParties } from "@/lib/data/store";
import { BookingStatusBadge } from "@/components/bookings/status-badges";
import { SERVICE_TYPE_LABELS } from "@/types/domain";
import { formatDate, formatDateRange, formatMoney } from "@/lib/format";

export function RecentBookings({ bookings }: { bookings: BookingWithParties[] }) {
  return (
    <ul className="divide-y divide-border">
      {bookings.map((booking) => {
        const dates = booking.endDate && booking.endDate !== booking.startDate
          ? formatDateRange(booking.startDate, booking.endDate)
          : formatDate(booking.startDate);
        return (
          <li key={booking.id}>
            <Link
              href={`/bookings/${booking.id}`}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {booking.reference}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {booking.customerName}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {SERVICE_TYPE_LABELS[booking.serviceType]} · {booking.supplierName} · {dates}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {booking.amount != null && booking.currency
                    ? formatMoney(booking.amount, booking.currency)
                    : "Amount pending"}
                </p>
                <div className="mt-0.5 flex justify-end">
                  <BookingStatusBadge status={booking.status} />
                </div>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
