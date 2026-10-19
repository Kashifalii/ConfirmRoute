import type {
  Booking,
  BookingChange,
  BookingDocument,
  BookingException,
  BookingStatus,
  Customer,
  ExceptionStatus,
  Organization,
  Supplier,
} from "@/types/domain";
import type { DemoDatabase } from "./seed/seed-data";

export interface BookingWithParties extends Booking {
  customerName: string;
  supplierName: string;
}

export interface ExceptionWithBooking extends BookingException {
  bookingReference: string;
}

export interface ActivityItem extends BookingChange {
  bookingReference: string;
}

export interface DashboardMetrics {
  totalBookings: number;
  pendingReview: number;
  approved: number;
  archived: number;
  openExceptions: number;
}

export interface BookingFilter {
  status?: BookingStatus;
  /** Free-text query matched against customer, supplier, and reference. */
  query?: string;
}

export interface NewBookingRecord {
  reference: string;
  customerName: string;
  supplierName: string;
  serviceType: Booking["serviceType"];
  startDate: string;
  endDate: string | null;
  amount: number | null;
  currency: Booking["currency"];
  status: BookingStatus;
  notes: string | null;
}

export interface NewExceptionRecord {
  bookingId: string;
  type: BookingException["type"];
  field: string | null;
  description: string;
  previousValue: string | null;
  newValue: string | null;
}

export interface NewDocumentRecord {
  bookingId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sourceScenario: string | null;
  storagePath?: string | null;
}

/**
 * Persistence contract shared by the demo store and the Supabase store.
 * All methods are server-side only; the UI never talks to storage directly.
 */
export interface DataStore {
  readonly mode: "demo" | "supabase";

  getOrganization(): Promise<Organization>;
  updateOrganizationNotificationEmail(email: string | null): Promise<Organization>;
  getActorName(): Promise<string>;

  listBookings(filter?: BookingFilter): Promise<BookingWithParties[]>;
  getBooking(id: string): Promise<BookingWithParties | null>;
  createBooking(record: NewBookingRecord): Promise<BookingWithParties>;
  updateBooking(
    id: string,
    patch: Partial<Omit<NewBookingRecord, "status">>,
  ): Promise<BookingWithParties | null>;
  setBookingStatus(
    id: string,
    status: BookingStatus,
  ): Promise<BookingWithParties | null>;

  listExceptions(filter?: {
    status?: ExceptionStatus;
    bookingId?: string;
  }): Promise<ExceptionWithBooking[]>;
  getException(id: string): Promise<BookingException | null>;
  createException(record: NewExceptionRecord): Promise<BookingException>;
  resolveException(
    id: string,
    resolutionNote: string,
  ): Promise<BookingException | null>;
  /** Used when an exception becomes obsolete (e.g. duplicate reference edited away). */
  autoResolveException(id: string, note: string): Promise<void>;
  deleteExceptionsWhere(predicate: {
    bookingId: string;
    type: BookingException["type"];
    field: string | null;
  }): Promise<void>;

  listBookingChanges(bookingId: string): Promise<BookingChange[]>;
  recordBookingChange(change: {
    bookingId: string;
    actor: string;
    field: string;
    previousValue: string | null;
    newValue: string | null;
    reason: string | null;
  }): Promise<BookingChange>;
  listRecentActivity(limit: number): Promise<ActivityItem[]>;

  listDocuments(bookingId: string): Promise<BookingDocument[]>;
  addDocument(record: NewDocumentRecord): Promise<BookingDocument>;
  uploadBookingFile(
    bookingId: string,
    filename: string,
    bytes: Uint8Array,
  ): Promise<string>;
  deleteStoredDocument(storagePath: string): Promise<void>;

  getDashboardMetrics(): Promise<DashboardMetrics>;

  findOrCreateCustomer(name: string): Promise<Customer>;
  findOrCreateSupplier(
    name: string,
    serviceType: Supplier["serviceType"],
  ): Promise<Supplier>;

  /** Demo-only: restores the fictional seed state. */
  resetDemoData(): Promise<void>;
}

export type { DemoDatabase };
