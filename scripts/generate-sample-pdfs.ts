/**
 * Generates the fictional sample PDFs used by the intake demo scenarios.
 * Run with: npm run samples:generate
 *
 * The PDFs are intentionally simple text-based documents; the scanned sample
 * contains no selectable text so the application can demonstrate the
 * "no OCR in this MVP" path honestly.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

const OUT_DIR = path.join(process.cwd(), "public", "samples");

interface DocSpec {
  filename: string;
  heading: string;
  lines: string[];
}

const DOCS: DocSpec[] = [
  {
    filename: "hotel-confirmation-mvr-1099.pdf",
    heading: "Hotel Booking Confirmation",
    lines: [
      "Mountain View Resort, Bhurban Road, Murree",
      "------------------------------------------------------------",
      "",
      "Booking reference: MVR-1099",
      "Guest name: Ahmed Khan",
      "Service type: Hotel accommodation",
      "Room type: Deluxe mountain-view room",
      "Check-in date: 20 December 2026",
      "Check-out date: 24 December 2026",
      "Total cost: PKR 88,000",
      "Payment status: Guaranteed by agency",
      "",
      "This confirmation is a fictional sample document created for the",
      "ConfirmRoute portfolio demo. All names, references, and amounts are",
      "invented and do not relate to any real supplier or guest.",
    ],
  },
  {
    filename: "flight-confirmation-swa-9127.pdf",
    heading: "Flight Itinerary Confirmation",
    lines: [
      "SkyWing Airlines - Fictional Demo Carrier",
      "------------------------------------------------------------",
      "",
      "Booking reference: SWA-9127",
      "Passenger name: Zainab Farooq",
      "Service type: Flight",
      "Route: Lahore (LHE) - Istanbul (IST) - Lahore (LHE)",
      "Departure date: 15 January 2027",
      "Return date: 22 January 2027",
      "Cabin: Economy",
      "",
      "Note: the total cost is not stated on this confirmation.",
      "",
      "This confirmation is a fictional sample document created for the",
      "ConfirmRoute portfolio demo. All names, references, and routes are",
      "invented and do not relate to any real airline or passenger.",
    ],
  },
  {
    filename: "amended-confirmation-mvr-1025.pdf",
    heading: "AMENDED Hotel Booking Confirmation",
    lines: [
      "Mountain View Resort, Bhurban Road, Murree",
      "------------------------------------------------------------",
      "",
      "Booking reference: MVR-1025",
      "Guest name: Ahmed Khan",
      "Service type: Hotel accommodation",
      "Check-in date: 15 November 2026",
      "Check-out date: 18 November 2026",
      "Amended total cost: PKR 82,000",
      "Previous total cost: PKR 75,000",
      "Reason: rate revision for the requested room upgrade",
      "",
      "This amended confirmation replaces the total shown on the",
      "original confirmation for booking MVR-1025.",
      "",
      "This confirmation is a fictional sample document created for the",
      "ConfirmRoute portfolio demo. All names, references, and amounts are",
      "invented and do not relate to any real supplier or guest.",
    ],
  },
  {
    filename: "flight-confirmation-swa-8842.pdf",
    heading: "Flight Itinerary Confirmation",
    lines: [
      "SkyWing Airlines - Fictional Demo Carrier",
      "------------------------------------------------------------",
      "",
      "Booking reference: SWA 8842",
      "Passenger name: Maryam Aslam",
      "Service type: Flight",
      "Route: Karachi (KHI) - Dubai (DXB) - Karachi (KHI)",
      "Departure date: 9 December 2026",
      "Return date: 15 December 2026",
      "Total cost: PKR 96,000",
      "",
      "This confirmation is a fictional sample document created for the",
      "ConfirmRoute portfolio demo. All names, references, and routes are",
      "invented and do not relate to any real airline or passenger.",
    ],
  },
];

async function renderDoc(spec: DocSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page: PDFPage = pdf.addPage([595, 842]); // A4
  const font: PDFFont = await pdf.embedFont(StandardFonts.Helvetica);
  const bold: PDFFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  let y = 786;

  page.drawText(spec.heading, {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0.12, 0.18, 0.33),
  });
  y -= 28;

  for (const line of spec.lines) {
    if (line.length > 0) {
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    }
    y -= 18;
  }

  return pdf.save();
}

/** A page with drawn shapes but no text — simulates a scanned image PDF. */
async function renderScannedDoc(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  page.drawRectangle({
    x: 56,
    y: 90,
    width: 483,
    height: 662,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 0.98),
  });
  // Faux scan noise: a few gray blocks standing in for unreadable content.
  const blocks = [
    { x: 80, y: 640, w: 260, h: 14 },
    { x: 80, y: 610, w: 380, h: 14 },
    { x: 80, y: 580, w: 320, h: 14 },
    { x: 80, y: 550, w: 410, h: 14 },
    { x: 80, y: 520, w: 290, h: 14 },
    { x: 80, y: 470, w: 360, h: 14 },
    { x: 80, y: 440, w: 300, h: 14 },
  ];
  for (const block of blocks) {
    page.drawRectangle({
      x: block.x,
      y: block.y,
      width: block.w,
      height: block.h,
      color: rgb(0.72, 0.74, 0.78),
    });
  }
  return pdf.save();
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  for (const spec of DOCS) {
    await writeFile(path.join(OUT_DIR, spec.filename), await renderDoc(spec));
    console.log(`wrote ${spec.filename}`);
  }

  await writeFile(
    path.join(OUT_DIR, "scanned-confirmation.pdf"),
    await renderScannedDoc(),
  );
  console.log("wrote scanned-confirmation.pdf");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
