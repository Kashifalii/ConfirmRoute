import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getStore } from "./get-store";
import { WorkspaceAuthenticationError } from "./errors";
import type {
  ActivityItem,
  BookingWithParties,
  DashboardMetrics,
  ExceptionWithBooking,
} from "./store";
import { evaluateApprovalEligibility } from "@/lib/validation/booking";
import type { BookingFilter } from "./store";
import type {
  BookingChange,
  BookingDocument,
  BookingStatus,
} from "@/types/domain";

export interface DashboardData {
  mode: "demo" | "supabase";
  metrics: DashboardMetrics;
  recentBookings: BookingWithParties[];
  activity: ActivityItem[];
}

export interface BookingsListData {
  mode: "demo" | "supabase";
  bookings: BookingWithParties[];
  counts: Record<BookingStatus, number>;
}

export interface BookingDetailData {
  mode: "demo" | "supabase";
  booking: BookingWithParties;
  exceptions: ExceptionWithBooking[];
  changes: BookingChange[];
  documents: BookingDocument[];
  approval: ReturnType<typeof evaluateApprovalEligibility>;
}

export interface ExceptionsListData {
  mode: "demo" | "supabase";
  exceptions: ExceptionWithBooking[];
  openCount: number;
}

/**
 * Read API for server components. `connection()` ensures every read runs at
 * request time (never baked into the static shell), so dashboards always
 * reflect the current demo or database state.
 */
async function store() {
  await connection();
  try {
    return await getStore();
  } catch (error) {
    if (error instanceof WorkspaceAuthenticationError) redirect("/login");
    throw error;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const dataStore = await store();
  const [metrics, recentBookings, activity] = await Promise.all([
    dataStore.getDashboardMetrics(),
    dataStore.listBookings(),
    dataStore.listRecentActivity(6),
  ]);
  return {
    mode: dataStore.mode,
    metrics,
    recentBookings: recentBookings.slice(0, 6),
    activity,
  };
}

export async function getBookingsListData(
  filter?: BookingFilter,
): Promise<BookingsListData> {
  const dataStore = await store();
  const [bookings, all] = await Promise.all([
    dataStore.listBookings(filter),
    dataStore.listBookings(),
  ]);
  const counts: Record<BookingStatus, number> = {
    pending_review: 0,
    approved: 0,
    archived: 0,
  };
  for (const booking of all) counts[booking.status] += 1;
  return { mode: dataStore.mode, bookings, counts };
}

export async function getBookingDetailData(
  id: string,
): Promise<BookingDetailData | null> {
  const dataStore = await store();
  const booking = await dataStore.getBooking(id);
  if (!booking) return null;
  const [exceptions, changes, documents] = await Promise.all([
    dataStore.listExceptions({ bookingId: id }),
    dataStore.listBookingChanges(id),
    dataStore.listDocuments(id),
  ]);
  const open = exceptions.filter((exception) => exception.status === "open");
  return {
    mode: dataStore.mode,
    booking,
    exceptions,
    changes,
    documents,
    approval: evaluateApprovalEligibility(booking, open),
  };
}

export async function getExceptionsListData(): Promise<ExceptionsListData> {
  const dataStore = await store();
  const exceptions = await dataStore.listExceptions();
  return {
    mode: dataStore.mode,
    exceptions,
    openCount: exceptions.filter((exception) => exception.status === "open").length,
  };
}

export async function getSettingsData() {
  const dataStore = await store();
  return {
    mode: dataStore.mode,
    organization: await dataStore.getOrganization(),
  };
}

export async function getDemoMode(): Promise<"demo" | "supabase"> {
  const dataStore = await store();
  return dataStore.mode;
}
