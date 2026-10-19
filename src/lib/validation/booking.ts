import { z } from "zod";
import {
  BOOKING_STATUSES,
  CURRENCIES,
  SERVICE_TYPES,
  type Booking,
  type BookingException,
  type CurrencyCode,
  type RequiredBookingField,
} from "@/types/domain";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateSchema = z
  .string()
  .regex(DATE_PATTERN, "Use the YYYY-MM-DD date format");

export const currencySchema = z.enum(CURRENCIES);

/**
 * Shape of a persisted booking. Fields that can be legitimately missing while
 * a record is pending review are nullable here; `bookingApprovalSchema` is
 * what enforces completeness.
 */
export const bookingSchema = z.object({
  reference: z.string().trim().min(1, "Booking reference is required").max(60, "Booking reference is too long"),
  customerName: z.string().trim().min(2, "Customer name is required").max(120),
  supplierName: z.string().trim().min(2, "Supplier name is required").max(160),
  serviceType: z.enum(SERVICE_TYPES, { message: "Select a service type" }),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullable(),
  amount: z
    .number("Enter the cost amount")
    .positive("Amount must be greater than zero")
    .max(99_999_999, "Amount is unrealistically large")
    .nullable(),
  currency: currencySchema.nullable(),
  status: z.enum(BOOKING_STATUSES),
  notes: z.string().trim().max(2000, "Notes are too long").nullable(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const bookingDraftSchema = bookingSchema
  .extend({
    reference: z.string().trim().max(60).nullable(),
    customerName: z.string().trim().max(120).nullable(),
    supplierName: z.string().trim().max(160).nullable(),
    serviceType: z.enum(SERVICE_TYPES).nullable(),
    startDate: isoDateSchema.nullable(),
    amount: z.number().positive().max(99_999_999).nullable(),
  })
  .omit({ status: true, notes: true });

export type BookingDraftInput = z.infer<typeof bookingDraftSchema>;

export const resolutionNoteSchema = z
  .string()
  .trim()
  .min(3, "Add a short resolution note")
  .max(500, "Keep the resolution note under 500 characters");

/** Uppercase and strip separators so "mvr 1025", "MVR-1025" and "MVR1025" compare equal. */
export function normalizeReference(reference: string): string {
  return reference.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function datesInOrder(startDate: string, endDate: string): boolean {
  return isValidIsoDate(startDate) && isValidIsoDate(endDate) && endDate >= startDate;
}

export function formatAmountChange(
  previousAmount: number,
  newAmount: number,
): { difference: number; direction: "increase" | "decrease" } {
  const difference = Math.round((newAmount - previousAmount) * 100) / 100;
  return {
    difference,
    direction: difference >= 0 ? "increase" : "decrease",
  };
}

/** Returns the names of required fields that are missing or empty on a booking. */
export function missingRequiredFields(booking: {
  reference: string;
  customerName: string;
  supplierName: string;
  serviceType: Booking["serviceType"] | null;
  startDate: string;
  endDate: string | null;
  amount: number | null;
  currency: CurrencyCode | null;
}): RequiredBookingField[] {
  const missing: RequiredBookingField[] = [];
  if (!booking.reference?.trim()) missing.push("reference");
  if (!booking.customerName?.trim()) missing.push("customerName");
  if (!booking.supplierName?.trim()) missing.push("supplierName");
  if (!booking.serviceType) missing.push("serviceType");
  if (!booking.startDate) missing.push("startDate");
  if (!booking.endDate) missing.push("endDate");
  if (booking.amount == null) missing.push("amount");
  if (!booking.currency) missing.push("currency");
  return missing;
}

export interface DuplicateCandidate {
  id: string;
  normalizedReference: string;
  status: Booking["status"];
}

/**
 * Finds another non-archived booking in the same organization that shares a
 * normalized booking reference. Used to raise a duplicate_reference warning.
 */
export function findDuplicateReference(
  candidate: { id: string; normalizedReference: string },
  existing: DuplicateCandidate[],
): DuplicateCandidate | null {
  return (
    existing.find(
      (booking) =>
        booking.id !== candidate.id &&
        booking.status !== "archived" &&
        booking.normalizedReference === candidate.normalizedReference,
    ) ?? null
  );
}

export interface ApprovalEligibility {
  eligible: boolean;
  reasons: string[];
}

/**
 * A booking can be approved only when every required field is present, dates
 * are ordered, and no exception is still open on the record. An open
 * discrepancy is never treated as verified.
 */
export function evaluateApprovalEligibility(
  booking: Parameters<typeof missingRequiredFields>[0],
  openExceptions: Pick<BookingException, "type" | "field" | "description">[],
): ApprovalEligibility {
  const reasons: string[] = [];

  for (const field of missingRequiredFields(booking)) {
    reasons.push(`Missing required information: ${field}.`);
  }

  if (booking.startDate && booking.endDate && !datesInOrder(booking.startDate, booking.endDate)) {
    reasons.push("End date is earlier than the start date.");
  }

  if (booking.amount != null && booking.amount <= 0) {
    reasons.push("Amount must be greater than zero.");
  }

  if (openExceptions.length > 0) {
    reasons.push(
      `${openExceptions.length} open exception${openExceptions.length === 1 ? "" : "s"} must be resolved first.`,
    );
  }

  return { eligible: reasons.length === 0, reasons };
}
