import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUnauthenticatedAuthError } from "@/lib/supabase/errors";
import { WorkspaceAuthenticationError } from "./errors";
import { normalizeReference } from "@/lib/validation/booking";
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
import type {
  Booking,
  BookingChange,
  BookingDocument,
  BookingException,
  Customer,
  Organization,
  Supplier,
} from "@/types/domain";

interface BookingRow {
  id: string;
  organization_id: string;
  reference: string;
  normalized_reference: string;
  customer_id: string;
  supplier_id: string;
  service_type: Booking["serviceType"];
  start_date: string;
  end_date: string | null;
  amount: number | null;
  currency: Booking["currency"];
  status: Booking["status"];
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers: { name: string } | null;
  suppliers: { name: string } | null;
}

interface ExceptionRow {
  id: string;
  organization_id: string;
  booking_id: string;
  type: BookingException["type"];
  field: string | null;
  description: string;
  previous_value: string | null;
  new_value: string | null;
  status: BookingException["status"];
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface ChangeRow {
  id: string;
  booking_id: string;
  actor: string;
  field: string;
  previous_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

interface DocumentRow {
  id: string;
  organization_id: string;
  booking_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
  source_scenario: string | null;
  created_at: string;
}

function toBookingView(row: BookingRow): BookingWithParties {
  return {
    id: row.id,
    organizationId: row.organization_id,
    reference: row.reference,
    normalizedReference: row.normalized_reference,
    customerId: row.customer_id,
    supplierId: row.supplier_id,
    customerName: row.customers?.name ?? "Unknown customer",
    supplierName: row.suppliers?.name ?? "Unknown supplier",
    serviceType: row.service_type,
    startDate: row.start_date,
    endDate: row.end_date,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toException(row: ExceptionRow): BookingException {
  return {
    id: row.id,
    organizationId: row.organization_id,
    bookingId: row.booking_id,
    type: row.type,
    field: row.field,
    description: row.description,
    previousValue: row.previous_value,
    newValue: row.new_value,
    status: row.status,
    resolutionNote: row.resolution_note,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Supabase-backed store bound to the signed-in user's organization. RLS
 * remains the authority for every database operation.
 */
class SupabaseDataStore implements DataStore {
  readonly mode = "supabase" as const;

  constructor(
    private readonly client: SupabaseClient,
    private readonly organizationId: string,
    private readonly memberName: string,
  ) {}

  private bookingsQuery() {
    return this.client
      .from("bookings")
      .select("*, customers(name), suppliers(name)")
      .eq("organization_id", this.organizationId);
  }

  async getOrganization(): Promise<Organization> {
    const { data, error } = await this.client
      .from("organizations")
      .select("id, name, notification_email, created_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      notificationEmail: data.notification_email,
      createdAt: data.created_at,
    };
  }

  async updateOrganizationNotificationEmail(email: string | null): Promise<Organization> {
    const { data, error } = await this.client
      .from("organizations")
      .update({ notification_email: email })
      .eq("id", this.organizationId)
      .select("id, name, notification_email, created_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      notificationEmail: data.notification_email,
      createdAt: data.created_at,
    };
  }

  async getActorName(): Promise<string> {
    return process.env.TRIPOPS_ACTOR_NAME?.trim() || this.memberName;
  }

  async listBookings(filter?: BookingFilter): Promise<BookingWithParties[]> {
    const { data, error } = await this.bookingsQuery().order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as unknown as BookingRow[];
    const query = filter?.query?.trim().toLowerCase();
    return rows
      .map(toBookingView)
      .filter((booking) => {
        if (filter?.status && booking.status !== filter.status) return false;
        if (query) {
          const haystack = `${booking.customerName} ${booking.supplierName} ${booking.reference}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      });
  }

  async getBooking(id: string): Promise<BookingWithParties | null> {
    const { data, error } = await this.bookingsQuery().eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toBookingView(data as unknown as BookingRow) : null;
  }

  async createBooking(record: NewBookingRecord): Promise<BookingWithParties> {
    const customer = await this.findOrCreateCustomer(record.customerName);
    const supplier = await this.findOrCreateSupplier(record.supplierName, record.serviceType);
    const { data, error } = await this.client
      .from("bookings")
      .insert({
        organization_id: this.organizationId,
        reference: record.reference,
        normalized_reference: normalizeReference(record.reference),
        customer_id: customer.id,
        supplier_id: supplier.id,
        service_type: record.serviceType,
        start_date: record.startDate,
        end_date: record.endDate,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
        notes: record.notes,
      })
      .select("*, customers(name), suppliers(name)")
      .single();
    if (error) throw error;
    return toBookingView(data as unknown as BookingRow);
  }

  async updateBooking(
    id: string,
    patch: Partial<Omit<NewBookingRecord, "status">>,
  ): Promise<BookingWithParties | null> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.reference !== undefined) {
      row.reference = patch.reference;
      row.normalized_reference = normalizeReference(patch.reference);
    }
    if (patch.customerName !== undefined) {
      row.customer_id = (await this.findOrCreateCustomer(patch.customerName)).id;
    }
    if (patch.supplierName !== undefined) {
      const current = await this.getBooking(id);
      const serviceType = patch.serviceType ?? current?.serviceType;
      if (!serviceType) throw new Error("Service type required to resolve supplier.");
      row.supplier_id = (await this.findOrCreateSupplier(patch.supplierName, serviceType)).id;
    }
    if (patch.serviceType !== undefined) row.service_type = patch.serviceType;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    if (patch.amount !== undefined) row.amount = patch.amount;
    if (patch.currency !== undefined) row.currency = patch.currency;
    if (patch.notes !== undefined) row.notes = patch.notes;

    const { data, error } = await this.client
      .from("bookings")
      .update(row)
      .eq("id", id)
      .eq("organization_id", this.organizationId)
      .select("*, customers(name), suppliers(name)")
      .maybeSingle();
    if (error) throw error;
    return data ? toBookingView(data as unknown as BookingRow) : null;
  }

  async setBookingStatus(id: string, status: Booking["status"]): Promise<BookingWithParties | null> {
    const { data, error } = await this.client
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", this.organizationId)
      .select("*, customers(name), suppliers(name)")
      .maybeSingle();
    if (error) throw error;
    return data ? toBookingView(data as unknown as BookingRow) : null;
  }

  async listExceptions(filter?: {
    status?: BookingException["status"];
    bookingId?: string;
  }): Promise<ExceptionWithBooking[]> {
    let query = this.client
      .from("booking_exceptions")
      .select("*, bookings(reference)")
      .eq("organization_id", this.organizationId);
    if (filter?.status) query = query.eq("status", filter.status);
    if (filter?.bookingId) query = query.eq("booking_id", filter.bookingId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: ExceptionRow & { bookings: { reference: string } | null }) => ({
      ...toException(row),
      bookingReference: row.bookings?.reference ?? "—",
    }));
  }

  async getException(id: string): Promise<BookingException | null> {
    const { data, error } = await this.client
      .from("booking_exceptions")
      .select("*")
      .eq("id", id)
      .eq("organization_id", this.organizationId)
      .maybeSingle();
    if (error) throw error;
    return data ? toException(data as ExceptionRow) : null;
  }

  async createException(record: NewExceptionRecord): Promise<BookingException> {
    const { data, error } = await this.client
      .from("booking_exceptions")
      .insert({
        organization_id: this.organizationId,
        booking_id: record.bookingId,
        type: record.type,
        field: record.field,
        description: record.description,
        previous_value: record.previousValue,
        new_value: record.newValue,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toException(data as ExceptionRow);
  }

  async resolveException(id: string, resolutionNote: string): Promise<BookingException | null> {
    const { data, error } = await this.client
      .from("booking_exceptions")
      .update({
        status: "resolved",
        resolution_note: resolutionNote,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", this.organizationId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? toException(data as ExceptionRow) : null;
  }

  async autoResolveException(id: string, note: string): Promise<void> {
    await this.resolveException(id, note);
  }

  async deleteExceptionsWhere(predicate: {
    bookingId: string;
    type: BookingException["type"];
    field: string | null;
  }): Promise<void> {
    const { error } = await this.client
      .from("booking_exceptions")
      .delete()
      .eq("organization_id", this.organizationId)
      .eq("booking_id", predicate.bookingId)
      .eq("type", predicate.type)
      .eq("field", predicate.field);
    if (error) throw error;
  }

  async listBookingChanges(bookingId: string): Promise<BookingChange[]> {
    const { data, error } = await this.client
      .from("booking_changes")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: ChangeRow) => ({
      id: row.id,
      bookingId: row.booking_id,
      actor: row.actor,
      field: row.field,
      previousValue: row.previous_value,
      newValue: row.new_value,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  }

  async recordBookingChange(change: {
    bookingId: string;
    actor: string;
    field: string;
    previousValue: string | null;
    newValue: string | null;
    reason: string | null;
  }): Promise<BookingChange> {
    const { data, error } = await this.client
      .from("booking_changes")
      .insert({
        booking_id: change.bookingId,
        actor: change.actor,
        field: change.field,
        previous_value: change.previousValue,
        new_value: change.newValue,
        reason: change.reason,
      })
      .select("*")
      .single();
    if (error) throw error;
    const row = data as ChangeRow;
    return {
      id: row.id,
      bookingId: row.booking_id,
      actor: row.actor,
      field: row.field,
      previousValue: row.previous_value,
      newValue: row.new_value,
      reason: row.reason,
      createdAt: row.created_at,
    };
  }

  async listRecentActivity(limit: number): Promise<ActivityItem[]> {
    const { data, error } = await this.client
      .from("booking_changes")
      .select("*, bookings(reference)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row: ChangeRow & { bookings: { reference: string } | null }) => ({
      id: row.id,
      bookingId: row.booking_id,
      actor: row.actor,
      field: row.field,
      previousValue: row.previous_value,
      newValue: row.new_value,
      reason: row.reason,
      createdAt: row.created_at,
      bookingReference: row.bookings?.reference ?? "—",
    }));
  }

  async listDocuments(bookingId: string): Promise<BookingDocument[]> {
    const { data, error } = await this.client
      .from("booking_documents")
      .select("*")
      .eq("organization_id", this.organizationId)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async (row: DocumentRow) => {
        let downloadUrl: string | null = null;
        if (row.storage_path) {
          const { data: signed, error: signedError } = await this.client.storage
            .from("booking-documents")
            .createSignedUrl(row.storage_path, 60);
          if (signedError) throw signedError;
          downloadUrl = signed.signedUrl;
        }
        return {
          id: row.id,
          organizationId: row.organization_id,
          bookingId: row.booking_id,
          filename: row.filename,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          storagePath: row.storage_path,
          downloadUrl,
          sourceScenario: row.source_scenario,
          createdAt: row.created_at,
        };
      }),
    );
  }

  async addDocument(record: NewDocumentRecord): Promise<BookingDocument> {
    const { data, error } = await this.client
      .from("booking_documents")
      .insert({
        organization_id: this.organizationId,
        booking_id: record.bookingId,
        filename: record.filename,
        mime_type: record.mimeType,
        size_bytes: record.sizeBytes,
        storage_path: record.storagePath ?? null,
        source_scenario: record.sourceScenario,
      })
      .select("*")
      .single();
    if (error) throw error;
    const row = data as DocumentRow;
    return {
      id: row.id,
      organizationId: row.organization_id,
      bookingId: row.booking_id,
      filename: row.filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      storagePath: row.storage_path,
      downloadUrl: null,
      sourceScenario: row.source_scenario,
      createdAt: row.created_at,
    };
  }

  async uploadBookingFile(
    bookingId: string,
    filename: string,
    bytes: Uint8Array,
  ): Promise<string> {
    const booking = await this.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found in this workspace.");

    const storagePath = `${this.organizationId}/${bookingId}/${randomUUID()}.pdf`;
    const { error } = await this.client.storage
      .from("booking-documents")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: false,
        metadata: { originalName: filename },
      });
    if (error) throw error;
    return storagePath;
  }

  async deleteStoredDocument(storagePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from("booking-documents")
      .remove([storagePath]);
    if (error) throw error;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [bookingsResult, exceptionsResult] = await Promise.all([
      this.client
        .from("bookings")
        .select("status")
        .eq("organization_id", this.organizationId),
      this.client
        .from("booking_exceptions")
        .select("status")
        .eq("organization_id", this.organizationId),
    ]);
    if (bookingsResult.error) throw bookingsResult.error;
    if (exceptionsResult.error) throw exceptionsResult.error;
    const statuses = (bookingsResult.data ?? []) as Array<{ status: Booking["status"] }>;
    const exceptionStatuses = (exceptionsResult.data ?? []) as Array<{
      status: BookingException["status"];
    }>;
    return {
      totalBookings: statuses.length,
      pendingReview: statuses.filter((row) => row.status === "pending_review").length,
      approved: statuses.filter((row) => row.status === "approved").length,
      archived: statuses.filter((row) => row.status === "archived").length,
      openExceptions: exceptionStatuses.filter((row) => row.status === "open").length,
    };
  }

  async findOrCreateCustomer(name: string): Promise<Customer> {
    const { data: existing, error: existingError } = await this.client
      .from("customers")
      .select("id, organization_id, name, email, phone, created_at")
      .eq("organization_id", this.organizationId);
    if (existingError) throw existingError;
    const match = (existing ?? []).find(
      (row) => normalizeName(row.name) === normalizeName(name),
    );
    if (match) {
      return {
        id: match.id,
        organizationId: match.organization_id,
        name: match.name,
        email: match.email,
        phone: match.phone,
        createdAt: match.created_at,
      };
    }
    const { data, error } = await this.client
      .from("customers")
      .insert({ organization_id: this.organizationId, name: name.trim() })
      .select("id, organization_id, name, email, phone, created_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      createdAt: data.created_at,
    };
  }

  async findOrCreateSupplier(
    name: string,
    serviceType: Supplier["serviceType"],
  ): Promise<Supplier> {
    const { data: existing, error: existingError } = await this.client
      .from("suppliers")
      .select("id, organization_id, name, service_type, created_at")
      .eq("organization_id", this.organizationId);
    if (existingError) throw existingError;
    const match = (existing ?? []).find(
      (row) => normalizeName(row.name) === normalizeName(name),
    );
    if (match) {
      return {
        id: match.id,
        organizationId: match.organization_id,
        name: match.name,
        serviceType: match.service_type,
        createdAt: match.created_at,
      };
    }
    const { data, error } = await this.client
      .from("suppliers")
      .insert({
        organization_id: this.organizationId,
        name: name.trim(),
        service_type: serviceType,
      })
      .select("id, organization_id, name, service_type, created_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      serviceType: data.service_type,
      createdAt: data.created_at,
    };
  }

  async resetDemoData(): Promise<void> {
    throw new Error(
      "Demo reset is only available in demo mode. Use supabase/seed.sql to reset Supabase data.",
    );
  }
}

export async function getSupabaseStore(): Promise<SupabaseDataStore> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error && !isUnauthenticatedAuthError(error)) throw error;
  if (!data.user) throw new WorkspaceAuthenticationError();

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", data.user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.organization_id) {
    throw new Error("This account is not associated with an organization.");
  }

  return new SupabaseDataStore(
    client,
    profile.organization_id,
    profile.full_name || data.user.email || "Workspace member",
  );
}
