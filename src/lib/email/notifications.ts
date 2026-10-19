import "server-only";

import { Resend } from "resend";
import { getStore } from "@/lib/data/get-store";

export type EmailNotificationResult =
  | { status: "sent" }
  | { status: "unconfigured"; message: string }
  | { status: "failed"; message: string };

export async function sendWorkspaceNotification(
  subject: string,
  message: string,
): Promise<EmailNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRIPOPS_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return {
      status: "unconfigured",
      message: "Email alerts are not configured; set RESEND_API_KEY and TRIPOPS_EMAIL_FROM.",
    };
  }

  try {
    const store = await getStore();
    const organization = await store.getOrganization();
    if (!organization.notificationEmail) {
      return {
        status: "unconfigured",
        message: "Set a workspace notification email in Settings to receive alerts.",
      };
    }

    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: organization.notificationEmail,
      subject: `${organization.name}: ${subject}`,
      text: message,
    });
    if (error) {
      return { status: "failed", message: error.message };
    }
    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Email delivery failed unexpectedly.",
    };
  }
}
