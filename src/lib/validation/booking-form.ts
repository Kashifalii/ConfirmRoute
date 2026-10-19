import { z } from "zod";
import { CURRENCIES, SERVICE_TYPES } from "@/types/domain";
import { isoDateSchema } from "./booking";

const emptyToNull = (value: unknown) =>
  value === "" || value === null || value === undefined ? null : value;

const numberOrNull = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isNaN(value)) return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .number("Enter a valid amount")
    .positive("Amount must be greater than zero")
    .max(99_999_999, "Amount is unrealistically large")
    .nullable(),
);

const optionalText = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return "";
    return value;
  },
  z.string().trim().max(2000, "Notes are too long"),
);

/**
 * Schema shared by the review/edit form and the server actions that receive
 * it. Amount, end date, and currency may be empty while a booking is pending
 * review; approval eligibility is checked separately.
 */
export const bookingFormSchema = z
  .object({
    reference: z
      .string()
      .trim()
      .min(1, "Booking reference is required")
      .max(60, "Booking reference is too long"),
    customerName: z.string().trim().min(2, "Customer name is required").max(120),
    supplierName: z.string().trim().min(2, "Supplier name is required").max(160),
    serviceType: z.enum(SERVICE_TYPES, { message: "Select a service type" }),
    startDate: z.string().trim().min(1, "Start date is required").pipe(isoDateSchema),
    endDate: z.preprocess(emptyToNull, isoDateSchema.nullable()),
    amount: numberOrNull,
    currency: z.preprocess(emptyToNull, z.enum(CURRENCIES).nullable()),
    notes: optionalText,
  })
  .superRefine((values, ctx) => {
    if (values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }
  });

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
/** Raw (pre-preprocess) form input accepted by React Hook Form. */
export type BookingFormInput = z.input<typeof bookingFormSchema>;
