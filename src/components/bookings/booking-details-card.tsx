import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingWithParties } from "@/lib/data/store";
import { SERVICE_TYPE_LABELS } from "@/types/domain";
import { formatDate, formatDateRange, formatMoney } from "@/lib/format";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function BookingDetailsCard({ booking }: { booking: BookingWithParties }) {
  const dates =
    booking.endDate && booking.endDate !== booking.startDate
      ? formatDateRange(booking.startDate, booking.endDate)
      : formatDate(booking.startDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer">{booking.customerName}</Field>
          <Field label="Supplier">{booking.supplierName}</Field>
          <Field label="Service type">{SERVICE_TYPE_LABELS[booking.serviceType]}</Field>
          <Field label="Travel dates">{dates}</Field>
          <Field label="Amount">
            {booking.amount != null && booking.currency
              ? formatMoney(booking.amount, booking.currency)
              : "Missing — required for approval"}
          </Field>
          <Field label="Notes">{booking.notes ?? "—"}</Field>
        </dl>
      </CardContent>
    </Card>
  );
}
