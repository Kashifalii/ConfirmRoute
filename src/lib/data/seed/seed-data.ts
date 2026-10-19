import { DEMO_ORGANIZATION_ID, DEMO_ORGANIZATION_NAME } from "@/lib/config";
import type {
  Booking,
  BookingChange,
  BookingDocument,
  BookingException,
  Customer,
  Organization,
  Supplier,
} from "@/types/domain";

/**
 * The complete fictional dataset used to seed demo mode. All identifiers are
 * fixed UUIDs and all timestamps are fixed ISO strings so that seeding is
 * fully reproducible and a demo reset restores the exact same state.
 */
export interface DemoDatabase {
  organization: Organization;
  customers: Customer[];
  suppliers: Supplier[];
  bookings: Booking[];
  documents: BookingDocument[];
  exceptions: BookingException[];
  changes: BookingChange[];
}

const ORG = DEMO_ORGANIZATION_ID;

function customer(index: number, name: string): Customer {
  return {
    id: `a1b2c3d4-0000-4000-8000-00000000c00${index}`,
    organizationId: ORG,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    phone: `+92 300 5550${100 + index}`,
    createdAt: `2026-09-1${(index % 9) + 1}T09:00:00.000Z`,
  };
}

function supplier(
  index: number,
  name: string,
  serviceType: Supplier["serviceType"],
): Supplier {
  return {
    id: `a1b2c3d4-0000-4000-8000-00000000s00${index}`,
    organizationId: ORG,
    name,
    serviceType,
    createdAt: `2026-09-0${index}T08:30:00.000Z`,
  };
}

function booking(input: {
  index: number;
  reference: string;
  customerId: string;
  supplierId: string;
  serviceType: Booking["serviceType"];
  startDate: string;
  endDate: string | null;
  amount: number | null;
  currency: Booking["currency"];
  status: Booking["status"];
  notes?: string;
  createdAt: string;
}): Booking {
  const { index, ...rest } = input;
  return {
    id: `a1b2c3d4-0000-4000-8000-00000000b0${String(index).padStart(2, "0")}`,
    organizationId: ORG,
    normalizedReference: input.reference.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    ...rest,
    notes: input.notes ?? null,
    updatedAt: input.createdAt,
  };
}

const CUSTOMERS: Customer[] = [
  customer(1, "Ahmed Khan"),
  customer(2, "Fatima Raza"),
  customer(3, "Bilal Sheikh"),
  customer(4, "Ayesha Malik"),
  customer(5, "Usman Tariq"),
  customer(6, "Hira Qureshi"),
  customer(7, "Daniyal Hussain"),
  customer(8, "Sana Iqbal"),
];

const SUPPLIERS: Supplier[] = [
  supplier(1, "Mountain View Resort", "hotel"),
  supplier(2, "SkyWing Airlines", "flight"),
  supplier(3, "Silk Route Tours", "tour"),
  supplier(4, "Coastal Pearl Hotels", "hotel"),
  supplier(5, "Indus Car Services", "transfer"),
  supplier(6, "Thar Desert Safaris", "tour"),
];

const C = (index: number) => CUSTOMERS[index - 1];
const S = (index: number) => SUPPLIERS[index - 1];

const BOOKINGS: Booking[] = [
  booking({
    index: 1,
    reference: "MVR-1025",
    customerId: C(1).id,
    supplierId: S(1).id,
    serviceType: "hotel",
    startDate: "2026-11-15",
    endDate: "2026-11-18",
    amount: 75000,
    currency: "PKR",
    status: "pending_review",
    notes: "Mountain-view room requested. Confirmation received by email.",
    createdAt: "2026-10-06T10:12:00.000Z",
  }),
  booking({
    index: 2,
    reference: "SWA-8842",
    customerId: C(2).id,
    supplierId: S(2).id,
    serviceType: "flight",
    startDate: "2026-12-01",
    endDate: "2026-12-07",
    amount: 132500,
    currency: "PKR",
    status: "approved",
    notes: "Islamabad – Dubai return, economy class.",
    createdAt: "2026-09-28T08:40:00.000Z",
  }),
  booking({
    index: 3,
    reference: "HGD-2091",
    customerId: C(3).id,
    supplierId: S(4).id,
    serviceType: "hotel",
    startDate: "2026-10-20",
    endDate: null,
    amount: 58000,
    currency: "PKR",
    status: "pending_review",
    notes: "Confirmation lists the arrival date but the departure date is missing.",
    createdAt: "2026-10-09T14:05:00.000Z",
  }),
  booking({
    index: 4,
    reference: "TRS-5510",
    customerId: C(4).id,
    supplierId: S(6).id,
    serviceType: "tour",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    amount: 44000,
    currency: "PKR",
    status: "approved",
    createdAt: "2026-09-21T11:20:00.000Z",
  }),
  booking({
    index: 5,
    reference: "ICS-3377",
    customerId: C(5).id,
    supplierId: S(5).id,
    serviceType: "transfer",
    startDate: "2026-10-18",
    endDate: "2026-10-18",
    amount: 12500,
    currency: "PKR",
    status: "approved",
    notes: "Airport pickup, sedan.",
    createdAt: "2026-10-01T09:15:00.000Z",
  }),
  booking({
    index: 6,
    reference: "MVR-1038",
    customerId: C(6).id,
    supplierId: S(1).id,
    serviceType: "hotel",
    startDate: "2026-12-10",
    endDate: "2026-12-14",
    amount: 82000,
    currency: "PKR",
    status: "pending_review",
    notes: "Amended confirmation received with a new total.",
    createdAt: "2026-10-04T16:45:00.000Z",
  }),
  booking({
    index: 7,
    reference: "SWA-8901",
    customerId: C(7).id,
    supplierId: S(2).id,
    serviceType: "flight",
    startDate: "2026-11-22",
    endDate: "2026-11-28",
    amount: 940,
    currency: "USD",
    status: "approved",
    createdAt: "2026-09-25T13:30:00.000Z",
  }),
  booking({
    index: 8,
    reference: "TRS-5564",
    customerId: C(8).id,
    supplierId: S(6).id,
    serviceType: "tour",
    startDate: "2026-10-25",
    endDate: "2026-10-29",
    amount: 39500,
    currency: "PKR",
    status: "archived",
    notes: "Trip cancelled by the customer; kept for reference.",
    createdAt: "2026-09-18T10:00:00.000Z",
  }),
  booking({
    index: 9,
    reference: "HGD-2140",
    customerId: C(1).id,
    supplierId: S(4).id,
    serviceType: "hotel",
    startDate: "2027-01-05",
    endDate: "2027-01-09",
    amount: 65000,
    currency: "PKR",
    status: "pending_review",
    createdAt: "2026-10-11T09:50:00.000Z",
  }),
  booking({
    index: 10,
    reference: "ICS-3402",
    customerId: C(2).id,
    supplierId: S(5).id,
    serviceType: "transfer",
    startDate: "2026-11-30",
    endDate: "2026-11-30",
    amount: 350,
    currency: "AED",
    status: "approved",
    notes: "Dubai airport transfer for the December trip.",
    createdAt: "2026-10-03T12:10:00.000Z",
  }),
  booking({
    index: 11,
    reference: "SRT-7204",
    customerId: C(3).id,
    supplierId: S(3).id,
    serviceType: "tour",
    startDate: "2026-12-18",
    endDate: "2026-12-22",
    amount: 1250,
    currency: "EUR",
    status: "approved",
    createdAt: "2026-09-30T15:25:00.000Z",
  }),
  booking({
    index: 12,
    reference: "trs 5510",
    customerId: C(5).id,
    supplierId: S(6).id,
    serviceType: "tour",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    amount: 41000,
    currency: "PKR",
    status: "pending_review",
    notes: "Received from a second sales contact; reference looks like an existing booking.",
    createdAt: "2026-10-12T17:35:00.000Z",
  }),
];

const EXCEPTIONS: BookingException[] = [
  {
    id: "a1b2c3d4-0000-4000-8000-00000000e001",
    organizationId: ORG,
    bookingId: BOOKINGS[2].id,
    type: "missing_field",
    field: "endDate",
    description:
      "The confirmation does not include a departure date. Add the end date before approving this booking.",
    previousValue: null,
    newValue: null,
    status: "open",
    resolutionNote: null,
    resolvedAt: null,
    createdAt: "2026-10-09T14:06:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000e002",
    organizationId: ORG,
    bookingId: BOOKINGS[5].id,
    type: "value_change",
    field: "amount",
    description:
      "The amended confirmation lists PKR 82,000 while the booking previously recorded PKR 78,000 — a difference of PKR 4,000. Review and confirm the new amount.",
    previousValue: "78000",
    newValue: "82000",
    status: "open",
    resolutionNote: null,
    resolvedAt: null,
    createdAt: "2026-10-04T16:50:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000e003",
    organizationId: ORG,
    bookingId: BOOKINGS[11].id,
    type: "duplicate_reference",
    field: "reference",
    description:
      "Reference 'trs 5510' matches the normalized reference of an existing booking (TRS-5510, Thar Desert Safaris tour). Confirm whether this is a separate booking before approving.",
    previousValue: null,
    newValue: "trs 5510",
    status: "open",
    resolutionNote: null,
    resolvedAt: null,
    createdAt: "2026-10-12T17:36:00.000Z",
  },
];

const CHANGES: BookingChange[] = [
  {
    id: "a1b2c3d4-0000-4000-8000-00000000h001",
    bookingId: BOOKINGS[1].id,
    actor: "Kamran Siddiqui",
    field: "status",
    previousValue: "pending_review",
    newValue: "approved",
    reason: "Checked against the e-ticket; all details matched.",
    createdAt: "2026-09-28T09:02:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000h002",
    bookingId: BOOKINGS[3].id,
    actor: "Rabia Anwar",
    field: "status",
    previousValue: "pending_review",
    newValue: "approved",
    reason: "Safari itinerary confirmed with the supplier.",
    createdAt: "2026-09-21T12:00:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000h003",
    bookingId: BOOKINGS[6].id,
    actor: "Kamran Siddiqui",
    field: "travelDates",
    previousValue: "2026-11-20 → 2026-11-26",
    newValue: "2026-11-22 → 2026-11-28",
    reason: "Airline schedule change accepted after guest confirmation.",
    createdAt: "2026-10-05T10:44:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000h004",
    bookingId: BOOKINGS[4].id,
    actor: "Rabia Anwar",
    field: "status",
    previousValue: "pending_review",
    newValue: "approved",
    reason: "Driver and pickup time confirmed.",
    createdAt: "2026-10-01T09:40:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000h005",
    bookingId: BOOKINGS[9].id,
    actor: "Kamran Siddiqui",
    field: "status",
    previousValue: "pending_review",
    newValue: "approved",
    reason: "Transfer voucher verified.",
    createdAt: "2026-10-03T12:30:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000h006",
    bookingId: BOOKINGS[10].id,
    actor: "Rabia Anwar",
    field: "status",
    previousValue: "pending_review",
    newValue: "approved",
    reason: "Tour package and price confirmed.",
    createdAt: "2026-09-30T15:40:00.000Z",
  },
];

const DOCUMENTS: BookingDocument[] = [
  {
    id: "a1b2c3d4-0000-4000-8000-00000000d001",
    organizationId: ORG,
    bookingId: BOOKINGS[0].id,
    filename: "mountain-view-resort-confirmation.pdf",
    mimeType: "application/pdf",
    sizeBytes: 48213,
    storagePath: null,
    downloadUrl: null,
    sourceScenario: null,
    createdAt: "2026-10-06T10:12:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000d002",
    organizationId: ORG,
    bookingId: BOOKINGS[1].id,
    filename: "skywing-eticket.pdf",
    mimeType: "application/pdf",
    sizeBytes: 63740,
    storagePath: null,
    downloadUrl: null,
    sourceScenario: null,
    createdAt: "2026-09-28T08:40:00.000Z",
  },
  {
    id: "a1b2c3d4-0000-4000-8000-00000000d003",
    organizationId: ORG,
    bookingId: BOOKINGS[5].id,
    filename: "mvr-1038-amended-confirmation.pdf",
    mimeType: "application/pdf",
    sizeBytes: 51102,
    storagePath: null,
    downloadUrl: null,
    sourceScenario: null,
    createdAt: "2026-10-04T16:45:00.000Z",
  },
];

export function createSeedDatabase(): DemoDatabase {
  return {
    organization: {
      id: ORG,
      name: DEMO_ORGANIZATION_NAME,
      notificationEmail: null,
      createdAt: "2026-09-15T08:00:00.000Z",
    },
    customers: structuredClone(CUSTOMERS),
    suppliers: structuredClone(SUPPLIERS),
    bookings: structuredClone(BOOKINGS),
    documents: structuredClone(DOCUMENTS),
    exceptions: structuredClone(EXCEPTIONS),
    changes: structuredClone(CHANGES),
  };
}
