import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getBookingDetailData } from "@/lib/data/queries";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { BookingStatusBadge } from "@/components/bookings/status-badges";
import { BookingDetailsCard } from "@/components/bookings/booking-details-card";
import { ApprovalPanel } from "@/components/bookings/approval-panel";
import { ExceptionsSection } from "@/components/bookings/exceptions-section";
import { ChangeHistory } from "@/components/bookings/change-history";
import { DocumentsList } from "@/components/bookings/documents-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type Props = PageProps<"/bookings/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getBookingDetailData(id);
  return {
    title: data ? data.booking.reference : "Booking not found",
  };
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getBookingDetailData(id);
  if (!data) notFound();

  const { mode, booking, exceptions, changes, documents, approval } = data;

  return (
    <>
      <PageHeader
        title={booking.reference}
        description={`Booking for ${booking.customerName} · ${booking.supplierName}`}
        actions={
          <>
            <BookingStatusBadge status={booking.status} className="h-8 px-3 text-xs" />
            {booking.status !== "archived" ? (
              <Button variant="outline" asChild>
                <Link href={`/bookings/${booking.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <ModeBanner mode={mode} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <BookingDetailsCard booking={booking} />
          <ExceptionsSection exceptions={exceptions} />
          <ChangeHistory changes={changes} />
        </div>
        <div className="space-y-4">
          <ApprovalPanel
            bookingId={booking.id}
            status={booking.status}
            eligibility={approval}
          />
          <DocumentsList documents={documents} mode={mode} />
          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Created {formatDateTime(booking.createdAt)}</p>
              <p>Last updated {formatDateTime(booking.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
