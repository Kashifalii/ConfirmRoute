export const BOOKING_STATUSES = ["pending_review", "approved", "archived"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const SERVICE_TYPES = ["hotel", "flight", "tour", "transfer"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CURRENCIES = ["PKR", "USD", "AED", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const EXCEPTION_TYPES = [
  "missing_field",
  "duplicate_reference",
  "value_change",
  "invalid_value",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_STATUSES = ["open", "resolved"] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export interface Organization {
  id: string;
  name: string;
  notificationEmail: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  serviceType: ServiceType;
  createdAt: string;
}

/**
 * Stored booking. `endDate`, `amount`, and `currency` are nullable so that a
 * record with missing information can be saved as pending_review; the approval
 * schema is what requires them to be complete.
 */
export interface Booking {
  id: string;
  organizationId: string;
  reference: string;
  normalizedReference: string;
  customerId: string;
  supplierId: string;
  serviceType: ServiceType;
  startDate: string;
  endDate: string | null;
  amount: number | null;
  currency: CurrencyCode | null;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDocument {
  id: string;
  organizationId: string;
  bookingId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Path in Supabase Storage when persistence is configured; null in demo mode. */
  storagePath: string | null;
  /** Short-lived signed URL for authorized access to a stored document. */
  downloadUrl: string | null;
  /** Scenario id when the document came from a known sample scenario. */
  sourceScenario: string | null;
  createdAt: string;
}

export interface BookingException {
  id: string;
  organizationId: string;
  bookingId: string;
  type: ExceptionType;
  /** Field name for missing_field / invalid_value / value_change exceptions. */
  field: string | null;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  status: ExceptionStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface BookingChange {
  id: string;
  bookingId: string;
  actor: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
}

/** Fields of a booking that approval requires to be present and valid. */
export const REQUIRED_BOOKING_FIELDS = [
  "reference",
  "customerName",
  "supplierName",
  "serviceType",
  "startDate",
  "endDate",
  "amount",
  "currency",
] as const;
export type RequiredBookingField = (typeof REQUIRED_BOOKING_FIELDS)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  archived: "Archived",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  hotel: "Hotel",
  flight: "Flight",
  tour: "Tour",
  transfer: "Transfer",
};

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  missing_field: "Missing information",
  duplicate_reference: "Duplicate reference",
  value_change: "Changed value",
  invalid_value: "Invalid value",
};

export const EXCEPTION_STATUS_LABELS: Record<ExceptionStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};
