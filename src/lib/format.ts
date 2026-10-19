import type { CurrencyCode } from "@/types/domain";

/** Formats a monetary amount with its currency code, e.g. "PKR 75,000". */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/** Formats a signed monetary difference, e.g. "+ PKR 7,000" or "- PKR 3,500". */
export function formatSignedMoney(
  difference: number,
  currency: CurrencyCode,
): string {
  const sign = difference > 0 ? "+" : difference < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(difference), currency)}`;
}

/** Formats an ISO date (YYYY-MM-DD) as "15 Nov 2026". */
export function formatDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats a date range as "15 – 18 Nov 2026" (same month) or "30 Nov – 4 Dec 2026". */
export function formatDateRange(
  startDate: string,
  endDate: string,
): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} – ${endDate}`;
  }
  const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const monthYear = (date: Date) =>
    date.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    return `${day(start)} – ${day(end)} ${monthYear(end)}`;
  }
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${day(start)} ${start.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })} – ${day(end)} ${monthYear(end)}`;
  }
  return `${day(start)} ${monthYear(start)} – ${day(end)} ${monthYear(end)}`;
}

/** Formats an ISO timestamp as "13 Oct 2026, 14:32". */
export function formatDateTime(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return isoTimestamp;
  return parsed.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Formats a byte count for display, e.g. "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}
