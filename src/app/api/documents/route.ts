import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/get-store";
import { WorkspaceAuthenticationError } from "@/lib/data/errors";
import { getUploadLimitBytes } from "@/lib/config";

function isPdfSignature(bytes: Uint8Array): boolean {
  const header = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  return header.includes("%PDF-");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const bookingId = formData.get("bookingId");

  if (!(file instanceof File) || typeof bookingId !== "string" || !bookingId.trim()) {
    return NextResponse.json(
      { error: "A PDF file and booking are required." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > getUploadLimitBytes()) {
    return NextResponse.json(
      { error: `The PDF must be between 1 byte and ${getUploadLimitBytes()} bytes.` },
      { status: 413 },
    );
  }

  let store;
  try {
    store = await getStore();
  } catch (error) {
    if (error instanceof WorkspaceAuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not authorize the booking PDF upload.", error);
    return NextResponse.json(
      { error: "Could not authorize this upload." },
      { status: 500 },
    );
  }
  if (store.mode !== "supabase") {
    return NextResponse.json(
      { error: "Private PDF storage is only available with Supabase configured." },
      { status: 503 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfSignature(bytes)) {
    return NextResponse.json(
      { error: "The uploaded file is not a valid PDF." },
      { status: 400 },
    );
  }

  const booking = await store.getBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found in this workspace." }, { status: 404 });
  }

  const filename = file.name.replace(/[\\/\r\n]/g, "_").slice(0, 200) || "booking.pdf";
  let storagePath: string | null = null;
  try {
    storagePath = await store.uploadBookingFile(
      bookingId,
      filename,
      bytes,
    );
    await store.addDocument({
      bookingId,
      filename,
      mimeType: "application/pdf",
      sizeBytes: file.size,
      sourceScenario: null,
      storagePath,
    });
  } catch (error) {
    if (storagePath) {
      try {
        await store.deleteStoredDocument(storagePath);
      } catch (cleanupError) {
        console.error(
          "PDF metadata failed and the uploaded file could not be removed.",
          new AggregateError(
            [error, cleanupError],
            "PDF metadata failed and the uploaded file could not be removed.",
          ),
        );
        return NextResponse.json(
          {
            error:
              "The PDF metadata could not be saved and temporary file cleanup failed. Contact your workspace administrator.",
          },
          { status: 500 },
        );
      }
    }
    console.error("Could not persist the uploaded booking PDF.", error);
    return NextResponse.json(
      { error: "The booking was created, but the PDF could not be stored. Please retry." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
