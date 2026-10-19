"use client";

import { toast } from "sonner";
import type { EmailNotificationResult } from "@/lib/email/notifications";

export function showNotificationResult(
  result: EmailNotificationResult,
  actionLabel: string,
): void {
  if (result.status === "unconfigured") {
    toast.info(`${actionLabel}; email alert not sent.`, {
      description: result.message,
    });
  } else if (result.status === "failed") {
    toast.error(`${actionLabel}, but email alert delivery failed.`, {
      description: result.message,
    });
  }
}
