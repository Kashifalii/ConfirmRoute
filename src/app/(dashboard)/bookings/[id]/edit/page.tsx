import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBookingDetailData } from "@/lib/data/queries";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { BookingForm } from "@/components/bookings/booking-form";
import { Button } from "@/components/ui/button";

type Props = PageProps<"/bookings/[id]/edit">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getBookingDetailData(id);
  return {
    title: data ? `Edit ${data.booking.reference}` : "Booking not found",
  };
}

export default async function EditBookingPage({ params }: Props) {
  const { id } = await params;
  const data = await getBookingDetailData(id);
  if (!data) notFound();
  if (data.booking.status === "archived") redirect(`/bookings/${id}`);

  const { mode, booking } = data;

  return (
    <>
      <PageHeader
        title={`Edit ${booking.reference}`}
        description="Corrections are recorded in the change history; nothing is silently overwritten."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/bookings/${booking.id}`}>Back to booking</Link>
          </Button>
        }
      />
      <ModeBanner mode={mode} />
      <div className="max-w-3xl">
        <BookingForm
          mode="edit"
          bookingId={booking.id}
          defaultValues={{
            reference: booking.reference,
            customerName: booking.customerName,
            supplierName: booking.supplierName,
            serviceType: booking.serviceType,
            startDate: booking.startDate,
            endDate: booking.endDate,
            amount: booking.amount,
            currency: booking.currency,
            notes: booking.notes ?? "",
          }}
        />
      </div>
    </>
  );
}
