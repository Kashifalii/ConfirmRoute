import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingChange } from "@/types/domain";
import { formatDateTime } from "@/lib/format";

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

export function ChangeHistory({ changes }: { changes: BookingChange[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change history</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {changes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <History aria-hidden="true" className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No changes recorded yet. Edits, approvals, and exception
              resolutions will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {changes.map((change) => (
              <li key={change.id} className="px-4 py-3">
                <p className="text-sm text-foreground">
                  <span className="font-medium">
                    {FIELD_LABELS[change.field] ?? change.field}
                  </span>
                  {change.previousValue == null && change.newValue == null
                    ? " updated"
                    : change.previousValue == null
                      ? ` set to "${change.newValue}"`
                      : change.newValue == null
                        ? ` cleared (was "${change.previousValue}")`
                        : `: "${change.previousValue}" → "${change.newValue}"`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {change.actor} · {formatDateTime(change.createdAt)}
                  {change.reason ? ` · ${change.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
