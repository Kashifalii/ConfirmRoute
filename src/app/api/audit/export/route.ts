import { connection } from "next/server";
import { getStore } from "@/lib/data/get-store";
import { WorkspaceAuthenticationError } from "@/lib/data/errors";

function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  await connection();

  let store;
  try {
    store = await getStore();
  } catch (error) {
    if (error instanceof WorkspaceAuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not authorize the audit export.", error);
    return Response.json({ error: "Could not export workspace history." }, { status: 500 });
  }

  try {
    const bookings = await store.listBookings();
    const changes = await Promise.all(
      bookings.map(async (booking) => ({
        booking,
        changes: await store.listBookingChanges(booking.id),
        exceptions: await store.listExceptions({ bookingId: booking.id }),
      })),
    );
    const rows: Array<Array<string | number | null>> = [[
      "event_type",
      "booking_reference",
      "timestamp",
      "actor",
      "field",
      "previous_value",
      "new_value",
      "reason",
    ]];

    for (const { booking, changes: bookingChanges, exceptions } of changes) {
      for (const change of bookingChanges) {
        rows.push([
          "booking_change",
          booking.reference,
          change.createdAt,
          change.actor,
          change.field,
          change.previousValue,
          change.newValue,
          change.reason,
        ]);
      }
      for (const exception of exceptions) {
        rows.push([
          "exception_recorded",
          booking.reference,
          exception.createdAt,
          null,
          `${exception.type}${exception.field ? `:${exception.field}` : ""}`,
          exception.previousValue,
          exception.newValue,
          exception.description,
        ]);
        if (exception.status === "resolved" && exception.resolvedAt) {
          rows.push([
            "exception_resolved",
            booking.reference,
            exception.resolvedAt,
            null,
            `${exception.type}${exception.field ? `:${exception.field}` : ""}`,
            "open",
            "resolved",
            exception.resolutionNote,
          ]);
        }
      }
    }

    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="confirmroute-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not generate the audit export.", error);
    return Response.json({ error: "Could not export workspace history." }, { status: 500 });
  }
}
