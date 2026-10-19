"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  acceptAmendmentAction,
  resolveExceptionAction,
} from "@/features/bookings/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ExceptionTypeBadge,
  ExceptionStatusBadge,
} from "@/components/bookings/status-badges";
import type { ExceptionWithBooking } from "@/lib/data/store";
import { formatDateTime } from "@/lib/format";
import { showNotificationResult } from "@/components/layout/notification-result";

function ValueChange({ exception }: { exception: ExceptionWithBooking }) {
  if (exception.previousValue == null && exception.newValue == null) return null;
  return (
    <p className="mt-1 text-sm text-foreground">
      <span className="text-muted-foreground line-through decoration-muted-foreground/60">
        {exception.previousValue ?? "—"}
      </span>{" "}
      <ArrowRight aria-hidden="true" className="inline size-3.5 text-muted-foreground" />{" "}
      <span className="font-medium">{exception.newValue ?? "—"}</span>
    </p>
  );
}

function OpenExceptionCard({ exception }: { exception: ExceptionWithBooking }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function resolve() {
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      toast.error("Add a short resolution note", {
        description: "Explain how you verified this issue (min. 3 characters).",
      });
      return;
    }
    startTransition(async () => {
      const result = await resolveExceptionAction(exception.id, trimmed);
      if (result.ok) {
        toast.success("Exception resolved");
        showNotificationResult(result.data.notification, "Exception resolved");
        setNote("");
      } else {
        toast.error("Could not resolve", { description: result.message });
      }
    });
  }

  function accept() {
    startTransition(async () => {
      const result = await acceptAmendmentAction(exception.id);
      if (result.ok) {
        toast.success("New value applied", {
          description: "The booking was updated and the change was recorded in history.",
        });
        showNotificationResult(result.data.notification, "Amendment accepted");
      } else {
        toast.error("Could not accept", { description: result.message });
      }
    });
  }

  return (
    <Card className="border-warning/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ExceptionTypeBadge type={exception.type} />
          <ExceptionStatusBadge status={exception.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">{exception.description}</p>
        <ValueChange exception={exception} />
        {exception.type === "value_change" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Accepting applies the new value to the booking. The previous
              value is preserved in change history. Keep the current value
              instead if the old price was correct.
            </p>
            <Button onClick={accept} disabled={isPending}>
              <CheckCircle2 aria-hidden="true" />
              Accept new value
            </Button>
          </div>
        ) : null}
        <div className="space-y-2 border-t border-border pt-3">
          <label
            htmlFor={`note-${exception.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            {exception.type === "value_change"
              ? "Note (required if keeping the current value)"
              : "Resolution note"}
          </label>
          <Textarea
            id={`note-${exception.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Called the hotel and confirmed the missing end date."
            rows={2}
            maxLength={500}
          />
          <Button variant="outline" onClick={resolve} disabled={isPending}>
            {exception.type === "value_change"
              ? "Keep current value"
              : "Resolve with note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResolvedExceptionCard({ exception }: { exception: ExceptionWithBooking }) {
  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ExceptionTypeBadge type={exception.type} />
          <ExceptionStatusBadge status={exception.status} />
        </CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground">
            {exception.resolvedAt
              ? formatDateTime(exception.resolvedAt)
              : null}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{exception.description}</p>
        <ValueChange exception={exception} />
        {exception.resolutionNote ? (
          <p className="text-sm text-foreground">
            <span className="font-medium">Note:</span> {exception.resolutionNote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ExceptionsSection({
  exceptions,
}: {
  exceptions: ExceptionWithBooking[];
}) {
  const open = exceptions.filter((exception) => exception.status === "open");
  const resolved = exceptions.filter((exception) => exception.status === "resolved");

  return (
    <section aria-labelledby="exceptions-heading" className="space-y-3">
      <h2
        id="exceptions-heading"
        className="flex items-center gap-2 text-base font-semibold text-foreground"
      >
        Exceptions
        <span className="text-sm font-normal text-muted-foreground">
          ({open.length} open, {resolved.length} resolved)
        </span>
      </h2>
      {exceptions.length === 0 ? (
        <p className="rounded-xl bg-card px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No exceptions recorded for this booking.
        </p>
      ) : (
        <div className="space-y-3">
          {open.map((exception) => (
            <OpenExceptionCard key={exception.id} exception={exception} />
          ))}
          {resolved.map((exception) => (
            <ResolvedExceptionCard key={exception.id} exception={exception} />
          ))}
        </div>
      )}
    </section>
  );
}
