import { isValidIsoDate } from "@/lib/validation/booking";
import { CURRENCIES, SERVICE_TYPES } from "@/types/domain";
import type {
  ExtractedBookingData,
  ExtractedField,
  ExtractedFieldEvidence,
  ExtractionResult,
} from "./types";

export const LOCAL_PARSER_ID = "local-rule-parser";

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const CURRENCY_ALIASES: Record<string, (typeof CURRENCIES)[number]> = {
  PKR: "PKR",
  USD: "USD",
  AED: "AED",
  EUR: "EUR",
  GBP: "GBP",
  RS: "PKR",
  "RS.": "PKR",
  RUPEES: "PKR",
  DOLLARS: "USD",
  "€": "EUR",
  "£": "GBP",
  "$": "USD",
};

const EMPTY_DATA: ExtractedBookingData = {
  reference: null,
  customerName: null,
  supplierName: null,
  serviceType: null,
  startDate: null,
  endDate: null,
  amount: null,
  currency: null,
};

function linesOf(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function matchingLine(
  lines: string[],
  pattern: RegExp,
): { value: string; evidence: string } | null {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1]?.trim()) {
      return { value: match[1].trim(), evidence: line };
    }
  }
  return null;
}

function parseDate(value: string): string | null {
  const input = value.trim().replace(/[,]/g, "");
  const iso = input.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const date = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    return isValidIsoDate(date) ? date : null;
  }

  const dayFirst = input.match(
    /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/,
  );
  const monthFirst = input.match(
    /\b([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\b/,
  );
  const numeric = input.match(/\b(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})\b/);

  let year: string;
  let month: string;
  let day: string;
  if (dayFirst && MONTHS[dayFirst[2].toLowerCase()]) {
    [, day, month] = dayFirst;
    year = dayFirst[3];
    month = MONTHS[month.toLowerCase()];
  } else if (monthFirst && MONTHS[monthFirst[1].toLowerCase()]) {
    month = MONTHS[monthFirst[1].toLowerCase()];
    day = monthFirst[2];
    year = monthFirst[3];
  } else if (numeric) {
    // Supplier confirmations commonly use day-first dates outside the US.
    day = numeric[1];
    month = numeric[2];
    year = numeric[3];
  } else {
    return null;
  }

  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isValidIsoDate(date) ? date : null;
}

function parseCurrency(text: string): (typeof CURRENCIES)[number] | null {
  const normalized = text.toUpperCase();
  const code = normalized.match(/\b(PKR|USD|AED|EUR|GBP)\b/);
  if (code) return code[1] as (typeof CURRENCIES)[number];

  const alias = normalized.match(/\b(RS\.?|RUPEES|DOLLARS)\b/);
  if (alias) return CURRENCY_ALIASES[alias[1]];
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  if (text.includes("$")) return "USD";
  return null;
}

function parseAmount(text: string): number | null {
  const match = text.match(
    /(?:PKR|USD|AED|EUR|GBP|RS\.?|[$€£])?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i,
  );
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function addEvidence(
  evidence: Partial<Record<ExtractedField, ExtractedFieldEvidence>>,
  field: ExtractedField,
  line: string,
  confidence: ExtractedFieldEvidence["confidence"] = "high",
): void {
  evidence[field] = { confidence, text: line };
}

function parseServiceType(
  lines: string[],
): { value: ExtractedBookingData["serviceType"]; evidence: string; confidence: "high" | "medium" } | null {
  const labeled = matchingLine(
    lines,
    /^(?:service\s*type|service|booking\s*type)\s*[:#-]\s*(.+)$/i,
  );
  const candidates = labeled
    ? [labeled]
    : lines.map((line) => ({ value: line, evidence: line }));

  for (const candidate of candidates) {
    const value = candidate.value.toLowerCase();
    if (/\b(flight|airline|air ticket|air travel)\b/.test(value)) {
      return { value: SERVICE_TYPES[1], evidence: candidate.evidence, confidence: labeled ? "high" : "medium" };
    }
    if (/\b(hotel|accommodation|resort|check[- ]?in|check[- ]?out|lodging)\b/.test(value)) {
      return { value: SERVICE_TYPES[0], evidence: candidate.evidence, confidence: labeled ? "high" : "medium" };
    }
    if (/\b(tour|safari|excursion|sightseeing)\b/.test(value)) {
      return { value: SERVICE_TYPES[2], evidence: candidate.evidence, confidence: labeled ? "high" : "medium" };
    }
    if (/\b(transfer|airport pickup|chauffeur|ground transport)\b/.test(value)) {
      return { value: SERVICE_TYPES[3], evidence: candidate.evidence, confidence: labeled ? "high" : "medium" };
    }
  }
  return null;
}

function parseDates(
  lines: string[],
  patterns: RegExp[],
): { value: string; evidence: string } | null {
  for (const line of lines) {
    if (!patterns.some((pattern) => pattern.test(line))) continue;
    const value = parseDate(line);
    if (value) return { value, evidence: line };
  }
  return null;
}

function parseMoney(
  lines: string[],
): { amount: number; currency: (typeof CURRENCIES)[number] | null; evidence: string } | null {
  const candidates = lines
    .filter((line) => /\b(amount|cost|price|fare|total|payment|payable|rate)\b/i.test(line))
    .filter((line) => !/\b(previous|original|deposit|tax|saving|discount)\b/i.test(line))
    .map((line) => ({
      amount: parseAmount(line),
      currency: parseCurrency(line),
      evidence: line,
      priority: /\b(amended|new|revised|grand total|total cost|total amount|total payable|amount due)\b/i.test(line)
        ? 2
        : 1,
    }))
    .filter((candidate) => candidate.amount !== null)
    .sort((a, b) => b.priority - a.priority);

  const best = candidates[0];
  return best?.amount != null
    ? { amount: best.amount, currency: best.currency, evidence: best.evidence }
    : null;
}

/**
 * Extracts common booking fields from selectable PDF text using local,
 * deterministic label matching. It deliberately leaves ambiguous fields
 * blank rather than inventing a value; every populated field includes source
 * text and a coarse confidence level for operator review.
 */
export function extractBookingDataFromText(text: string): ExtractionResult {
  const lines = linesOf(text);
  const data = { ...EMPTY_DATA };
  const fieldEvidence: Partial<Record<ExtractedField, ExtractedFieldEvidence>> = {};

  const reference = matchingLine(
    lines,
    /^(?:booking\s*(?:reference|ref|number|no\.?)|reference|confirmation\s*(?:number|no\.?|code)|reservation\s*(?:number|no\.?|code)|pnr)\s*[:#-]\s*([A-Z0-9][A-Z0-9 -]{1,59})$/i,
  );
  if (reference) {
    data.reference = reference.value.trim();
    addEvidence(fieldEvidence, "reference", reference.evidence);
  }

  const customer = matchingLine(
    lines,
    /^(?:guest|passenger|traveler|traveller|customer|client|lead\s*guest|primary\s*guest)\s*(?:name)?\s*[:#-]\s*(.{2,120})$/i,
  );
  if (customer) {
    data.customerName = customer.value;
    addEvidence(fieldEvidence, "customerName", customer.evidence);
  }

  const supplier = matchingLine(
    lines,
    /^(?:supplier|provider|vendor|airline|hotel|tour\s*operator)\s*(?:name)?\s*[:#-]\s*(.{2,160})$/i,
  );
  if (supplier) {
    data.supplierName = supplier.value;
    addEvidence(fieldEvidence, "supplierName", supplier.evidence);
  } else {
    const header = lines.find((line) =>
      /\b(airlines?|resort|hotel|tours?|travel|safaris|car services)\b/i.test(line),
    );
    if (header && !/^(?:booking|flight|hotel|travel)\b/i.test(header)) {
      data.supplierName = header.slice(0, 160);
      addEvidence(fieldEvidence, "supplierName", header, "medium");
    }
  }

  const service = parseServiceType(lines);
  if (service) {
    data.serviceType = service.value;
    addEvidence(fieldEvidence, "serviceType", service.evidence, service.confidence);
  }

  const startDate = parseDates(lines, [
    /\b(check[- ]?in|arrival|start(?:\s*date)?|departure\s*date|outbound\s*date|travel\s*date|date\s*of\s*service)\b/i,
  ]);
  if (startDate) {
    data.startDate = startDate.value;
    addEvidence(fieldEvidence, "startDate", startDate.evidence);
  }

  const endDate = parseDates(lines, [
    /\b(check[- ]?out|return\s*date|end(?:\s*date)?|arrival\s*back)\b/i,
  ]);
  if (endDate && endDate.value !== data.startDate) {
    data.endDate = endDate.value;
    addEvidence(fieldEvidence, "endDate", endDate.evidence);
  }

  const money = parseMoney(lines);
  if (money) {
    data.amount = money.amount;
    addEvidence(fieldEvidence, "amount", money.evidence);
    if (money.currency) {
      data.currency = money.currency;
      addEvidence(fieldEvidence, "currency", money.evidence);
    }
  }
  if (!data.currency) {
    const currencyLine = matchingLine(
      lines,
      /^(?:currency)\s*[:#-]\s*(PKR|USD|AED|EUR|GBP)\b/i,
    );
    if (currencyLine) {
      data.currency = parseCurrency(currencyLine.value);
      if (data.currency) addEvidence(fieldEvidence, "currency", currencyLine.evidence);
    }
  }

  const populated = Object.values(data).some((value) => value !== null);
  return {
    providerId: LOCAL_PARSER_ID,
    scenarioId: null,
    data,
    fieldEvidence,
    disclosure: populated
      ? "Fields were parsed locally from selectable PDF text using deterministic rules. Review every field and its source text; low-confidence matches may be incorrect."
      : "No booking fields could be identified in the selectable PDF text. Review the document manually and create the booking yourself.",
  };
}
