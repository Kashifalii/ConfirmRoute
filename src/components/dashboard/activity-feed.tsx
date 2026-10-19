import Link from "next/link";
import { History } from "lucide-react";
import type { ActivityItem } from "@/lib/data/store";
import { formatDateTime } from "@/lib/format";

/**
 * Human-readable labels for change-history fields. Money fields are stored
 * pre-formatted (e.g. "PKR 75,000"), so no further formatting happens here.
 */
const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  reference: "Reference",
  customerName: "Customer",
  supplierName: "Supplier",
  serviceType: "Service type",
  startDate: "Start date",
  endDate: "End date",
  travelDates: "Travel dates",
  amount: "Amount",
  currency: "Currency",
  notes: "Notes",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function changeSummary(item: ActivityItem): string {
  const field = fieldLabel(item.field);
  if (item.previousValue == null && item.newValue != null) {
    return `${field} set to "${item.newValue}"`;
  }
  if (item.previousValue != null && item.newValue == null) {
    return `${field} cleared (was "${item.previousValue}")`;
  }
  return `${field}: "${item.previousValue}" → "${item.newValue}"`;
}

export function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <History aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No activity yet. Changes and approvals will appear here.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {activity.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <p className="text-sm text-foreground">
            <Link
              href={`/bookings/${item.bookingId}`}
              className="font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {item.bookingReference}
            </Link>{" "}
            — {changeSummary(item)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.actor} · {formatDateTime(item.createdAt)}
            {item.reason ? ` · ${item.reason}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
