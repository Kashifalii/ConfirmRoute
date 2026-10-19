"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/data/get-store";

export type NotificationEmailActionResult =
  | { ok: true; email: string | null }
  | { ok: false; message: string };

const emailSchema = z.union([z.literal(""), z.string().trim().email()]);

export async function updateNotificationEmailAction(
  value: string,
): Promise<NotificationEmailActionResult> {
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email address or leave the field empty." };
  }

  try {
    const store = await getStore();
    if (store.mode !== "supabase") {
      return { ok: false, message: "Notification settings require Supabase workspace mode." };
    }
    const organization = await store.updateOrganizationNotificationEmail(
      parsed.data || null,
    );
    revalidatePath("/settings");
    return { ok: true, email: organization.notificationEmail };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the workspace notification email.",
    };
  }
}
