import { getStore } from "@/lib/data/get-store";
import type { BookingWithParties, DataStore } from "@/lib/data/store";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import {
  evaluateApprovalEligibility,
  findDuplicateReference,
  formatAmountChange,
  missingRequiredFields,
  normalizeReference,
  resolutionNoteSchema,
} from "@/lib/validation/booking";
import type { BookingFormValues } from "@/lib/validation/booking-form";
import { extractionResultSchema } from "@/lib/validation/extraction";
import type { ExtractionResult } from "@/features/extraction/types";
import type { Booking } from "@/types/domain";

const FIELD_LABELS: Record<string, string> = {
  reference: "booking reference",
  customerName: "customer name",
  supplierName: "supplier name",
  serviceType: "service type",
  startDate: "start date",
  endDate: "end date",
  amount: "cost amount",
  currency: "currency",
  notes: "notes",
  status: "status",
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

async function recordExceptionStatus(
  store: DataStore,
  bookingId: string,
  type: string,
  field: string | null,
  previousValue: string | null,
  newValue: string,
  reason: string,
): Promise<void> {
  await store.recordBookingChange({
    bookingId,
    actor: await store.getActorName(),
    field: `exception:${type}${field ? `:${field}` : ""}`,
    previousValue,
    newValue,
    reason,
  });
}

async function recordBookingCreated(
  store: DataStore,
  booking: BookingWithParties,
): Promise<void> {
  await store.recordBookingChange({
    bookingId: booking.id,
    actor: await store.getActorName(),
    field: "record",
    previousValue: null,
    newValue: booking.reference,
    reason: "Booking created and queued for review.",
  });
}

/** Keeps missing_field exceptions in sync with the booking's current fields. */
async function syncMissingFieldExceptions(
  store: DataStore,
  booking: BookingWithParties,
): Promise<void> {
  const missing = new Set<string>(missingRequiredFields(booking));
  const open = (await store.listExceptions({ bookingId: booking.id, status: "open" })).filter(
    (exception) => exception.type === "missing_field",
  );

  for (const field of missing) {
    if (!open.some((exception) => exception.field === field)) {
      const exception = await store.createException({
        bookingId: booking.id,
        type: "missing_field",
        field,
        description: `The ${FIELD_LABELS[field] ?? field} is missing. Provide it before approving this booking.`,
        previousValue: null,
        newValue: null,
      });
      await recordExceptionStatus(
        store,
        booking.id,
        exception.type,
        exception.field,
        null,
        "open",
        exception.description,
      );
    }
  }

  for (const exception of open) {
    if (!exception.field || !missing.has(exception.field)) {
      const reason = "The field has been provided.";
      await store.autoResolveException(exception.id, reason);
      await recordExceptionStatus(
        store,
        booking.id,
        exception.type,
        exception.field,
        "open",
        "resolved",
        reason,
      );
    }
  }
}

/** Raises or clears the duplicate-reference warning after reference changes. */
async function syncDuplicateException(
  store: DataStore,
  booking: BookingWithParties,
): Promise<void> {
  const all = await store.listBookings();
  const duplicate = findDuplicateReference(booking, all);
  const open = (await store.listExceptions({ bookingId: booking.id, status: "open" })).find(
    (exception) => exception.type === "duplicate_reference",
  );

  if (duplicate && !open) {
    const exception = await store.createException({
      bookingId: booking.id,
      type: "duplicate_reference",
      field: "reference",
      description: `Reference '${booking.reference}' matches the normalized reference of another booking (${duplicate.normalizedReference}). Confirm whether this is a separate booking before approving.`,
      previousValue: null,
      newValue: booking.reference,
    });
    await recordExceptionStatus(
      store,
      booking.id,
      exception.type,
      exception.field,
      null,
      "open",
      exception.description,
    );
  } else if (!duplicate && open) {
    const reason = "The reference was changed and no longer conflicts with another booking.";
    await store.autoResolveException(open.id, reason);
    await recordExceptionStatus(
      store,
      booking.id,
      open.type,
      open.field,
      "open",
      "resolved",
      reason,
    );
  }
}

export interface ApplyIntakeInput {
  result: ExtractionResult;
  document?: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sourceScenario: string | null;
  } | null;
}

export type ApplyIntakeOutcome =
  | { outcome: "created"; bookingId: string }
  | { outcome: "amendment"; bookingId: string }
  | { outcome: "duplicate"; bookingId: string }
  | { outcome: "rejected"; message: string };

/**
 * Applies a (mock) extraction result to the database:
 * - known reference + same customer  -> amendment review of the existing booking
 * - known reference + other customer -> new booking flagged as a duplicate
 * - unknown reference               -> new pending_review booking
 * Missing required fields raise missing_field exceptions automatically.
 */
export async function applyIntakeResult(
  input: ApplyIntakeInput,
): Promise<ApplyIntakeOutcome> {
  const parsed = extractionResultSchema.parse(input.result);
  const data = parsed.data;
  const store = await getStore();

  if (!data.reference?.trim()) {
    return {
      outcome: "rejected",
      message:
        "The extraction did not include a booking reference, so no record can be created automatically. Enter the booking manually.",
    };
  }

  const normalized = normalizeReference(data.reference);
  const existing = (await store.listBookings()).find(
    (booking) =>
      booking.status !== "archived" && booking.normalizedReference === normalized,
  );

  if (existing && data.customerName && normalizeName(data.customerName) === normalizeName(existing.customerName)) {
    // Amendment for an existing booking: compare values, never overwrite silently.
    if (
      existing.amount != null &&
      data.amount != null &&
      data.currency != null &&
      existing.currency === data.currency &&
      data.amount !== existing.amount
    ) {
      const { difference } = formatAmountChange(existing.amount, data.amount);
      const alreadyFlagged = (await store.listExceptions({ bookingId: existing.id, status: "open" })).some(
        (exception) => exception.type === "value_change" && exception.field === "amount",
      );
      if (!alreadyFlagged) {
        const exception = await store.createException({
          bookingId: existing.id,
          type: "value_change",
          field: "amount",
          description: `The amended confirmation proposes ${formatMoney(data.amount, data.currency)}, previously recorded ${formatMoney(existing.amount, existing.currency ?? data.currency)} — a difference of ${formatSignedMoney(difference, data.currency)}. Review and confirm the new amount before approving.`,
          previousValue: String(existing.amount),
          newValue: String(data.amount),
        });
        await recordExceptionStatus(
          store,
          existing.id,
          exception.type,
          exception.field,
          null,
          "open",
          exception.description,
        );
      }
    }
    if (input.document) {
      await store.addDocument({
        bookingId: existing.id,
        ...input.document,
      });
    }
    return { outcome: "amendment", bookingId: existing.id };
  }

  if (!data.customerName?.trim() || !data.supplierName?.trim() || !data.serviceType || !data.startDate) {
    return {
      outcome: "rejected",
      message:
        "The extraction is missing core details (customer, supplier, service type, or start date), so no record can be created automatically. Enter the booking manually.",
    };
  }

  const created = await store.createBooking({
    reference: data.reference.trim(),
    customerName: data.customerName,
    supplierName: data.supplierName,
    serviceType: data.serviceType,
    startDate: data.startDate,
    endDate: data.endDate,
    amount: data.amount,
    currency: data.currency,
    status: "pending_review",
    notes: null,
  });
  await recordBookingCreated(store, created);

  if (input.document) {
    await store.addDocument({ bookingId: created.id, ...input.document });
  }

  await syncMissingFieldExceptions(store, created);
  await syncDuplicateException(store, created);

  return { outcome: existing ? "duplicate" : "created", bookingId: created.id };
}

export async function createManualBooking(
  values: BookingFormValues,
  document?: ApplyIntakeInput["document"],
): Promise<BookingWithParties> {
  const store = await getStore();
  const created = await store.createBooking({
    reference: values.reference,
    customerName: values.customerName,
    supplierName: values.supplierName,
    serviceType: values.serviceType,
    startDate: values.startDate,
    endDate: values.endDate ?? null,
    amount: values.amount ?? null,
    currency: values.currency ?? null,
    status: "pending_review",
    notes: values.notes || null,
  });
  await recordBookingCreated(store, created);
  if (document) {
    await store.addDocument({ bookingId: created.id, ...document });
  }
  await syncMissingFieldExceptions(store, created);
  await syncDuplicateException(store, created);
  return created;
}

/**
 * Saves edits to a booking. Every changed field is recorded in the change
 * history so previous values (e.g. an amended price) are never lost.
 */
export async function saveBookingEdits(
  bookingId: string,
  values: BookingFormValues,
): Promise<BookingWithParties | null> {
  const store = await getStore();
  const current = await store.getBooking(bookingId);
  if (!current) return null;
  if (current.status === "archived") {
    throw new Error("Archived bookings cannot be edited.");
  }

  const actor = await store.getActorName();
  const comparable: Array<keyof BookingFormValues> = [
    "reference",
    "customerName",
    "supplierName",
    "serviceType",
    "startDate",
    "endDate",
    "amount",
    "currency",
    "notes",
  ];

  const before: Record<string, unknown> = {
    reference: current.reference,
    customerName: current.customerName,
    supplierName: current.supplierName,
    serviceType: current.serviceType,
    startDate: current.startDate,
    endDate: current.endDate,
    amount: current.amount,
    currency: current.currency,
    notes: current.notes,
  };

  const updated = await store.updateBooking(bookingId, {
    reference: values.reference,
    customerName: values.customerName,
    supplierName: values.supplierName,
    serviceType: values.serviceType,
    startDate: values.startDate,
    endDate: values.endDate ?? null,
    amount: values.amount ?? null,
    currency: values.currency ?? null,
    notes: values.notes || null,
  });
  if (!updated) return null;

  for (const field of comparable) {
    const previous = before[field] ?? null;
    const next = values[field] ?? null;
    if (String(previous ?? "") !== String(next ?? "")) {
      const format = (value: unknown): string | null => {
        if (value == null || value === "") return null;
        if (field === "amount" && typeof value === "number" && updated.currency) {
          return formatMoney(value, updated.currency);
        }
        return String(value);
      };
      await store.recordBookingChange({
        bookingId,
        actor,
        field,
        previousValue: format(previous),
        newValue: format(next),
        reason: "Updated during review.",
      });
    }
  }

  await syncMissingFieldExceptions(store, updated);
  await syncDuplicateException(store, updated);
  return updated;
}

export type ApprovalResult =
  | { ok: true; booking: BookingWithParties }
  | { ok: false; reasons: string[] };

/**
 * Approves a booking only when every required field is present, dates are
 * ordered, and no exception remains open on the record.
 */
export async function approveBooking(bookingId: string): Promise<ApprovalResult> {
  const store = await getStore();
  const booking = await store.getBooking(bookingId);
  if (!booking) return { ok: false, reasons: ["Booking not found."] };
  if (booking.status === "archived") {
    return { ok: false, reasons: ["Archived bookings cannot be approved."] };
  }
  if (booking.status === "approved") {
    return { ok: false, reasons: ["This booking is already approved."] };
  }

  const openExceptions = await store.listExceptions({ bookingId, status: "open" });
  const eligibility = evaluateApprovalEligibility(booking, openExceptions);
  if (!eligibility.eligible) return { ok: false, reasons: eligibility.reasons };

  const updated = await store.setBookingStatus(bookingId, "approved");
  if (!updated) return { ok: false, reasons: ["Booking not found."] };
  await store.recordBookingChange({
    bookingId,
    actor: await store.getActorName(),
    field: "status",
    previousValue: "pending_review",
    newValue: "approved",
    reason: "Approved after review.",
  });
  return { ok: true, booking: updated };
}

export async function archiveBooking(bookingId: string): Promise<BookingWithParties | null> {
  const store = await getStore();
  const booking = await store.getBooking(bookingId);
  if (!booking || booking.status === "archived") return null;
  const updated = await store.setBookingStatus(bookingId, "archived");
  await store.recordBookingChange({
    bookingId,
    actor: await store.getActorName(),
    field: "status",
    previousValue: booking.status,
    newValue: "archived",
    reason: "Archived by operator.",
  });
  return updated;
}

export type ResolveResult =
  | { ok: true; bookingId: string }
  | { ok: false; message: string };

export async function resolveExceptionWithNote(
  exceptionId: string,
  note: string,
): Promise<ResolveResult> {
  const parsed = resolutionNoteSchema.safeParse(note);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid resolution note." };
  }
  const store = await getStore();
  const exception = await store.getException(exceptionId);
  if (!exception) return { ok: false, message: "Exception not found." };
  if (exception.status === "resolved") {
    return { ok: false, message: "This exception is already resolved." };
  }
  await store.resolveException(exceptionId, parsed.data);
  await recordExceptionStatus(
    store,
    exception.bookingId,
    exception.type,
    exception.field,
    "open",
    "resolved",
    parsed.data,
  );
  return { ok: true, bookingId: exception.bookingId };
}

/**
 * Accepts a proposed amendment: applies the new value to the booking,
 * records the change history, and resolves the value_change exception.
 */
export async function acceptAmendment(
  exceptionId: string,
): Promise<ResolveResult> {
  const store = await getStore();
  const exception = await store.getException(exceptionId);
  if (!exception) return { ok: false, message: "Exception not found." };
  if (exception.type !== "value_change") {
    return { ok: false, message: "Only value-change exceptions can be accepted as amendments." };
  }
  if (exception.status === "resolved") {
    return { ok: false, message: "This amendment has already been handled." };
  }

  const booking = await store.getBooking(exception.bookingId);
  if (!booking) return { ok: false, message: "Booking not found." };

  const field = exception.field ?? "amount";
  const newValue = exception.newValue;

  if (field === "amount" && newValue != null) {
    const nextAmount = Number(newValue);
    const currency = booking.currency;
    await store.updateBooking(exception.bookingId, { amount: nextAmount });
    await store.recordBookingChange({
      bookingId: exception.bookingId,
      actor: await store.getActorName(),
      field: "amount",
      previousValue:
        booking.amount != null && currency
          ? formatMoney(booking.amount, currency)
          : booking.amount != null
            ? String(booking.amount)
            : null,
      newValue: currency ? formatMoney(nextAmount, currency) : newValue,
      reason: "Amended amount accepted after review.",
    });
  }

  await store.resolveException(
    exceptionId,
    `Amendment accepted — ${FIELD_LABELS[field] ?? field} updated to ${newValue ?? "the proposed value"}.`,
  );
  await recordExceptionStatus(
    store,
    exception.bookingId,
    exception.type,
    exception.field,
    "open",
    "resolved",
    `Amendment accepted — ${FIELD_LABELS[field] ?? field} updated to ${newValue ?? "the proposed value"}.`,
  );
  return { ok: true, bookingId: exception.bookingId };
}

export async function resetDemoData(): Promise<void> {
  const store = await getStore();
  if (store.mode !== "demo") {
    throw new Error("Reset is only available in demo mode.");
  }
  await store.resetDemoData();
}

export type { Booking };
