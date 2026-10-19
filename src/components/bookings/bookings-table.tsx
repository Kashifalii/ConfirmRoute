import Link from "next/link";
import type { BookingWithParties } from "@/lib/data/store";
import { BookingStatusBadge } from "@/components/bookings/status-badges";
import { SERVICE_TYPE_LABELS } from "@/types/domain";
import { formatDate, formatDateRange, formatMoney } from "@/lib/format";

function bookingDates(booking: BookingWithParties): string {
  if (booking.endDate && booking.endDate !== booking.startDate) {
    return formatDateRange(booking.startDate, booking.endDate);
  }
  return formatDate(booking.startDate);
}

function bookingAmount(booking: BookingWithParties): string {
  if (booking.amount != null && booking.currency) {
    return formatMoney(booking.amount, booking.currency);
  }
  return "—";
}

export function BookingsTable({ bookings }: { bookings: BookingWithParties[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">Reference</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Service</th>
              <th scope="col" className="px-4 py-3">Supplier</th>
              <th scope="col" className="px-4 py-3">Dates</th>
              <th scope="col" className="px-4 py-3 text-right">Amount</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {bookings.map((booking) => (
              <tr key={booking.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {booking.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground">{booking.customerName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {SERVICE_TYPE_LABELS[booking.serviceType]}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{booking.supplierName}</td>
                <td className="px-4 py-3 text-muted-foreground">{bookingDates(booking)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                  {bookingAmount(booking)}
                </td>
                <td className="px-4 py-3">
                  <BookingStatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/bookings/${booking.id}`}
              className="block rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{booking.reference}</span>
                <BookingStatusBadge status={booking.status} />
              </div>
              <p className="mt-1 text-sm text-foreground">{booking.customerName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {SERVICE_TYPE_LABELS[booking.serviceType]} · {booking.supplierName} ·{" "}
                {bookingDates(booking)}
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {bookingAmount(booking)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
