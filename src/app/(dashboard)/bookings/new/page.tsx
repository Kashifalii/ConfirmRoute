import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { BookingForm } from "@/components/bookings/booking-form";
import { isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = {
  title: "New booking",
};

export default function NewBookingPage() {
  const mode = isSupabaseConfigured() ? "supabase" : "demo";

  return (
    <>
      <PageHeader
        title="New booking"
        description="Create a booking manually when there is no document to process."
      />
      <ModeBanner mode={mode} />
      <div className="max-w-3xl">
        <BookingForm mode="create" />
      </div>
    </>
  );
}
