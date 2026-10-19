"use client";

import { useTransition } from "react";
import { Archive, BadgeCheck, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { approveBookingAction, archiveBookingAction } from "@/features/bookings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingStatus } from "@/types/domain";
import { showNotificationResult } from "@/components/layout/notification-result";

export function ApprovalPanel({
  bookingId,
  status,
  eligibility,
}: {
  bookingId: string;
  status: BookingStatus;
  eligibility: { eligible: boolean; reasons: string[] };
}) {
  const [isPending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const result = await approveBookingAction(bookingId);
      if (result.ok) {
        toast.success("Booking approved", {
          description: "The booking is now marked as approved.",
        });
        showNotificationResult(result.data.notification, "Booking approved");
      } else {
        toast.error("Cannot approve yet", { description: result.message });
      }
    });
  }

  function archive() {
    startTransition(async () => {
      const result = await archiveBookingAction(bookingId);
      if (result.ok) {
        toast.success("Booking archived", {
          description: "The booking is now read-only.",
        });
      } else {
        toast.error("Could not archive", { description: result.message });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "approved" ? (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
              <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>
                Approved. A human operator verified this booking against its
                source document.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={archive}
              disabled={isPending}
            >
              <Archive aria-hidden="true" />
              Archive booking
            </Button>
          </>
        ) : status === "archived" ? (
          <div className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            <p>
              Archived. This booking is read-only; edits and approval are
              disabled.
            </p>
          </div>
        ) : eligibility.eligible ? (
          <>
            <p className="text-sm text-muted-foreground">
              All required information is present and no exceptions are open.
              Approving records a human verification step.
            </p>
            <Button className="w-full" onClick={approve} disabled={isPending}>
              <BadgeCheck aria-hidden="true" />
              Approve booking
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning-foreground">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Approval is blocked</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {eligibility.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Resolve the items above before approving. Bookings are never
              auto-approved.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
