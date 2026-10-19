// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Point demo persistence at a throwaway directory before the store is used.
process.env.DEMO_DATA_DIR = mkdtempSync(path.join(tmpdir(), "tripops-service-test-"));
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;

import {
  acceptAmendment,
  applyIntakeResult,
  approveBooking,
  archiveBooking,
  resetDemoData,
  resolveExceptionWithNote,
  saveBookingEdits,
} from "./service";
import { getStore } from "@/lib/data/get-store";
import { mockExtractionProvider } from "@/features/extraction/mock-provider";
import { extractionResultSchema } from "@/lib/validation/extraction";

async function extractScenario(scenarioId: "clean-hotel" | "missing-amount" | "changed-price" | "duplicate-reference") {
  const result = await mockExtractionProvider.extract({ kind: "scenario", scenarioId });
  return extractionResultSchema.parse(result);
}

beforeEach(async () => {
  await resetDemoData();
});

describe("applyIntakeResult — scenario A: clean booking", () => {
  it("creates a reviewable record that can be approved", async () => {
    const outcome = await applyIntakeResult({ result: await extractScenario("clean-hotel") });
    expect(outcome).toMatchObject({ outcome: "created" });

    const store = await getStore();
    if (outcome.outcome !== "created") throw new Error("expected created");
    const booking = await store.getBooking(outcome.bookingId);
    expect(booking).toMatchObject({
      reference: "MVR-1099",
      customerName: "Ahmed Khan",
      supplierName: "Mountain View Resort",
      serviceType: "hotel",
      amount: 88000,
      currency: "PKR",
      status: "pending_review",
    });

    const exceptions = await store.listExceptions({ bookingId: booking!.id, status: "open" });
    expect(exceptions).toHaveLength(0);

    const approval = await approveBooking(booking!.id);
    expect(approval.ok).toBe(true);
  });
});

describe("applyIntakeResult — scenario B: missing information", () => {
  it("flags the missing amount and blocks approval until corrected", async () => {
    const outcome = await applyIntakeResult({ result: await extractScenario("missing-amount") });
    if (outcome.outcome !== "created") throw new Error("expected created");
    const store = await getStore();

    const open = await store.listExceptions({ bookingId: outcome.bookingId, status: "open" });
    expect(open.map((e) => e.type)).toContain("missing_field");
    expect(open.find((e) => e.type === "missing_field")?.field).toBe("amount");

    const blocked = await approveBooking(outcome.bookingId);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reasons.join(" ")).toMatch(/amount/i);
    }

    await saveBookingEdits(outcome.bookingId, {
      reference: "SWA-9127",
      customerName: "Zainab Farooq",
      supplierName: "SkyWing Airlines",
      serviceType: "flight",
      startDate: "2027-01-15",
      endDate: "2027-01-22",
      amount: 61500,
      currency: "PKR",
      notes: "",
    });

    const afterFix = await store.listExceptions({ bookingId: outcome.bookingId, status: "open" });
    expect(afterFix).toHaveLength(0);

    const approval = await approveBooking(outcome.bookingId);
    expect(approval.ok).toBe(true);
  });
});

describe("applyIntakeResult — scenario C: changed price", () => {
  it("flags the 75,000 -> 82,000 amendment without overwriting the stored value", async () => {
    const outcome = await applyIntakeResult({ result: await extractScenario("changed-price") });
    expect(outcome).toMatchObject({ outcome: "amendment" });
    if (outcome.outcome !== "amendment") throw new Error("expected amendment");

    const store = await getStore();
    const booking = await store.getBooking(outcome.bookingId);
    // The stored amount stays at the previous value until the amendment is accepted.
    expect(booking?.amount).toBe(75000);

    const open = await store.listExceptions({ bookingId: outcome.bookingId, status: "open" });
    const change = open.find((e) => e.type === "value_change");
    expect(change).toBeDefined();
    expect(change?.previousValue).toBe("75000");
    expect(change?.newValue).toBe("82000");
    expect(change?.description).toContain("7,000");

    const blocked = await approveBooking(outcome.bookingId);
    expect(blocked.ok).toBe(false);
  });

  it("accepting the amendment applies the new amount and preserves history", async () => {
    const outcome = await applyIntakeResult({ result: await extractScenario("changed-price") });
    if (outcome.outcome !== "amendment") throw new Error("expected amendment");
    const store = await getStore();

    const open = await store.listExceptions({ bookingId: outcome.bookingId, status: "open" });
    const change = open.find((e) => e.type === "value_change");
    expect(change).toBeDefined();

    const accepted = await acceptAmendment(change!.id);
    expect(accepted.ok).toBe(true);

    const booking = await store.getBooking(outcome.bookingId);
    expect(booking?.amount).toBe(82000);

    const history = await store.listBookingChanges(outcome.bookingId);
    const amountChange = history.find((h) => h.field === "amount");
    expect(amountChange?.previousValue).toBe("PKR 75,000");
    expect(amountChange?.newValue).toBe("PKR 82,000");

    const stillOpen = await store.listExceptions({ bookingId: outcome.bookingId, status: "open" });
    expect(stillOpen).toHaveLength(0);

    const approval = await approveBooking(outcome.bookingId);
    expect(approval.ok).toBe(true);
  });
});

describe("applyIntakeResult — scenario D: duplicate reference", () => {
  it("creates the record with a duplicate warning that needs resolution", async () => {
    const outcome = await applyIntakeResult({ result: await extractScenario("duplicate-reference") });
    expect(outcome).toMatchObject({ outcome: "duplicate" });
    if (outcome.outcome !== "duplicate") throw new Error("expected duplicate");

    const store = await getStore();
    const open = await store.listExceptions({ bookingId: outcome.bookingId, status: "open" });
    expect(open.map((e) => e.type)).toContain("duplicate_reference");

    const blocked = await approveBooking(outcome.bookingId);
    expect(blocked.ok).toBe(false);

    const resolved = await resolveExceptionWithNote(
      open.find((e) => e.type === "duplicate_reference")!.id,
      "Confirmed with the airline: separate booking that reuses the reference.",
    );
    expect(resolved.ok).toBe(true);

    const approval = await approveBooking(outcome.bookingId);
    expect(approval.ok).toBe(true);
  });
});

describe("saveBookingEdits", () => {
  it("records every changed field in the change history", async () => {
    const store = await getStore();
    const seeded = (await store.listBookings()).find((b) => b.reference === "HGD-2091");
    expect(seeded).toBeDefined();

    await saveBookingEdits(seeded!.id, {
      reference: "HGD-2091",
      customerName: "Bilal Sheikh",
      supplierName: "Coastal Pearl Hotels",
      serviceType: "hotel",
      startDate: "2026-10-20",
      endDate: "2026-10-24",
      amount: 58000,
      currency: "PKR",
      notes: "Departure date added after checking with the hotel.",
    });

    const history = await store.listBookingChanges(seeded!.id);
    const endDateChange = history.find((h) => h.field === "endDate");
    expect(endDateChange?.previousValue).toBeNull();
    expect(endDateChange?.newValue).toBe("2026-10-24");

    // The seeded missing_field exception resolves once the field is provided.
    const open = await store.listExceptions({ bookingId: seeded!.id, status: "open" });
    expect(open).toHaveLength(0);
  });

  it("rejects a resolution note that is too short", async () => {
    const store = await getStore();
    const open = (await store.listExceptions({ status: "open" }))[0];
    const result = await resolveExceptionWithNote(open.id, "ok");
    expect(result.ok).toBe(false);
  });
});

describe("archiveBooking", () => {
  it("archives and then refuses further edits", async () => {
    const store = await getStore();
    const seeded = (await store.listBookings({ status: "approved" }))[0];
    expect(seeded).toBeDefined();

    const archived = await archiveBooking(seeded.id);
    expect(archived?.status).toBe("archived");

    await expect(
      saveBookingEdits(seeded.id, {
        reference: seeded.reference,
        customerName: seeded.customerName,
        supplierName: seeded.supplierName,
        serviceType: seeded.serviceType,
        startDate: seeded.startDate,
        endDate: seeded.endDate,
        amount: seeded.amount,
        currency: seeded.currency,
        notes: "",
      }),
    ).rejects.toThrow(/archived/i);
  });
});
