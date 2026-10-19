"use server";

import { revalidatePath } from "next/cache";
import {
  acceptAmendment,
  applyIntakeResult,
  approveBooking,
  archiveBooking,
  createManualBooking,
  resetDemoData,
  resolveExceptionWithNote,
  saveBookingEdits,
  type ApplyIntakeInput,
} from "./service";
import { bookingFormSchema } from "@/lib/validation/booking-form";
import type { BookingFormValues } from "@/lib/validation/booking-form";
import type { BookingWithParties } from "@/lib/data/store";
import {
  sendWorkspaceNotification,
  type EmailNotificationResult,
} from "@/lib/email/notifications";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function revalidateBookingViews(bookingId?: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/exceptions");
  if (bookingId) {
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath(`/bookings/${bookingId}/review`);
    revalidatePath(`/bookings/${bookingId}/edit`);
  }
}

export async function applyIntakeResultAction(
  input: ApplyIntakeInput,
): Promise<ActionResult<{
  bookingId: string;
  outcome: string;
  notification: EmailNotificationResult;
}>> {
  try {
    const outcome = await applyIntakeResult(input);
    if (outcome.outcome === "rejected") {
      return { ok: false, message: outcome.message };
    }
    revalidateBookingViews(outcome.bookingId);
    const notification = await sendWorkspaceNotification(
      "Booking intake needs review",
      `A booking was processed from document intake (${outcome.outcome}). Reference: ${input.result.data.reference ?? "not available"}. Review it in your ConfirmRoute workspace.`,
    );
    return {
      ok: true,
      data: { bookingId: outcome.bookingId, outcome: outcome.outcome, notification },
    };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function createManualBookingAction(
  values: unknown,
  document: ApplyIntakeInput["document"],
): Promise<ActionResult<{ bookingId: string; notification: EmailNotificationResult }>> {
  const parsed = bookingFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please correct the form.",
    };
  }
  try {
    const booking: BookingWithParties = await createManualBooking(
      parsed.data as BookingFormValues,
      document,
    );
    revalidateBookingViews(booking.id);
    const notification = await sendWorkspaceNotification(
      "Booking created",
      `Booking ${booking.reference} was created and is pending review.`,
    );
    return { ok: true, data: { bookingId: booking.id, notification } };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function saveBookingEditsAction(
  bookingId: string,
  values: unknown,
): Promise<ActionResult<null>> {
  const parsed = bookingFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please correct the form.",
    };
  }
  try {
    await saveBookingEdits(bookingId, parsed.data as BookingFormValues);
    revalidateBookingViews(bookingId);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function approveBookingAction(
  bookingId: string,
): Promise<ActionResult<{ notification: EmailNotificationResult }>> {
  try {
    const result = await approveBooking(bookingId);
    if (!result.ok) {
      return { ok: false, message: result.reasons.join(" ") };
    }
    revalidateBookingViews(bookingId);
    const notification = await sendWorkspaceNotification(
      "Booking approved",
      `Booking ${result.booking.reference} was approved after review.`,
    );
    return { ok: true, data: { notification } };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function archiveBookingAction(
  bookingId: string,
): Promise<ActionResult<null>> {
  try {
    const archived = await archiveBooking(bookingId);
    if (!archived) {
      return { ok: false, message: "This booking could not be archived." };
    }
    revalidateBookingViews(bookingId);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function resolveExceptionAction(
  exceptionId: string,
  note: string,
): Promise<ActionResult<{ notification: EmailNotificationResult }>> {
  try {
    const result = await resolveExceptionWithNote(exceptionId, note);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    revalidateBookingViews(result.bookingId);
    const notification = await sendWorkspaceNotification(
      "Exception resolved",
      `An exception was resolved for booking ${result.bookingId}. Note: ${note.trim()}`,
    );
    return { ok: true, data: { notification } };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function acceptAmendmentAction(
  exceptionId: string,
): Promise<ActionResult<{ notification: EmailNotificationResult }>> {
  try {
    const result = await acceptAmendment(exceptionId);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    revalidateBookingViews(result.bookingId);
    const notification = await sendWorkspaceNotification(
      "Booking amendment accepted",
      `An amendment was accepted for booking ${result.bookingId}.`,
    );
    return { ok: true, data: { notification } };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

export async function resetDemoDataAction(): Promise<ActionResult<null>> {
  try {
    await resetDemoData();
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
