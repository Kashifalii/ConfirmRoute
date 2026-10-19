import { describe, expect, it } from "vitest";
import {
  datesInOrder,
  evaluateApprovalEligibility,
  findDuplicateReference,
  formatAmountChange,
  isValidIsoDate,
  missingRequiredFields,
  normalizeReference,
} from "./booking";

describe("normalizeReference", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeReference("mvr 1025")).toBe("MVR1025");
    expect(normalizeReference("MVR-1025")).toBe("MVR1025");
    expect(normalizeReference("mvr_1025")).toBe("MVR1025");
    expect(normalizeReference("  trs-5510 ")).toBe("TRS5510");
  });

  it("treats differently formatted references as equal", () => {
    expect(normalizeReference("SWA 8842")).toBe(normalizeReference("swa-8842"));
  });
});

describe("date validation", () => {
  it("accepts valid ISO dates", () => {
    expect(isValidIsoDate("2026-11-15")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("15-11-2026")).toBe(false);
    expect(isValidIsoDate("2026/11/15")).toBe(false);
  });

  it("requires the end date not to precede the start date", () => {
    expect(datesInOrder("2026-11-15", "2026-11-18")).toBe(true);
    expect(datesInOrder("2026-11-15", "2026-11-15")).toBe(true);
    expect(datesInOrder("2026-11-18", "2026-11-15")).toBe(false);
  });
});

describe("formatAmountChange", () => {
  it("calculates the changed-price difference (75,000 -> 82,000)", () => {
    expect(formatAmountChange(75000, 82000)).toEqual({
      difference: 7000,
      direction: "increase",
    });
  });

  it("handles decreases and rounding", () => {
    expect(formatAmountChange(82000, 75000)).toEqual({
      difference: -7000,
      direction: "decrease",
    });
    expect(formatAmountChange(100.005, 100.02).difference).toBeCloseTo(0.02, 2);
  });
});

describe("missingRequiredFields", () => {
  const complete = {
    reference: "MVR-1099",
    customerName: "Ahmed Khan",
    supplierName: "Mountain View Resort",
    serviceType: "hotel" as const,
    startDate: "2026-12-20",
    endDate: "2026-12-24",
    amount: 88000,
    currency: "PKR" as const,
  };

  it("returns nothing for a complete booking", () => {
    expect(missingRequiredFields(complete)).toEqual([]);
  });

  it("identifies a missing amount", () => {
    expect(
      missingRequiredFields({ ...complete, amount: null, currency: null }),
    ).toEqual(["amount", "currency"]);
  });

  it("identifies a missing end date", () => {
    expect(missingRequiredFields({ ...complete, endDate: null })).toEqual([
      "endDate",
    ]);
  });
});

describe("findDuplicateReference", () => {
  const existing = [
    { id: "b1", normalizedReference: "SWA8842", status: "approved" as const },
    { id: "b2", normalizedReference: "MVR1025", status: "pending_review" as const },
    { id: "b3", normalizedReference: "TRS5510", status: "archived" as const },
  ];

  it("flags a second record with the same normalized reference", () => {
    const duplicate = findDuplicateReference(
      { id: "b4", normalizedReference: "SWA8842" },
      existing,
    );
    expect(duplicate?.id).toBe("b1");
  });

  it("ignores the record itself", () => {
    expect(
      findDuplicateReference({ id: "b1", normalizedReference: "SWA8842" }, existing),
    ).toBeNull();
  });

  it("ignores archived bookings", () => {
    expect(
      findDuplicateReference({ id: "b4", normalizedReference: "TRS5510" }, existing),
    ).toBeNull();
  });

  it("returns null for unique references", () => {
    expect(
      findDuplicateReference({ id: "b4", normalizedReference: "MVR1099" }, existing),
    ).toBeNull();
  });
});

describe("evaluateApprovalEligibility", () => {
  const valid = {
    reference: "MVR-1099",
    customerName: "Ahmed Khan",
    supplierName: "Mountain View Resort",
    serviceType: "hotel" as const,
    startDate: "2026-12-20",
    endDate: "2026-12-24",
    amount: 88000,
    currency: "PKR" as const,
  };

  it("allows approval for a complete, exception-free booking", () => {
    expect(evaluateApprovalEligibility(valid, [])).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it("blocks approval while required fields are missing", () => {
    const result = evaluateApprovalEligibility({ ...valid, amount: null }, []);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("amount"))).toBe(true);
  });

  it("blocks approval while an exception is open", () => {
    const result = evaluateApprovalEligibility(valid, [
      { type: "value_change", field: "amount", description: "Amended price" },
    ]);
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toContain("open exception");
  });

  it("blocks approval when the end date precedes the start date", () => {
    const result = evaluateApprovalEligibility(
      { ...valid, startDate: "2026-12-24", endDate: "2026-12-20" },
      [],
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("End date"))).toBe(true);
  });
});
