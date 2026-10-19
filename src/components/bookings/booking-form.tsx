"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createManualBookingAction,
  saveBookingEditsAction,
} from "@/features/bookings/actions";
import {
  bookingFormSchema,
  type BookingFormInput,
  type BookingFormValues,
} from "@/lib/validation/booking-form";
import {
  CURRENCIES,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { showNotificationResult } from "@/components/layout/notification-result";

type FormValues = BookingFormValues;

const EMPTY_VALUES: BookingFormInput = {
  reference: "",
  customerName: "",
  supplierName: "",
  serviceType: "hotel",
  startDate: "",
  endDate: null,
  amount: null,
  currency: null,
  notes: "",
};

function toFormValues(values: Partial<BookingFormInput>): BookingFormInput {
  return {
    ...EMPTY_VALUES,
    ...values,
    notes: values.notes ?? "",
  };
}

export function BookingForm({
  mode,
  bookingId,
  defaultValues,
}: {
  mode: "create" | "edit";
  bookingId?: string;
  defaultValues?: Partial<BookingFormInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormInput, unknown, FormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: toFormValues(defaultValues ?? {}),
  });

  const serviceType = useWatch({ control, name: "serviceType" });
  const currency = useWatch({ control, name: "currency" }) as
    | string
    | null
    | undefined;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    let targetId: string;
    if (mode === "create") {
      const result = await createManualBookingAction(values, undefined);
      if (!result.ok) {
        setServerError(result.message);
        toast.error("Could not create booking", { description: result.message });
        return;
      }
      targetId = result.data.bookingId;
      toast.success("Booking created", {
        description: "The booking is pending review.",
      });
      showNotificationResult(result.data.notification, "Booking created");
    } else {
      const result = await saveBookingEditsAction(bookingId!, values);
      if (!result.ok) {
        setServerError(result.message);
        toast.error("Could not save", { description: result.message });
        return;
      }
      targetId = bookingId!;
      toast.success("Changes saved", {
        description: "Edits are recorded in the change history.",
      });
    }
    router.push(`/bookings/${targetId}`);
  });

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                placeholder="e.g. MVR-1099"
                aria-invalid={!!errors.reference}
                {...register("reference")}
              />
              {errors.reference ? (
                <p className="text-xs text-destructive">{errors.reference.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Supplier confirmation number.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service type</Label>
              <Select
                value={serviceType}
                onValueChange={(value) =>
                  setValue("serviceType", value as FormValues["serviceType"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="serviceType" aria-invalid={!!errors.serviceType}>
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SERVICE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceType ? (
                <p className="text-xs text-destructive">{errors.serviceType.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input
                id="customerName"
                placeholder="e.g. Ahmed Khan"
                aria-invalid={!!errors.customerName}
                {...register("customerName")}
              />
              {errors.customerName ? (
                <p className="text-xs text-destructive">{errors.customerName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier name</Label>
              <Input
                id="supplierName"
                placeholder="e.g. Mountain View Resort"
                aria-invalid={!!errors.supplierName}
                {...register("supplierName")}
              />
              {errors.supplierName ? (
                <p className="text-xs text-destructive">{errors.supplierName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                aria-invalid={!!errors.startDate}
                {...register("startDate")}
              />
              {errors.startDate ? (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                aria-invalid={!!errors.endDate}
                {...register("endDate")}
              />
              {errors.endDate ? (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Optional for single-day services; required before approval.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 88000"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              {errors.amount ? (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Can be left empty if the document is incomplete; required
                  before approval.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currency ?? undefined}
                onValueChange={(value) =>
                  setValue("currency", value as FormValues["currency"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="currency" aria-invalid={!!errors.currency}>
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency ? (
                <p className="text-xs text-destructive">{errors.currency.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Anything worth remembering about this booking"
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? "Create booking" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
