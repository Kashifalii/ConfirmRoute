"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationEmailAction } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NotificationEmailForm({
  initialEmail,
  enabled,
}: {
  initialEmail: string | null;
  enabled: boolean;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateNotificationEmailAction(email);
      if (!result.ok) {
        toast.error("Could not save notification email", { description: result.message });
        return;
      }
      setEmail(result.email ?? "");
      toast.success("Notification email saved");
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="notification-email">Workspace notification email</Label>
        <Input
          id="notification-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!enabled || isPending}
          placeholder="operations@example.com"
        />
        <p className="text-sm text-muted-foreground">
          Booking intake, approvals, and resolved exceptions can send alerts to this address.
        </p>
      </div>
      <Button onClick={save} disabled={!enabled || isPending}>
        {isPending ? "Saving..." : "Save email"}
      </Button>
    </div>
  );
}
