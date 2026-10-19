import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDemoDataDir } from "@/lib/config";
import type {
  ActivityItem,
  BookingFilter,
  BookingWithParties,
  DashboardMetrics,
  DataStore,
  ExceptionWithBooking,
  NewBookingRecord,
  NewDocumentRecord,
  NewExceptionRecord,
} from "./store";
import { createSeedDatabase, type DemoDatabase } from "./seed/seed-data";
import type {
  Booking,
  BookingDocument,
  BookingException,
  BookingStatus,
  Customer,
  Supplier,
} from "@/types/domain";
import { normalizeReference } from "@/lib/validation/booking";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * File-backed store used in demo mode. Data lives in `.demo-data/db.json`
 * (gitignored) and is seeded from the fictional dataset on first use. This is
 * explicitly NOT a database — the UI labels demo-mode persistence honestly.
 */
class DemoDataStore implements DataStore {
  readonly mode = "demo" as const;

  private db: DemoDatabase | null = null;
  private readonly file: string;

  constructor() {
    const dir = getDemoDataDir();
    const base = path.isAbsolute(dir)
      ? dir
      : path.join(/* turbopackIgnore: true */ process.cwd(), dir);
    this.file = path.join(base, "db.json");
  }

  private async load(): Promise<DemoDatabase> {
    if (this.db) return this.db;
    try {
      const raw = await readFile(this.file, "utf8");
      this.db = JSON.parse(raw) as DemoDatabase;
      if (this.db.organization.notificationEmail === undefined) {
        this.db.organization.notificationEmail = null;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      this.db = createSeedDatabase();
      await this.persist();
    }
    return this.db;
  }

  private async persist(): Promise<void> {
    const db = await this.load();
    const dir = path.dirname(this.file);
    await mkdir(dir, { recursive: true });
    const temp = `${this.file}.tmp`;
    await writeFile(temp, JSON.stringify(db, null, 2), "utf8");
    await rename(temp, this.file);
  }

  async getOrganization() {
    return (await this.load()).organization;
  }

  async updateOrganizationNotificationEmail(email: string | null) {
    const db = await this.load();
    db.organization.notificationEmail = email;
    await this.persist();
    return db.organization;
  }

  async getActorName(): Promise<string> {
    return process.env.TRIPOPS_ACTOR_NAME?.trim() || "Demo operator";
  }

  private withParties(db: DemoDatabase, booking: Booking): BookingWithParties {
    const customer = db.customers.find((c) => c.id === booking.customerId);
    const supplier = db.suppliers.find((s) => s.id === booking.supplierId);
    return {
      ...booking,
      customerName: customer?.name ?? "Unknown customer",
      supplierName: supplier?.name ?? "Unknown supplier",
    };
  }

  async listBookings(filter?: BookingFilter): Promise<BookingWithParties[]> {
    const db = await this.load();
    const query = filter?.query?.trim().toLowerCase();
    return db.bookings
      .filter((booking) => {
        if (filter?.status && booking.status !== filter.status) return false;
        if (query) {
          const view = this.withParties(db, booking);
          const haystack = `${view.customerName} ${view.supplierName} ${booking.reference}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .map((booking) => this.withParties(db, booking))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBooking(id: string): Promise<BookingWithParties | null> {
    const db = await this.load();
    const booking = db.bookings.find((b) => b.id === id);
    return booking ? this.withParties(db, booking) : null;
  }

  async createBooking(record: NewBookingRecord): Promise<BookingWithParties> {
    const db = await this.load();
    const customer = await this.findOrCreateCustomer(record.customerName);
    const supplier = await this.findOrCreateSupplier(record.supplierName, record.serviceType);
    const timestamp = nowIso();
    const booking: Booking = {
      id: randomUUID(),
      organizationId: db.organization.id,
      reference: record.reference,
      normalizedReference: normalizeReference(record.reference),
      customerId: customer.id,
      supplierId: supplier.id,
      serviceType: record.serviceType,
      startDate: record.startDate,
      endDate: record.endDate,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      notes: record.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.bookings.push(booking);
    await this.persist();
    return this.withParties(db, booking);
  }

  async updateBooking(
    id: string,
    patch: Partial<Omit<NewBookingRecord, "status">>,
  ): Promise<BookingWithParties | null> {
    const db = await this.load();
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) return null;

    if (patch.reference !== undefined && patch.reference !== booking.reference) {
      booking.reference = patch.reference;
      booking.normalizedReference = normalizeReference(patch.reference);
    }
    if (patch.serviceType !== undefined) booking.serviceType = patch.serviceType;
    if (patch.startDate !== undefined) booking.startDate = patch.startDate;
    if (patch.endDate !== undefined) booking.endDate = patch.endDate;
    if (patch.amount !== undefined) booking.amount = patch.amount;
    if (patch.currency !== undefined) booking.currency = patch.currency;
    if (patch.notes !== undefined) booking.notes = patch.notes;
    if (patch.customerName !== undefined) {
      booking.customerId = (await this.findOrCreateCustomer(patch.customerName)).id;
    }
    if (patch.supplierName !== undefined) {
      const serviceType = booking.serviceType;
      booking.supplierId = (await this.findOrCreateSupplier(patch.supplierName, serviceType)).id;
    }
    booking.updatedAt = nowIso();

    await this.persist();
    return this.withParties(db, booking);
  }

  async setBookingStatus(id: string, status: BookingStatus): Promise<BookingWithParties | null> {
    const db = await this.load();
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) return null;
    booking.status = status;
    booking.updatedAt = nowIso();
    await this.persist();
    return this.withParties(db, booking);
  }

  async listExceptions(filter?: {
    status?: BookingException["status"];
    bookingId?: string;
  }): Promise<ExceptionWithBooking[]> {
    const db = await this.load();
    return db.exceptions
      .filter((exception) => {
        if (filter?.status && exception.status !== filter.status) return false;
        if (filter?.bookingId && exception.bookingId !== filter.bookingId) return false;
        return true;
      })
      .map((exception) => ({
        ...exception,
        bookingReference:
          db.bookings.find((b) => b.id === exception.bookingId)?.reference ?? "—",
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getException(id: string): Promise<BookingException | null> {
    const db = await this.load();
    return db.exceptions.find((e) => e.id === id) ?? null;
  }

  async createException(record: NewExceptionRecord): Promise<BookingException> {
    const db = await this.load();
    const exception: BookingException = {
      id: randomUUID(),
      organizationId: db.organization.id,
      bookingId: record.bookingId,
      type: record.type,
      field: record.field,
      description: record.description,
      previousValue: record.previousValue,
      newValue: record.newValue,
      status: "open",
      resolutionNote: null,
      resolvedAt: null,
      createdAt: nowIso(),
    };
    db.exceptions.push(exception);
    await this.persist();
    return exception;
  }

  async resolveException(id: string, resolutionNote: string): Promise<BookingException | null> {
    const db = await this.load();
    const exception = db.exceptions.find((e) => e.id === id);
    if (!exception) return null;
    exception.status = "resolved";
    exception.resolutionNote = resolutionNote;
    exception.resolvedAt = nowIso();
    await this.persist();
    return exception;
  }

  async autoResolveException(id: string, note: string): Promise<void> {
    const db = await this.load();
    const exception = db.exceptions.find((e) => e.id === id);
    if (!exception || exception.status === "resolved") return;
    exception.status = "resolved";
    exception.resolutionNote = note;
    exception.resolvedAt = nowIso();
    await this.persist();
  }

  async deleteExceptionsWhere(predicate: {
    bookingId: string;
    type: BookingException["type"];
    field: string | null;
  }): Promise<void> {
    const db = await this.load();
    db.exceptions = db.exceptions.filter(
      (e) => !(e.bookingId === predicate.bookingId && e.type === predicate.type && e.field === predicate.field),
    );
    await this.persist();
  }

  async listBookingChanges(bookingId: string) {
    const db = await this.load();
    return db.changes
      .filter((change) => change.bookingId === bookingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async recordBookingChange(change: {
    bookingId: string;
    actor: string;
    field: string;
    previousValue: string | null;
    newValue: string | null;
    reason: string | null;
  }) {
    const db = await this.load();
    const entry = {
      id: randomUUID(),
      createdAt: nowIso(),
      ...change,
    };
    db.changes.push(entry);
    await this.persist();
    return entry;
  }

  async listRecentActivity(limit: number): Promise<ActivityItem[]> {
    const db = await this.load();
    return db.changes
      .map((change) => ({
        ...change,
        bookingReference:
          db.bookings.find((b) => b.id === change.bookingId)?.reference ?? "—",
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listDocuments(bookingId: string): Promise<BookingDocument[]> {
    const db = await this.load();
    return db.documents
      .filter((doc) => doc.bookingId === bookingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addDocument(record: NewDocumentRecord): Promise<BookingDocument> {
    const db = await this.load();
    const document: BookingDocument = {
      id: randomUUID(),
      organizationId: db.organization.id,
      bookingId: record.bookingId,
      filename: record.filename,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      storagePath: null,
      downloadUrl: null,
      sourceScenario: record.sourceScenario,
      createdAt: nowIso(),
    };
    db.documents.push(document);
    await this.persist();
    return document;
  }

  async uploadBookingFile(
    _bookingId: string,
    _filename: string,
    _bytes: Uint8Array,
  ): Promise<string> {
    throw new Error("PDF file bytes are not persisted in demo mode.");
  }

  async deleteStoredDocument(_storagePath: string): Promise<void> {
    throw new Error("Stored PDF files are not available in demo mode.");
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const db = await this.load();
    return {
      totalBookings: db.bookings.length,
      pendingReview: db.bookings.filter((b) => b.status === "pending_review").length,
      approved: db.bookings.filter((b) => b.status === "approved").length,
      archived: db.bookings.filter((b) => b.status === "archived").length,
      openExceptions: db.exceptions.filter((e) => e.status === "open").length,
    };
  }

  async findOrCreateCustomer(name: string): Promise<Customer> {
    const db = await this.load();
    const normalized = normalizeName(name);
    const existing = db.customers.find((c) => normalizeName(c.name) === normalized);
    if (existing) return existing;
    const customer: Customer = {
      id: randomUUID(),
      organizationId: db.organization.id,
      name: name.trim(),
      email: null,
      phone: null,
      createdAt: nowIso(),
    };
    db.customers.push(customer);
    await this.persist();
    return customer;
  }

  async findOrCreateSupplier(name: string, serviceType: Supplier["serviceType"]): Promise<Supplier> {
    const db = await this.load();
    const normalized = normalizeName(name);
    const existing = db.suppliers.find((s) => normalizeName(s.name) === normalized);
    if (existing) return existing;
    const supplier: Supplier = {
      id: randomUUID(),
      organizationId: db.organization.id,
      name: name.trim(),
      serviceType,
      createdAt: nowIso(),
    };
    db.suppliers.push(supplier);
    await this.persist();
    return supplier;
  }

  async resetDemoData(): Promise<void> {
    this.db = createSeedDatabase();
    await this.persist();
  }
}

let storeInstance: DemoDataStore | null = null;

export function getDemoStore(): DemoDataStore {
  if (!storeInstance) storeInstance = new DemoDataStore();
  return storeInstance;
}
